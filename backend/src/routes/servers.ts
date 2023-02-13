import { Database } from "../modules/Database"
import Respond from "../modules/Respond"
import Safely from "../modules/Safely"

import Fetch, { PermissionsCache } from "../middleware/Fetch"
import { ERequest, EResponse } from "../types/Express"
import { Webserver } from "../Webserver"
import Validate from "../middleware/Validate"

Webserver.get(
    "/api/servers",
    Validate.userSession(true),
    Fetch.userPermissions(false),
    async (req: ERequest, res: EResponse): Promise<void> => {

        // [1] Fetch Server(s) for User
        const [servers, findError] = await Safely.call(
            Database.server.findMany({
                where: {
                    ["id"]: {
                        in: Object
                            .keys(res.locals.permissions as PermissionsCache)
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
                }
            })
        )
        if (findError)
            return Respond.withServerError(res, findError)

        Respond.withJSON(res, servers)
    }
)