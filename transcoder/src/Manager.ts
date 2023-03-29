import { Transcoder } from "./class/Transcoder"
import { PubSub } from "./core/Database"

// Start Transcoders
const workerCount = 1
const transcoders: Transcoder[] = []
for (var i = 0; i < workerCount; i++) {
    const worker = new Transcoder(i, workerCount)
    transcoders.push(worker)
    worker.startWork()
}

// Listen for New Video Events
PubSub.once("ready", () => {
    PubSub.subscribe(["video:queue:add"], (message: string, channel: string) => {
        switch (channel) {

            // Wakeup relevant transcoder
            case "video:queue:add":
                const videoId = BigInt(message)
                const workerId = Number(videoId % BigInt(workerCount))
                const worker = transcoders[workerId]
                if (worker) worker.startWork()
                break

        }
    })
})