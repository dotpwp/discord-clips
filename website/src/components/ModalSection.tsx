import { IconProp } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React from "react";

interface PropsForModalSection {
    children: React.ReactNode;
    icon: IconProp;
    title: string;
    description: string;
}

/**
 * Wrapper for Modal Section with header, title, description, and children.
 * @param icon - Icon that appears in top left corner
 * @param title - Text that appears inline with Icon
 * @param description - Description for Section, Seperate paragraphs with \n 
*/

export const ModalSection: React.FC<PropsForModalSection> = (props) => {
    return <div className="py-4 w-full border-b border-b-ring">
        <p className="text-book text-lg font-semibold">
            <FontAwesomeIcon className="text-2xl pr-1" icon={props.icon} />
            {props.title}
        </p>
        {props
            .description
            .split("\n")
            .map(text => <p className="pb-2 text-book-alt">{text}</p>)
        }
        <div className="w-full">
            {props.children}
        </div>
    </div>
}