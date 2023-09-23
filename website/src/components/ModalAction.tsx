import { IconProp } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React from "react";
import Style from "../modules/Style";

interface PropsForModalAction {
    className?: string;
    isDisabled: boolean;
    icon: IconProp;
    content: string;
    onClick: React.MouseEventHandler<HTMLButtonElement>;
}

/**
 * Full Width Buttons for ModalSections
 * 
 * @param onClick - Function to invoke on button click
 * @param disabled - Applies special styling if disabled
 * @param icon - Icon to appear inside button
 * @param content - Text to appear inline with icon
*/

export const ModalAction: React.FC<PropsForModalAction> = (props) => {
    return <button
        onClick={props.onClick}
        disabled={props.isDisabled}
        className={Style.classIf(
            props.isDisabled,
            "opacity-50",
            "hover:text-book hover:bg-button",
            props.className + "px-4 py-2 my-2 h-full w-full text-book-alt ring-1 ring-ring bg-bg-button-alt rounded transition-colors"
        )}
    >
        <FontAwesomeIcon icon={props.icon} className="pr-1" />
        {props.content}
    </button>
}