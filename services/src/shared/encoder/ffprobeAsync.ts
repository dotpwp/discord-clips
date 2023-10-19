import { ffprobeData } from "../../types/ffmpegAsync";
import { ffprobePath } from "../..";
import Safe from "../util/Safe";
import cp from "child_process";
import { promisify } from "util";

/** ffprobeAsync but as a Promise instead of a callback */
export const ffprobe = promisify(ffprobeAsync)

/** Creates new ffprobe instance with given filepath */
export function ffprobeAsync(filepath: string, callback: (err: string | null, data: ffprobeData) => void) {
    const ffprobeProcess = cp.spawn(ffprobePath, [
        "-v", "error",
        "-print_format", "json",
        "-show_format",
        "-show_streams",
        filepath
    ])

    const processErrors = new Array<string>()
    const processOutput = new Array<string>()

    ffprobeProcess.stdout?.on("data", c => processOutput.push(c))
    ffprobeProcess.stderr?.on("data", c => processErrors.push(c))
    ffprobeProcess.on("exit", code => {
        // Process Error
        if (code !== 0) return callback(processErrors.join(""), {} as ffprobeData)

        // Parse JSON and return
        const parsedJSON = Safe.parseJSON(processOutput.join(""))
        if (parsedJSON === false) return callback(
            `Unusable data returned by ffprobe! ` +
            `STDERR: ${processErrors.join("")} ` +
            `STDOUT; ${processOutput.join("")} `,
            {} as ffprobeData
        )
        callback(null, parsedJSON as ffprobeData)
    })
}