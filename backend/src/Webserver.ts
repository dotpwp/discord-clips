import * as express from "express"
import { Log } from "./modules/Log"

import cors = require("cors")
import RestoreIP from "./middleware/RestoreIP"
import LogRequest from "./middleware/LogRequest"
import Respond from "./modules/Respond"

export const Webserver = express()
    .disable("x-powered-by")
    .disable("etag")
    .use(
        RestoreIP(),
        LogRequest,
        cors({
            origin: (process.env.NODE_ENV === "development")
                ? "http://localhost"
                : "https://clips.robobot.dev"
        })
    )

import "./routes/auth"
import "./routes/servers"
import "./routes/content"
import "./routes/servers|:server_id"
import "./routes/servers|:server_id|categories"
import "./routes/servers|:server_id|clips"
import "./routes/servers|:server_id|clips|:clip_id|hearts"
import "./routes/servers|:server_id|clips|:clip_id"
import "./routes/users|:user_id"

Webserver
    .use("*", (_, res) => Respond.withNotFound(res))
    .listen(3000, () => Log.info("HTTP", "Listening :3000"))
