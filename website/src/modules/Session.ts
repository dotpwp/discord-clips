import { Cookies } from "react-cookie";
import { JsonPermissions } from "../types/database";

const cookieJar = new Cookies()
const enum DiscordPerms {
    ADMINISTRATOR = (1 << 3),
    MANAGE_GUILD = (1 << 5),
}

class Session {
    public loggedIn: boolean = false
    public userId: string | null = null
    public username: string | null = null
    public avatar: string | null = null
    public created: Date | null = null
    public expires: Date | null = null
    public permissions: JsonPermissions = {}

    constructor() {
        // Decode and Parse 'auth_token' cookie
        const tokenString = cookieJar.get("auth_token")
        if (!tokenString) return
        const [payload, signature] = tokenString.split(".", 2)
        if (!payload || !signature) return

        try {
            const tokenData = JSON.parse(atob(payload))
            this.userId = tokenData.uid
            this.username = tokenData.username
            this.avatar = tokenData.avatar
            this.created = new Date(tokenData.iat * 1000)
            this.expires = new Date(tokenData.eat * 1000)
            this.permissions = tokenData.permissions
            this.loggedIn = true
        } catch (err) {
            console.error("{LOGIN} Token is unusable. Try clearing out your cookie jar.", err)
        }
    }

    /**
     * Checks permissions using the ones cached inside token
     * @param serverId - Server ID to check permissions of
    */
    public canModifyServer(serverId: string): boolean {
        const perms = this.permissions[serverId] || 0
        return (
            (perms & DiscordPerms.ADMINISTRATOR) === DiscordPerms.ADMINISTRATOR ||
            (perms & DiscordPerms.MANAGE_GUILD) === DiscordPerms.MANAGE_GUILD
        )
    }
}

export default new Session();