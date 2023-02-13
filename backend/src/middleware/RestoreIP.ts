import { RequestHandler } from "express"
import { Log } from "../modules/Log"

export default function (): RequestHandler {
    switch (process.env.PROXY_MODE) {

        // Trust Cloudflare's 'CF-Connecting-IP' Header
        case "cloudflare":
            Log.info("PROXY", "Restoring IP via 'CF-Connecting-IP' header")
            return (req, res, next) => {
                res.locals.ip = req.header("CF-Connecting-IP") || req.ip
                next()
            }

        // Trust NGINX's 'X-Forwarded-For' Header
        case "nginx":
            Log.info("PROXY", "Restoring IP via 'X-Forwarded-For' header")
            return (req, res, next) => {
                res.locals.ip = req.header("X-Forwarded-For") || req.ip
                next()
            }

        // Trust Connecting IP Address
        default:
            Log.info("PROXY", "Accepting connecting IP as original IP")
            return (req, res, next) => {
                res.locals.ip = req.ip
                next()
            }
    }
}