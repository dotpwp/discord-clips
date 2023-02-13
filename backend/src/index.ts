// [1] Set ffmpeg & ffprobe Path
import * as ffprobeStatic from "ffprobe-static"
import * as ffmpegStatic from "ffmpeg-static"
import * as ffmpeg from "fluent-ffmpeg"

ffmpeg.setFfprobePath(ffprobeStatic.path) // @ts-ignore
ffmpeg.setFfmpegPath(ffmpegStatic)

// [2] Load environment variables
import { config } from "dotenv"
import { Log } from "./modules/Log"

if (config({ path: ".env" }).parsed)
    Log.warn(".ENV", "Loaded variable(s) from file")

function assertEnvironmentVariable(name: string, required = false) {
    if (process.env[name]) return true
    if (required) {
        // Exit program because variable isn't set
        Log.error("ENV", `Environment Variable '${name}' must be set! Exiting...`)
        process.exit(1)
    } else {
        // Warn user that variable isn't set
        Log.warn("ENV", `Environment Variable '${name}' is not set (Using Default).`)
        return false
    }
}

// App Options
assertEnvironmentVariable("HMAC_KEY")
assertEnvironmentVariable("PROXY_MODE")
assertEnvironmentVariable("DB_POSTGRES_URL", true)
assertEnvironmentVariable("ENCODER_OPTIONS", true)
assertEnvironmentVariable("DISCORD_OAUTH_SECRET", true)
assertEnvironmentVariable("DISCORD_OAUTH_CLIENT_ID", true)
assertEnvironmentVariable("DISCORD_OAUTH_REDIRECT", true)
assertEnvironmentVariable("DISCORD_OAUTH_AUTH_URL", true)

// [3] Start Application
import "./Webserver"
import "./Encoder"