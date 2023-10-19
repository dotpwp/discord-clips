import { EnumAudioCodec, EnumVideoCodec } from "@prisma/client";
import { ffmpegPath } from "../..";
import Froppy from "../util/Froppy";
import cp from "child_process";

const enum EnumHardware {
    Software = "software",
    VideoToolbox = "cpu_apple",
    Quicksync = "cpu_intel",
    NVENC = "gpu_nvidia",
    AMF = "gpu_amd",
}

/**
 * Automatically determines hardware on machine to make encoding faster.
 * Making sure CPU is for Requests/Image Processing and GPU is for Encoding.
*/
class ffmpegCodec {
    private withHardware = EnumHardware.Software
    private customMap(assign: any): { [key: string]: string } {
        return Object.assign({
            [EnumVideoCodec.AV1]: "libaom-av1",
            [EnumVideoCodec.VP9]: "libvpx-vp9",
            [EnumVideoCodec.H264]: "libx264",
            [EnumAudioCodec.OPUS]: "libopus",
            [EnumAudioCodec.AAC]: "aac",
            [EnumAudioCodec.NONE]: "",
        }, assign)
    }

    // Mapping for Custom
    private encoderMapping = {
        [EnumHardware.Software]: this.customMap({}),
        [EnumHardware.NVENC]: this.customMap({
            [EnumVideoCodec.H264]: "h264_nvenc",
        }),
        [EnumHardware.Quicksync]: this.customMap({
            [EnumVideoCodec.H264]: "h264_qsv",
        }),
        [EnumHardware.VideoToolbox]: this.customMap({
            [EnumVideoCodec.H264]: "h264_videotoolbox",
        }),
        [EnumHardware.AMF]: this.customMap({
            [EnumVideoCodec.H264]: "h264_amf",
        }),
    }

    constructor() {
        // Check to see if hardware acceleration is available
        const exec = cp.spawnSync(ffmpegPath, ["-hide_banner", "-hwaccels"])
        const hwaccels = exec.stdout.toString()

        if (hwaccels.includes("videotoolbox"))
            this.withHardware = EnumHardware.VideoToolbox
        if (hwaccels.includes("cuda"))
            this.withHardware = EnumHardware.NVENC
        if (hwaccels.includes("amf"))
            this.withHardware = EnumHardware.AMF
        if (hwaccels.includes("qsv"))
            this.withHardware = EnumHardware.Quicksync

        Froppy.info("FFMPEG", `Using: ${this.withHardware}`)
    }

    /** Fastest Video/Audio codec depending on hardware */
    public get(forCodec: EnumVideoCodec | EnumAudioCodec) {
        return this.encoderMapping[this.withHardware][forCodec]
    }
}
export default new ffmpegCodec()