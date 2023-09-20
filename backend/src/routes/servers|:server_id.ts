import { Database } from "../modules/Database"
import Respond from "../modules/Respond"
import Safely from "../modules/Safely"

import { ERequest, EResponse } from "../types/Express"
import { Webserver } from "../Webserver"
import Validate from "../middleware/Validate"
import Fetch from "../middleware/Fetch"

Webserver.get(
    "/api/servers/:server_id",
    Validate.parameters("server_id"),
    Validate.userSession(false),
    Fetch.userPermissions(false),
    async (req: ERequest, res: EResponse): Promise<void> => {

        // [1] Fetch Server
        const [someServer, fetchError] = await Safely.call(
            Database.server.findFirst({
                where: {
                    ["id"]: res.locals.server_id
                },
                select: {
                    ["id"]: true,
                    ["created"]: true,
                    ["name"]: true,
                    ["icon"]: true,
                    ["allowGuests"]: true,
                    ["uploadCount"]: true,
                    ["categoryCount"]: true,
                    ["categories"]: {
                        select: {
                            ["id"]: true,
                            ["created"]: true,
                            ["name"]: true,
                            ["icon"]: true,
                            ["flags"]: true,
                            ["managed"]: true,
                        }
                    },
                    ["webhooks"]: Validate.canModifyServer(res)
                }
            })
        )
        if (fetchError)
            return Respond.withServerError(res, fetchError)

        if (someServer === null)
            return Respond.withNotFound(res, "Unknown Server")

        if (!someServer.allowGuests && !res.locals.permissions[res.locals.server_id.toString()])
            return Respond.withUnauthorized(res)

        Respond.withJSON(res, someServer)
    }
)


Webserver.patch(
    "/api/servers/:server_id",
    Validate.userSession(true),
    Validate.parameters("server_id"),
    Validate.responseBody({
        allowGuests: {
            ["type"]: "boolean",
            ["required"]: false,
        },
        webhooks: {
            ["type"]: "array",
            ["required"]: false,
            ["maximumLength"]: 100,
            ["validator"]: {
                ["type"]: "object",
                ["required"]: true,
                ["fields"]: {
                    categoryId: {
                        ["type"]: "bigint",
                        ["required"]: true
                    },
                    webhookUrl: {
                        ["type"]: "string",
                        ["required"]: true,
                        ["regex"]: [{
                            // Last segment is limited to 128 characters so people dont fill up the database with like megabytes of data
                            pattern: new RegExp(/(http|https):\/\/(discord|discordapp).com\/api\/webhooks\/([0-9]{17,20})\/([A-z0-9_]{0,128})/),
                            message: "Invalid Webhook URL"
                        }]
                    }
                }
            }
        }
    }),
    Fetch.userPermissions(true),
    Validate.userCanModifyServer,
    async (req: ERequest, res: EResponse): Promise<void> => {

        // [1] Update Server
        // This shouldn't cause a not found error
        const [updatedServer, updateError] = await Safely.call(
            Database.server.update({
                where: {
                    ["id"]: res.locals.server_id
                },
                data: {
                    ["allowGuests"]: req.body.allowGuests,
                    ["webhooks"]: req.body.webhooks,
                },
                select: {
                    ["allowGuests"]: true,
                    ["webhooks"]: true
                }
            })
        )
        if (updateError?.code === "P2025")
            return Respond.withNotFound(res, "Unknown Server")

        if (updateError !== undefined)
            return Respond.withServerError(res, updateError)

        Respond.withJSON(res, updatedServer)
    }
)