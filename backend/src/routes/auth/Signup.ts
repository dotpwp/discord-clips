import { Request, Response } from "express";
import { ValidatorOptions } from "../../typings/BodyValidator";
import { StatusCode } from "../../typings/StatusCode";
import { prisma } from "../../core/Database";
import { User } from "@prisma/client";
import { hash } from "bcrypt";
import Cryptography from "../../modules/Cryptography";
import Responses from "../../modules/Responses";
import RegEx from "../../modules/RegEx";
import pcall from "../../modules/PCall";

interface RequestBody {
    username: string
    password: string
}

export async function Route_CreateAccount(req: Request, res: Response): Promise<any> {
    const { username, password }: RequestBody = req.body

    // [1] Ensure username is not in use
    var [ran, usernameDuplicate] = await pcall(
        prisma.user.findFirst({
            where: { username: username },
            select: { userId: true },
        })
    )
    if (!ran) return Responses.abort(res, "UserSignup[1:2]", usernameDuplicate)
    if (usernameDuplicate) return Responses.message(res,
        StatusCode.CONFLICT,
        "This username is already in use"
    )


    // [2]  Create new Account & Session
    // [2:1] Hash Password
    var [ran, hashedPassword]: [boolean, string] = await pcall(hash(password, 12))
    if (!ran) return Responses.abort(res, "UserSignup[2:1]", hashedPassword)

    // [2:2] Upload To Database
    const created = new Date()
    const userId = Cryptography.generateSnowflake()
    const token = Cryptography.generateToken(userId)

    var [ran, newUser]: [boolean, User] = await pcall(
        prisma.user.create({
            select: {
                "userId": true,
                "username": true,
            },
            data: {
                "userId": userId,
                "username": username,
                "password": hashedPassword,
                "sessions": {
                    create: {
                        "created": created,
                        "token": token,
                        "ipAddress": req.ip,
                        "userAgent": req.header("User-Agent") || "Unknown",
                    }
                }
            }
        })
    )

    // Failed to Create User
    if (!ran) return Responses.abort(res, "UserSignup[2:2]", newUser)

    // Return New User to Client
    res
        .status(StatusCode.CREATED)
        .json({
            token: token,
            userId: userId.toString(),
        })
}

export const BV_CreateAccount: ValidatorOptions = {
    username: {
        type: "STRING",
        required: true,
        minimumLength: 3,
        maximumLength: 32,
        regex: [{
            message: "Username contains unallowed Characters. (Alphanumeric and underscores only)",
            pattern: RegEx.validUsername
        }]
    },
    password: {
        type: "STRING",
        required: true,
        minimumLength: 8,
        maximumLength: 256,
        regex: [
            {
                message: "Password is missing an alphanumeric character. (A-Z, a-z, 0-9)",
                pattern: RegEx.includesAlphanumeric,
            },
            {
                message: "Password is missing a special character. (~!@#$%^&*()_+)",
                pattern: RegEx.includesSpecial
            },
            {
                message: "Invalid Password",
                pattern: RegEx.validPassword,
            }
        ]
    }
}