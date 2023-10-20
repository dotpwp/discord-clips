import { FlagsCategories, FlagsPermissions } from "../../../../../types/Permission";
import { ERequest, EResponse } from "../../../../../types/Express";
import { Webserver } from "../../../..";
import { Database } from "../../../../../shared/util/Database";
import { DBError } from "../../../../../types/Database";
import ExpressBodyJSON from "../../../../../shared/middleware/ExpressBodyJSON";
import Validator from "../../../../../shared/util/Validator";
import Validate from "../../../../../shared/web/Validate";
import Crypto from "../../../../../shared/util/Unique";
import Reply from "../../../../../shared/web/Reply";
import Safe from "../../../../../shared/util/Safe";

// Requires Tests:
// Valid Body => 200 OK

interface RequestBody {
    name: string;
    icon: string;
    flags: number;
}

Webserver.post(
    "/api/server/:serverid/categories",
    Validate.routeParams("serverid"),
    Validate.userToken,
    Validate.userIsLoggedIn,
    Validate.hasPermissionTo(FlagsPermissions.MANAGE_GUILD),
    ExpressBodyJSON(),
    Validator.createMiddleware({
        ["name"]: {
            _description: "Name for Category",
            type: "string",
            required: true,
            maximumLength: 32,
            minimumLength: 2
        },
        ["icon"]: {
            _description: "Icon for Category",
            type: "string",
            required: true,
            maximumLength: 32,
            minimumLength: 1
        },
        ["flags"]: {
            _description: "Flags for Category",
            type: "number",
            required: true,
            maximumValue: FlagsCategories.ALL_FLAGS,
            minimumValue: 0,
        }
    }),
    async function (req: ERequest<RequestBody>, res: EResponse) {
        const { serverid } = res.locals
        const { body } = req

        // [1] Create Transaction
        const [newCategory, transactionError] = await Safe.call(
            Database.$transaction(async tx => {
                // [2A] Increment Category Count
                await tx.server.update({
                    select: { id: true },
                    where: { ["id"]: serverid },
                    data: { ["categoryCount"]: { increment: 1 } }
                })
                // [2B] Create New Category
                const newCategory = await tx.category.create({
                    data: {
                        ["id"]: Crypto.generateSnowflake(),
                        ["serverId"]: serverid,
                        ["name"]: body.name,
                        ["icon"]: body.icon,
                        ["flags"]: body.flags
                    },
                    select: {
                        ["id"]: true,
                        ["created"]: true,
                        ["name"]: true,
                        ["icon"]: true,
                        ["flags"]: true,
                    }
                })
                return newCategory
            })
        )
        if (transactionError?.code === DBError.NotFound)
            return Reply.withUnknown(res, "Unknown Server")
        if (transactionError)
            return Reply.withServerError(res, transactionError)

        // [3] Send Response to Client
        Reply.withJSON(res, newCategory)
    }
)