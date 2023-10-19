import { ERequest, EResponse } from "../../../types/Express";
import { Webserver } from "../..";
import { Database } from "../../../shared/util/Database";
import Validate from "../../../shared/web/Validate";
import Reply from "../../../shared/web/Reply";
import Safe from "../../../shared/util/Safe";

// Needs Tests:
// - Logged in => 200 OK
// - Logged Out => 401 Unauthorized

Webserver.get(
    "/api/servers",
    Validate.userToken,
    Validate.userIsLoggedIn,
    async function (req: ERequest, res: EResponse) {
        const { token } = res.locals

        // [1] Fetch Servers
        const [serverList, fetchError] = await Safe.call(
            Database.server.findMany({
                where: {
                    ["id"]: {
                        in: Object
                            .keys(token.permissions)
                            .map(id => Safe.parseBigint(id))
                            .filter(id => id !== false) as bigint[]
                    }
                },
                select: {
                    ["id"]: true,
                    ["name"]: true,
                    ["icon"]: true,
                    ["uploadCount"]: true,
                    ["categoryCount"]: true,
                }
            })
        )

        // [2] Send Response to Client
        fetchError
            ? Reply.withServerError(res, fetchError)
            : Reply.withJSON(res, serverList)
    }
)