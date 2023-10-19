import { ERequest, EResponse } from "../../../../types/Express";
import { Webserver } from "../../..";
import { Database } from "../../../../shared/util/Database";
import Validate from "../../../../shared/web/Validate";
import Reply from "../../../../shared/web/Reply";
import Safe from "../../../../shared/util/Safe";

// Needs Tests:
// Logged In => 200 OK
// Bogus User => 400 Bad Request
// Logged Out => 401 Unauthorized

Webserver.get(
    "/api/users/:userid",
    Validate.routeParams("userid"),
    Validate.userToken,
    Validate.userIsLoggedIn,
    async function (req: ERequest, res: EResponse) {
        const { token, userid } = res.locals

        // [1] Fetch User Information
        const isMe = (userid === token.uid)
        const userID = (isMe ? token.uid : userid)
        const [someUser, fetchUserError] = await Safe.call(
            Database.user.findFirst({
                where: { id: userID },
                select: {
                    ["id"]: true,
                    ["avatar"]: true,
                    ["alias"]: true,
                    ["uploadCount"]: true,
                    ["permissions"]: true,
                }
            })
        )
        if (fetchUserError)
            return Reply.withServerError(res, fetchUserError)
        if (someUser === null)
            return Reply.withUnknown(res, "Unknown User")


        // [2] Create Transaction
        const [response, transactionError] = await Safe.call(
            Database.$transaction(async tx => {
                // [2A] Fetch Servers this User is in
                const allServers = await tx.server.findMany({
                    where: {
                        ["id"]: {
                            in: Object
                                .keys(someUser.permissions || {})
                                .map(id => BigInt(id))
                        }
                    },
                    select: {
                        ["id"]: true,
                        ["name"]: true,
                        ["icon"]: true,
                        ["allowGuests"]: true,
                        ["uploadCount"]: true,
                        ["categoryCount"]: true,
                    }
                })

                // [2B] Filter out Servers that aren't mutual
                const filteredServers = allServers
                    .filter(s => s.allowGuests || token.permissions[s.id.toString()])

                // [2C] Fetch most recent hearts
                const userHearts = await tx.heart.findMany({
                    take: 50,
                    where: {
                        ["userId"]: userID,
                        ["clip"]: {
                            ["deleted"]: false,
                            ["serverId"]: { in: filteredServers.map(s => s.id) }
                        }
                    },
                    select: {
                        ["id"]: true,
                        ["created"]: true,
                        ["clip"]: {
                            select: {
                                ["id"]: true,
                                ["created"]: true,
                                ["title"]: true,
                                ["thumbnail"]: true,
                                ["duration"]: true,
                                ["approximateCommentCount"]: true,
                                ["approximateHeartCount"]: true,
                                ["approximateViewCount"]: true,
                            }
                        }
                    }
                })

                // [2D] Return Data
                // User can fetch clips list themselves via API
                return {
                    ["user"]: {
                        ["id"]: someUser.id,
                        ["avatar"]: someUser.avatar,
                        ["alias"]: someUser.alias,
                        ["uploadCount"]: someUser.uploadCount,
                    },
                    ["hearts"]: userHearts,
                    ["mutualServerCount"]: (allServers.length - filteredServers.length),
                    ["serverCount"]: allServers.length,
                    ["servers"]: filteredServers,
                }
            })
        )
        if (transactionError)
            return Reply.withServerError(res, transactionError)

        // [3] Send Response to Client
        Reply.withJSON(res, response)
    }
)