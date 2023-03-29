import { RequestHandler } from "express";
import { Logger } from "../core/Logger";


const PROXY_MODE = process.env.PROXY_MODE
export default function RestoreProxyIP(): RequestHandler {
    switch (PROXY_MODE) {

        // Retrieve IP Adress from Cloudflares CF-Connection-IP Header
        case "cloudflare":
            Logger.debug("PROXY", "Using Cloudflare as proxy")
            return (req, res, next) => {
                req.ip = req.header("CF-Connecting-IP") || req.ip
                next()
            }

        // Retrieve IP Adress from NGINXs X-Forwarded-For Header
        case "nginx":
            Logger.debug("PROXY", "Using NGINX as proxy")
            return (req, res, next) => {
                req.ip = req.header("X-Forwarded-For") || req.ip
                next()
            }

        // Trusting Connecting IP
        default:
            Logger.debug("PROXY", "Proxy Disabled")
            return (req, res, next) => next()
    }
}