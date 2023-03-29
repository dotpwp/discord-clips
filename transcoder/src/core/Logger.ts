import { LogSeverity, LogBody } from "../typings/Logger"
import { createWriteStream } from "fs"
import { inspect } from "util"

export const SHOULD_LOG_TO_CONSOLE = (process.env.NODE_ENV !== "production")
const logOutput = createWriteStream("./general.log", { flags: "a" })
setInterval(() => entryCounter = 0, 1000)
let entryCounter = 0

/*
    Severity:
    This were gonna be enums but I probably wont make a 
    tailer for this logger so its gonna have to be strings

    Service:
    Core Services should be named as is (e.g. CLIENT, PRISMA, MANIFEST)
    Services/Commands should be prefixed with their category (e.g. SERVICE:PLAYINGMUSIC COMMAND:PLAY)

    Message:
    Something you can pass along to the poor engineer to tell him at what step this error occurred
    (e.g. Invoker @ Step 2)

    Body:
    Any additional data that you want to pass along to the engineer.
    (e.g. {
        "guildId": "1234567890",
        "error": {
            "message": "Lorem Ipsum",
            "trace": "Some.Module (13:14)"
            ...
        }
    })
*/

function InternalLoggerFunction(severity: LogSeverity, service: string, message: string, body?: LogBody, logBody = true): Promise<string> {
    return new Promise(async (resolve) => {
        const Time = new Date()
        const Head = `${Time.getTime()}-${entryCounter}`
        const consoleOutput = `[${Time.toTimeString().slice(0, 8)}][${severity}][${service}] ${message}`
        const bodyOutput = logBody && body ? "• " + inspect(body, true, Infinity, true) : ""

        // Log to Console
        if (SHOULD_LOG_TO_CONSOLE) console.log(consoleOutput, bodyOutput)

        // Write to Log File
        try {
            logOutput.write(`${Head} - ${consoleOutput} - ${JSON.stringify(body)}\n`)
            resolve(Head)
        } catch (err) {
            console.log(err)
            resolve("ERROR")
        }

    })
};

/*
    Logging functions for ease of use, 
    it takes care of timestamping, console logging, etc.
*/
export const Logger = {
    raw: InternalLoggerFunction,
    debug: (service: string, message: string, body?: LogBody) => InternalLoggerFunction("DEBUG", service, message, body),
    info: (service: string, message: string, body?: LogBody) => InternalLoggerFunction("INFO", service, message, body),
    warn: (service: string, message: string, body?: LogBody) => InternalLoggerFunction("WARN", service, message, body),
    fatal: (service: string, message: string, body?: LogBody) => InternalLoggerFunction("FATAL", service, message, body),
    error: (service: string, message: string, body?: { [key: string]: LogBody, error: any }) => InternalLoggerFunction("ERROR", service, message, body),
};