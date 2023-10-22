import { ERequest, EResponse } from "../../../../../types/Express";
import { Webserver } from "../../../..";
import { Database } from "../../../../../shared/util/Database";
import ExpressBodyQuery from "../../../../../shared/middleware/ExpressBodyQuery";
import Validator from "../../../../../shared/util/Validator";
import Validate from "../../../../../shared/web/Validate";
import Reply from "../../../../../shared/web/Reply";
import Safe from "../../../../../shared/util/Safe";
import { HttpStatusCode } from "axios";

// Needs Tests:
// No Filters                         => 200 OK (1 Item)
// Filter[page] = 2                   => 200 OK (0 Items)
// Filter[cursor] = (Debug Video)[0]  => 200 OK (1 items)
// Filter[Category] = Bogus           => 200 OK (0 Items)
// Filter[User] = Debug User          => 200 OK (3 Items)

interface RequestBody {
    ["filter[page]"]: number
    ["limit[items]"]: number
    ["filter[cursor]"]: bigint
    ["filter[category]"]: bigint
    ["filter[user]"]: bigint
}

Webserver.get(
    "/api/server/:serverid/clips",
    Validate.routeParams("serverid"),
    Validate.userToken,
    ExpressBodyQuery,
    Validator.createMiddleware({
        "filter[category]": {
            _description: "Filter items by Category",
            type: "bigint",
            required: false,
        },
        "filter[cursor]": {
            _description: "Return items starting from Video ID",
            type: "bigint",
            required: false,
        },
        "filter[user]": {
            _description: "Filter items by User",
            type: "bigint",
            required: false,
        },
        "limit[items]": {
            _description: "Return x amount of items",
            type: "number",
            required: false,
            minimumValue: 1,
            maximumValue: 36,
        },
    }),
    async (req: ERequest<RequestBody>, res: EResponse) => {
        const
            { serverid } = res.locals,
            filterCategory = req.body["filter[category]"],
            filterCursor = req.body["filter[cursor]"],
            filterUser = req.body["filter[user]"],
            limitItems = req.body["limit[items]"] || 24


        // [1] Ensure User has permission to browse this server
        const [someServer, fetchServerError] = await Safe.call(
            Database.server.findFirst({
                where: { ["id"]: serverid },
                select: { ["allowGuests"]: true }
            })
        )
        if (fetchServerError)
            return Reply.withServerError(res, fetchServerError)
        if (someServer === null)
            return Reply.withApiError(res, HttpStatusCode.NotFound)

        // Disallow Guests (if server has disabled it)
        if (someServer.allowGuests === false && Validate.isServerGuest(res))
            return Reply.withApiError(res, HttpStatusCode.Unauthorized)


        // [2] Fetch Clips for Category
        const [someClips, fetchClipsError] = await Safe.call(
            Database.clip.findMany({
                ["cursor"]: filterCursor ? { id: filterCursor } : undefined,
                ["skip"]: filterCursor ? 1 : 0,
                ["take"]: limitItems,
                orderBy: {
                    ["created"]: "desc"
                },
                where: {
                    ["deleted"]: false,
                    ["userId"]: filterUser,
                    ["serverId"]: serverid,
                    ["categoryId"]: filterCategory,
                },
                select: {
                    ["id"]: true,
                    ["created"]: true,
                    ["title"]: true,
                    ["description"]: true,
                    ["thumbnail"]: true,
                    ["duration"]: true,
                    ["availability"]: true,
                    ["approximateCommentCount"]: true,
                    ["approximateHeartCount"]: true,
                    ["approximateViewCount"]: true,
                    ["user"]: {
                        select: {
                            ["id"]: true,
                            ["alias"]: true,
                            ["avatar"]: true,
                        }
                    }
                }
            })
        )
        if (fetchClipsError)
            return Reply.withServerError(res, fetchClipsError)

        // [3] Send Response to Client
        Reply.withJSON(res, someClips)
    }
)