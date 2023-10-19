import { BodyValidationOptions, Validators, ErrorMessage } from "../../types/Validator";
import { NextFunction, RequestHandler } from "express";
import { ERequest, EResponse } from "../../types/Express";
import Reply from "../web/Reply";
import Safe from "./Safe";

class Validator {
    /**
     * Creates a middleware that will validate the request body.
     * Overwrites body fields into given type from options.
     * @param validatorOptions - Validator Options
     * @returns - Validator Middleware
     */
    public createMiddleware(validatorOptions: BodyValidationOptions): RequestHandler {
        // Create field list
        const allFields = new Array<string>()
        const requiredFields = new Array<string>()

        Object
            .entries(validatorOptions)
            .forEach(([field, options]) => {
                if (options.required) requiredFields.push(field)
                allFields.push(field)
            })

        // Return Request Handler
        return (req: ERequest<any>, res: EResponse, next: NextFunction): void => {
            const messages = new Array<ErrorMessage>()

            // Ensure required field(s) are present
            requiredFields.forEach(field => {
                if (req.body?.[field] === undefined)
                    messages.push(`root: Missing field "${field}"`)
            })

            // Validate all Fields
            allFields.forEach(field => {
                if (req.body?.[field] === undefined) return
                const [someValue, someMessages] = this.validateField(field, req.body[field], validatorOptions[field])
                messages.push(...someMessages)
                req.body[field] = someValue
            });

            // Continue Response...
            (messages.length !== 0)
                ? Reply.withParserError(res, messages)
                : next()
        }
    }
    /**
     * Creates a Function that will validate an object
     * @param validatorOptions - Validator Options
     * @returns {ErrorMessage[]} - An Array of parsing errors
     */
    public createValidator(validatorOptions: BodyValidationOptions) {
        // Create Required/Optional Fields List
        const allFields = new Array<string>()
        const requiredFields = new Array<string>()
        Object
            .entries(validatorOptions)
            .forEach(([field, options]) => {
                if (options.required) requiredFields.push(field)
                allFields.push(field)
            })

        // Return Validator Function
        return (object: any): [any, ErrorMessage[]] => {
            const messages = new Array<ErrorMessage>()

            // Ensure required field(s) are present
            requiredFields.forEach(field => {
                if (object?.[field] === undefined)
                    messages.push(`root: Missing field "${field}"`)
            })

            // Validate all Fields
            allFields.forEach(field => {
                if (object?.[field] === undefined) return
                const [someValue, someMessages] = this.validateField(field, object[field], validatorOptions[field])
                messages.push(...someMessages)
                object[field] = someValue
            });

            return [object, messages]
        }
    }
    /**
     * Internal Field Validation Function
     * @param field - Name of Field
     * @param value - Value of Field
     * @param options - Options to validate with
     * @returns {[any, ErrorMessage[]]} - Parsed Value, Error Messages
     */
    private validateField(field: string, value: any, options: Validators): [any, ErrorMessage[]] {
        if (!options) return [value, []]
        const messages = new Array<ErrorMessage>()

        switch (options.type) {
            case "string":
                const someString: string = value
                if (typeof (someString) !== "string") {
                    messages.push(`${field}: Must be of type "${options.type}"`)
                    break
                }
                if (options.maximumLength && someString.length > options.maximumLength)
                    messages.push(`${field}: Cannot have more than "${options.minimumLength}" characters`)

                if (options.minimumLength && someString.length < options.minimumLength)
                    messages.push(`${field}: Cannot have less than "${options.minimumLength}" characters`)

                if (options.regex) options.regex.forEach(expression => {
                    if (expression.pattern.test(someString) === false)
                        messages.push(`${field}:  ${expression.message}`)
                })
                value = someString
                break

            case "boolean":
                if (typeof (value) !== "boolean") {
                    messages.push(`${field}: Must be of type "${options.type}"`)
                    break
                }
                break

            case "number":
                const someNumber: number = parseInt(value)
                if (isNaN(someNumber)) {
                    messages.push(`${field}: Must be of type "${options.type}"`)
                    break
                }
                if (options.maximumValue !== undefined && someNumber > options.maximumValue)
                    messages.push(`${field}: Cannot be greater than "${options.maximumValue}"`)

                if (options.minimumValue !== undefined && someNumber < options.minimumValue)
                    messages.push(`${field}: Cannot be lesser than "${options.minimumValue}"`)
                value = someNumber
                break

            case "bigint":
                const someBigint = Safe.parseBigint(value)
                if (someBigint === false) {
                    messages.push(`${field}: Must be of type "${options.type}"`)
                    break
                }
                if (options.maximumValue !== undefined && someBigint > options.maximumValue)
                    messages.push(`${field}: Cannot be greater than "${options.maximumValue}"`)

                if (options.minimumValue !== undefined && someBigint < options.minimumValue)
                    messages.push(`${field}: Cannot be lesser than "${options.minimumValue}"`)
                value = someBigint
                break

            case "array":
                const someArray: any[] = value
                if (Array.isArray(someArray) === false) {
                    messages.push(`${field}: Must be of type "${options.type}"`)
                    break
                }
                if (options.maximumLength !== undefined && someArray.length > options.maximumLength)
                    messages.push(`${field}: Cannot have more than "${options.maximumLength}" items`)

                if (options.minimumLength !== undefined && someArray.length < options.minimumLength)
                    messages.push(`${field}: Cannot have less than "${options.minimumLength}" items`)

                someArray.forEach((item, index) => {
                    const [someValue, someMessages] = this.validateField(`${field}[${index}]`, item, options.validator)
                    messages.push(...someMessages)
                    someArray[index] = someValue
                })
                value = someArray
                break

            case "object":
                const someObject: { [key: string]: any } = value
                if (someObject === null || someObject === undefined || typeof (someObject) !== "object") {
                    messages.push(`${field}: Must be of type "${options.type}"`)
                    break
                }

                // Determine Required/Optional Fields
                const allFields = new Array<string>()
                const requiredFields = new Array<string>()
                Object
                    .entries(options.fields)
                    .forEach(([field, options]) => {
                        if (options.required) requiredFields.push(field)
                        allFields.push(field)
                    })

                // Ensure Required Field(s) are present
                requiredFields.forEach(key => {
                    if (someObject[key] === undefined)
                        messages.push(`${field}: Missing field "${key}"`)
                })

                // Validate Fields
                allFields.forEach(key => {
                    if (someObject[key] === undefined) return
                    const [someValue, someMessages] = this.validateField(`${field}.${key}`, someObject[key], options.fields[key])
                    messages.push(...someMessages)
                    someObject[key] = someValue
                })
                value = someObject
                break
        }

        // console.log(field, messages)
        return [value, messages]
    }
}
export default new Validator()