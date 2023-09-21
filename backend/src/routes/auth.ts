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

// Removes HTML Tags from message
const HTML_PAGE = (message: string) =>
    `<!DOCTYPE html> 
    <html lang="en">
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <style>
                body {
                    background-color: #1f2937;
                }
                div {
                    position: absolute;
                    display: flex;
                    width: 100%;
                    height: 100%;
                    align-items: center;
                    justify-content: center;
                }
                p {
                    color: #e5e7eb;
                    font-family: Arial, Helvetica, sans-serif
                }
                </style>
                <script>
                    setTimeout(function() {
                        if (window.parent) {
                            window.close()
                        } else {
                            window.location.href = "/"
                        }
                    }, 1_000) 
                </script>
        </head>
        <body>
            <div><p>${message.replace(/(<([^>]+)>)/ig, '')}</p></div>
        </body>
    </html>`


Webserver.get(
    "/api/auth/login",
    async (req, res): Promise<void> => {

        // [1] Redirect user to Discord Sign in page
        const search = new URLSearchParams(req.originalUrl.slice(req.originalUrl.indexOf("?") + 1))
        if (search.get("error")) {
            // Return Error Page if cancelled authorization
            res.send(HTML_PAGE(search.get("error_description") || "Unknown Error"))
            return
        }
        const code = search.get("code")
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
        const permissions: PermissionsCache = {}
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
                        ["categoryCount"]: 3,
                        ["categories"]: {
                            createMany: {
                                data: [
                                    {
                                        ["id"]: Crypto.generateSnowflake(),
                                        ["name"]: "All",
                                        ["icon"]: "folder",
                                        ["managed"]: false,
                                        ["flags"]: "ALL",
                                    },
                                    {
                                        ["id"]: Crypto.generateSnowflake(),
                                        ["name"]: "Clips",
                                        ["icon"]: "clapperboard",
                                        ["managed"]: false,
                                        ["flags"]: "CLIPS",
                                    },
                                    {
                                        ["id"]: Crypto.generateSnowflake(),
                                        ["name"]: "Videos",
                                        ["icon"]: "video",
                                        ["managed"]: false,
                                        ["flags"]: "VIDEOS",
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
            ["eat"]: (tokenIat + accessToken.expires_in),
            ["permissions"]: permissions
        }
        const tokenString = Crypto.createNewUserToken(tokenData)


        // [8] Set Cookie and Redirect User
        res
            .cookie("auth_token", tokenString, {
                ["maxAge"]: (accessToken.expires_in * 1000),
                ["sameSite"]: "strict",
                ["httpOnly"]: false,
                ["secure"]: true,
            })
            .send(HTML_PAGE(`Logged in as ${username}!`))
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