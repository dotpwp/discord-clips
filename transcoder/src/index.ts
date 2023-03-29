// Load Environment Variable(s)
import { config } from "dotenv";
if (config({ path: "../.env" })) console.debug(
    "Loaded environment variables from file"
)

// Check Environment Variables
function assertEnvironmentVariable(name: string) {
    if (process.env[name]) return
    console.error(`Environment Variable '${name}' is not set`)
    process.exit(1)
}
assertEnvironmentVariable("DB_REDIS_URL")
assertEnvironmentVariable("R2_BUCKET")
assertEnvironmentVariable("R2_ACCOUNT_ID")
assertEnvironmentVariable("R2_ACCESS_KEY")
assertEnvironmentVariable("R2_SECRET_KEY")
assertEnvironmentVariable("RB_AUTH")
assertEnvironmentVariable("RB_URL")

// Start Application
import "./core/Database"
import "./Manager"