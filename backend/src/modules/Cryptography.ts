import { createHash, createHmac } from "crypto";
import { InvalidTokenReason } from "../typings/Cryptography";

class Cryptography {

    // Snowflake Generator
    private SEQUENCE = 0
    private SHARDID = parseInt(process.env.SHARD_ID || "1")
    private EPOCH = new Date("June 26 2003").getTime()
    generateSnowflake(): bigint {
        const i = this.SEQUENCE++ % 1024
        let result = (BigInt(Date.now()) - BigInt(this.EPOCH)) << 23n;
        result = result | (BigInt(this.SHARDID) << 10n);
        result = result | BigInt(i);
        return result;
    }


    // Image Hashing Function
    hashImage(file: Buffer, animated = false): string {
        let hash = animated ? "a_" : ""
        hash += (Date.now() / 1000 | 0).toString(16)
        hash += createHash("md5").update(file).digest("hex")
        return hash
    }

    // Text Hashing Function
    hashText(text: string): string {
        return createHash("md5")
            .update(text)
            .digest("hex")
    }

    // Generate Login Token
    private authSecret = process.env.AUTH_SECRET || "my-secret"
    // Convert Base64 into String
    B64toStr = (x: string) => Buffer.from(x, "base64url").toString("utf8")
    // Convert String to Base64
    StrToB64 = (x: string | number) => Buffer.from(x.toString()).toString("base64")

    generateToken(userId: bigint | string): string {
        const payload =
            this.StrToB64(userId.toString()) + "." +
            this.StrToB64(Date.now() - this.EPOCH)

        const signature = createHmac("sha256", this.authSecret)
            .update(payload)
            .digest("base64")

        // Return New Token
        return `${payload}.${signature}`
    }



    validateToken(someToken: string): [true, { userId: string, timestamp: number }] | [false, InvalidTokenReason] {
        // Retrieve Token Segments
        const [userId, timestamp, signature] = someToken.split(".", 3)
        if (!userId) return [false, InvalidTokenReason.MISSING_PAYLOAD]
        if (!timestamp) return [false, InvalidTokenReason.MISSING_TIMESTAMP]
        if (!signature) return [false, InvalidTokenReason.MISSING_SIGNATURE]

        // Validate Token Signature
        const somePayloadSignature = createHmac("sha256", this.authSecret)
            .update(`${userId}.${timestamp}`)
            .digest("base64")

        if (somePayloadSignature !== signature)
            return [false, InvalidTokenReason.INVALID_SIGNATURE]

        // Return Validated Signature
        return [true, {
            userId: this.B64toStr(userId),
            timestamp: parseInt(this.B64toStr(timestamp)) + this.EPOCH
        }]
    }


}

export default new Cryptography();
