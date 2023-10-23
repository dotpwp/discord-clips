import { FlagsCategories, FlagsPermissions } from "../../../../types/Permission";
import { ERequest, EResponse } from "../../../../types/Express";
import { ErrorMessage } from "../../../../types/Validator";
import { Webserver } from "../../..";
import { Database } from "../../../../shared/util/Database";
import { DBError } from "../../../../types/Database";
import generateThumbnails from "../../../../shared/encoder/generateThumbnails";
import ExpressBodyJSON from "../../../../shared/middleware/ExpressBodyJSON";
import Validator from "../../../../shared/util/Validator";
import Validate from "../../../../shared/web/Validate";
import Unique from "../../../../shared/util/Unique";
import Reply from "../../../../shared/web/Reply";
import Flags from "../../../../shared/util/Flags";
import Safe from "../../../../shared/util/Safe";
import Path from "../../../../shared/util/Path";
import { writeFile } from "fs/promises";
import { HttpStatusCode } from "axios";
import bytes from "bytes";
import sharp from "sharp";

// Needs Tests:
// - Valid Request => 200 OK
// - Unknown Video => 404 Not Found
// - Body larger than 32MB => 413 Payload too Large
// - Title length more than 100 characters => 400 Bad Request
// - Description length more than 4096 characters => 400 bad request
// - Invalid Category ID => 400 Bad Request
// - Bad Image Data => 400 Bad Request

const thumbError: ErrorMessage[] = ["thumb: Invalid or Malformed Image Data"]

interface RequestBody {
    title: string
    description: string
    category: bigint
    thumbnail: string
}

Webserver.patch(
    "/api/clips/:clipid",
    Validate.routeParams("clipid"),
    Validate.userToken,
    Validate.userIsLoggedIn,
    ExpressBodyJSON(bytes("32mb")),
    Validator.createMiddleware({
        ["title"]: {
            _description: "Video Title",
            type: "string",
            required: false,
            minimumLength: 0,
            maximumLength: 100,
        },
        ["description"]: {
            _description: "Video Description",
            type: "string",
            required: false,
            minimumLength: 0,
            maximumLength: 4096,
        },
        ["category"]: {
            _description: "Video Category. Use 0 to set as null.",
            type: "bigint",
            required: false,
        },
        ["thumbnail"]: {
            _description: "Base64 Encoded Image Data",
            type: "string",
            required: false,
        },
    }),
    async function (req: ERequest<RequestBody>, res: EResponse) {
        const { clipid, token } = res.locals
        const { body } = req

        // [1] Fetch Clip via ID
        const [someClip, fetchClipError] = await Safe.call(
            Database.clip.findFirst({
                where: {
                    ["id"]: clipid,
                    ["deleted"]: false
                },
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

        // Server Managers & Uploader are the only ones who can edit this video
        const isMod = Flags.test(Validate.getPermissions(res), FlagsPermissions.MANAGE_GUILD)
        if (someClip.userId !== token.uid && !isMod)
            return Reply.withApiError(res, HttpStatusCode.Unauthorized)


        // [2] Validate Category
        if (body.category && body.category !== 0n) {
            // [2A] Fetch Category
            const [someCategory, fetchCategoryError] = await Safe.call(
                Database.category.findFirst({
                    where: { id: body.category },
                    select: { flags: true }
                })
            )
            if (someCategory === null)
                return Reply.withUnknown(res, "Unknown Category")
            if (fetchCategoryError)
                return Reply.withServerError(res, fetchCategoryError)

            // [2B] Test Category Flags
            if (Flags.test(someCategory.flags, FlagsCategories.MOD_MANAGED) && !isMod)
                return Reply.withApiError(res, HttpStatusCode.Unauthorized)
        }


        // [3] Validate Thumbnail Data
        let imageID: string | undefined = undefined
        if (body.thumbnail) {
            imageID = Unique.generateID()
            const imagePath = Path.forImageBlob(someClip.id, imageID)
            const imageData = Buffer.from(body.thumbnail.replace(/^data:image\/\w+;base64,/, ""), "base64")

            // [3A] Validate Thumbnail using Sharp
            const [_, testImageError] = await Safe.call(sharp(imageData).stats())
            if (testImageError)
                return Reply.withParserError(res, thumbError)

            // [3B] Write Thumbnail to Disk
            const [__, writeImageError] = await Safe.call(writeFile(imagePath, imageData))
            if (writeImageError)
                return Reply.withParserError(res, thumbError)

            // [3C] Create Thumbnail Folder
            const contentPath = await Path.createThumbnailDirectory(someClip.id, imageID)
            if (contentPath instanceof Error)
                return Reply.withServerError(res, contentPath)

            // [3D] Generate Thumbnails
            const [___, convertThumbnailError] = await Safe.call(generateThumbnails(contentPath, imagePath))
            if (convertThumbnailError)
                Reply.withParserError(res, thumbError)
        }

        // [4] Update Clip
        const [updatedClip, updateClipError] = await Safe.call(
            Database.clip.update({
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
                },
                where: {
                    ["id"]: someClip.id,
                    ["deleted"]: false,
                },
                data: {
                    ["title"]: body.title,
                    ["description"]: body.description,
                    ["categoryId"]: (body.category === 0n) ? null : body.category,
                    ["thumbnail"]: imageID,
                },
            })
        )
        if (updateClipError?.code === DBError.NotFound)
            return Reply.withUnknown(res, "Unknown Clip")
        if (updateClipError?.code === DBError.ForeignNotFound)
            return Reply.withUnknown(res, "Unknown Category")
        if (updateClipError)
            return Reply.withServerError(res, updateClipError)

        // [5] Send Response to Client
        Reply.withJSON(res, updatedClip)
    }
)