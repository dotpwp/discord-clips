type ISOTimestamp = string
type Snowflake = string

export interface AccessToken {
    access_token: string               // 6qrZcUqja7812RVdnEKjpzOL4CvHBFG
    refresh_token: string              // D43f5y0ahjqew82jZ4NViEr2YafMKhue
    token_type: string                 // Bearer
    expires_in: number                 // 604800
    scope: string                      // identify
}

export interface AccessRevoked { }

export interface PartialGuild {
    name: string                       // 1337 Krew
    id: string                         // 80351110224678912
    icon: string | null                // 8342729096ea3675442027381ff50dfe
    owner: boolean                     // true
    permissions: number                // 36953089
    features: string[]                 // [COMMUNITY NEWS]
    approximate_member_count: number   // 3268
    approximate_presence_count: number // 784
}

export interface PartialUser {
    id: string                         // 80351110224678912
    username: string                   // Nelly
    global_name: string | null         // Nelly
    avatar: string | null              // 8342729096ea3675442027381ff50dfe
}

/** Received when sending a GET request to a webhook URL */
export interface ResponseGetWebhook {
    application_id: any
    avatar: any
    channel_id: string
    guild_id: string
    id: string
    name: string
    type: number
    token: string
    url: string
    user: PartialUser;
}

/** Received when sending a POST request to a webhook URL with ?wait=true */
export interface ResponsePostWebhook {
    id: Snowflake;
    type: number;
    content: string;
    channel_id: Snowflake;
    author: PartialUser;
    attachments: unknown[]
    embeds: unknown[]
    mentions: unknown[]
    mention_roles: unknown[]
    pinned: boolean
    mention_everyone: boolean
    tts: boolean
    timestamp: ISOTimestamp
    edited_timestamp: ISOTimestamp | null
    flags: number
    components: unknown[]
    webhook_id: Snowflake
}