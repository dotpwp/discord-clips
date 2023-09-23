import React from "react";

export interface PropsForAlert {
    header: string;
    message: string;
    action: "NONE" | "REFRESH" | "BACK";
}

/**
 *   Displays a cute image of rei holding a huge squid in her arms.
 *   Takes up the whole viewport so use should be limited to fatal errors.
 *   @param header - Message Header (ex. '404: Page Not Found')
 *   @param message - Message Content (ex. 'A user does not exist with this username')
 *   @param action - NONE = No Button, REFRESH = Refresh the page, BACK = Go back once in browser history
*/

export const Alert: React.FC<PropsForAlert> = (props) => {
    return <div className="px-4 absolute w-full h-full flex text-center items-center justify-center bg-background">
        <div className="max-w-lg space-y-4">
            <img
                src="/app-404.gif"
                alt="A drawing of Rei holding a big squid on an old CRT monitor"
                className="w-full h-full aspect-retro rounded shadow-2xl"
            />
            <h1 className="font-bold text-lg text-book">{props.header}</h1>
            <p className="font-sans text-book-alt">{props.message}</p>
            <button
                aria-label="Go back"
                className="py-1 px-4 font-semibold hover:book text-book border border-accent bg-transparent hover:bg-accent rounded-full"
                hidden={props.action === "NONE"}
                onClick={() => {
                    if (props.action === "REFRESH") return window.location.reload()
                    if (props.action === "BACK") return window.history.back()
                }}
            >
                {(props.action === "REFRESH") ? "Refresh Page" : "Take a U-Turn"}
            </button>
        </div>
    </div>
}