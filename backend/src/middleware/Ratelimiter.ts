import { RequestHandler, Request, Response, NextFunction } from "express";
import { Limiter } from "../core/Database";
import { Logger } from "../core/Logger";
import Responses from "../modules/Responses";
import { StatusCode } from "../typings/StatusCode";

const InProd = (process.env.NODE_ENV === "production")

interface RatelimiterOptions {
    prefix?: string;
    ttl: number;
    limit: number;
    keygen?: (req: Request) => string;
}

export default function RateLimiter(options: RatelimiterOptions): RequestHandler {
    return function (req: Request, res: Response, next: NextFunction) {
        if (!InProd) return next()

        // Create Ratelimit Key
        const sessionKey = `rl:${options.prefix || req.route?.path}:${options.keygen ? options.keygen(req) : req.ip}`

        // Increment Rate Limit Key, this will return the quota left
        Limiter.incr(sessionKey)
            .then(async (usage: number) => {
                // Set TTL for New Session
                if (usage === 1) Limiter.expire(sessionKey, options.ttl)

                // Append Ratelimit Headers
                const expiresAt = (await Limiter.expireTime(sessionKey)) || 0
                res.header("X-Rate-Limit-Limit", options.limit.toString())
                res.header("X-Rate-Limit-Reset", expiresAt.toString())
                res.header("X-Rate-Limit-Remaining", (options.limit - usage).toString())

                // Check if quota has been exceeded
                if (usage > options.limit) res
                    .status(StatusCode.TOO_MANY_REQUESTS)
                    .json({
                        status: StatusCode.TOO_MANY_REQUESTS,
                        message: "429: Too Many Requests",
                        retry_after: (expiresAt - (Date.now() / 1000)).toLocaleString(undefined, { "maximumFractionDigits": 2 })
                    })
                else next()

            })
            .catch((error: Error) => {
                // Log This Error
                Logger.error("RATELIMIT", `Increment Error: ${error}`, { error })

                // Bypass Ratelimiting
                res.header("X-Rate-Limit-Limit", "-1")
                res.header("X-Rate-Limit-Reset", "-1")
                res.header("X-Rate-Limit-Remaining", "-1")
                return next()
            })

    }
}