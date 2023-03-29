import { Logger } from "./Logger";
import express from "express";
// Middleware
import ApiErrorCatcher from "../middleware/ErrorCatcher";
import ExpressLogger from "../middleware/ExpressLogger";
import bodyValidator from "../middleware/BodyValidator";
import Ratelimiter from "../middleware/Ratelimiter";
import UserSession from "../middleware/UserSession";
import bodyParser from "../middleware/BodyParser";
import restoreIP from "../middleware/RestoreIP";
// Routes
import { Route_LoginUser, BV_LoginUser } from "../routes/auth/Login";
import { Route_ClipsUpload, BV_ClipsUpload } from "../routes/clips/Upload";
import { Route_CreateAccount, BV_CreateAccount } from "../routes/auth/Signup";
import { StatusCode } from "../typings/StatusCode";
import Responses from "../modules/Responses";

express()
    .set("x-powered-by", false)
    .set("etag", false)
    .use(restoreIP())
    .use(ExpressLogger)

    .post(
        ["/api/auth/login", "/auth/login"],
        bodyParser.json(),
        bodyValidator(BV_LoginUser),
        Ratelimiter({ ttl: 3600, limit: 60 }),
        Ratelimiter({ ttl: 300, limit: 5, keygen: req => `${req.body?.account}:${req.ip}` }),
        Route_LoginUser
    )
    .post(
        ["/api/auth/signup", "/auth/signup"],
        bodyParser.json(),
        bodyValidator(BV_CreateAccount),
        Ratelimiter({ ttl: 3600, limit: 5 }),
        Route_CreateAccount
    )
    .post(
        ["/api/clips/create", "/clips/create"],
        UserSession(true, false),
        bodyParser.form({ media: "FILE", title: "TEXT", description: "TEXT" }),
        bodyValidator(BV_ClipsUpload),
        Ratelimiter({ ttl: 3600, limit: 5 }),
        Route_ClipsUpload,
    )

    .use("*", (_, res) => Responses.message(res, StatusCode.NOT_FOUND, "Endpoint Not Found"))
    .use(ApiErrorCatcher)
    .listen(8080, () => Logger.debug("EXPRESS", "Server Started: 8080"))