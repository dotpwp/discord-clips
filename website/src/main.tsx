import { createBrowserRouter, RouterProvider } from "react-router-dom";
import ReactDOM from "react-dom/client"
import React from "react";
import "./index.css"
import { ViewsIndex } from "./views/ViewsIndex";
import { ViewServerlist } from "./views/ViewServerlist";
import { ViewServer } from "./views/ViewServer";
import { ViewClip } from "./views/ViewClip";
import { Alert } from "./components/Alert";

ReactDOM
    .createRoot(document.getElementById("sakuya")!)
    .render(
        <React.StrictMode>
            <RouterProvider
                router={createBrowserRouter([
                    { path: "/",                element: <ViewsIndex />     },
                    { path: "/servers",         element: <ViewServerlist /> },
                    {path: "/server/:serverId", element: <ViewServer />     },
                    {path: "/clip/:clipId",     element: <ViewClip />        },
                    // {path: "/user/:userId",        element: <ViewUser />        },
                    {
                        path: "*",
                        element: <Alert
                            header="page not found (￣～￣;)"
                            message="sorry but whatever you were looking for doesnt exist in the part of cyberspace."
                            action="BACK"
                        />
                    }
                ])}
            />
        </React.StrictMode >
    )