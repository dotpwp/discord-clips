import { Request, Response, NextFunction, RequestHandler } from "express";
import { ValidatorOptions } from "../typings/BodyValidator";
import Responses from "../modules/Responses";
import { File } from "multiparty";


export default function bodyValidator(ValidatorOptions: ValidatorOptions): RequestHandler {
    // Determine Required Fields
    const optionFields: string[] = []
    const requiredFields: string[] = []
    Object.entries(ValidatorOptions).forEach(([field, option]) => {
        if (option.required) requiredFields.push(field)
        optionFields.push(field)
    })

    // Return Body Parser Function
    return (req: Request, res: Response, next: NextFunction) => {
        // Ensure Required Fields are present
        for (const field of requiredFields) {
            if (!req.body[field]) {
                Responses.badRequest(res, `Field '${field}' is required`)
                break
            }
        }
        if (res.headersSent) return

        try {
            // Validate Body Fields
            optionFields.forEach((field, index) => {
                // Ensure Body has field
                if (!req.body[field]) return

                // Retrieve Options for field
                const fieldOptions = ValidatorOptions[field]
                switch (fieldOptions.type) {

                    case "FILE":
                        // Ensure file is a file
                        const someFile: File = req.body[field]
                        if (typeof (someFile) !== "object")
                            throw `Field '${field}' is not of type 'File'`
                        break

                    case "BOOLEAN":
                        // Ensure boolean is a boolean
                        const someBoolean: number = req.body[field]
                        if (typeof (someBoolean) !== "boolean")
                            throw `Field '${field}' is not of type 'boolean'`
                        break

                    case "NUMBER":
                        // Ensure number is a number
                        const someNumber: number = req.body[field]
                        if (isNaN(someNumber))
                            throw `Field '${field}' is not of type 'number'`

                        // Ensure number doesnt exceed maximum
                        if (fieldOptions.maximum)
                            if (someNumber > fieldOptions.maximum)
                                throw `Field '${field}' has a value greater than '${fieldOptions.maximum}'`

                        // Ensure number meets minimum
                        if (fieldOptions.minimum)
                            if (someNumber < fieldOptions.minimum)
                                throw `Field '${field}' has a value lesser than '${fieldOptions.minimum}'`
                        break

                    case "STRING":
                        // Ensure string is a string
                        const someString: string = req.body[field]
                        if (typeof (someString) !== "string")
                            throw `Field '${field}' is not of type 'string'`

                        // Ensure String meets maximum length
                        if (fieldOptions.maximumLength)
                            if (someString.length > fieldOptions.maximumLength)
                                throw `Field '${field}' has a length greater than '${fieldOptions.maximumLength}'`

                        // Ensure String meets minimum length
                        if (fieldOptions.minimumLength)
                            if (someString.length < fieldOptions.minimumLength)
                                throw `Field '${field}' has a length lesser than '${fieldOptions.minimumLength}'`

                        // Test Regex Pattern(s)
                        if (fieldOptions.regex) fieldOptions.regex.forEach((regex): any => {
                            // Test string against pattern
                            if (regex.pattern.test(someString) === false)
                                throw regex.message || `Field '${field}' does not meet requirements`
                        })
                        break
                }
            })

            // Body OK
            if (!res.headersSent) next()
        } catch (validationError: string | unknown) {
            // Return Validation Error
            Responses.badRequest(res, validationError as string)
        }

    }
}