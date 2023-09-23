import React from "react";
import Style from "../modules/Style";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { IconProp } from "@fortawesome/fontawesome-svg-core";

export interface PropsForModalToggle {
    className?: string;
    disabled: boolean;
    toggled: boolean;
    iconEnabled: IconProp;
    iconDisabled: IconProp;
    onClick: React.MouseEventHandler<HTMLButtonElement>;
}

export const ModalToggle: React.FC<PropsForModalToggle> = (props) => {
    return <button
        className={Style.classIf(
            props.disabled,
            "opacity-50", "hover:ring-2 hover:ring-accent hover:bg-button",
            props.className + " w-10 px-2 py-1 group text-center bg-button-alt rounded ring-1 ring-ring transition-colors"
        )}
        disabled={props.disabled}
        onClick={props.onClick}
    >
        <FontAwesomeIcon
            icon={props.toggled ? props.iconEnabled : props.iconDisabled}
            className={Style.classIf(
                props.disabled,
                "text-book-alt",
                "group-hover:text-book text-book-alt",
                "transition-colors"
            )}
        />
    </button>
}