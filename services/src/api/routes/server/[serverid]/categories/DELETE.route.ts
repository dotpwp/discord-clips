import { ERequest, EResponse } from "../../../../../types/Express";
import { FlagsPermissions } from "../../../../../types/Permission";
import { Webserver } from "../../../..";
import { Database } from "../../../../../shared/util/Database";
import { DBError } from "../../../../../types/Database";
import Validate from "../../../../../shared/web/Validate";
import Reply from "../../../../../shared/web/Reply";
import Safe from "../../../../../shared/util/Safe";

// Needs Tests:
// Delete Category => 200 OK
// Delete Category Again => 404 Not Found
// Unknown Category ID => 404 Not Found

Webserver.delete(
    "/api/server/:serverid/categories/:categoryid",
    Validate.routeParams("serverid", "categoryid"),
    Validate.userToken,
    Validate.hasPermissionTo(FlagsPermissions.MANAGE_GUILD),
    async function (req: ERequest, res: EResponse) {
        const { categoryid, serverid } = res.locals

        // [1] Create Transaction
        const [_, transactionError] = await Safe.call(
            Database.$transaction(async tx => {
                // [1A] Delete Category
                await tx.category.delete({
                    select: { id: true },
                    where: {
                        ["id"]: categoryid,
                        ["serverId"]: serverid,
                    }
                })
                // [1B] Decrement Category Count
                await tx.server.update({
                    select: { id: true },
                    where: { ["id"]: serverid },
                    data: { ["categoryCount"]: { decrement: 1 } }
                })
                // [1C] Remove Category from Videos
                await tx.clip.updateMany({
                    where: {
                        ["categoryId"]: categoryid,
                        ["serverId"]: serverid
                    },
                    data: { ["categoryId"]: null }
                })
                return
            })
        )
        if (transactionError?.code === DBError.NotFound)
            return Reply.withUnknown(res, "Unknown Category")
        if (transactionError)
            return Reply.withServerError(res, transactionError)

        // [2] Send Response to Client
        Reply.withJSON(res, { success: true })
    }
)