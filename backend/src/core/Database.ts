import { PrismaClient } from "../../../prisma-client";
import { createClient } from "redis";
import { Logger } from "./Logger";

// Disconnect from Databases
process.on("beforeExit", () => {
    console.debug("Closing Database Connections")
    prisma.$disconnect()
    // PubSub.disconnect()
    Redis.disconnect()
})

// Create New Redis Client
function createNewRedisClient(name: string, url: string) {
    const DbName = `REDIS:${name}`
    const newRedisClient = createClient({ url })
    let hasConnected = false

    // Append Event Listeners
    newRedisClient.once("ready", () => hasConnected = true)
    newRedisClient.on("error", (error) => {
        // Connection errored before it had succesfully started, this means it was misconfigured
        if (!hasConnected) Logger.fatal(DbName, "Connection failed to start", { error })

        // Generic Error
        Logger.error(DbName, "An error has occurred", error)
        process.exit(1)
    })

    // Connect to Database
    newRedisClient.connect()
    return newRedisClient
}


// Export Clients
const DBURL = process.env.DB_REDIS_URL || process.exit(1)
export const Limiter = createNewRedisClient("LIMITER", DBURL)
// export const PubSub = createNewRedisClient("PUBSUB", DBURL)
export const Redis = createNewRedisClient("DEFAULT", DBURL)
export const prisma = new PrismaClient()