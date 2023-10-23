import { ERequest, EResponse } from "../../../../types/Express";
import { Database } from "../../../../shared/util/Database";
import { Webserver } from "../../..";
import Validate from "../../../../shared/web/Validate";
import Reply from "../../../../shared/web/Reply";
import Safe from "../../../../shared/util/Safe";

// Needs Tests:
// - Get Video => 200 OK
// - Get Video with Bad ID => 404 Not Found

Webserver.get(
    "/api/clips/:clipid",
    Validate.routeParams("clipid"),
    async function (req: ERequest, res: EResponse) {
        const { clipid } = res.locals

        // [1] Fetch Clip From Database
        const [someClip, fetchClipError] = await Safe.call(
            Database.clip.findFirst({
                where: {
                    ["deleted"]: false,
                    ["id"]: clipid
                },
                select: {
                    ["id"]: true,
                    ["created"]: true,
                    ["title"]: true,
                    ["description"]: true,
                    ["thumbnail"]: true,
                    ["preview"]: true,
                    ["duration"]: true,
                    ["availability"]: true,
                    ["approximateCommentCount"]: true,
                    ["approximateHeartCount"]: true,
                    ["approximateViewCount"]: true,
                    ["hearts"]: {
                        take: 10,
                        select: {
                            ["id"]: true,
                            ["created"]: true,
                            ["user"]: {
                                select: {
                                    ["id"]: true,
                                    ["avatar"]: true,
                                    ["alias"]: true,
                                }
                            }
                        }
                    },
                    ["user"]: {
                        select: {
                            ["id"]: true,
                            ["alias"]: true,
                            ["avatar"]: true,
                        }
                    },
                    ["server"]: {
                        select: {
                            ["id"]: true,
                            ["name"]: true,
                            ["icon"]: true,
                            ["allowGuests"]: true,
                            ["uploadCount"]: true,
                            ["categoryCount"]: true,
                        }
                    },
                    ["category"]: {
                        select: {
                            ["id"]: true,
                            ["created"]: true,
                            ["name"]: true,
                            ["icon"]: true,
                            ["flags"]: true,
                        }
                    },
                    ["formats"]: {
                        select: {
                            ["id"]: true,
                            ["container"]: true,
                            ["videoCodec"]: true,
                            ["videoFramerate"]: true,
                            ["videoBitrate"]: true,
                            ["videoHeight"]: true,
                            ["videoWidth"]: true,
                            ["audioCodec"]: true,
                            ["audioBitrate"]: true,
                        }
                    }
                }
            })
        )
        if (fetchClipError)
            return Reply.withApiError(res, fetchClipError)
        if (someClip === null)
            return Reply.withUnknown(res, "Unknown Clip")

        // [2] Send Response to Client
        Reply.withJSON(res, someClip)
    }
)