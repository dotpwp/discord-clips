class Discord {
    /**
     * Creates Webhook URL
     * @example
     * createWebhookURL(1234567890n, "example-token", false)
     * "https://discord.com/api/webhooks/1234567890/example-token"
     */
    public createWebhookURL(channelId: bigint | string, token: string, withWait: boolean) {
        return `https://discord.com/api/webhooks/${channelId}/${token}${withWait ? "?wait=true" : ""}`
    }
}

export default new Discord()