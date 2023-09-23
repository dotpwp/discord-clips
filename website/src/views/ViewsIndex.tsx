import { useNavigate } from "react-router-dom";
import React from "react";

/**
 * Empty page that redirects to '/servers'
 * One day this will become a landing page.
*/

export const ViewsIndex: React.FC = () => {
    const navigate = useNavigate()
    React.useEffect(() => navigate("/servers"))
    return <></>
}