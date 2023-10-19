import { ERequest, EResponse } from "../../../../../types/Express";
import { Webserver } from "../../../..";
import { Database } from "../../../../../shared/util/Database";
import { DBError } from "../../../../../types/Database";
import Validate from "../../../../../shared/web/Validate";
import Reply from "../../../../../shared/web/Reply";
import Safe from "../../../../../shared/util/Safe";

// Needs Tests:
// - Attempt to UnHeart clip => 200 OK
// - Attempt to UnHeart clip => 400 Bad Request
// - Attempt to UnHeart clip when deleted => 404 Not Found

Webserver.delete(
    "/api/clips/:clipid/hearts",
    Validate.routeParams("clipid"),
    Validate.userToken,
    Validate.userIsLoggedIn,
    async function (req: ERequest, res: EResponse) {
        const { clipid, token } = res.locals

        // [1] Create Transaction
        const [_, transactionError] = await Safe.call(
            Database.$transaction(async tx => {
                // [1A] Decrement Heart Counter on Video
                // Will return NotFound if clip was deleted
                await tx.clip.update({
                    select: { id: true },
                    where: {
                        ["id"]: clipid,
                        ["deleted"]: false
                    },
                    data: {
                        ["approximateHeartCount"]: { decrement: 1 }
                    }
                })
                // [1B] Delete Heart from Database
                // If this heart is the latest for a notification
                // It will simply display '123 likes' instead of 'some user and 123 others liked your video'
                return await tx.heart.delete({
                    select: { id: true },
                    where: {
                        userId_clipId: {
                            ["clipId"]: clipid,
                            ["userId"]: token.uid,
                        }
                    }
                })
            })
        )
        if (transactionError?.code === DBError.NotFound)
            return Reply.withUnknown(res, "Unknown Heart")
        if (transactionError?.code === DBError.ForeignNotFound)
            return Reply.withUnknown(res, "Unknown Clip")
        if (transactionError)
            return Reply.withServerError(res, transactionError)

        // [2] Send Response to Client
        Reply.withJSON(res, { success: true })
    }
)