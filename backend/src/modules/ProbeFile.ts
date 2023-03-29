import { FFProbeResults } from "../typings/ProbeResults";
import ffprobeStatic from "ffprobe-static";
import * as cp from "child_process";


interface FFProbeError {
    errored: boolean;
    reason: string;
    log: string;
}

const SupportedFileExtensions = new Set<string>(["3gp", "mpeg", "mp4", "mov", "webm", "mkv", "flv", "avi"])
const SupportedAudioCodecs = new Set<string>(["mp3", "aac", "wav", "aiff", "wav", "wma", "opus", "ac3", "flac"])

export default async function ProbeFile(absolutePath: string): Promise<[true, FFProbeResults] | [false, FFProbeError]> {
    return new Promise(async (resolve) => {

        // Validate File Extension
        const fileExtension = absolutePath.split(".").pop() || ""
        if (!SupportedFileExtensions.has(fileExtension)) return resolve([false, {
            errored: false,
            reason: "Unsupported File Extension",
            log: ""
        }])

        // Create new FFProbe Process
        const ffprobeProcess = cp.spawn(ffprobeStatic.path, [
            "-loglevel", "error",
            "-print_format", "json",
            "-show_format",
            "-show_streams",
            absolutePath
        ])

        let ffprobeOut = ""
        let ffprobeErr = ""
        ffprobeProcess.stdout.on("data", (d: Buffer) => ffprobeOut += d.toString())
        ffprobeProcess.stderr.on("data", (d: Buffer) => ffprobeErr += d.toString())

        // Error occurred while processing, kill process and error
        ffprobeProcess.stdin.on("error", (error: NodeJS.ErrnoException) => {
            if (!ffprobeProcess.killed) ffprobeProcess.kill()
            resolve([false, { errored: true, log: ffprobeErr, reason: error.message }])
        })

        ffprobeProcess.on("close", async (code) => {
            // FFProbe encountered an error
            if (code !== 0) {
                if (!ffprobeProcess.killed) ffprobeProcess.kill()

                // User Provided Invalid Data
                if (ffprobeErr.endsWith("Invalid data found when processing input\r\n"))
                    return resolve([false, {
                        errored: false,
                        log: ffprobeErr,
                        reason: "Invalid data found when processing input"
                    }])

                // Unknown Error 
                return resolve([false, {
                    errored: true,
                    log: ffprobeErr,
                    reason: `Process exited with exit code ${code}`
                }])
            }
            const contentInfo: FFProbeResults = JSON.parse(ffprobeOut)

            // Validate Media Duration
            const contentDuration = parseInt(contentInfo?.format?.duration || "0")
            if (contentDuration < 5) return resolve([false, {
                errored: false,
                log: ffprobeErr,
                reason: "Media duration cannot be shorter than 5 seconds"
            }])
            if (contentDuration > 120) return resolve([false, {
                errored: false,
                log: ffprobeErr,
                reason: "Media duration must be longer than 120 seconds"
            }])

            // Validate Content is acceptable
            if (contentInfo.streams.find(stream => stream.codec_type === "images")) return resolve([false, {
                errored: false,
                log: ffprobeErr,
                reason: "Invalid Codec Type of Image",
            }])

            // Validate Video Stream is Present
            const videoStream = contentInfo.streams.find(stream => stream.codec_type === "video")
            if (!videoStream) return resolve([false, {
                log: ffprobeErr,
                errored: false,
                reason: "File contains no Video Stream"
            }])

            // Validate Audio Codecs
            const validAudioStreams = contentInfo.streams
                .filter(stream => stream.codec_type === "audio")
                .every(codec => SupportedAudioCodecs.has(codec.codec_name || ""))

            if (!validAudioStreams) return resolve([false, {
                log: ffprobeErr,
                errored: false,
                reason: "Unsupported Audio Codec"
            }])

            return resolve([true, contentInfo])
        })
    })
}