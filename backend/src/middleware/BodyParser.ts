import { Request, Response, NextFunction, RequestHandler } from "express";
import { JSONParserOptions, FormParserOptions } from "../typings/BodyParser";
import { StatusCode } from "../typings/StatusCode"
import multiparty, { File } from "multiparty";
import Responses from "../modules/Responses";
import { Logger } from "../core/Logger";
import { mkdir } from "fs";
import { join } from "path";


// Determine Temporary File Folder
if (!process.env.TEMP_FILE_DIR) Logger.warn(
    "BODYPARSER", "Environment variable 'TEMP_FILE_DIR' is not set. Using /tmp Directory in CWD."
)
const TEMP_FILE_DIR = !process.env.TEMP_FILE_DIR
    ? join(process.cwd(), "tmp")
    : process.env.TEMP_FILE_DIR;

// Create Temporary Directory
mkdir(TEMP_FILE_DIR, err => !err
    ? Logger.debug("BODYPARSER", "Created Temp Directory")
    : undefined
)

class BodyParser {

    private defaultJSONParserOptions = {
        limit: 8 * 1000,  // 8KB
        timeout: 30000,
    }

    json(opts = {} as JSONParserOptions): RequestHandler {
        const options = Object.assign(this.defaultJSONParserOptions, opts)
        return function (req: Request, res: Response, next: NextFunction) {

            // Ensure Content-Type Header is Given
            const contentType = req.header("Content-Type")
            if (!contentType) return Responses.badRequest(res,
                "Content-Type Header is Required"
            )

            // Ensure Content is in JSON
            if (contentType !== "application/json") return Responses.message(res,
                StatusCode.UNSUPPORTED_MEDIA_TYPE,
                `Unsupported Content-Type`
            )

            // Ensure Content-Length header is present
            const rawContentLength = req.header("Content-Length")
            if (!rawContentLength) return Responses.message(res,
                StatusCode.LENGTH_REQUIRED,
                "Content-Length Header Required"
            )

            // Validate Content-Length Header
            const contentLength = parseInt(rawContentLength)
            if (isNaN(contentLength)) return Responses.message(res,
                StatusCode.LENGTH_REQUIRED,
                "Content-Length Header Invalid"
            )
            if (contentLength > options.limit) return Responses.message(res,
                StatusCode.PAYLOAD_TOO_LARGE,
                `Payload too Large, maximum allowed body size is '${options.limit}' bytes`
            )

            // Allocate Buffer for Request Body
            const bodyBuffer = Buffer.alloc(contentLength)
            req.on("data", chunk => bodyBuffer.write(chunk?.toString()))
            req.once("close", () => {
                // Clear timeout as body has been collected
                if (res.headersSent) return
                clearTimeout(collectTimeout)

                // Parse Request Body
                try {
                    // Body Parsed, continue request
                    req.body = JSON.parse(bodyBuffer.toString())
                    if (!res.headersSent) next()

                } catch (error: any) {
                    // Unable to Parse Body, return Error
                    Logger.error("BODYPARSER", "Unable to Parse Body", { error })
                    Responses.message(res,
                        StatusCode.UNPROCESSABLE_ENTITY,
                        "422: Unprocessable Entity"
                    )
                }
            })

            // Collection Timed Out, close request
            const collectTimeout = setTimeout(() => Responses.message(res,
                StatusCode.REQUEST_TIMEOUT,
                "Request Timeout"
            ), options.timeout)

        }
    }


    public form(options: FormParserOptions): RequestHandler {
        const MAX_FIELDS: number = Object.values(options).length
        const MAX_FILE_SIZE = 1000000000    // 8KB
        const MAX_FIELD_SIZE = 8000         // 1GB

        return function (req: Request, res: Response, next: NextFunction) {

            const form = new multiparty.Form({
                "autoFiles": false,
                "autoFields": false,
                "maxFilesSize": MAX_FILE_SIZE,
                "maxFieldsSize": MAX_FIELD_SIZE,
                "maxFields": MAX_FIELDS,
                "uploadDir": TEMP_FILE_DIR,
            })

            form.parse(req, (
                error: Error,
                fields: { [key: string]: string[] },
                files: { [key: string]: File[] }
            ) => {
                if (!error) {
                    // Add Field(s) to Body
                    req.body = {}
                    Object.keys(fields).forEach(key => {
                        const value = fields[key][0]
                        if (value) req.body[key] = value
                    })

                    // Add File(s) to Body
                    Object.keys(files).forEach(key => {
                        const value = files[key][0]
                        if (value) req.body[key] = value
                    })

                    // Continue Request
                    next()
                }
                // Error while parsing Form Data
                else {
                    switch (error.message) {

                        // Missing Content-Type Header
                        case "missing content-type header":
                            return Responses.message(
                                res, StatusCode.BAD_REQUEST,
                                "Content-Type Header is Required"
                            )

                        // Content-Type does not match
                        case "unsupported content-type":
                            return Responses.message(res,
                                StatusCode.UNSUPPORTED_MEDIA_TYPE,
                                "Usupported Content-Type"
                            )

                        // Content-Type Header is missing boundary
                        case "content-type missing boundary":
                            return Responses.badRequest(res,
                                "Content-Type missing boundary"
                            )

                        // File(s) are too large
                        case "maximum file length exceeded":
                            return Responses.message(
                                res, StatusCode.PAYLOAD_TOO_LARGE,
                                `Payload too Large, maximum allowed size for files is '${MAX_FILE_SIZE}' bytes`
                            )

                        // Field(s) are too large
                        case `maxFieldsSize ${1} exceeded`:
                            return Responses.message(
                                res, StatusCode.PAYLOAD_TOO_LARGE,
                                `413: Payload too Large, maximum allowed size for fields is '${MAX_FIELD_SIZE}' bytes`
                            )

                        // More fields than required were given
                        case `maxFields ${MAX_FIELDS} exceeded.`:
                            return Responses.badRequest(res,
                                "Too many fields given"
                            )

                        // Internal Error has occurred
                        default:
                            return Responses.abort(
                                res, "Form Parse Failed", error
                            )
                    }
                }
            })
        }
    }

}

export default new BodyParser()