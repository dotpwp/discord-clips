import { HttpStatusCode } from "axios"
import { Response } from "express"
import { Log } from "./Log"

class Respond {

    // Respond with a 404 Page Not Found Error
    public withNotFound(res: Response, message = "Endpoint Not Found"): void {
        res
            .status(HttpStatusCode.NotFound)
            .json({
                status: HttpStatusCode.NotFound,
                message
            })
    }

    // Respond with a 500 Internal Server Error
    public withServerError(res: Response, error: any): void {
        Log.error("HTTP", `Error occurred at '${res.req.method}@${res.req.originalUrl}'`, error)

        // Respond with 500 Internal Server Error
        res
            .status(HttpStatusCode.InternalServerError)
            .json({
                status: HttpStatusCode.InternalServerError,
                message: "Internal Server Error"
            })
    }

    // Respond with a 401 Unauthorized Error
    public withUnauthorized(res: Response): void {
        res
            .status(HttpStatusCode.Unauthorized)
            .json({
                status: HttpStatusCode.Unauthorized,
                message: "Unauthorized"
            })
    }

    public withBadRequest(res: Response, reason: string) {
        res
            .status(HttpStatusCode.BadRequest)
            .json({
                status: HttpStatusCode.BadRequest,
                message: reason
            })
    }

    public withMethodNotAllowed(res: Response) {
        res
            .status(HttpStatusCode.MethodNotAllowed)
            .json({
                status: HttpStatusCode.MethodNotAllowed,
                message: "Method Not Allowed"
            })
    }

    public withJSON(res: Response, someObject: any) {
        res
            .header("Content-Type", "application/json")
            .end(
                JSON.stringify(
                    someObject,
                    (_, v) => typeof (v) === "bigint" ? v.toString() : v
                )
            )
    }

}

export default new Respond()