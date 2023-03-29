import { Request, Response, NextFunction } from "express";
import { SHOULD_LOG_TO_CONSOLE } from "../core/Logger";
import { createWriteStream } from "fs"
import { prisma } from "../core/Database";
import url from "url";

const logOutput = createWriteStream("./http.log", { flags: "a" })
setInterval(() => entryCounter = 0, 1000)
let entryCounter = 0

export default function (req: Request, res: Response, next: NextFunction) {
    // Retrieve Starting Info
    const bytesSent = req.socket.bytesWritten
    const bytesRead = req.socket.bytesRead
    const startTime = Date.now()
    next()

    // Wait for Request to complete...
    res.once("close", () => {
        const Time = new Date()
        const Head = `${Time.getTime()}-${entryCounter}`
        const latency = (Date.now() - startTime)
        const reqURL = url.parse(req.url)

        // Log to Console
        if (SHOULD_LOG_TO_CONSOLE) console.log(
            `${res.statusCode} ${req.method} ${req.url} ${latency.toLocaleString()}ms ${req.ip}`
        )

        // Create Entry in Database
        const logEntry = JSON.stringify({
            "remoteIp": req.ip,
            "latency": latency,
            "status": res.statusCode,
            "method": req.method,
            "path": reqURL.path || "",
            "query": reqURL.query || "",
            "bytesRead": (req.socket.bytesRead - bytesRead),
            "bytesSent": (req.socket.bytesWritten - bytesSent),
            "requestHeaders": req.headers,
            "responseHeaders": res.getHeaders(),
            "params": req.params
        })

        // Write to Log File
        try {
            logOutput.write(`${Head} - ${logEntry}\n`)
        } catch (err) {
            console.log(err)
        }

    })
}