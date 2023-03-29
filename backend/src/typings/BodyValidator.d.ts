export interface TypeValidator {
    type: string
    required?: boolean
}
export interface StringValidator extends TypeValidator {
    type: "STRING"
    maximumLength?: number
    minimumLength?: number
    regex?: {
        pattern: RegExp,
        expect?: boolean,
        message?: string,
    }[]
}
export interface NumberValidator extends TypeValidator {
    type: "NUMBER"
    minimum?: number
    maximum?: number
}
export interface BooleanValidator extends TypeValidator {
    type: "BOOLEAN"
}
export interface FileValidator extends TypeValidator {
    type: "FILE"
}

export interface ValidatorOptions {
    [key: string]: StringValidator | NumberValidator | BooleanValidator | FileValidator
}