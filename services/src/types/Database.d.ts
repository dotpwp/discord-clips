/**
 * Enums are added as needed: (See Reference)
 * https://www.prisma.io/docs/reference/api-reference/error-reference
*/
export const enum DBError {
    /** An operation failed because it depends on one or more records that were required but not found. {cause} */
    NotFound = "P2025",
    /** Foreign key constraint failed on the field: {field_name} */
    ForeignNotFound = "P2003",
    /** Unique constraint failed on the {constraint} */
    Duplicate = "P2002",
}

/** Webhook JSON stored in Database */
export interface WebhookJSON {
    category: bigint;
    channel: bigint;
    token: string;
}

/** Options JSON String stored in Database */
export interface EncoderOptionsJSON {
    hasCustomThumbnail: boolean
    trimStart?: number
    trimEnd?: number
    thumbnailAt?: number
}