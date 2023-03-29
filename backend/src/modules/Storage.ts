import Cryptography from "./Cryptography";
import { S3 } from "@aws-sdk/client-s3";
import axios, { AxiosError } from "axios";
import { StatusCode } from "../typings/StatusCode";

// Cloudflare R2 Bucket (Storing Proccessed Files)
export const R2_BUCKET = process.env.R2_BUCKET as string
export const R2_Storage = new S3({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY as string,
        secretAccessKey: process.env.R2_SECRET_KEY as string
    }
})


// Local Storage Bucket (Storing Orignal Files)
interface B2ApiResponse {
    success: boolean;
    message: string;
    code:
    StatusCode.OK |
    StatusCode.NOT_FOUND |
    StatusCode.BAD_REQUEST |
    StatusCode.UNAUTHORIZED |
    StatusCode.CONFLICT |
    StatusCode.INSUFFICIENT_STORAGE |
    StatusCode.CREATED |
    StatusCode.INTERNAL_SERVER_ERROR
}

class B2_Client {
    private RB_URL = process.env.RB_URL as string
    private RB_AUTH = Cryptography.StrToB64(process.env.RB_AUTH as string)

    // Ensure Base URL is valid
    constructor() {
        axios
            .get(this.RB_URL)
            .catch((e: AxiosError) => console.log(
                "Environment Variable 'RB_URL' is not valid",
                e.response?.data || e.message
            ))
    }

    public async get(filePath: string): Promise<[true, any] | [false, B2ApiResponse]> {
        return new Promise(resolve => {
            axios.get(this.RB_URL + filePath)
                // Return Data
                .then(res => res.data)
                .then(dat => resolve([true, dat]))
                // API Error
                .catch((e: AxiosError) => resolve([false, e.response?.data as any]))
        })
    }

    public async set(path: string, filename: string, data: any, overwrite = false): Promise<true | B2ApiResponse> {
        return new Promise(resolve => {
            axios
                .post(this.RB_URL + path, data, {
                    headers: { "Authorization": `Basic ${this.RB_AUTH}` },
                    params: {
                        "overwrite": (overwrite ? "true" : ""),
                        "filename": filename
                    }
                })
                .then(res => resolve(true))
                .catch((e: AxiosError) => resolve(e.response?.data as any))
        })
    }

}

export const B2_Storage = new B2_Client()