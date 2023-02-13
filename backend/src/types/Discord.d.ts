export interface DiscordAccessToken {
    access_token: string               // 6qrZcUqja7812RVdnEKjpzOL4CvHBFG
    token_type: string                 // Bearer
    expires_in: number                 // 604800
    refresh_token: string              // D43f5y0ahjqew82jZ4NViEr2YafMKhue
    scope: string                      // identify
}

export interface DiscordPartialGuild {
    name: string                       // 1337 Krew
    id: string                         // 80351110224678912
    icon: string                       // 8342729096ea3675442027381ff50dfe
    owner: boolean                     // true
    permissions: number                // 36953089
    features: string[]                 // [COMMUNITY NEWS]
    approximate_member_count: number   // 3268
    approximate_presence_count: number // 784
}

export interface DiscordUser {
    id: string                         // 80351110224678912
    username: string                   // Nelly
    global_name?: string               // Nelly
    avatar?: string                    // 8342729096ea3675442027381ff50dfe
}