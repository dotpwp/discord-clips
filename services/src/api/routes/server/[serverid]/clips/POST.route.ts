import { keyEncoderAwaken, keyQueueLatest } from "../../../../../shared/other/RedisKeys";
import { ERequest, EResponse } from "../../../../../types/Express";
import { FlagsPermissions } from "../../../../../types/Permission";
import { Cache, Database } from "../../../../../shared/util/Database";
import { ErrorMessage } from "../../../../../types/Validator";
import { ffmpegAsync } from "../../../../../shared/encoder/ffmpegAsync";
import { ffmpegArgs } from "../../../../../shared/encoder/ffmpegArgs";
import { Webserver } from "../../../..";
import { ffprobe } from "../../../../../shared/encoder/ffprobeAsync";
import { DBError } from "../../../../../types/Database";
import generateThumbnails from "../../../../../shared/encoder/generateThumbnails";
import Validator from "../../../../../shared/util/Validator";
import Validate from "../../../../../shared/web/Validate";
import Unique from "../../../../../shared/util/Unique";
import Froppy from "../../../../../shared/util/Froppy";
import Reply from "../../../../../shared/web/Reply";
import Safe from "../../../../../shared/util/Safe";
import Path from "../../../../../shared/util/Path";
import { createWriteStream, mkdir, rm } from "fs";
import { NextFunction } from "express";
import busboy from "busboy";
import bytes from "bytes";
import sharp from "sharp";


// Needs Tests:
// Title longer than 100 characters => 400 Bad Request
// Description longer than 4096 characters => 400 Bad Request
// Bogus Category => 400 Bad Request
// Bogus Trim Start => 400 Bad Request
// Bogus Trim End => 400 Bad Request
// Bogus Thumbnail At => 400 Bad Request
// Bogus Image => 400 Bad Request
// Bogus Video => 400 Bad Request
// (3x) Valid Body => 200 OK

interface RequestBody {
    title: string
    description: string
    category: bigint
    trimStart: number
    trimEnd: number
    thumbnailAt: number
    thumbnail: string
    video: string
}

interface ExtraLocals {
    locals: {
        videoID: bigint;
        imageID: string;
        cancelRequest: (message?: ErrorMessage, error?: Error) => void;
    }
}

const
    MAX_SIZE_FILE = bytes("8GB"),
    MAX_SIZE_FIELD = bytes("4KB")

Webserver.post(
    "/api/server/:serverid/clips",
    Validate.routeParams("serverid"),
    Validate.userToken,
    Validate.hasPermissionTo(FlagsPermissions.ATTACH_FILES),
    async function (req: ERequest<{ [key: string]: string }>, res: EResponse & ExtraLocals, next: NextFunction) {

        // [1] Create Body Parser
        const
            videoID = Unique.generateSnowflake(),
            contentPath = Path.forBlobs(videoID),
            bodyParser = busboy({
                ["headers"]: req.headers,
                ["limits"]: {
                    ["files"]: 2,
                    ["fields"]: 6,
                    ["fileSize"]: MAX_SIZE_FILE,
                    ["fieldSize"]: MAX_SIZE_FIELD,
                }
            }),
            cancelRequest = (message?: ErrorMessage, error?: Error) => {
                // Cancel Parsing
                req.unpipe(bodyParser)
                req.removeAllListeners()
                error
                    ? Reply.withServerError(res, error)
                    : Reply.withParserError(res, [message || "root: error"])
            }

        // [2] Append Event Listeners
        bodyParser
            .once("error", (error: Error) => cancelRequest(undefined, error))
            .once("fieldsLimit", () => cancelRequest("root: Reached fields limit"))
            .once("filesLimit", () => cancelRequest("root: Reached files limit"))
            .once("partsLimit", () => cancelRequest("root: Reached parts limit"))
            .once("finish", () => {
                res.locals.cancelRequest = cancelRequest
                res.locals.videoID = videoID
                return next()
            })
            .on("field", (field, value) => {
                switch (field) {
                    case "title":
                    case "description":
                    case "category":
                    case "trimStart":
                    case "trimEnd":
                    case "thumbnailAt":
                        req.body[field] = value
                        break

                    default:
                        cancelRequest(`${field}: Unknown field`)
                        break
                }
            })
            .on("file", (field, value) => {
                switch (field) {
                    case "video":
                        const videoPath = Path.forVideoBlob(videoID)
                        value.pipe(createWriteStream(videoPath))
                        req.body[field] = videoPath
                        break

                    case "thumbnail":
                        const imageID = Unique.generateID()
                        const imagePath = Path.forImageBlob(videoID, imageID)
                        value.pipe(createWriteStream(imagePath))
                        res.locals.imageID = imageID
                        req.body[field] = imagePath
                        break

                    default:
                        cancelRequest(`${field}: Unknown field`)
                        break
                }
            })

        // [3] Create New Folder
        mkdir(contentPath, { recursive: true }, error => {
            // [3A] Remove directory when parsing fails
            res.once("finish", () => (res.statusCode !== 200) && rm(
                contentPath, { recursive: true, force: true },
                error => (error) && Froppy.error("FS", `Cannot remove path: ${contentPath}`, { error })
            ))
            // [3B] Begin parsing
            req.body = {}
            error
                ? cancelRequest(undefined, error)
                : req.pipe(bodyParser)
        })
    },
    Validator.createMiddleware({
        ["title"]: {
            _description: "Video Title",
            type: "string",
            required: true,
            minimumLength: 0,
            maximumLength: 100,
        },
        ["description"]: {
            _description: "Video Category",
            type: "string",
            required: true,
            minimumLength: 0,
            maximumLength: 4096
        },
        ["category"]: {
            _description: "Category to place video in",
            type: "bigint",
            required: false,
            minimumValue: 0n,
        },
        ["trimStart"]: {
            _description: "Start video to given marker",
            type: "number",
            required: false,
            minimumValue: 0,
        },
        ["trimEnd"]: {
            _description: "Trim video to given marker",
            type: "number",
            required: false,
            minimumValue: 0,
        },
        ["thumbnailAt"]: {
            _description: "Take thumbnail at given position",
            type: "number",
            required: false,
            minimumValue: 0
        },
        // The following fields are absolute paths (strings)
        ["video"]: {
            _description: "Path to original Video Blob",
            type: "string",
            required: true,
        },
        ["thumbnail"]: {
            _description: "Path to original Thumbnail Blob",
            type: "string",
            required: false
        }
    }),
    async function (req: ERequest<RequestBody>, res: EResponse & ExtraLocals) {
        const { cancelRequest, videoID, serverid, token } = res.locals
        const { body } = req

        // [4A] Validate Video via Probing
        const [videoStats, testVideoError] = await Safe.call(ffprobe(body.video))
        if (testVideoError)
            return cancelRequest("video: Invalid or Malformed Video Data")
        if (videoStats.streams.filter(s => s.codec_type === "video").length === 0)
            return cancelRequest("video: Must contain one video stream")
        if (!videoStats.format.duration)
            return cancelRequest("video: Unknown Duration")

        // [4B] Validate Parameters (Mostly Trimming)
        const trimStartPresent = (body.trimStart !== undefined)
        const trimEndPresent = (body.trimEnd !== undefined)
        const thumbAtPresent = (body.thumbnailAt !== undefined)
        let duration = parseInt(videoStats.format.duration || "0")

        if ((trimStartPresent && trimEndPresent) && (body.trimStart > body.trimEnd))
            return cancelRequest("trimStart: Ahead of \"trimEnd\"")
        if ((trimStartPresent && trimEndPresent) && (body.trimEnd < body.trimStart))
            return cancelRequest("trimEnd: Behind \"trimStar\"")
        if (trimStartPresent && body.trimStart > duration)
            return cancelRequest("trimStart: Ahead of \"duration\"")
        if (trimEndPresent && body.trimEnd > duration)
            return cancelRequest("trimEnd: Ahead of \"duration\"")
        if (trimEndPresent && body.trimEnd < 0)
            return cancelRequest("trimEnd: Value is negative")
        if (trimStartPresent && body.trimStart < 0)
            return cancelRequest("trimStart: Value is negative")
        if (thumbAtPresent && body.thumbnailAt > duration)
            return cancelRequest("thumbAt: Ahead of \"duration\"")

        // Calculate Duration
        if (trimEndPresent) duration = body.trimEnd
        if (trimStartPresent) duration = duration - body.trimStart

        // [4C] Generate Thumbnails
        if (body.thumbnail) {
            // [4CA] Validate Given Thumbnail Data
            const [_, testImageError] = await Safe.call(sharp(body.thumbnail).stats())
            if (testImageError) return cancelRequest(
                "thumbnail: Invalid or Malformed Image Data"
            )
        } else {
            // [4CA] Create Thumbnail from Video
            const imageID = Unique.generateID()
            const imagePath = Path.forImageBlob(videoID, imageID)
            res.locals.imageID = imageID
            body.thumbnail = imagePath

            const [_, createThumbnailError] = await Safe.call(
                new Promise<void>(async (resolve, reject) => {
                    ffmpegAsync(
                        new ffmpegArgs().add(
                            "-an",
                            // Start at halfway point or at user given point
                            "-ss", `${body.thumbnailAt || (duration / 2) | 0}`,
                            "-i", body.video,
                            "-frames:v", "1",
                            "-c:v", "png",
                            "-f", "image2",
                            imagePath
                        ),
                        err => err ? reject(err) : resolve()
                    )
                })
            )
            if (createThumbnailError) return cancelRequest(
                "video: Unable to generate thumbnail"
            )
        }

        // [4CB] Create Thumbnail Folder
        const imageID = res.locals.imageID
        const imageFolder = await Path.createThumbnailDirectory(videoID, imageID)
        if (imageFolder instanceof Error)
            return cancelRequest(undefined, imageFolder)

        // [4CC] Generate Thumbnails
        const [_, convertThumbnailError] = await Safe.call(generateThumbnails(imageFolder, body.thumbnail))
        if (convertThumbnailError)
            return cancelRequest(undefined, convertThumbnailError)


        // [5] Create Transaction
        // This won't ensure that the category isn't from another server but whatever
        const [newClip, transactionError] = await Safe.call(
            Database.$transaction(async tx => {
                // [6A] Increment Upload Count in Server
                await tx.server.update({
                    where: { ["id"]: serverid },
                    data: { ["uploadCount"]: { increment: 1 } }
                })

                // [6B] Increment User Clip Counter
                await tx.user.update({
                    select: { id: true },
                    where: { ["id"]: token.uid },
                    data: { ["uploadCount"]: { increment: 1 } }
                })

                // [6C] Create new Clip in Database
                return await tx.clip.create({
                    data: {
                        ["id"]: videoID,
                        ["userId"]: token.uid,
                        ["serverId"]: serverid,
                        ["categoryId"]: body.category,
                        ["title"]: body.title,
                        ["description"]: body.description,
                        ["thumbnail"]: imageID,
                        ["duration"]: duration,
                        ["encoderOptions"]: Safe.jsonStringify({
                            hasCustomThumbnail: (body.thumbnail !== undefined),
                            thumbnailAt: body.thumbnailAt,
                            trimStart: body.trimStart,
                            trimEnd: body.trimEnd,
                        })
                    },
                    select: {
                        ["id"]: true,
                        ["created"]: true,
                        ["title"]: true,
                        ["description"]: true,
                        ["thumbnail"]: true,
                        ["preview"]: true,
                        ["duration"]: true,
                        ["availability"]: true,
                        ["approximateCommentCount"]: true,
                        ["approximateHeartCount"]: true,
                        ["approximateViewCount"]: true,
                        ["user"]: {
                            select: {
                                ["id"]: true,
                                ["alias"]: true,
                                ["avatar"]: true,
                            }
                        }
                    }
                })
            })
        )
        if (transactionError?.code === DBError.ForeignNotFound)
            return Reply.withUnknown(res, "Unknown Category")
        if (transactionError)
            return Reply.withServerError(res, transactionError)

        // [7] Add Video to Encoding Queue
        await Promise.all([
            Cache.publish(keyEncoderAwaken, keyQueueLatest),
            Cache.sAdd(keyQueueLatest, videoID.toString())
        ])

        // [8] Send Response to Client
        Reply.withJSON(res, newClip)
    }
)