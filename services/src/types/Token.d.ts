export interface TokenData {
    uid: bigint                     // Discord User ID
    alias: string                   // Discord Username/Displayname
    accessToken: string             // Discord oAuth2 Access Token
    avatar: string | null           // Discord User Avatar
    iat: number                     // Initialized At (UNIX Timestamp)
    eat: number                     // Expires At (UNIX Timestamp)
    permissions: ServerPermissions  // Server Permissions
}

/** Server ID as key with Permissions as value */
export interface ServerPermissions {
    [key: string]: number
}