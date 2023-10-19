import { ERequest, EResponse, ParameterNames } from "../../types/Express";
import { FlagsPermissions } from "../../types/Permission";
import { ErrorMessage } from "../../types/Validator";
import { TokenData } from "../../types/Token";
import { NextFunction } from "express";
import { HttpStatusCode } from "axios";
import cookieParser from "cookie-parser";
import Flags from "../util/Flags";
import Token from "../util/Token";
import Safe from "../util/Safe";
import Reply from "./Reply";

const parseCookies = cookieParser()
const guestSession: TokenData = {
    uid: 0n,
    alias: "Guest",
    avatar: null,
    eat: 0,
    iat: 0,
    accessToken: "",
    permissions: {},
}

class Validate {
    /**
    * [Middleware]
    * Decodes a users token.
    * Users with an invalid token or are missing a token are classified as guests and given a User ID of 0.
    * @param req - Server Request
    * @param res - Server Response
    * @param next - Next Function
    */
    public userToken(req: ERequest, res: EResponse, next: NextFunction) {
        parseCookies(req, res, () => {
            res.locals.token = Token.decodeUserToken(req.cookies.activeToken) || guestSession
            next()
        })
    }
    /**
     * [Middleware]
     * Checks to see if User ID is 0 (A Guest) before continuing.
     * Returns 401 Unauthorized if they are.
     * @param req - Server Request
     * @param res - Server Response
     * @param next - Next Function
     */
    public userIsLoggedIn(req: ERequest, res: EResponse, next: NextFunction) {
        res.locals.token.uid === 0n
            ? Reply.withApiError(res, HttpStatusCode.Unauthorized)
            : next()
    }
    /**
     * [MIDDLEWARE]
     * Checks user permissions before continuing request
     * @param givenPermissions - An array of permissions flags to test for
     * @returns Middleware Function
     */
    public hasPermissionTo(...givenPermissions: FlagsPermissions[]) {
        return (req: ERequest, res: EResponse, next: NextFunction) => {
            const permissions = res.locals.token.permissions[req.params.serverid] || 0
            if (!Flags.test(permissions, FlagsPermissions.ADMINISTRATOR) && !Flags.test(permissions, ...givenPermissions))
                return Reply.withApiError(res, HttpStatusCode.Unauthorized)
            next()
        }
    }
    /**
     * [MIDDLEWARE]
     * Returns "Bad Request" if an express parameter is not a bigint.
     * Bigints become available at "res.local.{name}"
     * @param names - Name of parameters to parse
     * @returns Results are stored in "res.locals"
     */
    public routeParams(...names: ParameterNames[]) {
        return function (req: ERequest, res: EResponse, next: NextFunction) {
            const messages = new Array<ErrorMessage>()

            // Validate Parameters
            names.forEach(name => {
                const parsedValue = Safe.parseBigint(req.params[name]);
                (parsedValue === false)
                    ? messages.push(`url: Invalid Parameter "${name}"`)
                    : res.locals[name] = parsedValue
            });

            // Continue Response...
            (messages.length !== 0)
                ? Reply.withParserError(res, messages)
                : next()
        }
    }
    /**
     * Checks to see if user is a guest, by seeing their User ID is 0
     * or the permissions for this Server ID are undefined
     * @param res - Server Response
     * @returns {boolean}- Whether or not user is a guest.
     */
    public isServerGuest(res: EResponse): boolean {
        return (
            res.locals.userid === 0n ||
            res.locals.token.permissions[res.req.params.serverid] === undefined
        )
    }
    /**
     * Fetches permissions for this server from permissions stored
     * in their token. Defaults to 0 if undefined
     * @param res - Server Response
     * @returns {number} - The Permissions for the Server
     */
    public getPermissions(res: EResponse): number {
        return res.locals.token.permissions[res.req.params.serverid] || 0
    }
}
export default new Validate()