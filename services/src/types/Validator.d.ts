export type Field = string
export type Reason = string
export type ErrorMessage = `${Field}: ${Reason}`

export interface BodyValidationOptions {
    [key: string]: Validators
}

export type Validators =
    ValidateString |
    ValidateNumber |
    ValidateBigint |
    ValidateBoolean |
    ValidateObject |
    ValidateArray

export interface ValidateBase {
    // lol you have to write comments now!
    _description: string;
    type: string
    required: boolean
}

export interface ValidateString extends ValidateBase {
    type: "string"
    maximumLength?: number
    minimumLength?: number
    regex?: {
        pattern: RegExp
        message: string
    }[]
}

export interface ValidateNumber extends ValidateBase {
    type: "number"
    minimumValue?: number
    maximumValue?: number
}

export interface ValidateBigint extends ValidateBase {
    type: "bigint"
    minimumValue?: bigint
    maximumValue?: bigint
}

export interface ValidateBoolean extends ValidateBase {
    type: "boolean"
}

export interface ValidateObject extends ValidateBase {
    type: "object"
    fields: {
        [key: string]: Validators
    }
}

export interface ValidateArray extends ValidateBase {
    type: "array"
    maximumLength?: number
    minimumLength?: number
    validator: Validators
}