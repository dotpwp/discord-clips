import { ERequest, EResponse } from "../../../../types/Express";
import { Webserver } from "../../..";
import Validate from "../../../../shared/web/Validate";
import Discord from "../../../../types/Discord";
import Reply from "../../../../shared/web/Reply";
import Safe from "../../../../shared/util/Safe";
import HTML from "../../../../shared/web/HTML";
import { stringify } from "querystring";
import axios from "axios";

const
    DISCORD_OAUTH_CLIENT_ID = process.env.DISCORD_OAUTH_CLIENT_ID as string,
    DISCORD_OAUTH_SECRET = process.env.DISCORD_OAUTH_SECRET as string

Webserver.get(
    "/api/auth/logout",
    Validate.userToken,
    Validate.userIsLoggedIn,
    async (req: ERequest, res: EResponse) => {

        // [1] Revoke Discord Token
        const [_, fetchError] = await Safe.call(
            axios<Discord.AccessRevoked>({
                method: "POST",
                url: "https://discord.com/api/oauth2/token/revoke",
                headers: {
                    ["Content-Type"]: "application/x-www-form-urlencoded"
                },
                data: stringify({
                    ["client_id"]: DISCORD_OAUTH_CLIENT_ID,
                    ["client_secret"]: DISCORD_OAUTH_SECRET,
                    ["token"]: res.locals.token.accessToken
                }),
            })
        )
        if (fetchError)
            return Reply.withServerError(res, fetchError)

        // [2] Send Redirect to Client
        res
            .cookie("activeToken", "", { maxAge: 0 })
            .send(HTML.notification("Logged out successfully!"))
    }
)