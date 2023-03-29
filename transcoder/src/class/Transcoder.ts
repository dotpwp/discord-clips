import { FFProbeResults } from "../typings/ProbeResults";
import { Events, prisma } from "../core/Database";
import { Status } from "../../../prisma-client";
import ffmpegPath from "ffmpeg-static";
import * as cp from "child_process";
import { File } from "multiparty";

import sharp from "sharp";
import * as fs from "fs";

interface QueueItem {
    id: bigint,
    data: {
        media: File;
        results: FFProbeResults
    }
}

type Float = number
interface FFMPEGProgress {
    frame: number;
    fps: Float,
    bitrate: Float;
    total_size: number;
    out_time_us: number;
    out_time_ms: number;
    out_time: '00:00:30.000000';
    dup_frames: number;
    drop_frames: number;
    speed: Float;
    progress: "continue" | "end";
    [key: string]: string | number;
}


export class Transcoder {
    private working = false
    private workerCount = 0n
    private currentVideo = 0n
    private transcoderId = 0n
    private videoIdQueue: QueueItem[] = []
    private process: cp.ChildProcess | null = null
    private probeInfo: FFProbeResults | null = null

    constructor(id: number, workerCount: number) {
        this.workerCount = BigInt(workerCount)
        this.transcoderId = BigInt(id)
    }

    private log(...args: any[]) {
        console.log(`[${new Date().toTimeString().slice(0, 8)}][${this.transcoderId}]`, ...args)
    }

    private async workError(videoId: bigint, message: string, logs: string) {

        // Video Failed To Process
        this.log(videoId, message, "\n", logs)
        // await prisma.video.update({
        //     where: { videoId },
        //     data: {
        //         encodeStatus: Status.ERRORED,
        //         encodeText: message,
        //     }
        // })

        // Next Video
        // this.startWork()
    }

    // Start working on queue
    public async startWork() {
        this.working = true

        // Find Work from Database
        if (this.videoIdQueue.length === 0) {
            this.log("Searching for work")

            const videoList = await prisma.video.findMany({
                select: { videoId: true, encodeInfo: true },
                where: { encodeStatus: Status.QUEUED },
                orderBy: { created: "asc" },
                take: 100
            })

            // Add videos to processing queue
            this.videoIdQueue.push(...videoList
                .filter(v => (v.videoId % this.workerCount === this.transcoderId))
                .map(v => {
                    return {
                        id: v.videoId,
                        data: JSON.parse(v.encodeInfo || "{}")
                    }
                }) as QueueItem[]
            )

            this.log(`Added ${this.videoIdQueue.length} item(s) to the queue`)
        }

        // Start working on video
        const item = this.videoIdQueue.pop()
        if (!item) return this.log("Nothing in queue, sleeping")
        this.log(`Working on Video Id: ${item.id}`)

        // Transcode Video
        let ffmpegLog = ""
        const { media, results } = item.data
        const mediaDuration = parseFloat(results.format.duration)
        const ffmpegProcess = cp.spawn(ffmpegPath || "", [
            "-sn", "-y",
            "-nostats",
            "-hide_banner",
            "-loglevel", "error",
            "-progress", "pipe:2",
            "-analyzeduration", "0",
            // Create Screenshots
            "-i", item.data.media.path,
            "-filter:v", "fps=1/1,scale=128:-1",
            "-f", "image2pipe",
            "pipe:1",
            // Encode Video Track
            "-i", item.data.media.path,
            "-map", "0:v:0",
            "-c:v", "h264_nvenc",
            "-b:v", "6000K",
            "-preset", "slow",
            "-pix_fmt", "yuv420p",
            "-filter:v", "scale=-1:1080",
            // Encode Audio Track
            "-map", "0:a:0",
            "-c:a", "aac",
            "-b:a", "160K",
            // Output File
            `./tmp/${item.id}.mp4`
        ])

        // Screenshot Output (stdout)
        let captureCount = 0
        let sharpProcess: sharp.Sharp
        let latestThumb: Buffer | null

        ffmpegProcess.stdio[1].on("data", (d: Buffer) => {

            if (d[0] === 255 && d[1] === 216 && d[2] === 255) {
                // This is a new JPEG image

                // if (sharpProcess) sharpProcess
                //     .resize(undefined, 128, { background: "#000000" })
                //     .jpeg({ quality: 30, progressive: true })
                //     .toFile(`./tmp/${captureCount++}.jpg`)

                // Create new Sharp
                // sharpProcess = sharp()
                // sharpProcess.write(d)

            } else {
                // Add to existing Image
            }
        })

        // Progress Output
        ffmpegProcess.stdio[2].on("data", (d: Buffer) => {
            const m = d.toString()
            if (m.startsWith("frame=")) {
                // @ts-ignore - Parse Key=Value Message
                const p: FFMPEGProgress = {}
                d.toString().trimEnd().split("\n").forEach(kv => {
                    const [key, value] = kv.split("=", 2)
                    const floatValue = parseFloat(value.trim())
                    p[key.trim()] = isNaN(floatValue) ? value : floatValue
                })

                // Broadcast Video Progress
                Events.publish(
                    `progress:${this.currentVideo}:update`,
                    `${p.progress}:${p.out_time_us / 1e+6 / mediaDuration * 100 | 0}`
                )
                // Broadcast Latest Thumbnail
                if (latestThumb) {
                    Events.publish(`progress:${this.currentVideo}:thumb`, latestThumb)
                    latestThumb = null
                }

                // Store FFMPEG Log
            } else ffmpegLog += m
        })

        // Process Output
        ffmpegProcess.stdio[2].on("data", (d: Buffer) => {
            ffmpegLog += d.toString()
        })

        ffmpegProcess.on("close", async (code) => {
            // FFMPEG Encounter An Error
            if (code !== 0) return this.workError(item.id, "Processing Error", ffmpegLog)
            this.log("Finished Work")

            // Probe File for Information
            // prisma.$transaction([
            //     // Video has been processed
            //     prisma.video.update({
            //         where: { videoId: item.id },
            //         select: { videoId: true },
            //         data: {
            //             encodeStatus: Status.PROCESSED,
            //             encodeInfo: null,
            //             encodeText: null,
            //         }
            //     }),
            //     // Upload Format to Database
            //     prisma.format.create({
            //         select: { formatId: true },
            //         data: {
            //             videoId: item.id,
            //             // Video
            //             videoBitrate: 0,
            //             videoCodec: VideoCodec.X264,
            //             videoHeight: 0,
            //             videoWidth: 0,
            //             // Audio
            //             audioBitrate: 0,
            //             audioCodec: AudioCodec.AAC,
            //         }
            //     })
            // ])


            // Process Complete
            Events.publish(`video: events: ${item.id.toString()}`, "done")
            // this.startWork()
        })

    }

}