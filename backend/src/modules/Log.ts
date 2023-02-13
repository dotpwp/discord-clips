import { createWriteStream } from "fs"
import { inspect } from "util"

type Severity = "DEBUG" | "ERROR" | "WARN" | "INFO"

class Module_Log {

    private LOG_OUTPUT = createWriteStream("./app.output.log", { flags: "a" })
    private createLogEntry(severity: Severity, source: string, message: string, data?: object) {
        const t = new Date()
        const entryHead = `${t.toTimeString().slice(0, 8)}.${t.getMilliseconds().toString().padStart(3, "0")} ${severity} @ ${source}: ${message}\n`

        process.stdout.write(
            entryHead + (data
                ? inspect(data, false, Infinity, true) + "\n---\n"
                : "")
        )
        this.LOG_OUTPUT.write(
            entryHead + (data
                ? inspect(data, false, Infinity, false) + "\n---\n"
                : "")
        )
    }

    // Public Entry Methods
    public debug(source: string, message: string, data?: object) {
        return this.createLogEntry("DEBUG", source, message, data)
    }
    public error(source: string, message: string, data?: object) {
        return this.createLogEntry("ERROR", source, message, data)
    }
    public warn(source: string, message: string, data?: object) {
        return this.createLogEntry("WARN", source, message, data)
    }
    public info(source: string, message: string, data?: object) {
        return this.createLogEntry("INFO", source, message, data)
    }
}

export const Log = new Module_Log()