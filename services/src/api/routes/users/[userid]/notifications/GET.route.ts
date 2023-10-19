import { ERequest, EResponse } from "../../../../../types/Express";
import { Webserver } from "../../../..";
import { Database } from "../../../../../shared/util/Database";
import ExpressBodyQuery from "../../../../../shared/middleware/ExpressBodyQuery";
import Validator from "../../../../../shared/util/Validator";
import Validate from "../../../../../shared/web/Validate";
import Reply from "../../../../../shared/web/Reply";
import Safe from "../../../../../shared/util/Safe";

// Needs Tests:
// Logged in => 200 OK
// Logged Out => 401 Unauthorized

interface RequestBody {
    ["filter[cursor]"]: bigint;
}

Webserver.get(
    "/api/users/@me/notifications",
    Validate.userToken,
    Validate.userIsLoggedIn,
    ExpressBodyQuery,
    Validator.createMiddleware({
        "filter[cursor]": {
            _description: "Start At Cursor",
            type: "bigint",
            required: false,
        }
    }),
    async function (req: ERequest<RequestBody>, res: EResponse) {
        const filterCursor = req.body["filter[cursor]"]
        const { token } = res.locals

        // [1] Fetch User Information
        const [someUser, fetchUserError] = await Safe.call(
            Database.user.findFirst({
                cursor: filterCursor ? { id: filterCursor } : undefined,
                skip: filterCursor ? 1 : 0,
                take: 24,
                where: { ["id"]: token.uid },
                select: {
                    ["lastNotificationAt"]: true,
                    ["readNotificationsAt"]: true,
                    ["notifications"]: {
                        select: {
                            ["id"]: true,
                            ["timestamp"]: true,
                            ["type"]: true,
                            ["clip"]: {
                                select: {
                                    ["id"]: true,
                                    ["title"]: true,
                                    ["thumbnail"]: true,
                                    ["approximateHeartCount"]: true,
                                }
                            },
                            ["heart"]: {
                                select: {
                                    ["id"]: true,
                                    ["created"]: true,
                                    ["user"]: {
                                        select: {
                                            ["id"]: true,
                                            ["avatar"]: true,
                                            ["alias"]: true,
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            })
        )
        if (fetchUserError)
            return Reply.withServerError(res, fetchUserError)
        if (someUser === null)
            return Reply.withUnknown(res, "Unknown User")

        // [2] Send Response to Client
        Reply.withJSON(res, someUser)
    }
)