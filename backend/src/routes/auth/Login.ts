import { Request, Response } from "express";
import { ValidatorOptions } from "../../typings/BodyValidator";
import { StatusCode } from "../../typings/StatusCode";
import { Session, User } from "@prisma/client";
import { prisma } from "../../core/Database";
import { compare } from "bcrypt";
import Cryptography from "../../modules/Cryptography";
import Responses from "../../modules/Responses";
import RegEx from "../../modules/RegEx";
import pcall from "../../modules/PCall";

interface RequestBody {
    username: string
    password: string
}

export async function Route_LoginUser(req: Request, res: Response) {
    const { username, password }: RequestBody = req.body

    // [1] Find Account with that username
    var [ran, someUser]: [boolean, User] = await pcall(
        prisma.user.findFirst({
            where: { username },
            select: {
                "userId": true,
                "password": true,
            }
        })
    )
    // No user found
    if (!ran) return Responses.abort(res, "UserLogin[1]", someUser)
    if (!someUser) return Responses.badRequest(res, "Incorrect Username or Password")


    // [2] Ensure Password is Correct
    // Ensure user has a password
    if (!someUser?.password) return Responses.message(res,
        StatusCode.PRECONDITION_FAILED,
        "You must reset your password before you can login."
    )

    // Compare Password
    var [success, match]: [boolean, boolean] = await pcall(compare(password, someUser.password))
    if (!success) return Responses.abort(res, "UserLogin[2]", match)
    if (!match) return Responses.badRequest(res, "Incorrect Username or Password")


    // [3] Check for Duplicate Session
    // Check to see if session exists for this user already
    const userAgent = req.header("User-Agent")
    var [ran, someSession]: [boolean, Session] = await pcall(
        prisma.session.findFirst({
            where: {
                "userId": someUser.userId,
                "ipAddress": req.ip,
                "userAgent": userAgent
            },
            select: {
                "token": true,
                "userId": true,
            }
        })
    )
    // Use Existing Session (If Found)
    if (!ran) return Responses.abort(res, "UserLogin[3]", someSession)
    if (someSession) return res.json({
        "userId": someUser.userId.toString(),
        "token": someSession.token
    })

    // [4] Create New Session
    const token = Cryptography.generateToken(someUser.userId)

    var [ran, newSession]: [boolean, Session] = await pcall(
        prisma.session.create({
            select: { userId: true },
            data: {
                "token": token,
                "userId": someUser.userId,
                "ipAddress": req.ip,
                "userAgent": userAgent || "Unknown",
            }
        })
    )
    if (!ran) return Responses.abort(res, "UserLogin[4]", newSession)


    // Return New Session to Client
    res
        .status(StatusCode.CREATED)
        .json({
            "token": token,
            "userId": someUser.userId.toString()
        })
}

export const BV_LoginUser: ValidatorOptions = {
    username: {
        type: "STRING",
        required: true,
        regex: [{
            message: "Invalid Username Provided",
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