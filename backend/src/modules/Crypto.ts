import { createHmac } from "crypto";

export interface TokenData {
    uid: bigint;            // Discord User ID
    username: string;       // Discord Username/Displayname
    accessToken: string;    // Discord oAuth2 Access Token
    avatar: string | null;  // Discord User Avatar
    iat: number;            // Initialized At (UNIX Timestamp)
    eat: number;            // Expires At (UNIX Timestamp)
};

class Crypto {
    private HMAC_KEY: string = process.env.HMAC_KEY || "my-secret";

    // Creates a new JSON WEB TOKEN for the user with provided token data
    public createNewUserToken(tokenData: TokenData): string {

        const payload = Buffer
            .from(JSON.stringify(tokenData, (_, v) => typeof (v) === "bigint" ? v.toString() : v))
            .toString("base64url");

        const signature = createHmac("sha256", this.HMAC_KEY)
            .update(payload)
            .digest("base64url");

        return payload + "." + signature;
    };

    // Decodes and Verifies Given JSON WEB TOKEN from the user, returns false if bad
    public decodeAndVerifyUserToken(someToken: string): TokenData | false {
        if (!someToken) return false

        // Split up token into segments
        const [givenPayload, givenSignature] = someToken.split(".", 2);
        if (!givenPayload) return false;
        if (!givenSignature) return false;

        // Validate Token Signature
        const givenTokensDataSignature = createHmac("sha256", this.HMAC_KEY)
            .update(givenPayload)
            .digest("base64url");

        if (givenTokensDataSignature !== givenSignature) return false;

        // Parse and validate token fields
        const tokenJSON: TokenData = JSON.parse(
            Buffer.from(givenPayload, "base64url").toString()
        )

        if (tokenJSON.eat > Date.now()) return false;   // Token Expired
        tokenJSON.uid = BigInt(tokenJSON.uid);          // Parse User ID as bigint
        return tokenJSON;
    };

    // Generates Snowflake for Content IDs
    private SEQUENCE = 0
    private SHARDID = parseInt(process.env.SHARD_ID || "1")
    private EPOCH = new Date("June 26 2003").getTime()

    public generateSnowflake(): bigint {
        const i = this.SEQUENCE++ % 1024
        let result = (BigInt(Date.now()) - BigInt(this.EPOCH)) << 23n;
        result = result | (BigInt(this.SHARDID) << 10n);
        result = result | BigInt(i);
        return result;
    };
};

export default new Crypto();