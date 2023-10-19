import { Request, Response, NextFunction, RequestHandler } from "express";
import Froppy from "../util/Froppy";

/**
 * [MIDDLEWARE]
 * Global Middleware that restores IP Address when running webserver being a proxy.
 * New Value becomes available at "res.locals.ip"
 * @returns Middleware
 */
export default function (): RequestHandler {
    const MODE = process.env.WEB_PROXY_MODE?.toLowerCase()
    switch (MODE) {

        // Trust NGINX's "X-Forwarded-For" Header
        case "nginx":
            Froppy.info("PROXY", `Using NGINX header of "X-Forwarded-For"`)
            return function (req: Request, res: Response, next: NextFunction) {
                res.locals.ip = req.header("CF-Connecting-IP") || req.ip
                next()
            }

        // Trust Cloudflare's "CF-Connecting-IP" Header
        case "cloudflare":
            Froppy.info("PROXY", `Using Cloudflare header of "CF-Connecting-IP"`)
            return function (req: Request, res: Response, next: NextFunction) {
                res.locals.ip = req.header("X-Forwarded-For") || req.ip
                next()
            }

        default:
            // Notify user if they meant something else
            if (MODE !== "none") Froppy.warn(
                "PROXY", `Did you mean to set PROXY_MODE to "nginx", "cloudflare" or "none"?`
            )

            // Trust Connecting IP Address
            return function (req: Request, res: Response, next: NextFunction) {
                res.locals.ip = req.ip
                next()
            }
    }
}