import { PrismaClient } from "@prisma/client";
import * as redis from "redis";
import Froppy from "./Froppy";

/** Default Postgres Database Connection */
export const Database = createPrismaClient()
/** Default Redis Database Connection */
export const Cache = createRedisConnection()

/** Creates a new Redis Client */
export function createRedisConnection() {
    // Create New Client
    let isReady = false
    const client = redis.createClient({
        ["url"]: process.env.DB_REDIS_URL,
        ["commandsQueueMaxLength"]: Infinity
    })
    // Connect to Database
    client
        .on("ready", () => isReady = true)
        .on("error", error => {
            if (!isReady) {
                Froppy.error("REDIS", "Connection Error", { error })
                process.exit(1)
            }
        })
        .connect()
    return client
}

/** Creates a New Prisma Client */
export function createPrismaClient() {
    let isReady = false
    const client = new PrismaClient({})
    client
        .$connect()
        .then(() => isReady = true)
        .catch(error => {
            if (!isReady) {
                Froppy.error("PRISMA", "Connection Error", { error })
                process.exit(1)
            }
        })
    return Object.assign(client, { isReady })
}