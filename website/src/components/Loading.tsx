import React from "react";
import Style from "../modules/Style";

export interface PropsForLoading {
    fullscreen: boolean;
    message?: string;
}

/**
 * Loading icon consisting of sakuya flossing and a bar moving back and forth.
 *
 * @param message - Replaces the default message of 'loading stuffs' if set.
 * @param fullscreen - Fills the entire screen and center itself if enabled.
*/

export const Loading: React.FC<PropsForLoading> = (props) => {
    return <div className={Style.classIf(
        props.fullscreen,
        "absolute w-full h-full", "m-8",
        "flex items-center justify-center text-book-alt"
    )}>
        <div className="w-64 text-center">
            <img src="/sakuya-dance.gif" className="h-32 mx-auto" />
            <div className="h-[1px] my-2 bg-ring">
                <div className="relative h-full bg-book w-4 bg-text animate-loadingSlider" />
            </div>
            <span className="font-light">{props.message || "loading stuffs"}</span>
        </div>
    </div>
}