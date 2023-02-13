import { EnumAudioCodec, EnumVideoCodec } from "@prisma/client";

type ProbeInfoJSON = string;

export interface EncoderOptions {
    probeInfo: ProbeInfoJSON;
    trimEnd: number;
    trimStart: number;
    thumbnailAt: number;
    hasCustomThumbnail: boolean;
}

export interface WorkerSettings {
    workerCount: number;
    encoders: {
        // H264: h264_videotoolbox
        [key: string]: string;
    };
    encodings: {
        enabled: boolean;           // true
        codecVideo: EnumVideoCodec; // H264
        codecAudio: EnumAudioCodec; // AAC
        videoBitrate: number;       // 6000
        audioBitrate: number;       // 128
        maxWidth: number;           // 1920
        maxHeight: number;          // 1080
        maxFPS: number;             // 60
    }[]
}