import { createWriteStream, mkdir, rm } from "fs"
import { Log } from "../modules/Log"
import { join } from "path"
import { Database } from "../modules/Database"
import Respond from "../modules/Respond"
import Safely from "../modules/Safely"
import busboy = require("busboy")
import bytes = require("bytes")
import Ffmpeg = require("fluent-ffmpeg")

import { Webserver } from "../Webserver"
import { ERequest, EResponse } from "../types/Express"
import Crypto from "../modules/Crypto"
import Validate from "../middleware/Validate"
import Fetch from "../middleware/Fetch"
import { encoderOptions } from "../Encoder"
import sharp = require("sharp")
import { Prisma } from "@prisma/client"

function getQuery(
    search: URLSearchParams,
    key: string,
    defaultValue: number,
    minValue: number,
    maxValue: number
) {
    let value = parseInt(search.get(key))
    if (isNaN(value)) return defaultValue
    if (value < minValue) return minValue
    if (value > maxValue) return maxValue
    return value
}

Webserver.get(
    "/api/servers/:server_id/clips",
    Validate.parameters("server_id"),
    Validate.userSession(false),
    Fetch.userPermissions(false),
    async (req: ERequest, res: EResponse): Promise<void> => {

        const search = new URLSearchParams(req.originalUrl.slice(req.originalUrl.indexOf("?") + 1))
        const optionPage = getQuery(search, "page", 1, 1, Infinity)
        const optionItemsPerPage = getQuery(search, "limit", 24, 24, 48)
        const filterCategoryID = Safely.parseBigInt(search.get("category"))
        const filterUserID = Safely.parseBigInt(search.get("user"))

        // [1] Fetch Server Information
        const [someServer, fetchServerError] = await Safely.call(
            Database.server.findFirst({
                where: { ["id"]: res.locals.server_id },
                select: { ["allowGuests"]: true }
            })
        )
        if (fetchServerError !== undefined)
            return Respond.withServerError(res, fetchServerError)

        if (someServer === null)
            return Respond.withNotFound(res)

        if (!someServer.allowGuests && !res.locals.permissions[res.locals.server_id.toString()])
            return Respond.withUnauthorized(res)


        // [2] Fetch Clips for Category
        const where: Prisma.ClipWhereInput = {
            ["deleted"]: false,
            ["serverId"]: res.locals.server_id,
            ["categoryId"]: filterCategoryID || undefined,
            ["userId"]: filterUserID || undefined
        }
        const [data, transactionError] = await Safely.call(
            Database.$transaction([
                Database.clip.findMany({
                    where,
                    skip: (optionPage - 1) * optionItemsPerPage,
                    take: optionItemsPerPage,
                    orderBy: {
                        ["created"]: "asc"
                    },
                    select: {
                        ["id"]: true,
                        ["created"]: true,
                        ["title"]: true,
                        ["description"]: true,
                        ["duration"]: true,
                        ["available"]: true,
                        ["approximateViewCount"]: true,
                        ["approximateHeartCount"]: true,
                        ["user"]: {
                            select: {
                                ["id"]: true,
                                ["avatar"]: true,
                                ["username"]: true,
                                ["uploadCount"]: true,
                            }
                        },
                        ["category"]: {
                            select: {
                                ["id"]: true,
                                ["name"]: true,
                                ["icon"]: true,
                                ["modManaged"]: true,
                            }
                        },
                    }
                }),
                Database.clip.count({ where: where })
            ])
        )
        if (transactionError)
            return Respond.withServerError(res, transactionError)

        Respond.withJSON(res, {
            count: data[1],
            items: data[0],
        })
    }
)


interface PostBody {
    title: string;
    category: bigint;
    description: string;
    trimStart: number;
    trimEnd: number;
    thumbnailTime: number;
    thumbnail: string;
    video: string;
}

Webserver.post(
    "/api/servers/:server_id/clips",
    Validate.parameters("server_id"),
    Validate.userSession(true),
    Fetch.userPermissions(true),
    async (req: ERequest, res: EResponse): Promise<void> => {

        if (res.locals.token === false)
            return Respond.withUnauthorized(res)

        // [1] Parse Request Body
        const body: Partial<PostBody> = {}
        const videoId = Crypto.generateSnowflake()
        const folderPath = join(process.cwd(), "media", videoId.toString())

        const parser = busboy({
            headers: req.headers,
            highWaterMark: bytes("32mb"),
            limits: {
                files: 2,
                fields: 6,
                fieldNameSize: bytes("64b"),
                fieldSize: bytes("4kb"),
                fileSize: bytes("8gb")
            }
        })

        function closeBusboy(message: string, error?: Error) {
            // Cleanup body parsing
            req.unpipe(parser)
            req.removeAllListeners()
            error
                ? Respond.withServerError(res, error)
                : Respond.withBadRequest(res, message)

            // Delete uploaded files
            rm(folderPath, { recursive: true, force: true }, someError => {
                if (someError) Log.error("FS", `Unable to delete folder '${folderPath}'`, someError)
            })
        }

        parser.on("field", (field: string, value: any, _) => {
            switch (field) {
                case "title":
                case "description":
                    if (typeof (field) !== "string")
                        return closeBusboy(`Field '${field}' is not a string`)
                    return body[field] = value

                case "category":
                    const parsedBigint = Safely.parseBigInt(value)
                    if (parsedBigint === false)
                        return closeBusboy(`Field '${field}' is not a bigint`)
                    return body[field] = parsedBigint

                case "trimStart":
                case "trimEnd":
                case "thumbnailTime":
                    const parsedInteger = parseFloat(value)
                    if (isNaN(parsedInteger))
                        return closeBusboy(`Field '${field}' is not a number`)
                    return body[field] = parsedInteger

                case "video":
                case "thumbnail":
                    return closeBusboy(`Field '${field}' is not a file`)
            }
        })

        parser.on("file", (field, stream, _) => {
            switch (field) {
                case "thumbnail":
                    // Have sharp parse data to ensure it is valid
                    const imagePath = join(folderPath, "original.thumbnail.png")
                    body.thumbnail = imagePath

                    sharp(stream.read())
                        .resize({ withoutEnlargement: true, width: 1280, height: 720 })
                        .png()
                        .toFile(imagePath)
                        .catch(() => closeBusboy("Field 'image' contains malformed or corrupted data"))
                    break

                case "video":
                    // Write File to Disk
                    const filePath = join(folderPath, `original.${field}.blob`)
                    const writer = createWriteStream(filePath)

                    // Begin Writing
                    body.video = filePath
                    stream.pipe(writer)
                    break

                default:
                    stream.resume()
                    break
            }
        })

        parser.once("fieldsLimit", () => closeBusboy("Received too many 'fields'"))
        parser.once("filesLimit", () => closeBusboy("Received too many 'files'"))
        parser.once("finish", async () => {

            if (!body.video)
                return closeBusboy("Missing field 'video'")

            if (!body.category)
                return closeBusboy("Missing field 'category'")

            if (body.title && body.title.length > 320)
                return closeBusboy("Field 'title' cannot be longer than '320' characters")

            if (body.description && body.description.length > 4096)
                return closeBusboy("Field 'description' cannot be longer than '4096' characters")


            // [2] Ensure User can Upload to the Server
            const [someServer, fetchServerError] = await Safely.call(
                Database.server.findFirst({
                    where: { ["id"]: res.locals.server_id },
                    select: { ["allowGuests"]: true }
                })
            )
            if (fetchServerError !== undefined)
                return Respond.withServerError(res, fetchServerError)

            if (someServer === null)
                return Respond.withNotFound(res, "Unknown Server")

            if (!someServer.allowGuests && !res.locals.permissions[res.locals.server_id.toString()])
                return Respond.withUnauthorized(res)


            // [3] Probe Media file for content
            Ffmpeg()
                .addInput(body.video)
                .ffprobe(async (err: Error, info: Ffmpeg.FfprobeData) => {
                    if (err) {
                        // Check for Client Errors
                        if (err.message.includes("Invalid data found when processing input"))
                            return closeBusboy("Field 'video' contains malformed or corrupted data")

                        // Server Error
                        return closeBusboy("", err)
                    }

                    // [4] Validate Encoder Options
                    if (info.streams.filter(s => s.codec_type === "video").length !== 1)
                        return closeBusboy("Field 'video' must have one video stream")

                    const trimStartPresent = (body.trimStart !== undefined)
                    const trimEndPresent = (body.trimEnd !== undefined)

                    // trimStart is ahead of trimEnd
                    if ((trimStartPresent && trimEndPresent) && (body.trimStart > body.trimEnd))
                        return closeBusboy("Marker 'trimStart' is ahead of 'trimEnd'")

                    // trimEnd is behind of trimStart
                    if ((trimStartPresent && trimEndPresent) && (body.trimEnd < body.trimStart))
                        return closeBusboy("Marker 'trimEnd' is behind 'trimStart'")

                    // trimStart ahead of duration
                    if (trimStartPresent && body.trimStart > info.format.duration)
                        return closeBusboy("Marker 'trimStart' is ahead of 'duration'")

                    // trimEnd ahead of duration
                    if (trimEndPresent && body.trimEnd > info.format.duration)
                        return closeBusboy("Marker 'trimEnd' is ahead of 'duration'")

                    // trimEnd is negative
                    if (trimEndPresent && body.trimEnd < 0)
                        return closeBusboy("Marker 'trimEnd' is negative")

                    // trimStart is negative
                    if (trimStartPresent && body.trimStart < 0)
                        return closeBusboy("Marker 'trimStart' is negative")

                    if (res.locals.token === false)
                        return Respond.withUnauthorized(res)


                    // [5] Ensure Category Exists
                    const [someCategory, findError] = await Safely.call(
                        Database.category.findFirst({
                            where: {
                                ["id"]: body.category,
                                ["serverId"]: res.locals.server_id,
                            },
                            select: {
                                ["id"]: true
                            }
                        })
                    )
                    if (findError !== undefined)
                        return closeBusboy("", findError)

                    if (someCategory === null)
                        return closeBusboy("Unknown Category")


                    // [6] Add Clip to Encoder Queue
                    const videoStreamInfo = info.streams.find(s => s.codec_type === "video")
                    const noAudioStreams = (info.streams.filter(s => s.codec_type === "audio").length === 0)

                    const [someClip, createError] = await Safely.call(
                        Database.clip.create({
                            data: {
                                ["id"]: videoId,
                                ["userId"]: res.locals.token.uid,
                                ["serverId"]: res.locals.server_id,
                                ["categoryId"]: body.category,
                                ["title"]: body.title || videoId.toString(),
                                ["description"]: body.description || `A clip uploaded by ${res.locals.token.username}`,
                                ["duration"]: info.format.duration | 0,
                                ["encoderOptions"]: {
                                    ["probeInfo"]: JSON.stringify(info),
                                    ["trimStart"]: body.trimStart,
                                    ["trimEnd"]: body.trimEnd,
                                    ["thumbnailAt"]: body.thumbnailTime,
                                    ["hasCustomThumbnail"]: (body.thumbnail !== undefined)
                                },
                                ["formats"]: {
                                    createMany: {
                                        data: encoderOptions.encodings.map(format => {
                                            return {
                                                ["id"]: Crypto.generateSnowflake(),
                                                ["codecVideo"]: format.codecVideo,
                                                ["bitrateVideo"]: format.videoBitrate,
                                                ["codecAudio"]: (noAudioStreams ? "NONE" : format.codecAudio),
                                                ["bitrateAudio"]: (noAudioStreams ? 0 : format.audioBitrate),

                                                ["encodingStatus"]:
                                                    format.enabled ? "QUEUED" : "IGNORED",

                                                ["videoHeight"]:
                                                    (videoStreamInfo.height > format.maxHeight)
                                                        ? format.maxHeight
                                                        : videoStreamInfo.height,

                                                ["videoWidth"]:
                                                    (videoStreamInfo.width > format.maxWidth)
                                                        ? format.maxWidth
                                                        : videoStreamInfo.width,

                                                ["framerate"]: (() => {
                                                    const integers = videoStreamInfo
                                                        .r_frame_rate
                                                        .split("/")
                                                        .map(s => parseInt(s))
                                                    return Math.round(integers[0] / integers[1])

                                                })()
                                            }
                                        })
                                    }

                                },
                            },
                            select: {
                                ["id"]: true,
                                ["created"]: true,
                                ["title"]: true,
                                ["description"]: true,
                                ["duration"]: true,
                                ["approximateViewCount"]: true,
                                ["approximateHeartCount"]: true,
                                ["available"]: true
                            }
                        })
                    )
                    if (createError)
                        return closeBusboy("", createError)


                    // [7] Increment Counter
                    const [_, updateError] = await Safely.call(
                        Database.server.update({
                            where: {
                                ["id"]: res.locals.server_id
                            },
                            data: {
                                ["uploadCount"]: {
                                    increment: 1
                                }
                            }
                        })
                    )
                    if (updateError)
                        return closeBusboy("", updateError)

                    Respond.withJSON(res, someClip)
                })
        })

        // Create Project Folder & Parse Request
        mkdir(folderPath, { recursive: true }, err => err
            ? closeBusboy("", err)
            : req.pipe(parser)
        )
    }
)