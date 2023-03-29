export interface JSONParserOptions {
    timeout?: number;    // Timeout in Milliseconds
    limit?: number;      // Body Size Limit in bytes
}

export interface FormParserOptions {
    [key: string]: "TEXT" | "FILE";
}