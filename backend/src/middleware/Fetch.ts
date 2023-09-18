import { ERequest, EResponse, Handler, Next } from "../types/Express"
import { Database } from "../modules/Database"
import Respond from "../modules/Respond"
import Safely from "../modules/Safely"

export interface PermissionsCache {
    [key: string]: number;  // Server ID as key, value as permissions
}

class Fetch {

    // Fetch Permissions from Database
    // TODO: Fetch Latest from Discord API
    public userPermissions(fetchLatest = false): Handler {
        return async function (req: ERequest, res: EResponse, next: Next): Promise<void> {

            // User has no permissions if a guest
            if (res.locals.token === false) {
                res.locals.permissions = {}
                return next()
            }

            // Fetch Permissions from Database
            const [someUser, fetchError] = await Safely.call(
                Database.user.findFirst({
                    where: { ["id"]: res.locals.token.uid },
                    select: { ["permissions"]: true }
                })
            )
            if (fetchError !== undefined)
                return Respond.withServerError(res, fetchError)
            if (someUser === null)
                return Respond.withNotFound(res, "Unknown User")


            // Return permissions
            res.locals.permissions = someUser.permissions as PermissionsCache
            next()
        }
    }

}
export default new Fetch()