import { EnumContainerType } from "@prisma/client";
import { mkdir, mkdirSync } from "fs";
import { join, resolve } from "path";

class Path {
    /** Share Data Directory Path */
    private dataDirectory = process.env.DATA_DIR
        ? resolve(process.env.DATA_DIR)
        : join(process.cwd(), "data")
    /**
     * 🌐 Public Folder: "/content/{video.id}/thumbnails/{video.thumbnail}/{max|med|min}_default.{webp|jpeg}"
     * - Store resized thumbnails here
     * 
     * 🌐 Public Folder: "/content/{video.id}/formats/{format.id}.{format.container}"
     * - Store encoded formats here
    */
    public publicContentDirectory = join(this.dataDirectory, "content")
    /**
     * 🔒 Private Folder: "/blobs"
     * - Store original video and thumbnail blobs here
     * - Files should be renamed once used if they may be overwritten
    */
    public privateBlobsDirectory = join(this.dataDirectory, "blobs")
    /**
     * 🔒 Private Folder: "/logs"
     * - Store logs files here
    */
    public privateLogsDirectory = join(this.dataDirectory, "logs")

    constructor() {
        // Marked as recursive to prevent an error from
        // appearing due to already existing folders
        mkdirSync(this.dataDirectory, { recursive: true })
        mkdirSync(this.privateLogsDirectory, { recursive: true })
        mkdirSync(this.privateBlobsDirectory, { recursive: true })
        mkdirSync(this.publicContentDirectory, { recursive: true })
    }

    /** Resolves to an error if failed, returns folder path if created */
    public async createThumbnailDirectory(videoID: bigint | string, imageID: string) {
        return new Promise<string | Error>(async (resolve) => {
            const contentPath = join(this.publicContentDirectory, videoID.toString(), "thumbnails", imageID)
            mkdir(contentPath, { recursive: true }, (error) => error ? resolve(error) : resolve(contentPath))
        })
    }
    /** Resolves to error if failed, returns folder path if created */
    public async createFormatsDirectory(videoID: bigint | string) {
        return new Promise<string | Error>(async (resolve) => {
            const contentPath = join(this.publicContentDirectory, videoID.toString(), "formats")
            mkdir(contentPath, { recursive: true }, (error) => error ? resolve(error) : resolve(contentPath))
        })
    }

    /** Output path for a format or preview */
    public outputFormatPath(videoID: bigint | string, formatID: bigint | string, container: EnumContainerType): string {
        return join(this.publicContentDirectory, videoID.toString(), "formats", formatID + "." + container.toLowerCase())
    }

    /** The path to a folder full of blobs */
    public forBlobs(videoID: bigint | string): string {
        return join(this.privateBlobsDirectory, videoID.toString())
    }
    /** The path for an image in the blob folder */
    public forImageBlob(videoID: bigint | string, imageID: string): string {
        return join(this.privateBlobsDirectory, videoID.toString(), `image.${imageID}.blob`)
    }
    /** The path for the original video in the blob folder */
    public forVideoBlob(videoID: bigint | string): string {
        return join(this.privateBlobsDirectory, videoID.toString(), "video.original.blob")
    }
}

export default new Path()