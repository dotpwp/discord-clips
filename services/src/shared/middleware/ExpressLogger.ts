import { BLU, CYN, GRN, GRY, RED, RST, YEL } from "../other/ConsoleColors";
import { ERequest, EResponse } from "../../types/Express";
import Froppy from "../util/Froppy";
import Unique from "../util/Unique";
import Safe from "../util/Safe";
import { NextFunction } from "express";
import bytes from "bytes";

const
    proxyMode = (process.env.PROXY_MODE || "none"),
    isDisabled = (proxyMode === "cloudflare" || proxyMode === "nginx"),
    fileOutput = (isDisabled ? null : Froppy.createLogStream("http")),
    StatusColors: Record<number, string> = {
        [404]: `${YEL}404${RST}`,
        [400]: `${YEL}400${RST}`,
        [500]: `${RED}500${RST}`,
    },
    MethodColors: Record<string, string> = {
        GET: `${GRN}GET${RST}`,
        POST: `${YEL}POST${RST}`,
        PUT: `${BLU}PUT${RST}`,
        PATCH: `${CYN}PATCH${RST}`,
        DELETE: `${RED}DELETE${RST}`,
        HEAD: `${GRN}HEAD${RST}`,
        OPTIONS: `${GRY}OPTIONS${RST}`,
    }

/**
 * [MIDDLEWARE]
 * Global Middleware that logs http requests.
 * @param req - Request
 * @param res - Response
 * @param next - Next
 */
export default function (req: ERequest, res: EResponse, next: NextFunction) {
    if (isDisabled) return next()
    
    const startTime = new Date()
    const startBytesSent = req.socket.bytesWritten
    next()

    res.once("close", () => {
        const T = new Date()
        const responseTime = (T.getTime() - startTime.getTime())
        const requestID = Unique.generateSnowflake()
        // @ts-ignore 
        // Types break everywhere else if I the appropriate types
        // This is only used here so its not worth fighting it
        const bytesRead = (req.socket.bytesRead - (req.socket.byteCounter || 0))
        const bytesSent = (req.socket.bytesWritten - startBytesSent)

        // @ts-ignore ^^^
        req.socket.byteCounter = req.socket.bytesRead

        // GET 200 127.0.0.1 ⬇ 1.31KB ⬆ 11.61KB ⏱ 37ms /content/thumbnails/123456789/abcdef.jpeg?size=256
        process.stdout.write(
            `${GRY}${requestID} ${T.toTimeString().slice(0, 8)}.${T.getMilliseconds().toString().padStart(3, "0")}${RST} ` +
            (MethodColors[req.method] || req.method) + " " +
            (StatusColors[res.statusCode] || res.statusCode) + " " +
            `${GRY}${res.locals.ip}${RST} ` +
            `${GRN}⬇${RST} ${bytes.format(bytesRead)} ` +
            `${GRN}⬆${RST} ${bytes.format(bytesSent)} ` +
            `${GRN}⏱${RST} ${responseTime.toLocaleString()}ms ` +
            `${req.originalUrl}\n`
        )

        // Write Logs to JSON File
        if (fileOutput) {
            fileOutput.write(Safe.jsonStringify({
                id: requestID,
                at: startTime.getTime(),
                requestURL: req.url,
                remoteAddress: res.locals.ip,
                responseTime: `${responseTime}ms`,
                responseCode: res.statusCode,
                requestMethod: req.method,
                bytesRead: bytesRead,
                bytesSent: bytesSent,
                params: req.params,
                requestHeaders: req.headers,
                responseHeaders: res.getHeaders(),
            }))
            fileOutput.write("\n")
        }
    })
}