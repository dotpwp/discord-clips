import { Request, Response, NextFunction, RequestHandler } from "express"
import { PermissionsCache } from "../middleware/Fetch"
import { TokenData } from "../modules/Crypto"

export type ParameterNames =
    "format_id" |
    "category_id" |
    "server_id" |
    "clip_id" |
    "user_id"

export interface ERequest extends Request {
    params: {
        format: string
        category_id: string
        format_id: string
        server_id: string
        clip_id: string
        user_id: string | "@me"
    }
}
export interface EResponse extends Response {
    locals: {
        ip: string
        canModifyServer: boolean
        permissions: PermissionsCache
        token: TokenData | false
        format_id: bigint
        category_id: bigint
        server_id: bigint
        clip_id: bigint
        user_id: bigint
    }
}

export interface Next extends NextFunction { }
export interface Handler extends RequestHandler { }