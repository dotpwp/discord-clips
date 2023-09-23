import { DatabaseServer, DatabaseUser } from "../types/database"
import Session from "./Session"

class ImageURL {
    private DEFAULT_AVATAR = "https://cdn.discordapp.com/embed/avatars/0.png"
    private BASE_DISCORD = "https://cdn.discordapp.com"
    private FORMAT = "jpg"

    constructor() {
        // Check for WEBP image support using canvas
        const canvas = document.createElement("canvas")
        const supportsWEBP = canvas
            .toDataURL("image/webp")
            .indexOf("data:image/webp") === 0
        canvas.remove()
        if (supportsWEBP) this.FORMAT = "webp"

        console.log(`{IMAGE} Using image format: '${this.FORMAT}'`)
    }

    public avatar(user: DatabaseUser | { id: string; avatar: string; } | undefined, size = 128) {
        if (user === undefined) return "/default-avatar.jpg"
        return (user.avatar === null)
            ? this.DEFAULT_AVATAR
            : `${this.BASE_DISCORD}/avatars/${user.id}/${user.avatar}.${this.FORMAT}?size=${size}`
    }
    public sessionAvatar(size = 128) {
        return (Session.loggedIn)
            ? this.avatar({ "id": Session.userId || "", "avatar": Session.avatar || "" }, size)
            : this.DEFAULT_AVATAR
    }
    public icon(server: DatabaseServer | undefined, size = 128) {
        return (!server || server?.icon === null)
            ? this.DEFAULT_AVATAR
            : `${this.BASE_DISCORD}/icons/${server.id}/${server.icon}.${this.FORMAT}?size=${size}`
    }
    public thumbnail(clipId: string, size = 128) {
        return `/content/thumbnails/${clipId}.${this.FORMAT}?size=${size}`
    }
}



export default new ImageURL();