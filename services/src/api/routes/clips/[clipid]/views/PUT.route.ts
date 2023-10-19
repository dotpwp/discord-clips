import { Cache, Database } from "../../../../../shared/util/Database";
import { ERequest, EResponse } from "../../../../../types/Express";
import { Webserver } from "../../../..";
import { DBError } from "../../../../../types/Database";
import Validate from "../../../../../shared/web/Validate";
import Unique from "../../../../../shared/util/Unique";
import Reply from "../../../../../shared/web/Reply";
import Safe from "../../../../../shared/util/Safe";

// Needs Tests:
// - Valid ID => 200 OK (true)
// - Valid ID Again => 200 OK (false)
// - Bogus ID => 404 Not Found

Webserver.put(
    "/api/clips/:clipid/views",
    Validate.routeParams("clipid"),
    Validate.userToken,
    async function (req: ERequest, res: EResponse) {
        const { locals } = res

        // [1] Check for Debounce via Fingerprint
        // - Respond with true to prevent abuse
        // - Hash fingerprint for user privacy when looking at keys at a glance
        const databaseKey = "view:debounce:" + Unique.generateHash(
            `${locals.ip}${locals.token.uid}${locals.clipid}`
        )
        const [keyExists, existsError] = await Safe.call(Cache.exists(databaseKey))
        if (existsError)
            return Reply.withServerError(res, existsError)
        if (keyExists === 1)
            return Reply.withJSON(res, false)

        // [2] Increment View Counter
        const [someVideo, updateVideoError] = await Safe.call(
            Database.clip.update({
                where: {
                    ["id"]: locals.clipid,
                    ["deleted"]: false,
                    ["availability"]: "READY"
                },
                select: { duration: true },
                data: { approximateViewCount: { increment: 1 } }
            })
        )
        if (updateVideoError?.code === DBError.NotFound)
            return Reply.withUnknown(res, "Unknown Clip")
        if (updateVideoError)
            return Reply.withServerError(res, updateVideoError)


        // [3] Setup Debounce
        // - Limited to 30 seconds or 80% of video duration if shorter
        // - Fire-and-Forget Cache.exists() should catch database errors
        await Promise.allSettled([
            Cache.set(databaseKey, "X", { EX: (someVideo.duration) > 40 ? 40 : Math.floor(someVideo.duration * 0.75) }),
            Cache.xAdd("views:tracker", "*", {
                ["ipAddress"]: locals.ip,
                ["userID"]: locals.token.uid.toString(),
                ["clipID"]: locals.clipid.toString(),
            })
        ])

        // [4] Send Response to Client
        Reply.withJSON(res, true)
    }
)