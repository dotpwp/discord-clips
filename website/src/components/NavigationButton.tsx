import { IconDefinition } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React from "react";
import { Tooltip } from "./Tooltip";

export interface PropsforNavigationButton {
    onClick: React.MouseEventHandler<HTMLButtonElement>;
    id: string;
    icon: IconDefinition;
    content: string;
    hidden: boolean;
}

/**
 * A button that appears in the Navigation Bar.
 * 
 * @param onClick - Function to call upon click
 * @param icon - FontAwesome Icon to put in center of button
 * @param content - Message that appears when button is hovered
 * @param hidden - Hides button if set to true
*/

export const NavigationButton: React.FC<PropsforNavigationButton> = (props) => {
    return <button
        key={props.id}
        aria-label={props.content}
        data-tooltip-id={props.id}
        hidden={props.hidden}
        onClick={props.onClick}
        className="w-8 h-8 group hover:text-blurple hover:ring-2 ring-1 ring-ring hover:ring-accent bg-background-alt rounded-full hover:shadow-2xl shadow transition-shadow"
    >
        <FontAwesomeIcon icon={props.icon} className="text-md group-hover:text-book text-book-alt transition-colors" />
        <Tooltip id={props.id} content={props.content} />
    </button>
}