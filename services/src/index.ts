import Safe from "./shared/util/Safe";
import { config } from "dotenv";

export const
    envProd             = (process.env.NODE_ENV === "production"),
    envParsed           = (envProd ? false : config({ path: ".env" })),
    serviceHost         = (process.env.HOSTNAME || "0.0.0.0"),
    serviceName         = (process.env.SERVICE || (process.argv.at(-1) || "none").toLowerCase()),
    ffmpegPath: string  = (Safe.packageExists("ffmpeg-static") ? require("ffmpeg-static") : "ffmpeg"),
    ffprobePath: string = (Safe.packageExists("ffprobe-static") ? require("ffprobe-static").path : "ffprobe")

// [1] Validate Environment Variables
import Froppy from "./shared/util/Froppy";
import Validator from "./shared/util/Validator";

const [newEnv, envErrors] = Validator.createValidator({
    ["DATA_DIR"]: {
        _description: `Shared Directory to store files in. Set to "/data" for docker.`,
        type: "string",
        required: true,
    },
    ["NODE_ENV"]: {
        _description: "Change app behavior depending on environment.",
        type: "string",
        required: false,
        regex: [{
            message: `Value must be "production" or "development"`,
            pattern: new RegExp(/(production|development)/)
        }]
    },
    ["WORKER_ID"]: {
        _description: "Worker ID used by Snowflake Generator",
        type: "number",
        required: true,
        minimumValue: 0,
    },
    /** Database URLs */
    ["DB_POSTGRES_URL"]: {
        _description: "Database URL for Postgres",
        type: "string",
        required: (process.env.DB_BYPASS_URL_VALIDATION !== undefined),
        regex: [{
            message: "Invalid Database URL. Bypass validation with DB_BYPASS_URL_VALIDATION.",
            pattern: new RegExp(/(postgres:\/\/|postgresql:\/\/)/)
        }]
    },
    ["DB_REDIS_URL"]: {
        _description: "Database URL for Redis",
        type: "string",
        required: (process.env.DB_BYPASS_URL_VALIDATION !== undefined),
        regex: [{
            message: "Invalid Database URL. Bypass validation with DB_BYPASS_URL_VALIDATION.",
            pattern: new RegExp(/(redis:\/\/|rediss:\/\/)/)
        }]
    },
    /** Webserver Settings */
    ["WEB_SIGNATURE"]: {
        _description: `Secret to sign tokens with. Defaults to "my-secret" in development.`,
        type: "string",
        required: (envProd && serviceName === "api"),
        minimumLength: 8,
    },
    ["WEB_PROXY_MODE"]: {
        _description: "Set proxy server is running behind, turns off request logging if set.",
        type: "string",
        required: (serviceName === "api"),
        regex: [{
            message: `Value must of "nginx", "cloudflare", "none"`,
            pattern: new RegExp(/(nginx|cloudflare|none)/)
        }]
    },
    ["WEB_CORS_ORIGIN"]: {
        _description: `Origin for CORS header, defaults to "http://localhost".`,
        type: "string",
        required: (envProd && serviceName === "api"),
    },
    ["WEB_HOSTNAME"]: {
        _description: "Hostname to bind Webserver to.",
        type: "string",
        required: (envProd && serviceName === "api"),
    },
    /** Discord oAuth: Use /login-debug route while in development. */
    ["DISCORD_OAUTH_AUTH_URL"]: {
        _description: "URL to redirect user when they attempt to login with a code.",
        type: "string",
        required: (envProd && serviceName === "api"),
    },
    ["DISCORD_OAUTH_REDIRECT"]: {
        _description: `Value to use for field "redirect_uri" when exchanging token`,
        type: "string",
        required: (envProd && serviceName === "api"),
    },
    ["DISCORD_OAUTH_CLIENT_ID"]: {
        _description: `Value to use for field "client_id" when exchanging token`,
        type: "bigint",
        required: (envProd && serviceName === "api"),
    },
    ["DISCORD_OAUTH_SECRET"]: {
        _description: `Value to use for field "client_secret" when exchanging token`,
        type: "string",
        required: (envProd && serviceName === "api"),
    },
    /** Encoding Options */
    ["ENCODER_WORKER_COUNT"]: {
        _description: "Amount of workers to create for encoding purposes.",
        type: "number",
        required: (serviceName === "encoder"),
        minimumValue: 1,
    },
})(process.env)
process.env = newEnv
if (envErrors.length) {
    Froppy.error("STARTUP", "Invalid Options:", { error: envErrors })
    process.exit(1)
}

// [2] Start Application
switch (serviceName) {
    case "api": case "encoder":
        Froppy.info("STARTUP", `Starting Service: ${serviceName}`)
        require(`./${serviceName}/index`)
        break
    default:
        Froppy.error("STARTUP", `Service must be of type "encoder", or "api". ("${serviceName}")`)
        process.exit(1)
}