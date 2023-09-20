import { Request, Response, NextFunction } from "express"
import { createWriteStream } from "fs"
import { join } from "path"
import { parse } from "url"
import bytes = require("bytes")

/*
    Converts any given table into a key value pair string
    {"foo":"bar", "baz":"123"} => foo=bar,baz=123

*/
function keyValuePair(someObject: object): string {
    if (!someObject) return ""
    let pairs = ""

    for (const [key, value] of Object.entries(someObject)) {
        switch (typeof (value)) {
            case "number":
            case "bigint":
                return pairs += `,${key}=${value.toString()}`

            case "string":
            case "boolean":
                return pairs += `,${key}=${value}`

            case "symbol":
            case "function":
                return pairs += `,${key}=constructor`

            case "object":
                return pairs += `${key}=${keyValuePair(someObject)}`

            default:
            case "undefined":
                return pairs += `${key}=`
        }
    }

    return pairs
}

/*
    Logs HTTP Requests to log files
    JSON: For Computer Analytics or Tracking
    TEXT: For Human Reading
*/
const LOG_JSON = createWriteStream(join(process.cwd(), "http.json.log"), { flags: "a" })
const LOG_TEXT = createWriteStream(join(process.cwd(), "http.text.log"), { flags: "a" })
const pad = (time: number, maxLength = 2) => time.toString().padStart(maxLength, "0")

export default function (req: Request, res: Response, next: NextFunction) {
    // Retrieve Starting Info
    const bytesSent = req.socket.bytesWritten
    const bytesRead = req.socket.bytesRead
    const startTime = Date.now()
    next()

    // Wait for Request to complete...
    res.once("close", () => {
        const T = new Date()
        const responseTime = (T.getTime() - startTime)
        const requestURL = parse(req.url)

        // Log Output to File & Console
        // 12:30:00.000 GET 200 999ms ~ /users/1234567890123456789 ~ 192.168.255.255 ~ Receive=>(256b) Upload=>(256b)
        const TIMERS = `${pad(T.getHours())}:${pad(T.getMinutes())}:${pad(T.getSeconds())}.${pad(T.getMilliseconds(), 3)}`
        const OUTPUT = `${TIMERS} ${req.method} ${res.statusCode} ${res.locals.ip} (⬇ ${bytes.format(bytesRead)} ⬆ ${bytes.format(bytesSent)} ⏱ ${responseTime.toLocaleString()}ms) ${req.originalUrl}\n`
        process.stdout.write(OUTPUT)
        LOG_TEXT.write(OUTPUT)

        // Log Request to File
        LOG_JSON.write(
            JSON.stringify({
                at: startTime,
                remoteAddress: res.locals.ip,
                responseTime: `${responseTime}ms`,
                responseCode: res.statusCode.toString(),
                requestMethod: req.method,
                requestPath: requestURL.path || "",
                requestQuery: requestURL.query || "",
                bytesRead: bytesRead.toString(),
                bytesSent: bytesSent.toString(),
                requestHeaders: keyValuePair(req.headers),
                responseHeaders: keyValuePair(res.getHeaders()),
                params: keyValuePair(req.params)
            })
            + "\n"
        )

    })
}