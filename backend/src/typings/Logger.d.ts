export type Primitive = boolean | string | number | object | undefined | null;
export type LogSeverity = "DEBUG" | "INFO" | "WARN" | "ERROR" | "FATAL";
export type LogBody = Array<Primitive> | Primitive;