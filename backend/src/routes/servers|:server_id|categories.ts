import { BodyValidationOptions } from "../types/BodyValidator"
import { ERequest, EResponse } from "../types/Express"
import { Database } from "../modules/Database"
import Respond from "../modules/Respond"
import Crypto from "../modules/Crypto"
import Safely from "../modules/Safely"

import { Webserver } from "../Webserver"
import Validate from "../middleware/Validate"
import Fetch from "../middleware/Fetch"

interface RequestBody {
    name: string
    icon: string
    modManaged: boolean
}
const ValidationOptions: BodyValidationOptions = {
    ["name"]: {
        type: "string",
        required: true,
        maximumLength: 32,
        minimumLength: 1,
    },
    ["icon"]: {
        type: "string",
        required: true,
        maximumLength: 32,
        minimumLength: 1
    },
    ["modManaged"]: {
        type: "boolean",
        required: true,
    }
}

Webserver.post(
    "/api/servers/:server_id/categories",
    Validate.parameters("server_id"),
    Validate.userSession(true),
    Validate.responseBody(ValidationOptions),
    Fetch.userPermissions(true),
    Validate.userCanModifyServer,
    async (req: ERequest, res: EResponse): Promise<void> => {

        // [1] Create New Category for Server
        const body: RequestBody = req.body
        const [someCategory, createError] = await Safely.call(
            Database.category.create({
                data: {
                    ["id"]: Crypto.generateSnowflake(),
                    ["serverId"]: res.locals.server_id,
                    ["name"]: body.name,
                    ["icon"]: body.icon,
                    ["modManaged"]: body.modManaged,
                },
                select: {
                    ["id"]: true,
                    ["name"]: true,
                    ["icon"]: true,
                    ["modManaged"]: true
                }
            })
        )
        if (createError !== undefined)
            return Respond.withServerError(res, createError)

        Respond.withJSON(res, someCategory)
    }
)

Webserver.use(
    "/api/servers/:server_id/categories/:category_id",
    (req, res, next) => {
        if (req.method === "PATCH")
            return Validate.responseBody(ValidationOptions)(req, res, () => next())

        req.method === "DELETE"
            ? next()
            : Respond.withMethodNotAllowed(res)
    },
    Validate.parameters("server_id", "category_id"),
    Validate.userSession(true),
    Fetch.userPermissions(true),
    Validate.userCanModifyServer,
    async (req: ERequest, res: EResponse): Promise<void> => {
        
        // [1] Modify Category in Database
        const body: RequestBody = req.body
        const [updatedCategory, updateError] = await Safely.call(
            (req.method === "PATCH")
                // PATCH: Update Category
                ? Database.category.update({
                    where: {
                        ["serverId"]: res.locals.server_id,
                        ["id"]: res.locals.category_id
                    },
                    data: {
                        ["name"]: body.name,
                        ["icon"]: body.icon,
                        ["modManaged"]: body.modManaged,
                    },
                    select: {
                        ["id"]: true,
                        ["name"]: true,
                        ["icon"]: true,
                        ["modManaged"]: true
                    }
                })
                // DELETE: Remove Category
                : Database.category.delete({
                    where: {
                        ["serverId"]: res.locals.server_id,
                        ["id"]: res.locals.category_id,
                    },
                    select: {
                        ["id"]: true,
                    }
                })
        )
        if (updateError?.code === "P2025")
            return Respond.withNotFound(res, "Unknown Category")
        if (updateError)
            return Respond.withServerError(res, updateError)

        Respond.withJSON(res, updatedCategory)
    }
)