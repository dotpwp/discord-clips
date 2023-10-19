import { DBError, WebhookJSON } from "../../../../types/Database";
import { ERequest, EResponse } from "../../../../types/Express";
import { ResponseGetWebhook } from "../../../../types/Discord";
import { FlagsPermissions } from "../../../../types/Permission";
import { keyWebhookCache } from "../../../../shared/other/RedisKeys";
import { Cache, Database } from "../../../../shared/util/Database";
import { ErrorMessage } from "../../../../types/Validator";
import { Webserver } from "../../..";
import ExpressBodyJSON from "../../../../shared/middleware/ExpressBodyJSON";
import Validator from "../../../../shared/util/Validator";
import Validate from "../../../../shared/web/Validate";
import Discord from "../../../../shared/other/Discord";
import Froppy from "../../../../shared/util/Froppy";
import Unique from "../../../../shared/util/Unique";
import Reply from "../../../../shared/web/Reply";
import Safe from "../../../../shared/util/Safe";
import axios from "axios";

// Needs Tests:
// - Valid Body => 200 OK
// - Bogus Body => 400 Bad Request
// - Invalid URL => 400 Bad Request
// - Invalid Category => 400 Bad Request

interface RequestBody {
    allowGuests: true;
    webhooks: WebhookJSON[];
}

Webserver.patch(
    "/api/server/:serverid",
    Validate.routeParams("serverid"),
    Validate.userToken,
    Validate.hasPermissionTo(FlagsPermissions.MANAGE_GUILD),
    ExpressBodyJSON(),
    Validator.createMiddleware({
        ["allowGuests"]: {
            _description: "Whether or not to allow guests into this server",
            type: "boolean",
            required: false,
        },
        ["webhooks"]: {
            _description: "Notify users via webhook that a new video has been uploaded",
            type: "array",
            required: false,
            maximumLength: 100,
            validator: {
                _description: "",
                type: "object",
                required: true,
                fields: {
                    ["category"]: {
                        _description: "Category ID",
                        type: "bigint",
                        required: true
                    },
                    ["channel"]: {
                        _description: "Webhook Channel ID",
                        type: "bigint",
                        required: true,
                        minimumValue: 0n
                    },
                    ["token"]: {
                        _description: "Webhook Token",
                        type: "string",
                        required: true,
                        minimumLength: 8,
                        maximumLength: 128
                    }
                }
            }
        }
    }),
    async function (req: ERequest<RequestBody>, res: EResponse) {
        const { serverid } = res.locals
        const { body } = req

        // [1] Fetch Server Categories
        const [someCategories, fetchCategoriesError] = await Safe.call(
            Database.category.findMany({
                select: { id: true },
                where: {
                    ["serverId"]: serverid,
                    ["id"]: {
                        in: body.webhooks
                            .map(w => Safe.parseBigint(w.category.toString()))
                            .filter(w => w !== false) as bigint[]
                    }
                }
            })
        )
        if (fetchCategoriesError)
            return Reply.withServerError(res, fetchCategoriesError)

        // [2] Validate Webhooks
        // [2A] Validate Categories
        const messages = new Array<ErrorMessage>()
        body.webhooks.map((webhook, index) => {
            // ID of 0 is reserved for All Categories
            if (webhook.category === 0n) return

            // Find Category via ID in this server
            if (!someCategories.find(cat => cat.id === webhook.category))
                messages.push(`webhooks[${index}].category: Unknown Category`)
        })
        if (messages.length !== 0)
            return Reply.withParserError(res, messages)

        // [2B] Validate Webhook URLs
        const validationResults = await Promise.allSettled(
            body.webhooks.map(async (webhook, index) => {
                return new Promise<void>(async (resolve, reject) => {
                    if (res.headersSent) return reject("")

                    // [2A] Check Validation Cache
                    const WebhookURL = Discord.createWebhookURL(webhook.channel, webhook.token, false)
                    const WebhookKey = Unique.generateHash(WebhookURL)
                    const [cacheResults, getError] = await Safe.call(Cache.hGet(keyWebhookCache, WebhookKey))
                    if (getError) {
                        if (!res.headersSent) Reply.withServerError(res, getError)
                        return reject("")
                    }
                    if (cacheResults === "N") return reject(`webhooks[${index}]: Invalid Webhook`)
                    if (cacheResults === "Y") return resolve()

                    // [2B] Fetch Webhook Data from Discord
                    // This SHOULD BE SAFE as the body validator only allowed discord urls
                    const [apiRequest, requestError] = await Safe.call(
                        axios<ResponseGetWebhook>(WebhookURL, { validateStatus: () => true })
                    )

                    // [2CA] Remote Server has returned an error
                    if (requestError !== null || apiRequest.status >= 500) {
                        Froppy.error("WEBHOOK", "Error testing Webhook", requestError)
                        return reject(`webhooks[${index}]: Remote Error`)
                    }

                    // [2CB] Client has given a bad URL
                    if (apiRequest.status >= 400 && apiRequest.status < 500) {
                        Cache.hSet(keyWebhookCache, WebhookKey, "N")
                        return reject(`webhooks[${index}]: Invalid Webhook`)
                    }

                    // [2D] Cache Results as Valid
                    await Safe.call(Cache.hSet(keyWebhookCache, WebhookKey, "Y"))
                    resolve()
                })
            })
        )
        if (res.headersSent) return
        messages.push(
            ...validationResults
                .filter(p => p.status === "rejected")
                .map((p: PromiseRejectedResult) => p.reason)
        )
        if (messages.length !== 0)
            return Reply.withParserError(res, messages)

        // [3] Update Server
        const [updatedServer, updateError] = await Safe.call(
            Database.server.update({
                where: { ["id"]: serverid },
                data: {
                    ["allowGuests"]: body.allowGuests,
                    ["webhooks"]: body.webhooks.map(w => {
                        return {
                            ["category"]: w.category.toString(),
                            ["channel"]: w.channel.toString(),
                            ["token"]: w.token,
                        }
                    })
                },
                select: {
                    ["id"]: true,
                    ["allowGuests"]: true,
                    ["webhooks"]: true
                }
            })
        )
        if (updateError?.code === DBError.NotFound)
            return Reply.withUnknown(res, "Unknown Server")
        if (updateError)
            return Reply.withServerError(res, updateError)

        // [4] Send Response to Client
        Reply.withJSON(res, updatedServer)
    }
)