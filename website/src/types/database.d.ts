export type Snowflake = string
export type DateTime = string

export interface DatabaseUser {
    id: Snowflake
    created: DateTime
    updated: DateTime
    avatar: string | null
    username: string
    permissions: JsonPermissions
    uploads: DatabaseClip[]
    uploadCount: number
    heart: DatabaseHeart[]
}

export interface JsonPermissions {
    [key: Snowflake]: number
}

export interface DatabaseServer {
    id: Snowflake
    created: DateTime
    updated: DateTime
    name: string
    icon: string | null
    allowGuests: boolean
    uploadCount: number
    uploads: DatabaseClip[]
    categoryCount: number
    categories: DatabaseCategory[]
    webhooks: JsonWebhook[]
}

export interface JsonWebhook {
    categoryId: Snowflake
    webhookUrl: string
}

export interface DatabaseCategory {
    id: Snowflake
    created: DateTime
    serverId: Snowflake
    name: string
    icon: string
    managed: boolean
    server: DatabaseServer
    clip: DatabaseClip[]
    flags: "CLIPS" | "VIDEOS" | "ALL" | "NONE"
}

export interface DatabaseHeart {
    id: Snowflake
    created: DateTime
    userId: Snowflake
    clipId: Snowflake
    clip: DatabaseClip
    user: DatabaseUser
}

export interface DatabaseClip {
    id: Snowflake
    created: DateTime
    updated: DateTime
    userId: Snowflake
    serverId: Snowflake
    categoryId: Snowflake
    title: string
    description: string
    duration: number
    approximateViewCount: number
    approximateHeartCount: number
    hearts: DatabaseHeart[]
    formats: DatabaseFormat[]
    available: boolean
    deleted: boolean
    encoderOptions: JSON
    category: DatabaseCategory
    server: DatabaseServer
    user: DatabaseUser
}

export interface DatabaseFormat {
    id: Snowflake
    created: DateTime
    encodingTime: number
    encodingStatus: string
    videoHeight: number
    videoWidth: number
    codecVideo: string
    codecAudio: string
    framerate: number
    bitrateVideo: number
    bitrateAudio: number
    clipId: Snowflake
    clip: DatabaseClip
}