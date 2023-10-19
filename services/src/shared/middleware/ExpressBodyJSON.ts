import { ERequest, EResponse } from "../../types/Express";
import { HttpStatusCode } from "axios";
import { NextFunction } from "express";
import Reply from "../web/Reply";
import bytes from "bytes";

/**
 * [MIDDLEWARE]
 * Parses Request Body and makes it available at "req.body"
 * @param maxBodySize - Maximum Body Size in Bytes
 * @returns Middleware
 */
export default function (maxBodySize = bytes("128KB")) {
    return function (req: ERequest, res: EResponse, next: NextFunction) {
        if (req.header("Content-Type") !== "application/json") return next()

        const contentLength = parseInt(req.header("Content-Length") || "")
        if (isNaN(contentLength) || contentLength < 0)
            return Reply.withApiError(res, HttpStatusCode.BadRequest)
        if (contentLength > maxBodySize)
            return Reply.withApiError(res, HttpStatusCode.PayloadTooLarge)

        // [2] Collect Request Body
        const dataBuffer = Buffer.alloc(contentLength)
        req
            .on("data", (c: Buffer) => dataBuffer.write(c.toString()))
            .once("close", () => {
                try {
                    // [3] Parse JSON Body
                    req.body = JSON.parse(dataBuffer.toString())
                    next()
                } catch (err) {
                    // [3] Bad JSON Body
                    req.body = {}
                    Reply.withApiError(res, HttpStatusCode.UnprocessableEntity)
                }
            })
    }
}