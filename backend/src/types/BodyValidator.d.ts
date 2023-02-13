export interface BodyValidationOptions {
    [key: string]: Validators;
}

export type Validators =
    ValidateString |
    ValidateNumber |
    ValidateBigint |
    ValidateBoolean |
    ValidateFile |
    ValidateObject |
    ValidateArray

export interface ValidateBase {
    type: string;
    required: boolean;
}

export interface ValidateString extends ValidateBase {
    type: "string";
    maximumLength?: number;
    minimumLength?: number;
    regex?: {
        pattern: RegExp;
        message: string;
    }[]
}

export interface ValidateNumber extends ValidateBase {
    type: "number";
    minimumValue?: number;
    maximumValue?: number;
}

export interface ValidateBigint extends ValidateBase {
    type: "bigint";
    minimumValue?: bigint;
    maximumValue?: bigint;
}

export interface ValidateBoolean extends ValidateBase {
    type: "boolean";
}

export interface ValidateFile extends ValidateBase {
    type: "file";
}

export interface ValidateObject extends ValidateBase {
    type: "object";
    fields: {
        [key: string]: Validators;
    };
}

export interface ValidateArray extends ValidateBase {
    type: "array";
    maximumLength?: number;
    minimumLength?: number;
    validator: Validators;
}