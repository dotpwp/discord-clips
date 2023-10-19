import { EnumAudioCodec, EnumContainerType, EnumVideoCodec } from "@prisma/client"
import { ffprobeData } from "./ffmpegAsync"

export interface VideoResolution {
    maxHeight: number;
    maxWidth: number;
    maxFPS: number;
    maxBitrate: number;
}

export interface Encoding {
    formatEnabled: (info: ffprobeData) => boolean
    formatContainer: EnumContainerType
    videoCodec: EnumVideoCodec
    videoResolution: VideoResolution[]
    audioCodec: EnumAudioCodec
    audioBitrate: number
}

export const enum Action {
    /*** Return Video to queue, another worker will handle it */
    ReplaceVideoID,
    /*** Removes Video ID from queue effectively sending it to limbo */
    DiscardVideoID,
    /*** Video has at least one playback source and is now available */
    VideoReady,
    /*** Video is unusable, mark as unavailable and remove from queue */
    VideoUnusable
}

export const enum Source {
    /** ID was recovered from hash "encoder:worker:state" */
    WorkerState = 1,
    /** ID was retrieved from Latest Queue (First Priority) */
    Latest = 2,
    /** ID was retrieved from ReEncode Queue (Second Priority) */
    Reencode = 3,
    /** No ID was returned */
    None = 4,
}