import { envProd, serviceHost } from "..";
import ExpressLogger from "../shared/middleware/ExpressLogger";
import ExpressProxy from "../shared/middleware/ExpressProxy";
import Froppy from "../shared/util/Froppy";
import Reply from "../shared/web/Reply";
import { HttpStatusCode } from "axios";
import express from "express";
import cors from "cors";

export const Webserver = express()
    .disable("x-powered-by")
    .disable("query parser")
    .disable("etag")
    .use(
        ExpressProxy(),
        ExpressLogger,
        cors({ origin: envProd ? "http://localhost" : process.env.WEB_CORS_ORIGIN })
    )

import "./routes/auth/login/GET.debug";
import "./routes/auth/login/GET.route";
import "./routes/auth/logout/GET.route";
import "./routes/clips/[clipid]/hearts/DELETE.route";
import "./routes/clips/[clipid]/hearts/GET.route";
import "./routes/clips/[clipid]/hearts/PUT.route";
import "./routes/clips/[clipid]/views/PUT.route";
import "./routes/clips/[clipid]/DELETE.route";
import "./routes/clips/[clipid]/GET.route";
import "./routes/clips/[clipid]/PATCH.route";
import "./routes/server/[serverid]/GET.route";
import "./routes/server/[serverid]/PATCH.route";
import "./routes/server/[serverid]/categories/DELETE.route";
import "./routes/server/[serverid]/categories/PATCH.route";
import "./routes/server/[serverid]/categories/POST.route";
import "./routes/server/[serverid]/clips/GET.route";
import "./routes/server/[serverid]/clips/POST.route";
import "./routes/servers/GET.route";
import "./routes/users/[userid]/notifications/GET.route";
import "./routes/users/[userid]/notifications/PUT.route";
import "./routes/users/[userid]/GET.route";

Webserver
    .use("*", (_, res) => Reply.withApiError(res, HttpStatusCode.NotFound))
    .listen(3000, serviceHost, () => Froppy.info("EXPRESS", `Listening: ${serviceHost}:3000`))