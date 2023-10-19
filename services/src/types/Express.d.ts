import { Request, Response } from "express";
import { TokenData } from "./Token";

export type ParameterNames = "categoryid" | "serverid" | "clipid" | "userid"
export interface ERequest<Body = {}> extends Request {
    body: Body
    params: {
        categoryid: string
        serverid: string
        clipid: string
        userid: string
    }
}

export interface EResponse extends Response {
    locals: {
        /** From ExpressProxy.ts */
        ip: string
        /** From Validate.decodeToken */
        token: TokenData
        /** From Validate.expressParams */
        categoryid: bigint
        /** From Validate.expressParams */
        serverid: bigint
        /** From Validate.expressParams */
        clipid: bigint
        /** From Validate.expressParams */
        userid: bigint
    }
}