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
    managed: boolean
}

Webserver.post(
    "/api/servers/:server_id/categories",
    Validate.parameters("server_id"),
    Validate.responseBody({
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
        ["managed"]: {
            type: "boolean",
            required: true,
        }
    }),
    Validate.userSession(true),
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
                    ["managed"]: body.managed,
                    ["flags"]: "NONE"
                },
                select: {
                    ["id"]: true,
                    ["created"]: true,
                    ["name"]: true,
                    ["icon"]: true,
                    ["managed"]: true,
                    ["flags"]: true
                }
            })
        )
        if (createError !== undefined)
            return Respond.withServerError(res, createError)

        Respond.withJSON(res, someCategory)
    }
)

Webserver.patch(
    "/api/servers/:server_id/categories/:category_id",
    Validate.parameters("server_id", "category_id"),
    Validate.responseBody({
        ["name"]: {
            type: "string",
            required: false,
            maximumLength: 32,
            minimumLength: 1,
        },
        ["icon"]: {
            type: "string",
            required: false,
            maximumLength: 32,
            minimumLength: 1
        },
        ["managed"]: {
            type: "boolean",
            required: false,
        }
    }),
    Validate.bodyIsNotEmpty,
    Validate.userSession(true),
    Fetch.userPermissions(true),
    Validate.userCanModifyServer,
    async (req: ERequest, res: EResponse): Promise<void> => {

        // [1] Modify Category in Database
        const body: RequestBody = req.body
        const [updatedCategory, updateError] = await Safely.call(
            Database.category.update({
                where: {
                    ["id"]: res.locals.category_id,
                    ["serverId"]: res.locals.server_id,
                    ["flags"]: "NONE"
                },
                data: {
                    ["name"]: body?.name,
                    ["icon"]: body?.icon,
                    ["managed"]: body?.managed,
                },
                select: {
                    ["id"]: true,
                    ["created"]: true,
                    ["name"]: true,
                    ["icon"]: true,
                    ["managed"]: true,
                    ["flags"]: true,
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

Webserver.delete(
    "/api/servers/:server_id/categories/:category_id",
    Validate.parameters("server_id", "category_id"),
    Validate.userSession(true),
    Fetch.userPermissions(true),
    Validate.userCanModifyServer,
    async (req: ERequest, res: EResponse): Promise<void> => {

        const [someMessage, someError] = await Safely.call(
            Database.$transaction(async tx => {

                // Fetch Category for Server
                const categories = await tx.category.findMany({
                    where: {
                        ["serverId"]: res.locals.server_id,
                    },
                    select: {
                        ["id"]: true,
                        ["flags"]: true,
                    }
                })

                // Move all clips in the deleted category into the All Category
                const oldCategory = categories.find(c => c.id === res.locals.category_id)
                if (!oldCategory) return "Unknown Category"
                if (oldCategory.flags === "ALL") return "Cannot delete all category"

                const newCategory = categories.find(c => c.flags === "ALL")
                if (!newCategory) return "Category 'All' does not exist!"

                await tx.clip.updateMany({
                    where: {
                        ["serverId"]: res.locals.server_id,
                        ["categoryId"]: res.locals.category_id,
                    },
                    data: {
                        ["categoryId"]: newCategory.id
                    }
                })

                // Delete Old Category
                await tx.category.delete({
                    where: {
                        ["id"]: res.locals.category_id,
                        ["serverId"]: res.locals.server_id
                    },
                    select: {
                        ["id"]: true
                    }
                })

                return true
            })
        )
        if (someError !== undefined)
            return Respond.withServerError(res, someError)

        if (someMessage !== true)
            return Respond.withBadRequest(res, someMessage)

        Respond.withJSON(res, true)
    }
)