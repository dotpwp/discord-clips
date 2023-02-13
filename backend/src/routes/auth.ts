import { DiscordAccessToken, DiscordUser, DiscordPartialGuild } from "../types/Discord"
import { PermissionsCache } from "../middleware/Fetch"
import { Webserver } from "../Webserver"
import { Database } from "../modules/Database"
import Respond from "../modules/Respond"
import Safely from "../modules/Safely"
import Crypto from "../modules/Crypto"
import * as qs from "querystring"
import axios from "axios"

const
    DISCORD_OAUTH_REDIRECT = process.env.DISCORD_OAUTH_REDIRECT,
    DISCORD_OAUTH_AUTH_URL = process.env.DISCORD_OAUTH_AUTH_URL,
    DISCORD_OAUTH_CLIENT_ID = process.env.DISCORD_OAUTH_CLIENT_ID,
    DISCORD_OAUTH_SECRET = process.env.DISCORD_OAUTH_SECRET

Webserver.get(
    "/api/auth/login",
    async (req, res): Promise<void> => {

        // [1] Redirect user to Discord Sign in page
        const code = Array.isArray(req.query.code)
            ? req.query.code[0] as string
            : req.query.code as string
        if (!code) return res.redirect(DISCORD_OAUTH_AUTH_URL)

        // [2] Get Auth Token from Discord
        let [apiResponse, fetchError] = await Safely.call(
            axios({
                validateStatus: () => true,
                method: "POST",
                url: "https://discord.com/api/oauth2/token",
                headers: {
                    ["Content-Type"]: "application/x-www-form-urlencoded"
                },
                data: qs.stringify({
                    ["client_id"]: DISCORD_OAUTH_CLIENT_ID,
                    ["client_secret"]: DISCORD_OAUTH_SECRET,
                    ["code"]: code,
                    ["grant_type"]: "authorization_code",
                    ["redirect_uri"]: DISCORD_OAUTH_REDIRECT
                }),
            })
        )
        if (fetchError)
            return Respond.withServerError(res, fetchError)

        if (apiResponse.data.error_description === 'Invalid "code" in request.')
            return Respond.withBadRequest(res, "invalid 'code' parameter")

        if (apiResponse.data.error_description)
            return Respond.withServerError(res, apiResponse.data)


        // [3] Fetch User Profile from Discord API
        const accessToken: DiscordAccessToken = apiResponse.data
        const Authorization = `${accessToken.token_type} ${accessToken.access_token}`;
        [apiResponse, fetchError] = await Safely.call(
            axios({
                ["method"]: "GET",
                ["url"]: "https://discord.com/api/v9/users/@me",
                ["headers"]: { Authorization }
            })
        )
        if (fetchError)
            return Respond.withServerError(res, fetchError)


        // [4] Fetch User Servers from Discord API
        const discordUser: DiscordUser = apiResponse.data
        const username = (discordUser.global_name || discordUser.username)
        const discordId = BigInt(discordUser.id);
        [apiResponse, fetchError] = await Safely.call(
            axios({
                ["method"]: "GET",
                ["url"]: "https://discord.com/api/users/@me/guilds",
                ["headers"]: { Authorization }
            })
        )
        if (fetchError)
            return Respond.withServerError(res, fetchError)


        // [5] Cache Servers and Permissions
        const permissions: PermissionsCache = { ["cachedAt"]: Date.now() }
        const userServers: DiscordPartialGuild[] = apiResponse.data

        let [__, transactionError] = await Safely.call(
            Database.$transaction(userServers.map(server => {

                permissions[server.id] = server.permissions

                return Database.server.upsert({
                    where: {
                        ["id"]: BigInt(server.id)
                    },
                    create: {
                        ["id"]: BigInt(server.id),
                        ["name"]: server.name,
                        ["icon"]: server.icon || null,
                        ["categoryCount"]: 2,
                        ["categories"]: {
                            createMany: {
                                data: [
                                    {
                                        ["id"]: Crypto.generateSnowflake(),
                                        ["name"]: "Clips",
                                        ["icon"]: "fa-clapperboard",
                                        ["modManaged"]: false,
                                    },
                                    {
                                        ["id"]: Crypto.generateSnowflake(),
                                        ["name"]: "Videos",
                                        ["icon"]: "fa-video",
                                        ["modManaged"]: false,
                                    }
                                ]
                            }
                        },
                        ["webhooks"]: {}
                    },
                    update: {
                        ["name"]: server.name,
                        ["icon"]: server.icon || null,
                    }
                })
            }))
        )
        if (transactionError)
            return Respond.withServerError(res, transactionError)


        // [6] Upsert User into Database
        let [_, upsertError] = await Safely.call(
            Database.user.upsert({
                where: {
                    ["id"]: discordId
                },
                create: {
                    ["id"]: discordId,
                    ["avatar"]: discordUser.avatar || null,
                    ["username"]: username,
                    ["permissions"]: permissions,
                },
                update: {
                    ["avatar"]: discordUser.avatar || null,
                    ["username"]: username,
                    ["permissions"]: permissions,
                }
            })
        )
        if (upsertError)
            return Respond.withServerError(res, upsertError)


        // [7] Create New Token for User
        const tokenIat = (Date.now() / 1000 | 0)
        const tokenData = {
            ["uid"]: discordId,
            ["username"]: username,
            ["accessToken"]: accessToken.access_token,
            ["avatar"]: discordUser.avatar,
            ["iat"]: tokenIat,
            ["eat"]: (tokenIat + accessToken.expires_in)
        }
        const tokenString = Crypto.createNewUserToken(tokenData)


        // [8] Set Cookie and Redirect User
        res
            .cookie("auth_token", tokenString, {
                ["maxAge"]: (accessToken.expires_in * 1000),
                ["sameSite"]: "strict",
                ["httpOnly"]: true,
                ["secure"]: true,
            })
            .send(`
            <!DOCTYPE html> 
            <html lang="en">
                <head>
                    <title>Please wait...</title>
                </head>
                <body>
                    <p style="font-family: Arial, Helvetica, sans-serif">
                        Logged in as ${username}! 
                        <a href="/">Sending you Home... 🚀</a>
                    </p>
                </body>
                <script>
                    setTimeout(()=>{window.location.href = "/"}, 5000) 
                </script>
            </html>
       `)
    }
)

Webserver.get(
    "/api/auth/logout",
    async (req, res): Promise<void> => {
        // [1] Delete Cookie and Redirect Home
        return res
            .cookie("auth_token", "", { maxAge: 0 })
            .redirect("/")
    }
)