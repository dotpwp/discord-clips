import { existsSync } from "fs";
import { join } from "path";

class Safe {
    /**
     * Safely parses bigint.
     * @param possibleBigint - String that might be a bigint
     * @returns {bigint | false} - Returns false if an error is thrown.
     */
    public parseBigint(possibleBigint: string): bigint | false {
        try {
            return BigInt(possibleBigint)
        } catch (_) {
            return false
        }
    }
    /**
     * Parses strings that look like this "numerator/denominator".
     * @param someFramerate - String that might be a framerate
     * @returns {number | false} - Returns false if an error is thrown.
     */
    public parseFramerate(possibleFramerate?: string): number | false {
        if (!possibleFramerate) return false
        try {
            const
                [a, b] = possibleFramerate.split("/", 2),
                c = parseInt(a),
                d = parseInt(b)
            return (isNaN(c) || isNaN(d))
                ? false
                : c / d
        }
        catch (_) {
            return false
        }
    }
    /**
     * Safely parses JSON String.
     * @param someString - String that might be JSON
     * @returns {T | false} - Returns false if error was thrown
     */
    public parseJSON<T>(someString: string): T | false {
        try {
            return JSON.parse(someString)
        } catch (err) {
            return false
        }
    }
    /**
     * JSON stringify with support for bigints
     * @param value - Value to Stringify
     * @returns {string} - JSON String
     */
    public jsonStringify<T>(value: T): string {
        return JSON.stringify(value, (_, v) => (typeof (v) === "bigint") ? v.toString() : v)
    }
    /**
     * [SYNCHRONOUS]
     * Checks to see if module folder exists in node_modules. 
     * @param packageName - Module Name
     * @returns {boolean} - Whether or no module folder exists
     */
    public packageExists(packageName: string): boolean {
        return existsSync(join(process.cwd(), "node_modules", packageName))
    }
    /**
     * Used to make code work more like Go
     * @param somePromise - A Promise
     * @returns First arguments will be promise results if fulfilled, second argument will be an error if rejected
     * @example
     * const [newClip, createClipError] = await Safe.call(
     *  Database.clips.create({ data: {...} })
     * )
     * if (createClipError) 
     *  return Reply.withServerError(res, createClipError)
     * ...
     */
    public async call<Result>(somePromise: Result): Promise<[Awaited<Result>, any]> {
        try {
            // @ts-ignore
            return [await somePromise, null];
        } catch (err) {
            // @ts-ignore
            return [null, err];
        }
    }
}
export default new Safe()