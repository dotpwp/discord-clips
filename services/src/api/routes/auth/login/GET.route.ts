import { ERequest, EResponse } from "../../../../types/Express";
import { ServerPermissions } from "../../../../types/Token";
import { FlagsCategories } from "../../../../types/Permission";
import { Database } from "../../../../shared/util/Database";
import { Webserver } from "../../..";
import Discord from "../../../../types/Discord";
import Unique from "../../../../shared/util/Unique";
import Token from "../../../../shared/util/Token";
import Flags from "../../../../shared/util/Flags";
import Reply from "../../../../shared/web/Reply";
import Safe from "../../../../shared/util/Safe";
import HTML from "../../../../shared/web/HTML";
import { stringify } from "qs";
import axios from "axios";

const
    DISCORD_OAUTH_AUTH_URL = process.env.DISCORD_OAUTH_AUTH_URL as string,
    DISCORD_OAUTH_CLIENT_ID = process.env.DISCORD_OAUTH_CLIENT_ID as string,
    DISCORD_OAUTH_REDIRECT = process.env.DISCORD_OAUTH_REDIRECT as string,
    DISCORD_OAUTH_SECRET = process.env.DISCORD_OAUTH_SECRET as string

Webserver.get(
    "/api/auth/login",
    async function (req: ERequest, res: EResponse) {

        // Render Error if user cancelled login
        const query = new URLSearchParams(req.url.slice(req.url.indexOf("?")))
        if (query.get("error")) return res.send(
            HTML.notification(
                query.get("error_description") || "Unknown Error",
                false
            )
        )

        // Redirect User if they require a code
        const code = query.get("code")
        if (!code) return res.redirect(DISCORD_OAUTH_AUTH_URL)

        // [1] Fetch Users Token
        const [respToken, fetchTokenError] = await Safe.call(
            axios<Discord.AccessToken>({
                validateStatus: () => true,
                method: "POST",
                url: "https://discord.com/api/oauth2/token",
                headers: {
                    ["Content-Type"]: "application/x-www-form-urlencoded"
                },
                data: stringify({
                    ["client_id"]: DISCORD_OAUTH_CLIENT_ID,
                    ["client_secret"]: DISCORD_OAUTH_SECRET,
                    ["code"]: code,
                    ["grant_type"]: "authorization_code",
                    ["redirect_uri"]: DISCORD_OAUTH_REDIRECT
                })
            })
        )
        if (fetchTokenError)
            return Reply.withServerError(res, fetchTokenError)

        // @ts-ignore - If user provides an invalid code there will be an error at this field
        const apiErrorMessage = respToken.data.error_description
        if (apiErrorMessage)
            return Reply.withParserError(res, [`code: ${apiErrorMessage}`])

        // [2A] Fetch User Profile
        const accessToken: Discord.AccessToken = respToken.data
        const Authorization = `${accessToken.token_type} ${accessToken.access_token}`;
        const [responseUser, fetchUserError] = await Safe.call(
            axios<Discord.PartialUser>({
                ["method"]: "GET",
                ["url"]: "https://discord.com/api/v9/users/@me",
                ["headers"]: { Authorization }
            })
        )
        if (fetchUserError)
            return Reply.withServerError(res, fetchUserError)

        // [2B] Fetch User Servers
        const discordUser = responseUser.data
        const userAlias = (discordUser.global_name || discordUser.username)
        const userId = BigInt(discordUser.id)

        const [responseServers, fetchServerError] = await Safe.call(
            axios<Discord.PartialGuild[]>({
                ["method"]: "GET",
                ["url"]: "https://discord.com/api/users/@me/guilds",
                ["headers"]: { Authorization }
            })
        )
        if (fetchServerError)
            return Reply.withServerError(res, fetchServerError)

        // [3] Create Transaction
        const [userPermissions, transactionError] = await Safe.call(
            Database.$transaction(async tx => {

                // Permissions are also stored in the token to save a Database Query
                // They can later be recovered with "Validate.userToken()"
                const permissions: ServerPermissions = {}
                responseServers.data.forEach(s => permissions[s.id] = s.permissions)

                // [3A] Cache Servers in Database
                for (const server of responseServers.data) {
                    const serverID = BigInt(server.id)
                    await tx.server.upsert({
                        select: { id: true },
                        where: { id: serverID },
                        update: {
                            // Larger servers have a better chance of staying up to date
                            ["name"]: server.name,
                            ["icon"]: server.icon,
                        },
                        create: {
                            ["id"]: serverID,
                            ["name"]: server.name,
                            ["icon"]: server.icon,
                            ["webhooks"]: [],
                            ["categoryCount"]: 2,
                            ["categories"]: {
                                createMany: {
                                    data: [
                                        {
                                            ["id"]: Unique.generateSnowflake(),
                                            ["name"]: "Clips",
                                            ["icon"]: "clapperboard",
                                            ["flags"]: Flags.merge(FlagsCategories.VIEW_LIST),
                                        },
                                        {
                                            ["id"]: Unique.generateSnowflake(),
                                            ["name"]: "Videos",
                                            ["icon"]: "video",
                                            ["flags"]: Flags.merge(FlagsCategories.VIEW_GRID),
                                        }
                                    ]
                                }
                            }
                        }
                    })
                }

                // [3B] Cache User in Database
                await tx.user.upsert({
                    where: { id: userId },
                    select: { id: true },
                    create: {
                        ["id"]: userId,
                        ["avatar"]: discordUser.avatar,
                        ["alias"]: userAlias,
                        ["uploadCount"]: 0,
                        permissions
                    },
                    update: {
                        ["avatar"]: discordUser.avatar,
                        ["alias"]: userAlias,
                        permissions
                    }
                })

                return permissions
            })
        )
        if (transactionError)
            return Reply.withServerError(res, transactionError)

        // [4] Create New Token for User
        // User Token will expire when Discord Token expires
        const tokenIat = (Date.now() / 1000 | 0)
        res.cookie(
            "activeToken",
            Token.createUserToken({
                ["uid"]: BigInt(discordUser.id),
                ["alias"]: userAlias,
                ["accessToken"]: accessToken.access_token,
                ["avatar"]: discordUser.avatar,
                ["iat"]: tokenIat,
                ["eat"]: (tokenIat + accessToken.expires_in),
                ["permissions"]: userPermissions
            }), {
            ["maxAge"]: (accessToken.expires_in * 1000),
            ["sameSite"]: "strict",
            ["secure"]: true,
            /** Disabled to allow browser to fetch profile from token payload */
            ["httpOnly"]: false,
        })

        // [5] Send Response to User
        res.send(HTML.notification(`Logged in as ${userAlias}!`))
    }
)