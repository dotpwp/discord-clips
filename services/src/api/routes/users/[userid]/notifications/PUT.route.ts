import { ERequest, EResponse } from "../../../../../types/Express";
import { Webserver } from "../../../..";
import { Database } from "../../../../../shared/util/Database";
import { DBError } from "../../../../../types/Database";
import Validate from "../../../../../shared/web/Validate";
import Reply from "../../../../../shared/web/Reply";
import Safe from "../../../../../shared/util/Safe";

// Needs Tests:
// Logged in => 200 OK
// Logged Out => 401 Unauthorized

Webserver.put(
    "/api/users/@me/notifications",
    Validate.userToken,
    Validate.userIsLoggedIn,
    async function (req: ERequest, res: EResponse) {
        const { token } = res.locals

        // [1] Update User Information
        const [someUser, updateUserError] = await Safe.call(
            Database.user.update({
                where: { ["id"]: token.uid },
                data: { ["readNotificationsAt"]: new Date() },
                select: {
                    ["id"]: true,
                    ["readNotificationsAt"]: true
                }
            })
        )
        if (updateUserError?.code === DBError.NotFound)
            return Reply.withUnknown(res, "Unknown User")
        if (updateUserError)
            return Reply.withServerError(res, updateUserError)

        // [2] Send Response to Client
        Reply.withJSON(res, someUser)
    }
)