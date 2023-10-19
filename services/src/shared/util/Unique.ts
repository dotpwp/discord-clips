import { BinaryLike, createHash, randomBytes } from "crypto";

class Unique {
    private SEQUENCE = 0n
    private EPOCH = new Date("June 26 2003").getTime()
    private WORKER_ID = parseInt(process.env.WORKER_ID || "1")
    /**
     * Creates a Unique Snowflake (Safe to use for Row ID)
     * @see - Snowflake Documentation: https://docs.snowflake.com/
     * @example generateSnowflake() => 1541815603606036480
    */
    public generateSnowflake(): bigint {
        const i = this.SEQUENCE++ % 1024n
        let result = (BigInt(Date.now()) - BigInt(this.EPOCH)) << 23n
        result = result | (BigInt(this.WORKER_ID) << 10n)
        result = result | BigInt(i)
        return result
    }
    /**
     * Return MD5 Hash of Content
     * @param someData - Data to Hash
     * @returns 
     */
    public generateHash(someData: BinaryLike): string {
        return createHash("md5").update(someData).digest("hex")
    }
    /**
     * Generates a random string based on: 
     * - Date.now()
     * - 5 Random Bytes
     * - Current Sequence
     * @example "18ae76850783118599de60"
    */
    public generateID(): string {
        return Date.now().toString(16)          // Current Time
            + randomBytes(5).toString("hex")    // Random Bytes
            + (this.SEQUENCE++).toString(16)    // Sequence
    }
}
export default new Unique()