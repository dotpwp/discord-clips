import { ERequest, EResponse } from "../../types/Express";
import { NextFunction } from "express";

/**
 * [MIDDLEWARE]
 * Takes params from URL and makes them available at "req.body"
 * @param req - Request
 * @param res - Response
 * @param next - Next
 */
export default function (req: ERequest<any>, res: EResponse, next: NextFunction) {
    req.body = {}
    const q = new URLSearchParams(req.url.slice(req.url.indexOf("?")))
    q.forEach((v, k) => req.body[k] = v)
    next()
}