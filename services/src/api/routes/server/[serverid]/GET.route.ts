import { ERequest, EResponse } from "../../../../types/Express";
import { FlagsPermissions } from "../../../../types/Permission";
import { Webserver } from "../../..";
import { Database } from "../../../../shared/util/Database";
import Validate from "../../../../shared/web/Validate";
import Flags from "../../../../shared/util/Flags";
import Reply from "../../../../shared/web/Reply";
import Safe from "../../../../shared/util/Safe";
import { HttpStatusCode } from "axios";

// Needs Test:
// - Valid Server ID => 200 OK
// - Bogus Server ID => 404 Not Found

Webserver.get(
    "/api/server/:serverid",
    Validate.routeParams("serverid"),
    Validate.userToken,
    async function (req: ERequest, res: EResponse) {
        const { serverid } = res.locals

        // [1] Fetch Server
        const [someServer, fetchServerError] = await Safe.call(
            Database.server.findFirst({
                where: { ["id"]: serverid },
                select: {
                    ["id"]: true,
                    ["name"]: true,
                    ["icon"]: true,
                    ["allowGuests"]: true,
                    ["uploadCount"]: true,
                    ["categoryCount"]: true,
                    ["webhooks"]: Flags.test(
                        Validate.getPermissions(res),
                        FlagsPermissions.MANAGE_GUILD
                    ),
                    ["categories"]: {
                        select: {
                            ["id"]: true,
                            ["created"]: true,
                            ["name"]: true,
                            ["icon"]: true,
                            ["flags"]: true,
                        }
                    },
                }
            })
        )
        if (fetchServerError)
            return Reply.withServerError(res, fetchServerError)
        if (someServer === null)
            return Reply.withUnknown(res, "Unknown Server")

        // Disallow Guests (if server has disabled it)
        if (!someServer.allowGuests && Validate.isServerGuest(res))
            return Reply.withApiError(res, HttpStatusCode.Unauthorized)


        // [2] Send Response to Client
        Reply.withJSON(res, someServer)
    }
)