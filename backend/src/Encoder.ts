import { EncoderOptions, WorkerSettings } from "./types/Encoder"
import { Database } from "./modules/Database"
import { Log } from "./modules/Log"
import Safely from "./modules/Safely"
import Ffmpeg = require("fluent-ffmpeg")
import { join } from "path"

export const encoderOptions: WorkerSettings
    = JSON.parse(process.env.ENCODER_OPTIONS)

interface ProgressInfo {
    frames: number;         // 505
    currentFps: number;     // 0
    currentKbps: number;    // 5771.7
    targetSize: number;     // 11849
    timemark: string;       // 00:00:16:81
    percent: number;        // 99.95
}

class EncoderProcess {
    public busy = false
    private name: string
    private searchingDebounce = false

    private NO_WORK_AVAILABLE = 0
    private WORK_COMPLETE = 1

    constructor(workerId: number) {
        this.name = `ENCODER#${workerId}`
        this.bootstrapWorker()
    }

    public bootstrapWorker() {
        if (this.busy) return

        if (this.searchingDebounce === false)
            Log.debug(this.name, "Searching for work...")

        this
            .workerEventLoop()
            .then(
                c => this.searchingDebounce = (c === this.NO_WORK_AVAILABLE)
            )
            .catch(async ([formatId, someError]: [bigint?, Error?]) => {
                if (someError) Log
                    .error(this.name, "Error while encoding", someError)

                // Return Format to processing Queue
                if (formatId) Database.format
                    .update({
                        where: { ["id"]: formatId },
                        data: { ["encodingStatus"]: "QUEUED" }
                    })
                    .catch(() => {
                        // stuck in oblivion ig
                    })
            })

            .finally(() => setTimeout(() => this.bootstrapWorker(), 5_000))
    }

    private async workerEventLoop() {
        return new Promise(async (resolve, reject) => {

            // [1] Reserve Work from Database
            const startTime = Date.now()
            const [format, transactionError] = await Safely.call(
                Database.$transaction(async tx => {

                    // [1a] Fetch queued format from database
                    const someFormat = await tx.format.findFirst({
                        where: {
                            ["encodingStatus"]: "QUEUED",
                            ["clip"]: {
                                ["deleted"]: false,
                            },
                        },
                        select: {
                            ["id"]: true
                        }
                    })
                    if (someFormat === null) return null

                    // [1b] Reserve Work in Database
                    const updatedFormat = await tx.format.update({
                        where: {
                            ["id"]: someFormat.id,
                            ["encodingStatus"]: "QUEUED",
                        },
                        data: {
                            ["encodingStatus"]: "PROCESSING"
                        },
                        select: {
                            ["id"]: true,
                            ["videoHeight"]: true,
                            ["videoWidth"]: true,
                            ["codecAudio"]: true,
                            ["codecVideo"]: true,
                            ["framerate"]: true,
                            ["bitrateAudio"]: true,
                            ["bitrateVideo"]: true,
                            ["clip"]: {
                                select: {
                                    ["id"]: true,
                                    ["duration"]: true,
                                    ["encoderOptions"]: true
                                }
                            }
                        }
                    })

                    return updatedFormat
                })
            )
            if (transactionError !== undefined)
                return reject([null, transactionError])

            if (format === null)
                return resolve(this.NO_WORK_AVAILABLE)


            // [2] Encode Video to Desired Format
            const clip = format.clip
            const FOOTER = `(Clip=${clip.id},Format=${format.id})`
            const folderPath = join(process.cwd(), "media", clip.id.toString())
            const options: Partial<EncoderOptions> = format.clip.encoderOptions as any

            // Generate JPEG Thumbnail
            if (!options.hasCustomThumbnail) Ffmpeg()
                .addInput(join(folderPath, "original.video.blob"))
                .screenshot({
                    folder: folderPath,
                    filename: "original.thumbnail.png",
                    size: `${format.videoWidth}x${format.videoHeight}`,
                    timestamps: [
                        options.thumbnailAt
                            ? options.thumbnailAt       // Take Screenshot at designated time
                            : (clip.duration / 2) | 0   // Take Screenshot halfway through video
                    ]
                })

            // Encode Video with FFMPEG
            let totalUpdates = 0
            let totalFrames = 0

            const encoder = Ffmpeg()
                .addInput(join(folderPath, "original.video.blob"))

            if (options.trimStart) encoder
                .addInputOption("-ss", options.trimStart.toString())

            if (options.trimEnd) encoder
                .addInputOption("-to", options.trimEnd.toString())

            encoder
                .videoCodec(encoderOptions.encoders[format.codecVideo])
                .videoBitrate(format.bitrateVideo)

                .setSize(`${format.videoWidth}x${format.videoHeight}`)
                .withOutputFPS(format.framerate)

                .audioCodec(encoderOptions.encoders[format.codecAudio])
                .audioBitrate(format.bitrateAudio)
                .output(join(folderPath, `${format.id}.mp4`))

                // Encoding has begun!
                .on("start", () => Log.info(
                    this.name, `Encoding clip using '${format.codecVideo}' and '${format.codecAudio}' ${FOOTER}`
                ))
                .on("error", (ffmpegError, consoleOutput, consoleError) => {
                    Log.error(
                        this.name, `Error while encoding clip ${FOOTER}`,
                        { ["error"]: ffmpegError, ["stdout"]: consoleOutput, ["stderr"]: consoleError }
                    )
                    reject([format.id, null])
                })

                .on("progress", (progress: ProgressInfo) => {
                    totalFrames += progress.frames
                    totalUpdates++
                })

                .on("end", async () => {

                    const encodingTime = Math.round((Date.now() - startTime) / 1000)
                    const encodingFPS = (totalFrames / (totalUpdates / 2)).toFixed(2)
                    Log.info(this.name, `Took ${encodingTime} seconds to encode at ${encodingFPS}fps ${FOOTER}`)

                    // Update Clip and Format
                    const [_, updateError] = await Safely.call(
                        Database.$transaction([
                            // Mark Clip as now available
                            Database.clip.update({
                                where: { ["id"]: clip.id },
                                data: { ["available"]: true }
                            }),
                            // Mark Format as Complete
                            Database.format.update({
                                where: {
                                    ["id"]: format.id
                                },
                                data: {
                                    ["encodingTime"]: encodingTime,
                                    ["encodingStatus"]: "COMPLETE",
                                }
                            })
                        ])
                    )
                    if (updateError !== undefined)
                        return reject([format.id, transactionError])

                    // Process Complete!
                    resolve(this.WORK_COMPLETE)
                })
                .run()

        })
    }
}


// Start Encoder Process
for (var i = 0; i < encoderOptions.workerCount; i++)
    new EncoderProcess(i)