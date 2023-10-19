import { ffmpegArgs } from "./ffmpegArgs";
import { ffmpegPath } from "../..";
import cp from "child_process";
import { promisify } from "util";

/** Promise Version of ffmpegAsync */
export const ffmpeg = promisify(ffmpegAsync)

/** Creates new ffmpeg instance with given arguments */
export function ffmpegAsync(args: ffmpegArgs, callback: (err: string | null) => void) {
    const processErrors = new Array<string>()
    const ffmpegProcess = cp.spawn(ffmpegPath, args.get())

    ffmpegProcess.stderr?.on("data", c => processErrors.push(c))
    ffmpegProcess.on("exit", code =>
        callback(code === 0 ? null : processErrors.join(""))
    )
}