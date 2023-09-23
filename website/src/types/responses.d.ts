import { DatabaseCategory, DatabaseClip, DatabaseServer } from "./database";
import { HttpStatusCode } from "axios"

interface ServerError {
    status: HttpStatusCode;
    message: string;
}

// /api/auth/login
type ResponseGetAuth = {
    expiresAt: number;
    token: string;
}

// /api/servers
type ResponseGetServers = DatabaseServer[]

// /api/servers/:server_id
type ResponseGetServer = DatabaseServer

// /api/servers/:server_id
type ResponsePatchServer = DatabaseServer

// /api/servers/:server_id/categories
type ResponsePostCategory = DatabaseCategory

// /api/servers/:server_id/categories/:category_id
type ResponsePatchCategory = DatabaseCategory
type ResponseDeleteCategory = DatabaseCategory

// /api/servers/:server_id/clips
type ResponseGetClips = {
    count: number;
    items: DatabaseClip[];
}
type ResponsePostClip = DatabaseClip

// /api/servers/:server_id/clips/:clip_id
type ResponseGetClip = DatabaseClip
type ResponsePatchClip = DatabaseClip
type ResponseDeleteClip = DatabaseClip

// /api/servers/:server_id/clips/:clip_id/hearts
type ResponseUseHeart = number 
type ResponseGetHeart = boolean 