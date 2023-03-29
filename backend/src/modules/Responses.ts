import { StatusCode } from "../typings/StatusCode"
import { Logger } from "../core/Logger"
import { Response } from "express"

class Responses {

    // Quick Response
    public badRequest = (res: Response, msg = "Bad Request") => {
        this.message(res, StatusCode.BAD_REQUEST, msg)
    }
    public unauthorized = (res: Response) => this.message(res, StatusCode.UNAUTHORIZED, "Unauthorized")

    // Custom Messages
    public message(res: Response, status: StatusCode, message: string) {
        return res.status(status).json({ status, message: `${status}: ${message}` })
    }

    public async abort(res: Response, engineerMessage: string, error: any) {
        const eventId = await Logger.error("API", engineerMessage, { error })
        return this.message(res, StatusCode.INTERNAL_SERVER_ERROR, `Internal Server Error, reference id: ${eventId}`)
    }
}

export default new Responses()