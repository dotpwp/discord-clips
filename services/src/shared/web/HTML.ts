class HTML {
    /**
      * Generate a HTML with a dark background and white text in the center with your message.
     * @param message - Message to Display, escapes HTML Characters.
     * @returns {string}
     */
    public notification(message: string): string {
        return `<!DOCTYPE html> 
            <html lang="en">
                <head>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                    <style>
                        body {
                            background-color: #1f2937;
                        }
                        div {
                            position: absolute;
                            display: flex;
                            width: 100%;
                            height: 100%;
                            align-items: center;
                            justify-content: center;
                        }
                        p {
                            color: #e5e7eb;
                            font-family: Arial, Helvetica, sans-serif
                        }
                        </style>
                        <script>
                            setTimeout(function() {
                                if (window.parent) {
                                    window.close()
                                } else {
                                    window.location.href = "/"
                                }
                            }, 1_000) 
                        </script>
                </head>
                <body>
                    <div><p>${message.replace(/(<([^>]+)>)/ig, "")}</p></div>
                </body>
            </html>`
    }

}
export default new HTML()