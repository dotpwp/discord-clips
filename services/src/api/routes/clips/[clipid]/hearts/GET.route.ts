import { ERequest, EResponse } from "../../../../../types/Express";
import { Webserver } from "../../../..";
import { Database } from "../../../../../shared/util/Database";
import Validate from "../../../../../shared/web/Validate";
import Reply from "../../../../../shared/web/Reply";
import Safe from "../../../../../shared/util/Safe";

// Needs Tests:
// - Returns true when Hearted
// - Returns false when Hearted

Webserver.get(
    "/api/clips/:clipid/hearts",
    Validate.routeParams("clipid"),
    Validate.userToken,
    Validate.userIsLoggedIn,
    async function (req: ERequest, res: EResponse) {
        const { clipid, token } = res.locals

        // [1] Fetch Heart from Database
        const [someHeart, fetchHeartError] = await Safe.call(
            Database.heart.findFirst({
                select: { id: true },
                where: {
                    ["clipId"]: clipid,
                    ["userId"]: token.uid
                }
            })
        )
        if (fetchHeartError)
            return Reply.withServerError(res, fetchHeartError)

        // [2] Send Response to Client
        Reply.withJSON(res, someHeart !== null)
    }
)