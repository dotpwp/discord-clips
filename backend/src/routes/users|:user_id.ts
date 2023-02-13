import { Database } from "../modules/Database"
import Respond from "../modules/Respond"
import Safely from "../modules/Safely"

import { ERequest, EResponse } from "../types/Express"
import { Webserver } from "../Webserver"
import Fetch, { PermissionsCache } from "../middleware/Fetch"
import Validate from "../middleware/Validate"

Webserver.get(
    "/api/users/:user_id",
    Validate.userSession(true),
    Fetch.userPermissions(false),
    async (req: ERequest, res: EResponse): Promise<void> => {

        if (res.locals.token === false)
            return Respond.withUnauthorized(res)

        const isMe = (req.params.user_id === "@me")
        const userId = isMe
            ? res.locals.token.uid
            : Safely.parseBigInt(req.params.user_id)

        if (userId == false) return Respond
            .withBadRequest(res, "Invalid parameter 'userId'")


        // [1] Fetch Server permssions for user
        const [someUser, fetchUserError] = await Safely.call(
            Database.user.findFirst({
                where: { ["id"]: userId },
                select: { ["permissions"]: true }
            })
        )
        if (fetchUserError)
            return Respond.withServerError(res, fetchUserError)

        if (someUser === null)
            return Respond.withNotFound(res, "Unknown User")
        

        // [2] Fetch Clips for Each Server
        const [somServers, fetchServerError] = await Safely.call(
            Database.server.findMany({
                where: {
                    ["id"]: {
                        in: Object
                            .keys(someUser.permissions as PermissionsCache)
                            .filter(n => n !== "cachedAt")
                            .map(c => BigInt(c))
                    }
                },
                select: {
                    ["id"]: true,
                    ["name"]: true,
                    ["icon"]: true,
                    ["uploadCount"]: true,
                    ["categoryCount"]: true,
                    ["uploads"]: {
                        take: 25,
                        orderBy: {
                            ["created"]: "asc"
                        },
                        where: {
                            ["userId"]: userId
                        },
                        select: {
                            ["id"]: true,
                            ["created"]: true,
                            ["title"]: true,
                            ["duration"]: true,
                            ["approximateViewCount"]: true,
                            ["approximateHeartCount"]: true,
                        }
                    }
                }
            })
        )
        if (fetchServerError)
            return Respond.withServerError(res, fetchServerError)

        // [3] Return Response for Other Users
        if (!isMe) return Respond.withJSON(res, {
            hearts: null,
            servers: somServers
        })

        // [4] Fetch Hearts for Self
        const [someHearts, fetchHeartsError] = await Safely.call(
            Database.heart.findMany({
                orderBy: {
                    ["created"]: "asc"
                },
                where: {
                    ["userId"]: userId,
                },
                select: {
                    ["clip"]: {
                        select: {
                            ["id"]: true,
                            ["created"]: true,
                            ["title"]: true,
                            ["duration"]: true,
                            ["approximateViewCount"]: true,
                            ["approximateHeartCount"]: true,
                        }
                    }
                }
            })
        )
        if (fetchHeartsError)
            return Respond.withServerError(res, fetchHeartsError)

        Respond.withJSON(res, {
            hearts: someHearts,
            servers: somServers
        })
    }
)