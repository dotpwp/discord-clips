import { ERequest, EResponse } from "../../../../types/Express";
import { FlagsPermissions } from "../../../../types/Permission";
import { Webserver } from "../../..";
import { Database } from "../../../../shared/util/Database";
import { DBError } from "../../../../types/Database";
import Validate from "../../../../shared/web/Validate";
import Flags from "../../../../shared/util/Flags";
import Reply from "../../../../shared/web/Reply";
import Safe from "../../../../shared/util/Safe";
import { HttpStatusCode } from "axios";

// Needs Tests:
// - Delete Video => 200
// - Delete Video again => 404

Webserver.delete(
    "/api/clips/:clipid",
    Validate.routeParams("clipid"),
    Validate.userToken,
    Validate.userIsLoggedIn,
    async function (req: ERequest, res: EResponse) {
        const { clipid, token } = res.locals

        // [1] Fetch Clip by ID
        const [someClip, fetchClipError] = await Safe.call(
            Database.clip.findFirst({
                where: { id: clipid },
                select: {
                    ["id"]: true,
                    ["userId"]: true,
                    ["serverId"]: true,
                }
            })
        )
        if (fetchClipError)
            return Reply.withServerError(res, fetchClipError)
        if (someClip === null)
            return Reply.withUnknown(res, "Unknown Clip")

        // Server Managers & Uploader are the only ones who can delete this video
        if (someClip.userId !== token.uid && !Flags.test(Validate.getPermissions(res), FlagsPermissions.MANAGE_GUILD))
            return Reply.withApiError(res, HttpStatusCode.Unauthorized)


        // [2] Create Transaction
        const [_, transactionError] = await Safe.call(
            Database.$transaction(async tx => {
                // [2A] Mark Clip as Deleted
                await tx.clip.update({
                    select: { id: true },
                    where: { ["id"]: clipid, ["deleted"]: false },
                    data: { ["deleted"]: true }
                })
                // [2B] Decrement Server Upload Count
                await tx.server.update({
                    select: { id: true },
                    where: { ["id"]: someClip.serverId },
                    data: { ["uploadCount"]: { decrement: 1 } }
                })
                // [2C] Decrement User Upload Count
                await tx.user.update({
                    select: { id: true },
                    where: { ["id"]: someClip.userId },
                    data: { ["uploadCount"]: { decrement: 1 } }
                })
                return
            })
        )
        // Most Likely Error! Can also be the server or user.
        // But more than likely they wont be missing!
        if (transactionError?.code === DBError.ForeignNotFound)
            return Reply.withUnknown(res, "Unknown Clip")
        if (transactionError)
            return Reply.withServerError(res, transactionError)


        // [3] Send Response to Client
        Reply.withJSON(res, { success: true })
    }
)