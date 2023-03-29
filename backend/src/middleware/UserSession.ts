import { Request, Response, NextFunction, RequestHandler } from "express";
import Cryptography from "../modules/Cryptography";
import Responses from "../modules/Responses";
import { Redis } from "../core/Database";


const TOKEN_PREPEND = "Bearer "
export default function GetUserSession(sessionRequired = false, bypassRevokedonError = false): RequestHandler {
    return async function (req: Request, res: Response, next: NextFunction) {

        // Retrieve token string
        let givenToken = req.header("Authorization")
        if (!givenToken) {
            if (sessionRequired) return Responses.unauthorized(res)
            return next()
        }

        // Validate Token Start
        if (!givenToken.startsWith(TOKEN_PREPEND)) {
            if (sessionRequired) return Responses.unauthorized(res)
            return next()
        }
        const slicedToken = givenToken.slice(TOKEN_PREPEND.length)

        // Ensure Token isn't invalidated
        Redis.sIsMember("tokens:revoked", slicedToken)
            .then(wasRevoked => {

                // Given Token was revoked!
                if (wasRevoked) {
                    if (sessionRequired) return Responses.unauthorized(res)
                    return next()
                }

                // Validate given token
                const [isValid, token] = Cryptography.validateToken(slicedToken)
                if (!isValid) {
                    if (sessionRequired) return Responses.unauthorized(res)
                    return next()
                }

                // Store Session
                res.locals.userId = BigInt(token.userId)
                res.locals.tokenTimestamp = token.timestamp
                next()
            })
            // Continue as normal if allowed
            .catch(_ => !bypassRevokedonError
                ? Responses.unauthorized(res)
                : next()
            )

    }
}