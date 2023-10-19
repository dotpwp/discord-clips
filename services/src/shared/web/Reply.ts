import { ErrorMessage } from "../../types/Validator";
import { HttpStatusCode } from "axios";
import { Response } from "express";
import Froppy from "../util/Froppy";
import Safe from "../util/Safe";

class Reply {
    /**
     * Quick and easy way to write log and notify client of a server error.
     * Clients can use the "support" field when submitting an error or bug report.
     * @param res - Response
     * @param error - Error to Report
     */
    public withServerError(res: Response, error: Error) {
        const entryID = Froppy.error("HTTP", `Error occurred at "${res.req.method}@${res.req.originalUrl}"`, { error })
        res.status(HttpStatusCode.InternalServerError).json({
            status: HttpStatusCode.InternalServerError,
            message: "Internal Server Error",
            support: entryID
        })
    }
    /**
     * Sends an API Error to the client.
     * @param res - Request
     * @param statusCode - Status Code to reply with 
     * @param message - Message to reply with
     * @example 
     * withApiError(res, 400)
     * {
     *  "status": 400,
     *  "message": "Bad Request"
     * }
     */
    public withApiError(res: Response, statusCode: number, message?: string) {
        res.status(statusCode).json({
            status: statusCode,
            message: message || StatusMessages.get(statusCode)
        })
    }
    /**
     * Replys to client with a "400 Bad Request" and an array of messages
     * @param res - Response
     * @param messages - Parser Errors
     * @example 
     * withParserError(res, ["thumb: Invalid or Malformed Image Data"])
     * {
     *   "status": 400,
     *   "message": "Bad Request",
     *   "errors": [
     *       "thumb: Invalid or Malformed Image Data"  
     *   ]
     * }
     */
    public withParserError(res: Response, messages: ErrorMessage[]) {
        res.status(HttpStatusCode.BadRequest).json({
            status: HttpStatusCode.BadRequest,
            message: "Invalid Body",
            errors: messages
        })
    }
    /**
     * 
     * @param res - Response
     * @param message - Unknown Subject
     * @example
     * withUnknown(res, "Unknown Clip")
     * {
      *   "status": 404,
      *   "message": "Unknown Clip",
     * }
     */
    public withUnknown(res: Response, message: `Unknown ${string}`) {
        res.status(HttpStatusCode.NotFound).json({
            status: HttpStatusCode.NotFound,
            message: message,
        })
    }
    /**
     * Stringifies Object into JSON. Responds with 200 OK
     * @param res - Response
     * @param value - Value that can be stringified
     * @example
     * withJSON(res, {foo: "bar", baz: "bear"})
     * 
     * Content-Type: application/json
     * Content-Length: 26
     * {"foo":"bar","baz":"bear"}
     */
    public withJSON(res: Response, value: object | boolean | string | number | bigint) {
        const jsonString = Safe.jsonStringify(value)
        res
            .header("Content-Type", "application/json")
            .header("Content-Length", Buffer.byteLength(jsonString).toString())
            .end(jsonString)
    }
}
export default new Reply()

/**
 * Some Status Messages that I Ripped off the internet :P
 * @author https://www.iana.org/assignments/http-status-codes/http-status-codes.xhtml
 */
const StatusMessages = new Map<number, string>()
    .set(100, "Continue")
    .set(101, "Switching Protocols")
    .set(200, "OK")
    .set(201, "Created")
    .set(202, "Accepted")
    .set(203, "Non-Authoritative Information")
    .set(204, "No Content")
    .set(205, "Reset Content")
    .set(206, "Partial Content")
    .set(300, "Multiple Choices")
    .set(301, "Moved Permanently")
    .set(302, "Found")
    .set(303, "See Other")
    .set(304, "Not Modified")
    .set(305, "Use Proxy")
    .set(307, "Temporary Redirect")
    .set(400, "Bad Request")
    .set(401, "Unauthorized")
    .set(402, "Payment Required")
    .set(403, "Forbidden")
    .set(404, "Not Found")
    .set(405, "Method Not Allowed")
    .set(406, "Not Acceptable")
    .set(407, "Proxy Authentication Required")
    .set(408, "Request Timeout")
    .set(409, "Conflict")
    .set(410, "Gone")
    .set(411, "Length Required")
    .set(412, "Precondition Failed")
    .set(413, "Payload Too Large")
    .set(414, "URI Too Long")
    .set(415, "Unsupported Media Type")
    .set(416, "Range Not Satisfiable")
    .set(417, "Expectation Failed")
    .set(418, "I'm a teapot")
    .set(426, "Upgrade Required")
    .set(500, "Internal Server Error")
    .set(501, "Not Implemented")
    .set(502, "Bad Gateway")
    .set(503, "Service Unavailable")
    .set(504, "Gateway Time-out")
    .set(505, "HTTP Version Not Supported")
    .set(102, "Processing")
    .set(207, "Multi-Status")
    .set(226, "IM Used")
    .set(308, "Permanent Redirect")
    .set(422, "Unprocessable Entity")
    .set(423, "Locked")
    .set(424, "Failed Dependency")
    .set(428, "Precondition Required")
    .set(429, "Too Many Requests")
    .set(431, "Request Header Fields Too Large")
    .set(451, "Unavailable For Legal Reasons")
    .set(506, "Variant Also Negotiates")
    .set(507, "Insufficient Storage")
    .set(511, "Network Authentication Required")