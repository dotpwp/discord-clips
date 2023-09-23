class API {
    private DELAY_AMOUNT = 0

    constructor() {
        if (import.meta.env.MODE === "development") {
            this.DELAY_AMOUNT = 250
            console.warn(`{API} In development mode, delaying API response by ${this.DELAY_AMOUNT}ms`)
        }
    }

    public fetch<ResponseBody>(
        method: string,
        path: string,
        body: object | null,
        onSuccess: (json: ResponseBody) => void,
        onUnauthorized: () => void,
        onNotFound: () => void,
        onError: (error: Error) => void,
        onFinish: () => void
    ) {
        setTimeout(() => {
            // Create Headers
            const startTime = Date.now()
            const requestHeaders = new Headers()
            if (body !== null) requestHeaders
                .set("Content-Type", "application/json")

            // HTTP Requests
            fetch("/api/" + path, {
                method: method,
                cache: "no-cache",
                credentials: "same-origin",
                headers: requestHeaders,
                body: (body !== null)
                    ? JSON.stringify(body)
                    : undefined
            })
                .then(resp => {
                    console.log(`{API} (${Date.now() - startTime}ms) ${method} ${path}`)
                    switch (resp.status) {
                        case 200: resp
                            .json()
                            .then(json => onSuccess(json))
                            break
                        case 401: return onUnauthorized()
                        case 404: return onNotFound()
                        default: return resp
                            .text()
                            .then(text => onError(new Error(`HTTP/API ${resp.status} ${resp.statusText}\n${text}`)))
                    }
                })
                .catch(e => {
                    console.error("{API} Error:", e)
                    onError(e)
                })
                .finally(() => onFinish())
        }, this.DELAY_AMOUNT);
    }
}

export default new API();