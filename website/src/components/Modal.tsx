import React from "react";
import Style from "../modules/Style";

export interface PropsForModal {
    children: React.ReactNode;
    isVisible: boolean;
}

/**
 * Container for Modals, not fullscreen, appears in center of screen.
 * 
 * @param isVisible - Shows up if visible
 * @param children - React Nodes
*/

export const Modal: React.FC<PropsForModal> = (props) => {
    // return <div className={Style.classIf()}>
    return <div className={Style.classIf(
        props.isVisible,
        "", "hidden",
        "px-2 pb-8 pt-16 fixed w-full h-full flex items-center justify-center bg-background-alt/90 z-10"
    )}>
        <div className="px-4 py-2 w-full max-w-xl max-h-full h-fit overflow-scroll bg-background ring-1 ring-ring rounded-xl shadow-2xl">
            {props.children}
        </div>
    </div>
}