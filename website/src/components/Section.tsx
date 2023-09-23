import Style from "../modules/Style";
import { Loading } from "./Loading";
import React from "react";

export interface PropsForSection {
    children?: React.ReactNode;
    className?: string;
    fullscreen: boolean;
    isLoading: boolean;
    isEmpty: boolean;
    emptyMessage?: React.ReactNode;
    loadingMessage: string;
}

/**
 * Wrapper for sections that require information from elsewhere before rendering.
 * Displays alternate elements if 'isLoading' or 'isEmpty'
 * 
 * @param fullscreen - Whether or not this element takes up the fullscreen
 * @param isLoading - Displays loading component if true
 * @param isEmpty - Displays placeholder if true
 * @param emptyMessage - Replaces original message of 'nothing found' with components/string if given
*/

export const Section: React.FC<PropsForSection> = (props) => {
    return <>
        {
            (props.isLoading)
                ? <Loading fullscreen={props.fullscreen} message={props.loadingMessage} />
                : (props.isEmpty)
                    ? <div className={Style.classIf(
                        props.fullscreen,
                        "absolute w-full h-full", "m-8",
                        "flex items-center justify-center text-center text-book-alt"
                    )}>
                        <div>
                            <img src="/sakuya-nervous.gif" className="h-32 pb-2 mx-auto" />
                            <div className="font-light">{props.emptyMessage || "nothing found"}</div>
                        </div>
                    </div>
                    : <div className={props.className}>
                        {props.children}
                    </div>
        }
    </>
}