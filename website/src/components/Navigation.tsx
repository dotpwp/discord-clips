import { faArrowLeft, faSignOutAlt, faUserCircle } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDiscord } from "@fortawesome/free-brands-svg-icons";
import { useNavigate } from "react-router-dom";
import React from "react";
import { NavigationButton } from "./NavigationButton";
import { Tooltip } from "./Tooltip";
import ImageURL from "../modules/ImageURL";
import Session from "../modules/Session";
import Style from "../modules/Style";

export interface PropsForNavigation {
    canBack: boolean;
    buttons: React.ReactNode[];
}

/**
 * Navigation bar with support for buttons. 
 * Displays Logo and users avatar in the corners of the screen.
 * 
 * @param canBack - Displays "Back" button if enabled
 * @param buttons - List of NavigationButtons elements to display next to avatar.
*/

export const Navigation: React.FC<PropsForNavigation> = (props) => {
    const navigate = useNavigate()
    return <div className="fixed top-0 left-0 right-0 w-full bg-gradient-to-b from-background-alt to-transparent z-50">
        <div className="p-2 w-full max-w-6xl mx-auto flex justify-between">
            <div className="flex align-middle items-center gap-4">
                {/* Button: Home */}
                <button
                    aria-label="Go Home"
                    data-tooltip-id="Nav-Logo"
                    onClick={() => navigate('/')}
                >
                    <img className="h-10 w-fit" alt="Site Logo" src="/app-logo.png" />
                    <Tooltip id="Nav-Logo" content="Home" />
                </button>
                {/* Button: Back */}
                <NavigationButton
                    id="Nav-Back"
                    icon={faArrowLeft}
                    content="Back"
                    hidden={!props.canBack}
                    onClick={() => window.history.back()}
                />
            </div>
            <div className="flex align-middle items-center gap-2">
                {/* Button: Custom */}
                {props.buttons}
                {/* Button: Profile */}
                <button
                    data-tooltip-id="Nav-Profile"
                    className="group h-10 w-10 rounded-full bg-background-alt hover:ring-2 ring-1 ring-ring hover:ring-accent shadow-2xl transition-all"
                    onClick={() => {
                        if (Session.loggedIn) return
                        const popup = window.open("/api/auth/login", "_blank", "popup=yes,height=740,width=480")
                        const timer = setInterval(() => {
                            if (popup?.closed === true) {
                                clearInterval(timer)
                                window.location.reload()
                            }
                        }, 1000)
                        return
                    }}>
                    <img
                        hidden={!Session.loggedIn}
                        className="w-full h-full aspect-square rounded-full"
                        alt={`Avatar for '${Session.username || "Anonymous"}'`}
                        src={ImageURL.sessionAvatar(48)}
                    />
                    <FontAwesomeIcon
                        icon={faDiscord}
                        className={Style.classIf(Session.loggedIn, "hidden", "", "text-book-alt")}
                    />
                </button>
                <Tooltip id="Nav-Profile" clickable={Session.loggedIn}>
                    {!Session.loggedIn
                        ? <>Login with Discord</>
                        : <>
                            <button
                                className="hover:text-book text-book-alt w-full flex gap-1 justify-center items-center transition-colors"
                                onClick={() => navigate("/user/@me")}>
                                <FontAwesomeIcon icon={faUserCircle} />
                                View Profile
                            </button>
                            <button
                                className="hover:text-book text-book-alt w-full flex gap-1 justify-center items-center transition-colors"
                                onClick={() => window.location.href = "/api/auth/logout"}>
                                <FontAwesomeIcon icon={faSignOutAlt} />
                                Log Out
                            </button>
                        </>}
                </Tooltip>
            </div>
        </div>
    </div>

}