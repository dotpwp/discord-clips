import { FlagsCategories, FlagsPermissions } from "../../../../../types/Permission";
import { ERequest, EResponse } from "../../../../../types/Express";
import { Webserver } from "../../../..";
import { Database } from "../../../../../shared/util/Database";
import { DBError } from "../../../../../types/Database";
import ExpressBodyJSON from "../../../../../shared/middleware/ExpressBodyJSON";
import Validator from "../../../../../shared/util/Validator";
import Validate from "../../../../../shared/web/Validate";
import Reply from "../../../../../shared/web/Reply";
import Safe from "../../../../../shared/util/Safe";

// Needs Tests:
// Valid Body => 200 OK
// Unknown Category => 404 Not Found
// Name longer than 32 characters => 400 Bad Request
// Icon longer than 32 characters => 400 Bad Request

interface RequestBody {
    name: string;
    icon: string;
    flags: number;
}

Webserver.patch(
    "/api/server/:serverid/categories/:categoryid",
    Validate.routeParams("serverid", "categoryid"),
    Validate.userToken,
    Validate.hasPermissionTo(FlagsPermissions.MANAGE_GUILD),
    ExpressBodyJSON(),
    Validator.createMiddleware({
        ["name"]: {
            _description: "Name for Category",
            type: "string",
            required: false,
            maximumLength: 32,
            minimumLength: 2
        },
        ["icon"]: {
            _description: "Icon for Category",
            type: "string",
            required: false,
            maximumLength: 32,
            minimumLength: 1
        },
        ["flags"]: {
            _description: "Flags for Category",
            type: "number",
            required: false,
            maximumValue: FlagsCategories.ALL_FLAGS,
            minimumValue: 0,
        }
    }),
    async function (req: ERequest<RequestBody>, res: EResponse) {
        const { categoryid, serverid } = res.locals
        const { body } = req

        // [1] Update Category
        const [updatedCategory, updatedCategoryError] = await Safe.call(
            Database.category.update({
                where: {
                    ["id"]: categoryid,
                    ["serverId"]: serverid,
                },
                data: {
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
        )
        if (updatedCategoryError?.code === DBError.NotFound)
            return Reply.withUnknown(res, "Unknown Category")
        if (updatedCategoryError)
            return Reply.withServerError(res, updatedCategoryError)

        // [2] Send Response to Client
        Reply.withJSON(res, updatedCategory)
    }
)