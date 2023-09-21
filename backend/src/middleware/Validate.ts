import { ERequest, EResponse, Handler, Next, ParameterNames } from "../types/Express"
import { BodyValidationOptions, Validators } from "../types/BodyValidator"
import * as cookieParser from "cookie-parser"
import Respond from "../modules/Respond"
import Safely from "../modules/Safely"
import Crypto from "../modules/Crypto"
import { NextFunction, json } from "express"
const parseCookies = cookieParser()

class Validate {

    public canModifyServer(res: EResponse): boolean {
        if (res.locals.server_id === undefined) return false
        if (res.locals.permissions === undefined) return false

        const userPermissions = res.locals.permissions[res.locals.server_id.toString()]
        if (userPermissions === undefined) return false

        return (
            (userPermissions & 8) === 8 ||
            (userPermissions & 32) === 32
        )
    }

    // Ensure User can Moderate Server via permissions
    // 8: ADMINISTRATOR, 32: MODIFY_GUILD
    public userCanModifyServer(req: ERequest, res: EResponse, next: Next) {
        const userPermissions = res.locals.permissions[res.locals.server_id.toString()];
        (userPermissions & 8) === 8 || (userPermissions & 32) === 32
            ? next()
            : Respond.withUnauthorized(res)
    }

    // Decode Authorization or Cookie
    public userSession(requireSession: boolean): Handler {
        return function (req: ERequest, res: EResponse, next: Next): void {

            // Parse Cookies
            parseCookies(req, res, () => {
                // Decode Authorization Cookie
                const tokenData = Crypto.decodeAndVerifyUserToken(req.cookies.auth_token)
                if (requireSession && tokenData === false)
                    return Respond.withUnauthorized(res)

                // Store Parsed Token
                res.locals.token = tokenData
                next()
            })

        }
    }

    // Validate Request Parameters
    public parameters(...names: ParameterNames[]): Handler {
        return function (req: ERequest, res: EResponse, next: Next) {
            if (
                names.every(name => {
                    const parsedBigint = Safely.parseBigInt(req.params[name])
                    if (parsedBigint === false) {
                        Respond.withBadRequest(res, `Invalid parameter '${name}'`)
                        return false
                    }
                    res.locals[name] = parsedBigint
                    return true
                })
            ) next()
        }
    }

    public bodyIsNotEmpty(req: ERequest, res: EResponse, next: NextFunction) {
        Array.isArray(req.body)
            ? (req.body.length === 0)
                ? Respond.withBadRequest(res, "Array cannot be empty")
                : next()
            : (typeof (req.body) === "object")
                ? (Object.keys(req.body).length === 0)
                    ? Respond.withBadRequest(res, "Object cannot be empty")
                    : next()
                : Respond.withBadRequest(res, "Endpoint requires Body")
    }

    // Validate Request Body JSON
    public responseBody(validatorOptions: BodyValidationOptions): Handler {

        function validateField(field: string, value: any, options: Validators): string | undefined {
            if (!options) return undefined
            let message: string
            validation: switch (options.type) {

                case "string":
                    const someString: string = value

                    if (typeof (someString) !== "string") {
                        message = `Field '${field}' is not a '${options.type}'`
                        break
                    }
                    if (options.maximumLength && someString.length > options.maximumLength) {
                        message = `Field '${field}' cannot have more than '${options.minimumLength}' characters`
                        break
                    }
                    if (options.minimumLength && someString.length < options.minimumLength) {
                        message = `Field '${field}' cannot have less than '${options.minimumLength}' characters`
                        break
                    }
                    if (options.regex)
                        regexValidation:
                        for (const expression of options.regex) {
                            if (expression.pattern.test(someString) === false) {
                                message = `Field '${field}' is invalid with message '${expression.message}'`
                                break regexValidation
                            }
                        }
                    break

                case "boolean":
                    if (typeof (value) !== "boolean") {
                        message = `Field '${field}' is not a '${options.type}'`
                        break
                    }
                    break

                case "number":
                    const someNumber: number = value

                    if (isNaN(someNumber)) {
                        message = `Field '${field}' is not a '${options.type}'`
                        break
                    }
                    if (options.maximumValue !== undefined && someNumber > options.maximumValue) {
                        message = `Field '${field}' cannot have a value greater than '${options.maximumValue}'`
                        break
                    }
                    if (options.minimumValue !== undefined && someNumber < options.minimumValue) {
                        message = `Field '${field}' cannot have a value lesser than '${options.minimumValue}'`
                        break
                    }
                    break

                case "bigint":
                    const someBigint = Safely.parseBigInt(value)

                    if (someBigint === false) {
                        message = `Field '${field}' is not a '${options.type}'`
                        break
                    }
                    if (options.maximumValue !== undefined && someBigint > options.maximumValue) {
                        message = `Field '${field}' cannot have a value greater than '${options.maximumValue}'`
                        break
                    }
                    if (options.minimumValue !== undefined && someBigint < options.minimumValue) {
                        message = `Field '${field}' cannot have a value lesser than '${options.minimumValue}'`
                        break
                    }
                    break

                case "file":
                    if (typeof (value) !== "object") {
                        message = `Field '${field}' is not a '${options.type}'`
                        break validation
                    }
                    break

                case "array":
                    const someArray: any[] = value

                    if (Array.isArray(someArray) === false) {
                        message = `Field '${field}' is not a '${options.type}'`
                        break
                    }
                    if (someArray.length > options.maximumLength) {
                        message = `Array '${field}' cannot have more than '${options.maximumLength}' items`
                        break
                    }
                    if (someArray.length < options.minimumLength) {
                        message = `Array '${field}' cannot have more than '${options.minimumLength}' items`
                        break
                    }
                    fieldValidation: for (let i = 0; i < someArray.length; i++) {
                        const validateMessage = validateField(`${field}[${i}]`, someArray[i], options.validator)
                        if (validateMessage !== undefined) {
                            message = validateMessage
                            break fieldValidation
                        }
                    }
                    break

                case "object":
                    const someObject: { [key: string]: any } = value

                    if (
                        someObject === null ||
                        someObject === undefined ||
                        typeof (someObject) !== "object"
                    ) {
                        message = `Field '${field}' is not a '${options.type}'`
                        break
                    }

                    // This code is kinda redundant but its 2am and i cant be 
                    // bothered to clean it up a little so this will do for now .zZ

                    // Determine Required/Optional Fields
                    const optionalFields = new Array<string>()
                    const requiredFields = new Array<string>()
                    Object
                        .entries(options.fields)
                        .forEach(([field, options]) => {
                            if (options.required) requiredFields.push(field)
                            optionalFields.push(field)
                        })

                    // Ensure Required Field(s) are present
                    let passedTest = requiredFields.every(field => {
                        if (someObject[field] === undefined) {
                            message = `Field '${field}' is required`
                            return false
                        }
                        return true
                    })
                    if (passedTest === false) break

                    // Validate Fields
                    optionalFields.every(field => {
                        if (someObject[field] === undefined) return true
                        const validatorMessage = validateField(field, someObject[field], options.fields[field])
                        if (validatorMessage !== undefined) {
                            message = validatorMessage
                            return false
                        }
                        return true
                    })
                    break
            }

            return message
        }


        // Determine Required/Optional Fields
        const optionalFields = new Array<string>()
        const requiredFields = new Array<string>()
        Object
            .entries(validatorOptions)
            .forEach(([field, options]) => {
                if (options.required) requiredFields.push(field)
                optionalFields.push(field)
            })


        // Return Request Handler
        return function (req: ERequest, res: EResponse, next: Next): void {
            json()(req, res, () => {

                // Ensure required field(s) are present
                for (const field of requiredFields) {
                    if (req.body[field] === undefined) {
                        Respond.withBadRequest(res, `Field '${field}' is required`)
                        break
                    }
                }
                if (res.headersSent) return

                // Validate Fields
                for (const field of optionalFields) {
                    if (req.body[field] === undefined) continue
                    const message = validateField(field, req.body[field], validatorOptions[field])
                    if (message !== undefined) {
                        Respond.withBadRequest(res, message)
                        break
                    }
                }

                // Continue Response...
                if (res.headersSent === false) next()
            })
        }

    }
}
export default new Validate()