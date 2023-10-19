import { keyQueueComplete, keyQueueLatest, keyQueueReencode } from "../shared/other/RedisKeys";
import { ScriptFindWork, ScriptTransferIDFromActive } from "../shared/other/RedisScripts";
import { EncoderOptionsJSON, WebhookJSON } from "../types/Database";
import { Action, Source, VideoResolution } from "../types/Encoder";
import { ffmpeg, ffmpegAsync } from "../shared/encoder/ffmpegAsync";
import { ResponsePostWebhook } from "../types/Discord";
import { Cache, Database } from "../shared/util/Database";
import { encodingMethods } from ".";
import { ErrorMessage } from "../types/Validator";
import { ffmpegArgs } from "../shared/encoder/ffmpegArgs";
import { ffprobe } from "../shared/encoder/ffprobeAsync";
import generateThumbnails from "../shared/encoder/generateThumbnails";
import ffmpegCodec from "../shared/encoder/ffmpegCodec";
import Validator from "../shared/util/Validator";
import Discord from "../shared/other/Discord";
import Unique from "../shared/util/Unique";
import Froppy from "../shared/util/Froppy";
import Safe from "../shared/util/Safe";
import Path from "../shared/util/Path";
import { Prisma } from "@prisma/client";
import axios from "axios";

const validateEncoderOptionsJSON = Validator.createValidator({
    hasCustomThumbnail: {
        _description: "Skip creation of initial thumbnail.",
        type: "boolean",
        required: true,
    },
    trimStart: {
        _description: "Start Video At",
        type: "number",
        required: false,
    },
    trimEnd: {
        _description: "End Video At",
        type: "number",
        required: false,
    },
    thumbnailAt: {
        _description: "Take Screenshot At",
        type: "number",
        required: false,
    },
})

const validateWebhookJSON = Validator.createValidator({
    ["category"]: {
        _description: "Category ID",
        type: "bigint",
        required: true
    },
    ["channel"]: {
        _description: "Webhook Channel ID",
        type: "bigint",
        required: true,
        minimumValue: 0n
    },
    ["token"]: {
        _description: "Webhook Token",
        type: "string",
        required: true,
        minimumLength: 8,
        maximumLength: 128
    }
})

/**
 * Behold the unwavering loyalty of our Worker, ever vigilant and ready to serve. 
 * Like a faithful sentinel, it stands guard, committed to its tasks.
 * Let us proceed with gratitude for its steadfast dedication.
*/
export default class Worker {
    private ID: string
    private callSign: string
    private alreadyWorking = false
    private workingSource: Source = Source.None
    private workingVideoID: bigint = 0n
    private workingPreviewID: string | undefined = undefined
    private workingThumbnailID: string | undefined = undefined

    constructor(id: number) {
        this.callSign = `WORKER[${id + 1}]`
        this.ID = `worker:${id}`
        this.beginWork().catch(e => this.catchWork(e))
    }

    /** Externally Awaken Worker from Sleep */
    public awaken() { this.beginWork().catch(e => this.catchWork(e)) }

    /** Catches Fatal Errors in beginWork */
    public catchWork(reason: any) {
        Froppy.error(this.callSign, "Caught Fatal Error", { error: reason })
        setTimeout(() => this.beginWork().catch(e => this.catchWork(e)), 1_000);
    }

    /** Create format in database, automatically retries */
    private createFormat(data: Prisma.XOR<Prisma.FormatCreateInput, Prisma.FormatUncheckedCreateInput>) {
        Database.format
            .create({ select: { id: true }, data })
            .catch(error => {
                // Retry Create after a short delay
                Froppy.error(this.callSign, "DB > Cannot Create Format", { error })
                setTimeout(() => this.createFormat, 1_000)
            })
    }

    /** Finalize processing of video, automatically retries */
    private async finishWork(take: Action, unavailableId?: string) {
        new Promise<void>(async resolve => {
            switch (take) {
                // Send Video to Limbo
                case Action.DiscardVideoID:
                    await Cache.evalSha(await ScriptTransferIDFromActive, { keys: [this.ID] })
                    break

                // Return video to its respective queue
                case Action.ReplaceVideoID:
                    await Cache.evalSha(await ScriptTransferIDFromActive, {
                        keys: [
                            this.ID,
                            (this.workingSource === Source.Reencode)
                                ? keyQueueReencode
                                : keyQueueLatest
                        ]
                    })
                    break

                // Remove from queue and mark as unavailable
                // User can see that the video is unavailable and delete it later
                case Action.VideoUnusable:
                    await Database.clip.update({
                        where: {
                            ["id"]: this.workingVideoID
                        },
                        data: {
                            ["availability"]: "UNAVAILABLE",
                            ["reason"]: `Video Unavailable (${unavailableId})`
                        }
                    })
                    await Cache.evalSha(await ScriptTransferIDFromActive, { keys: [this.ID] })
                    break

                // Mark video as available
                // Available means at least one playback format has been encoded
                case Action.VideoReady:
                    await Database.clip.update({
                        where: {
                            ["id"]: this.workingVideoID
                        },
                        data: {
                            ["availability"]: "READY",
                            ["preview"]: this.workingPreviewID,
                            ["thumbnail"]: this.workingThumbnailID
                        }
                    })
                    await Cache.evalSha(await ScriptTransferIDFromActive, { keys: [this.ID, keyQueueComplete] })
                    break
            }
            resolve()
        })
            .then(() => {
                // Prepare for another loop
                this.alreadyWorking = false
                this.workingVideoID = 0n
                this.workingSource = Source.None
                this.workingPreviewID = undefined
                this.workingThumbnailID = undefined
                setTimeout(() => this.beginWork().catch(e => this.catchWork(e)), 1_000)
            })
            .catch(error => {
                // Retry Create after a short delay
                Froppy.error(this.callSign, "QUEUE > Cleanup Error", { error })
                setTimeout(() => this.createFormat, 1_000)
            })
    }

    /** Fetch and begin processing of a video from queue */
    private async beginWork() {
        if (this.alreadyWorking) return
        this.alreadyWorking = true


        // @ts-ignore - TODO: Needs Types
        // [1A] Fetch Work from Queue
        const [location, contentID]: [Source, string | undefined] = await Cache.evalSha(await ScriptFindWork, { keys: [this.ID] })
        if (location === Source.None || contentID === undefined) {
            Froppy.info(this.callSign, "QUEUE > Sleeping .zZ")
            return this.alreadyWorking = false
        }
        this.workingSource = location

        // [1B] Validate Video ID
        const videoID = Safe.parseBigint(contentID)
        if (videoID === false) return this.finishWork(
            Action.DiscardVideoID,
            Froppy.warn(this.callSign, "QUEUE > Invalid Video ID", { videoID })
        )
        this.workingVideoID = videoID


        // [2A] Fetch Video Info
        Froppy.info(this.callSign, `Working on: "${videoID}"`)
        const [someVideo, fetchVideoError] = await Safe.call(
            Database.clip.findFirst({
                where: { ["id"]: videoID },
                select: {
                    ["id"]: true,
                    ["encoderOptions"]: true,
                    ["thumbnail"]: true,
                    ["duration"]: true,
                    ["preview"]: true,
                    ["deleted"]: true,
                    ["categoryId"]: true,
                    ["user"]: {
                        select: {
                            ["id"]: true,
                            ["alias"]: true
                        }
                    },
                    ["formats"]: {
                        select: {
                            ["videoCodec"]: true,
                            ["audioCodec"]: true,
                        }
                    },
                    ["server"]: {
                        select: {
                            ["webhooks"]: true
                        }
                    }
                }
            })
        )
        if (fetchVideoError) return this.finishWork(
            Action.ReplaceVideoID,
            Froppy.error(this.callSign, "DB > Cannot Fetch Video", { error: fetchVideoError })
        )
        if (someVideo === null) return this.finishWork(
            Action.DiscardVideoID,
            Froppy.warn(this.callSign, "QUEUE > Unknown Video")
        )
        if (someVideo.deleted) return this.finishWork(
            Action.DiscardVideoID,
            Froppy.info(this.callSign, "QUEUE > Video was deleted")
        )


        // [3] Prepare for Encoding
        // [3A] Parse Encoding Settings
        const someOptionsJSON = Safe.parseJSON(someVideo.encoderOptions as string)
        if (someOptionsJSON === false) return this.finishWork(
            Action.VideoUnusable,
            Froppy.warn(this.callSign, "VIDEO > Invalid JSON", { json: someOptionsJSON })
        )
        const [options, errors]: [EncoderOptionsJSON, ErrorMessage[]] = validateEncoderOptionsJSON(someOptionsJSON)
        if (errors.length !== 0) return this.finishWork(
            Action.VideoUnusable,
            Froppy.warn(this.callSign, "VIDEO > Invalid Options", errors)
        )
        // [3B] Probe Video to Fetch Information
        const [probeInfo, probeError] = await Safe.call(ffprobe(Path.forVideoBlob(videoID)))
        if (probeError) return this.finishWork(
            Action.VideoUnusable,
            Froppy.error(this.callSign, "VIDEO > Probe Error", { error: probeError })
        )
        // [3C] Find Video/Audio Streams
        const audioStream = probeInfo.streams.find(s => s.codec_type === "audio")
        const videoStream = probeInfo.streams.find(s => s.codec_type === "video")
        if (videoStream === undefined) return this.finishWork(
            Action.VideoUnusable,
            Froppy.warn(this.callSign, "VIDEO > Missing Video Stream")
        )
        // [3D] Create Paths
        const originalVideoPath = Path.forVideoBlob(videoID)
        const originalThumbPath = Path.forImageBlob(videoID, "original")
        const formatFolder = await Path.createFormatsDirectory(videoID)
        if (formatFolder instanceof Error) this.finishWork(
            Action.ReplaceVideoID,
            Froppy.error(this.callSign, "FS > Error creating folder", { error: formatFolder })
        )


        // [4] Process Video
        // [4A] Create Animated Preview
        if (someVideo.preview === null) {

            // [4AA] Create a 6 Second preview of video at 2x playback speed
            const previewID = Unique.generateID()
            const [__, createPreviewError] = await Safe.call(
                ffmpeg(new ffmpegArgs().add(
                    "-an",
                    "-to", "00:00:06",
                    "-i", originalVideoPath,
                    "-loop", "0",
                    "-q:v", "75",
                    "-compression_level", "5",
                    "-vf", "fps=10, setpts=0.5*PTS, scale=320:180:force_original_aspect_ratio=decrease, pad=320:180:(ow-iw)/2:(oh-ih)/2, setsar=1",
                    Path.outputFormatPath(videoID, previewID, "WEBP")
                ))
            )
            if (createPreviewError) return this.finishWork(
                Action.VideoUnusable,
                Froppy.error(this.callSign, "PREVIEW > Cannot generate", { error: createPreviewError })
            )
            this.workingPreviewID = previewID
        }

        // [4B] Generate Thumbnails
        if (someVideo.thumbnail === null) {

            // [4BA] Create Thumbnail Folder
            const imageID = Unique.generateID()
            const imageFolder = await Path.createThumbnailDirectory(videoID, imageID)
            if (imageFolder instanceof Error) return this.finishWork(
                Action.ReplaceVideoID,
                Froppy.error(this.callSign, "FS > Error creating folder", { error: imageFolder })
            )

            // [4BB] Create Original Thumbnail
            const [__, createThumbnailError] = await Safe.call(
                new Promise<void>(async (resolve, reject) => {
                    if (options.hasCustomThumbnail) return resolve()
                    ffmpegAsync(
                        new ffmpegArgs().add(
                            "-an",
                            // Start at halfway point or a user given point
                            "-ss", `${options.thumbnailAt || (someVideo.duration / 2) | 0}`,
                            "-i", originalVideoPath,
                            "-frames:v", "1",
                            "-c:v", "png",
                            "-f", "image2",
                            originalThumbPath
                        ),
                        err => err ? reject(err) : resolve()
                    )
                })
            )
            if (createThumbnailError) return this.finishWork(
                Action.VideoUnusable,
                Froppy.error(this.callSign, "THUMBS > Cannot generate thumbnail", { error: createThumbnailError })
            )

            // [4BC] Generate Thumbnails
            const [___, convertThumbnailError] = await Safe.call(generateThumbnails(imageFolder, originalThumbPath))
            if (convertThumbnailError) return this.finishWork(
                Action.VideoUnusable,
                Froppy.error(this.callSign, "THUMBS > Cannot resize thumbnails", { error: convertThumbnailError })
            )
            this.workingThumbnailID = imageID
        }

        // [6] Create Formats for Video
        let formatsFinished = 0, formatsErrored = 0
        for (const encoding of encodingMethods) await new Promise<boolean>(async (resolve, reject) => {

            // Skip if format has been disabled
            if (!encoding.formatEnabled(probeInfo)) return resolve(false)
            // Skip if format has already been encoded
            if (someVideo.formats.find(f => f.videoCodec === encoding.videoCodec)) return resolve(false)

            // [6A] Calculate Resolution Tier
            const startAt = Date.now()
            const formatID = Unique.generateSnowflake()
            const videoHeight = (videoStream.height || 0)
            const videoWidth = (videoStream.width || 0)
            const videoFPS = (Safe.parseFramerate(videoStream.r_frame_rate) || 0)

            let resolution: VideoResolution = encoding.videoResolution[0]
            for (const someResolution of encoding.videoResolution) {
                (resolution === undefined)
                    ? resolution = someResolution
                    : (videoHeight >= someResolution.maxHeight || videoWidth >= someResolution.maxWidth)
                        ? resolution = someResolution
                        : null
            }

            // [6B] Calculate Bitrate
            const videoFilters = new Array<string>()
            const vidPixelCount = (videoWidth * videoHeight)
            const resPixelCount = (resolution.maxWidth * resolution.maxHeight)
            const videoBitrate = (vidPixelCount !== resPixelCount)
                ? resolution.maxBitrate * (vidPixelCount / resPixelCount) | 0
                : resolution.maxBitrate

            // [6C] Calculate Video Framerate
            if (videoFPS > resolution.maxFPS)
                videoFilters.push(`fps=${resolution.maxFPS}`)

            // [6D] Calculate Video Resolution
            if (vidPixelCount !== resPixelCount)
                videoFilters.push(`scale=${videoWidth}:${videoHeight}`)

            // [6E] Start Encoding Format
            ffmpegAsync(
                new ffmpegArgs()
                    .if(!audioStream, ["-an"])
                    .if(options.trimStart, ["-ss", `${options.trimStart}`])
                    .if(options.trimEnd, ["-to", `${options.trimEnd}`])
                    .add("-i", originalVideoPath)
                    .if(videoFilters.length, ["-vf", videoFilters.join(",")])
                    .if(videoStream, [
                        "-c:v", ffmpegCodec.get(encoding.videoCodec),
                        "-c:a", `${videoBitrate}K`
                    ])
                    .if(audioStream, [
                        "-c:a", ffmpegCodec.get(encoding.audioCodec),
                        "-b:a", `${encoding.audioBitrate}K`
                    ])
                    .add(Path.outputFormatPath(videoID, formatID, encoding.formatContainer)),
                error => {
                    if (error) return reject(error)
                    // Time: 13123  | Time: 768
                    const encodingTimeRobot = (Date.now() - startAt)
                    // Time: 13.12s | Time: 768ms
                    const encodingTimeHuman = (encodingTimeRobot > 1000)
                        ? `${(encodingTimeRobot / 1000).toFixed(2)}s`
                        : `${encodingTimeRobot}ms`

                    // Create Format in Database
                    this.createFormat({
                        ["id"]: formatID,
                        ["clipId"]: videoID,
                        ["encodingTime"]: encodingTimeRobot,
                        ["container"]: encoding.formatContainer,
                        ["videoCodec"]: encoding.videoCodec,
                        ["videoFramerate"]: videoFPS,
                        ["videoBitrate"]: videoBitrate,
                        ["videoWidth"]: videoWidth,
                        ["videoHeight"]: videoHeight,
                        ["audioCodec"]: encoding.audioCodec,
                        ["audioBitrate"]: encoding.audioBitrate,
                    })
                    Froppy.info(this.callSign,
                        "FORMAT > Encoded Format" +
                        ` | T: ${encodingTimeHuman}` +
                        ` | V:${videoWidth}x${videoHeight}@${videoBitrate}-${encoding.videoCodec}` +
                        ` | A:${encoding.audioBitrate}-${encoding.audioCodec}`
                    )
                    resolve(true)
                }
            )
        })
            .then(wasEncoded => wasEncoded && formatsFinished++)
            .catch(error => {
                Froppy.error(this.callSign, "FORMAT > Cannot Encode Format", { error })
                formatsErrored++
            })

        // Video is unusable if:
        // - No New Formats were encoded
        // - There are no existing formats
        // - There were errors while encoding  
        if (formatsFinished === 0 && formatsErrored > 0 && someVideo.formats.length === 0)
            return this.finishWork(
                Action.VideoUnusable,
                Froppy.warn(this.callSign, "VIDEO > Failed to Initialize")
            )

        // [7A] Fire Webhooks if:
        // - No existing formats
        // - Encoded a new a new format
        // - Server has at least one webhook
        if (Array.isArray(someVideo.server.webhooks) && someVideo.formats.length === 0 && formatsFinished > 0)
            someVideo.server.webhooks.forEach(async (someWebhook, index) => {

                // [7B] Validate Webhook
                const [webhook, parsingErrors]: [WebhookJSON, ErrorMessage[]] = validateWebhookJSON(someWebhook)
                if (parsingErrors.length !== 0)
                    return Froppy.warn(this.callSign, `WEBHOOK[${index}] > Validation Error`, { errors: parsingErrors })

                // [7C] Send Request
                if ((webhook.category !== 0n) && (someVideo.categoryId !== webhook.category)) return
                const [message, postError] = await Safe.call(
                    axios<ResponsePostWebhook>({
                        method: "POST",
                        url: Discord.createWebhookURL(webhook.channel, webhook.token, true),
                        data: {
                            username: "clips.robobot.dev",
                            avatar_url: "https://cdn.robobot.dev/.static/discord-avatar.png",
                            content:
                                `A new video has been uploaded by **${someVideo.user.alias}**!\n` +
                                `https://clips.robobot.dev/clips/${someVideo.id}`
                        }
                    })
                )
                if (postError) return Froppy.warn(this.callSign, `WEBHOOK[${index}] > Request Error`, { error: postError })

                // [7AD] Announce Post
                Froppy.info(this.callSign, `WEBHOOK[${index}] > Sent Message! (ID:${message.data?.id || "?"})`)
                return
            })

        // [8] Mark Video as Available
        this.finishWork(
            Action.VideoReady,
            Froppy.info(this.callSign, "QUEUE > Finished Video! Finalizing...")
        )
    }
}