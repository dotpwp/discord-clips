import { Request, Response } from "express"
import { randomBytes } from "crypto"
import { File } from "multiparty"
import { ValidatorOptions } from "../../typings/BodyValidator"
import { prisma, Redis } from "../../core/Database"
import ProbeFile from "../../modules/ProbeFile"
import Responses from "../../modules/Responses"
import pcall from "../../modules/pcall"

interface RequestBody {
    title: string;
    description: string;
    media: File;
}

export async function Route_ClipsUpload(req: Request, res: Response) {
    const { title, description, media }: RequestBody = req.body

    // [1] Probe the Media File
    const [ok, results] = await ProbeFile(media.path)
    if (!ok) {
        // Internal Error Ocurred
        if (results.errored) return Responses.abort(res,
            `ClipsUpload[1]: ${results.errored}`, results
        )
        // Bad Request
        return Responses.badRequest(res, results.reason)
    }

    // [2] Create New Video
    prisma.video.create({
        select: {
            videoId: true,
            shareId: true,
        },
        data: {
            userId: res.locals.userId,
            shareId: randomBytes(4).toString("hex"),
            title,
            description,
            encodeInfo: JSON.stringify({ results, media })
        }
    })
        .then(newVideo => {
            // Announce that video has been queued
            // This will notify the transcoder manager of a new video
            pcall(Redis.publish("video:queue:add", newVideo.videoId.toString()))

            // Send Response
            res.json({ videoId: newVideo.shareId })
        })
        .catch(e => Responses.abort(res, "ClipsUpload[2]", e))
}

export const BV_ClipsUpload: ValidatorOptions = {
    title: {
        type: "STRING",
        required: true,
        maximumLength: 100,
        minimumLength: 1,
    },
    description: {
        type: "STRING",
        required: true,
        maximumLength: 4000,
        minimumLength: 1
    },
    media: {
        type: "FILE",
        required: true,
    }
}