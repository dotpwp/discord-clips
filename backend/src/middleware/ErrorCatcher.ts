import { Request, Response, NextFunction } from "express";
import Responses from "../modules/Responses";

export default async function ApiErrorCatcher(error: any, req: Request, res: Response, next: NextFunction) {
    if (error) if (!res.headersSent) Responses.abort(res, "Uncaught Error", error)
};