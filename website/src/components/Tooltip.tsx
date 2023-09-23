import * as ReactTootlip from "react-tooltip";
import React from "react";

export interface PropsForBetterTooltip {
    children?: React.ReactNode;
    className?: string;
    id: string;
    hidden?: boolean;
    clickable?: boolean;
    place?: ReactTootlip.PlacesType;
    content?: string;
}

/**
 * Wrapper for React Tooltips, comes with styling for consistency sakes.
 * 
 * @param id - ID for element, match ids with another element to have tooltip appear when hovered
 * @param hidden - Hide the element if true
 * @param clickable - Makes tooltip clickable, enable if adding children that are buttons
 * @param place - Placement for Tooltip, defaults to 'bottom'.
 * @param content - String content to be placed in element, can use children alternatively.
*/

export const Tooltip: React.FC<PropsForBetterTooltip> = (props) => {
    return <ReactTootlip.Tooltip
        id={props.id}
        place={props.place}
        clickable={props.clickable}
        hidden={props.hidden}
        content={props.content}
        classNameArrow="hidden"
        className={"!ring-1 ring-ring !bg-background-alt !rounded-lg !shadow-2xl " + props.className}
        >
        { props.children }
    </ReactTootlip.Tooltip >
}