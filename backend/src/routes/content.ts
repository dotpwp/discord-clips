import { ERequest, EResponse } from "../types/Express"
import { Webserver } from "../Webserver"
import Validate from "../middleware/Validate"
import Respond from "../modules/Respond";
import { promisify } from "util";
import { exists } from "fs";
import { join } from "path";
import sharp = require("sharp")

const fileExists = promisify(exists)
const FOLDER_PATH = join(process.cwd(), "media")
const MIME_TYPES: { [key: string]: string } = {
    webp: "image/webp",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
}
const ACCEPTED_FORMATS = new Set<string>(Object.keys(MIME_TYPES))
const DEFAULT_IMAGE_SIZE = "128"


Webserver.get(
    "/content/thumbnails/:clip_id.:format",
    Validate.parameters("clip_id"),
    async function (req: ERequest, res: EResponse): Promise<void> {
        const { clip_id, format } = req.params

        // Ensure this image can be encoded
        if (ACCEPTED_FORMATS.has(format) === false)
            return Respond.withBadRequest(res, "Unsupported Image Format")

        // Ensure Image is between (32px and 1024px) tall
        const size = parseInt(
            Array.isArray(req.query.size)
                ? req.query.size[0] as string
                : req.query.size as string || DEFAULT_IMAGE_SIZE
        )
        if (size % 4 !== 0)
            return Respond.withBadRequest(res, "Size must be divisible by 4")
        if (size < 32)
            return Respond.withBadRequest(res, "Image must be larger than 32px")
        if (size > 1080)
            return Respond.withBadRequest(res, "Image must be smaller than 1024px")

        try {
            // Ensure File Exists
            const filePath = join(FOLDER_PATH, clip_id, "original.thumbnail.png")
            if (await fileExists(filePath) === false)
                return Respond.withNotFound(res, "Uknown Image")

            // Resize/Reencode Image to Desired Format
            const vips = sharp(filePath)
                .resize({
                    background: { r: 0, g: 0, b: 0 },
                    height: size,
                    width: (size * 1.77777777778) | 0,
                    fit: "contain"
                })

            if (format === "jpg" || format === "jpeg") vips.jpeg({
                progressive: true,
                quality: 75,
            })
            if (format === "png") vips.png({
                quality: 50,
                progressive: true
            })
            if (format === "webp") vips.webp({
                quality: 75,
                effort: 4,
            })

            // Send Image to Client
            res.header("Cache-Control", "public, max-age=31536000")
            res.header("Content-Type", MIME_TYPES[format])
            vips.pipe(res)

        } catch (someError) {
            // Catch Processing Error
            Respond.withServerError(res, someError)
        }
    }
)


Webserver.get(
    "/content/videos/:clip_id/:format_id.mp4",
    Validate.parameters("clip_id", "format_id"),
    async (req: ERequest, res: EResponse) => {
        // Should be safe as Validate.parameters only allows bigints (which aren't strings)
        const filePath = join(FOLDER_PATH, res.locals.clip_id.toString(), res.locals.format_id + ".mp4")
        await fileExists(filePath)
            ? res.sendFile(filePath)
            : Respond.withNotFound(res, "Unknown Video")
    }
)