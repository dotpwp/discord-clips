import { ERequest, EResponse } from "../../../../types/Express";
import { ServerPermissions } from "../../../../types/Token";
import { Database } from "../../../../shared/util/Database";
import { Webserver } from "../../..";
import Discord from "../../../../types/Discord";
import Token from "../../../../shared/util/Token";
import Reply from "../../../../shared/web/Reply";
import Safe from "../../../../shared/util/Safe";
import HTML from "../../../../shared/web/HTML";

const
    exampleServerID = 7119058189328322560n,
    exampleUserID = 7119058189328322561n,
    examplePermissions: ServerPermissions = { [exampleServerID.toString()]: 8 },
    exampleDiscordToken: Discord.AccessToken = {
        ["access_token"]: "6qrZcUqja7812RVdnEKjpzOL4CvHBFG",
        ["refresh_token"]: "D43f5y0ahjqew82jZ4NViEr2YafMKhue",
        ["token_type"]: "Bearer",
        ["expires_in"]: 604800,
        ["scope"]: "identify"
    }

Webserver.get(
    "/api/auth/login-debug",
    async function (req: ERequest, res: EResponse) {

        // [1A] Create Example User
        const [someUser, createUserError] = await Safe.call(
            Database.user.upsert({
                where: { id: exampleUserID },
                update: {},
                create: {
                    ["id"]: exampleUserID,
                    ["avatar"]: null,
                    ["alias"]: "Debug User",
                    ["uploadCount"]: 0,
                    ["permissions"]: examplePermissions
                }
            })
        )
        if (createUserError)
            return Reply.withServerError(res, createUserError)

        // [1B] Create Example Server
        const [_, createServerError] = await Safe.call(
            Database.server.upsert({
                select: { id: true },
                where: { id: exampleServerID },
                update: {},
                create: {
                    ["id"]: exampleServerID,
                    ["name"]: "Debug Server",
                    ["icon"]: null,
                    ["webhooks"]: [],
                },
            })
        )
        if (createServerError)
            return Reply.withServerError(res, createServerError)

        // [2] Create New Login
        const tokenIat = (Date.now() / 1000 | 0)
        const tokenString = Token.createUserToken({
            ["uid"]: exampleUserID,
            ["alias"]: someUser.alias,
            ["accessToken"]: exampleDiscordToken.access_token,
            ["avatar"]: someUser.avatar,
            ["iat"]: tokenIat,
            ["eat"]: (tokenIat + exampleDiscordToken.expires_in),
            ["permissions"]: examplePermissions
        })

        // [3] Send Redirect to User
        res
            .cookie("activeToken", tokenString, {
                ["maxAge"]: (exampleDiscordToken.expires_in * 1000),
                ["sameSite"]: "strict",
                ["httpOnly"]: false,
                ["secure"]: true,
            })
            .send(HTML.notification(`Logged in as ${someUser.alias}!`))
    }
)