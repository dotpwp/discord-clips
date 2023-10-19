import { ERequest, EResponse } from "../../../../../types/Express";
import { Webserver } from "../../../..";
import { Database } from "../../../../../shared/util/Database";
import { DBError } from "../../../../../types/Database";
import Validate from "../../../../../shared/web/Validate";
import Unique from "../../../../../shared/util/Unique";
import Reply from "../../../../../shared/web/Reply";
import Safe from "../../../../../shared/util/Safe";
import { HttpStatusCode } from "axios";

// Needs Tests:
// - Attempt to heart => 200 OK
// - Attempt to heart again => 400 Bad Request
// - Attempt to heart clip when deleted => 404 Not Found
// - Ensure Notification was Created

Webserver.put(
    "/api/clips/:clipid/hearts",
    Validate.routeParams("clipid"),
    Validate.userToken,
    Validate.userIsLoggedIn,
    async function (req: ERequest, res: EResponse) {
        const { clipid, token } = res.locals

        // [1] Create Transaction
        const [_, transactionError] = await Safe.call(
            Database.$transaction(async tx => {
                // [1A] Increment Clip Counter
                // Will return ForeignNotFound if clip was deleted
                const someClip = await tx.clip.update({
                    select: { id: true, userId: true },
                    where: { id: clipid, deleted: false },
                    data: {
                        ["approximateHeartCount"]: {
                            increment: 1
                        }
                    }
                })
                // [1B] Create Heart in Database
                const newHeart = await tx.heart.create({
                    select: { id: true },
                    data: {
                        ["id"]: Unique.generateSnowflake(),
                        ["clipId"]: clipid,
                        ["userId"]: token.uid,
                    }
                })
                // [1C] Create Heart Notification for Video
                const notifiedAt = new Date()
                await tx.notification.upsert({
                    where: {
                        type_userId_clipId: {
                            ["type"]: "CLIP_HEARTED",
                            ["userId"]: someClip.userId,
                            ["clipId"]: someClip.id,
                        }
                    },
                    update: {
                        // Push to top of notifications
                        ["timestamp"]: notifiedAt,
                        ["heartId"]: newHeart.id,
                    },
                    create: {
                        // Create New Notification
                        ["id"]: Unique.generateSnowflake(),
                        ["type"]: "CLIP_HEARTED",
                        ["userId"]: someClip.userId,
                        ["clipId"]: someClip.id,
                        ["heartId"]: newHeart.id,
                    }
                })
                // [1D] Update Uploader's Notification Timestamp
                await tx.user.update({
                    select: { id: true },
                    where: { id: someClip.userId },
                    data: { ["lastNotificationAt"]: notifiedAt }
                })
                return
            })
        )
        if (transactionError?.code === DBError.ForeignNotFound)
            return Reply.withUnknown(res, "Unknown Clip")
        if (transactionError?.code === DBError.Duplicate)
            return Reply.withApiError(res, HttpStatusCode.BadRequest, "Already Hearted")
        if (transactionError)
            return Reply.withServerError(res, transactionError)

        // [2] Send Response to Client
        Reply.withJSON(res, { success: true })
    }
)