import { ERequest, EResponse } from "../types/Express";
import { Webserver } from "../Webserver";
import { Database } from "../modules/Database";
import Validate from "../middleware/Validate";
import Respond from "../modules/Respond";
import Safely from "../modules/Safely";
import Crypto from "../modules/Crypto";

Webserver.use(
    "/api/clips/:clip_id/hearts",
    (req, res, next) => {
        (req.method !== "PUT" && req.method !== "DELETE")
            ? Respond.withMethodNotAllowed(res)
            : next()
    },
    Validate.parameters("clip_id"),
    Validate.userSession(true),
    async (req: ERequest, res: EResponse): Promise<void> => {

        if (res.locals.token === false)
            return Respond.withUnauthorized(res)

        // [1] Ensure Clip Exists
        const [someClip, findClipError] = await Safely.call(
            Database.clip.findFirst({
                where: {
                    ["deleted"]: false,
                    ["id"]: res.locals.clip_id,
                },
                select: {
                    ["id"]: true
                }
            })
        )
        if (findClipError)
            return Respond.withServerError(res, findClipError)
        if (someClip === null)
            return Respond.withNotFound(res, "Unknown Clip")


        // [2] Find Heart
        const [someHeart, findHeartError] = await Safely.call(
            Database.heart.findFirst({
                where: {
                    ["clipId"]: res.locals.clip_id,
                    ["userId"]: res.locals.token.uid
                },
                select: {
                    ["id"]: true
                }
            })
        )
        if (findHeartError !== undefined)
            return Respond.withServerError(res, findHeartError)


        // [3] Modify Hearts
        const isCreating = (req.method === "PUT")

        if (isCreating === true && someHeart !== null)
            return Respond.withBadRequest(res, "Already Hearted")

        if (isCreating === false && someHeart === null)
            return Respond.withBadRequest(res, "Already Heartless")

        const [_, modifyError] = await Safely.call(
            isCreating
                // PUT: Create Heart
                ? Database.heart.create({
                    data: {
                        ["id"]: Crypto.generateSnowflake(),
                        ["userId"]: res.locals.token.uid,
                        ["clipId"]: res.locals.clip_id,
                    },
                    select: { ["id"]: true }
                })
                // DELETE: Remove Heart
                : Database.heart.delete({
                    where: { ["id"]: someHeart.id },
                    select: { ["id"]: true }
                })
        )
        if (modifyError !== undefined)
            return Respond.withServerError(res, modifyError)


        // [4] Modify Counters
        const [updatedClip, updateError] = await Safely.call(
            Database.clip.update({
                where: {
                    ["deleted"]: false,
                    ["id"]: someClip.id
                },
                select: {
                    ["approximateHeartCount"]: true
                },
                data: {
                    ["approximateHeartCount"]: {
                        increment: (isCreating ? 1 : undefined),
                        decrement: (isCreating ? undefined : 1),
                    }
                }
            })
        )
        if (updateError !== undefined)
            return Respond.withServerError(res, updateError)

        Respond.withJSON(res, updatedClip.approximateHeartCount)
    }
)