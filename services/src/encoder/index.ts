import { ScriptMoveCompleteToReencode } from "../shared/other/RedisScripts";
import { Cache, createRedisConnection } from "../shared/util/Database";
import { keyEncoderAwaken } from "../shared/other/RedisKeys";
import { Encoding } from "../types/Encoder";
import Unique from "../shared/util/Unique";
import Froppy from "../shared/util/Froppy";
import Worker from "./Worker";

export const encodingMethods: Encoding[] = [
    {
        formatEnabled: () => true,
        formatContainer: "MP4",
        audioCodec: "AAC",
        audioBitrate: 320,
        videoCodec: "H264",
        videoResolution: [
            // Sort from worst to best or you're gonna have a bad time.
            { maxWidth: 256, maxHeight: 144, maxFPS: 30, maxBitrate: 300 },
            { maxWidth: 426, maxHeight: 240, maxFPS: 30, maxBitrate: 500 },
            { maxWidth: 640, maxHeight: 360, maxFPS: 30, maxBitrate: 1000 },
            { maxWidth: 854, maxHeight: 480, maxFPS: 30, maxBitrate: 2000 },
            { maxWidth: 1280, maxHeight: 720, maxFPS: 60, maxBitrate: 6000 },
            { maxWidth: 1920, maxHeight: 1080, maxFPS: 60, maxBitrate: 9000 },
        ]
    }
]

ScriptMoveCompleteToReencode.then(async scriptSha => {
    // Move Items from Complete Queue to Re-Encoding Queue
    const encodingHash = Unique.generateHash(JSON.stringify(encodingMethods))
    const itemsMoved = await Cache.evalSha(scriptSha, { keys: [encodingHash] })
    Froppy.info("MASTER", `Moved ${itemsMoved} items to Re-Encode queue`)

    // Create new Workers
    const workerCount = parseInt(process.env.ENCODER_WORKER_COUNT || "1")
    const workers = new Array<Worker>()
    for (let i = 0; i < workerCount; i++)
        workers.push(new Worker(i))

    // Awaken Workers on Event
    createRedisConnection().subscribe(
        keyEncoderAwaken,
        () => workers.forEach(w => w.awaken())
    )
})