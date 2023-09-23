import { Helmet } from "react-helmet";
import React from "react";
import { Navigation, PropsForNavigation } from "./Navigation";
import { Loading } from "./Loading";
import { Alert } from "./Alert";

export interface PropsForContent {
    children: React.ReactNode;
    title: string;
    isLoading: boolean;
    isNotFound: boolean;
    messageNotFound: string;
    messageLoading: string;
    isErrored: boolean;
    messageError: string;
    navigation: PropsForNavigation;
}

/**
 * Wrapper for pages that require information from elsewhere before rendering.
 * Displays alternate elements if 'isLoading', 'isNotFound', or 'isEmpty'
 * Includes Navigation Bar
 * 
 * @param isLoading - Displays a Loading element if false 
 * @param isNotFound - Displays an Alert element if true
 * @param messageNotFound - Replaces message content in Not Found Alert
 * @param isErrored - Displays an Alert element if true
 * @param messageError - Replaces message content in Error Alert
 * @param navigation - Set properties for Navigation element
 * @param children - React Nodes
*/

export const Content: React.FC<PropsForContent> = (props) => {
    return <>
        <Helmet>
            <link rel="icon" type="image/png" href="/favicon.png" />
            <title>{props.title} - Clips</title>
        </Helmet>
        <Navigation
            canBack={props.navigation.canBack}
            buttons={props.navigation.buttons}
        />
        {
            (props.isNotFound)
                ? <Alert
                    header="404 Page Not Found (º﹃º )"
                    message={props.messageNotFound || "sorry but whatever you were looking for doesnt exist"}
                    action="BACK"
                />
                : (props.isErrored)
                    ? <Alert
                        header="An Error has Occurred"
                        message={props.messageError}
                        action="REFRESH"
                    />
                    : (props.isLoading)
                        ? <Loading fullscreen={true} message={props.messageLoading} />
                        : <div className="w-full h-full">{props.children}</div>
        }
    </>
}