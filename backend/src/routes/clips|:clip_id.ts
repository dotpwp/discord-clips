import { ERequest, EResponse } from "../types/Express"
import { Webserver } from "../Webserver"
import { Database } from "../modules/Database"
import Validate from "../middleware/Validate"
import Respond from "../modules/Respond"
import Safely from "../modules/Safely"
import { join } from "path"
import sharp = require("sharp")


Webserver.get(
    "/api/clips/:clip_id",
    Validate.parameters("clip_id"),
    async (req: ERequest, res: EResponse): Promise<void> => {

        // [1] Fetch Clip from Database
        const [someClip, fetchError] = await Safely.call(
            Database.clip.findFirst({
                where: {
                    ["deleted"]: false,
                    ["id"]: res.locals.clip_id,
                },
                select: {
                    ["id"]: true,
                    ["created"]: true,
                    ["title"]: true,
                    ["description"]: true,
                    ["duration"]: true,
                    ["approximateViewCount"]: true,
                    ["approximateHeartCount"]: true,
                    ["available"]: true,
                    ["server"]: {
                        select: {
                            ["id"]: true,
                            ["name"]: true,
                            ["icon"]: true,
                            ["uploadCount"]: true,
                            ["categoryCount"]: true,
                        }
                    },
                    ["user"]: {
                        select: {
                            ["id"]: true,
                            ["avatar"]: true,
                            ["username"]: true,
                            ["uploadCount"]: true,
                        }
                    },
                    ["category"]: {
                        select: {
                            ["id"]: true,
                            ["name"]: true,
                            ["icon"]: true,
                        }
                    },
                    ["formats"]: {
                        select: {
                            ["id"]: true,
                            ["encodingStatus"]: true,
                            ["encodingTime"]: true,
                            ["codecAudio"]: true,
                            ["codecVideo"]: true,
                            ["videoHeight"]: true,
                            ["videoWidth"]: true,
                            ["framerate"]: true,
                            ["bitrateAudio"]: true,
                            ["bitrateVideo"]: true,
                        }
                    },
                    ["hearts"]: {
                        take: 10,
                        select: {
                            ["id"]: true,
                            ["created"]: true,
                            ["user"]: {
                                select: {
                                    ["id"]: true,
                                    ["avatar"]: true,
                                    ["username"]: true,
                                }
                            }
                        }
                    }
                }
            })
        )
        if (fetchError !== undefined)
            return Respond.withServerError(res, fetchError)

        if (someClip === null)
            return Respond.withNotFound(res, "Unknown Clip")

        Respond.withJSON(res, someClip)
    }
)


interface RequestBody {
    title?: string
    description?: string
    thumbnail?: string
}

Webserver.use(
    "/api/clips/:clip_id",
    (req, res, next) => {
        if (req.method === "PATCH")
            return Validate.responseBody({
                ["title"]: {
                    type: "string",
                    required: false,
                    maximumLength: 320,
                    minimumLength: 1,
                },
                ["description"]: {
                    type: "string",
                    required: false,
                    minimumLength: 1,
                    maximumLength: 4096,
                },
                ["thumbnail"]: {
                    type: "string",
                    required: false,
                    maximumLength: (32 * 1e+6) // 32MB
                }
            })(req, res, () => next())

        req.method === "DELETE"
            ? next()
            : Respond.withMethodNotAllowed(res)
    },
    Validate.parameters("clip_id"),
    Validate.userSession(true),
    async (req: ERequest, res: EResponse): Promise<void> => {

        const body: RequestBody = req.body
        if (res.locals.token === false)
            return Respond.withUnauthorized(res)


        // [1] Ensure User can Modify Clip/Server
        const [originalClip, fetchError] = await Safely.call(
            Database.clip.findFirst({
                where: {
                    ["deleted"]: false,
                    ["id"]: res.locals.clip_id,
                },
                select: {
                    ["id"]: true,
                    ["userId"]: true,
                }
            })
        )
        if (fetchError)
            return Respond.withServerError(res, fetchError)

        if (originalClip === null)
            return Respond.withNotFound(res, "Unknown Clip")

        if (
            originalClip.userId !== res.locals.token.uid    // Check for clip owner
            && Validate.canModifyServer(res) === false      // Mods bypass owner check
        )
            return Respond.withUnauthorized(res)


        // [2] Store New Thumbnail
        if (req.method === "PATCH" && body.thumbnail !== undefined) {

            // Have sharp parse data to ensure it is valid
            const [_, writeError] = await Safely.call(
                sharp()
                    .end(Buffer.from(body.thumbnail.slice(body.thumbnail.indexOf(",") + 1), "base64"))
                    .resize({ withoutEnlargement: true, width: 1280, height: 720 })
                    .png()
                    .toFile(join(process.cwd(), "media", req.params.clip_id, "original.thumbnail.png"))
            )
            if (writeError)
                // Can't test for a server error, so I will assume its a client problem.
                return Respond.withBadRequest(res, "Field 'image' contains malformed or corrupted data")
        }


        // [3] Update Clip in Database
        const [updatedClip, updateError] = await Safely.call(
            Database.clip.update({
                where: {
                    ["deleted"]: false,
                    ["id"]: res.locals.clip_id,
                },
                select: {
                    ["id"]: true,
                    ["title"]: true,
                    ["description"]: true,
                },
                data: {
                    ["deleted"]: (req.method === "DELETE") ? true : undefined,
                    ["title"]: body?.title,
                    ["description"]: body?.description,
                }
            })
        )
        if (updateError !== undefined)
            return Respond.withServerError(res, updateError)

        Respond.withJSON(res, updatedClip)
    }
)