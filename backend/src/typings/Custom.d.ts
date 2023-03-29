import "express";

declare global {
    interface Locals {
        userId: bigint;
        tokenTimestamp: number;
    }

    declare module "express" {
        export interface Response {
            locals: Locals;
        }
    }

    namespace NodeJS {
        export interface NodeEnv {
            NODE_ENV: "development" | "production";
        }
    }

}