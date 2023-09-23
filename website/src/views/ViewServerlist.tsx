import { useNavigate } from "react-router-dom";
import React from "react";
import Session from "../modules/Session";
import { Section } from "../components/Section";
import { DatabaseServer } from "../types/database";
import { Content } from "../components/Content";
import API from "../modules/API";
import { ResponseGetServers } from "../types/responses";
import ImageURL from "../modules/ImageURL";

/**
 * Page that lists all servers user is currently in.
 * Allows them to choose a server, or encourages them to login if not already.
*/

const MissingSomething = <div className="w-full my-8 text-book-alt text-center font-light">
    <p>Missing a server?</p>
    <p>Try logging out then back in!</p>
</div>

export const ViewServerlist: React.FC = () => {
    const navigate = useNavigate()
    const [dataServer, setDataServers] = React.useState<DatabaseServer[]>([]);
    const [isLoading, setLoading] = React.useState(true)
    const [errorMessage, setError] = React.useState("")

    React.useEffect(() => {
        if (!Session.loggedIn) return setLoading(false)
        if (!isLoading) return
        API.fetch<ResponseGetServers>(
            "GET", "servers", null,
            // data => setDataServers(data),
            data => setDataServers(data),
            () => setError("Unauthorized"),
            () => setError("Not Found"),
            er => setError(er.message),
            () => setLoading(false)
        )
    }, [dataServer])

    return <Content
        title="Server List"
        isLoading={isLoading}
        messageLoading="loading servers"
        isErrored={errorMessage !== ""}
        messageError={errorMessage}
        isNotFound={false}
        messageNotFound=""
        navigation={{ canBack: false, buttons: [] }}
    >
        <Section
            className="px-4 max-w-5xl w-full mx-auto pt-24  "
            fullscreen={true}
            isLoading={false}
            loadingMessage=""
            isEmpty={!Session.loggedIn || dataServer.length === 0}
            emptyMessage={
                !Session.loggedIn
                    ? <>
                        <p className="text-book">Login to view your servers!</p>
                        <p>Hint, Hint! Click the icon in the top right!</p>
                    </>
                    : <>
                        <p>Well, well, well, looks like someone's floating in the digital abyss with no servers to call home!</p>
                        <p>Maybe it's time to hit that 'Join Server' button and start your epic journey through the land of Discord? </p>
                        <p>Or are you the elusive lone wolf, forging your own path in the virtual wilderness?</p>
                        <p>Either way, may your DMs be ever entertaining!</p>
                        {MissingSomething}
                    </>
            }>

            <div className="text-book text-center pb-8 grid gap-2">
                <h1 className="text-3xl text-center font-light">Welcome {Session.username}!</h1>
                <p className="text-book-alt">You're a member of these servers:</p>
            </div>

            <div className="grid lg:grid-cols-3 md:grid-cols-2 sm:grid-cols-1 gap-4 scale-100">
                {dataServer.map(server => {
                    return <button
                        key={server.id}
                        className=" h-24 p-4 gap-2 flex items-center bg-background-alt rounded-2xl hover:ring-2 ring-1 hover:ring-accent ring-ring transition-shadow"
                        onClick={() => navigate(`/server/${server.id}`)}
                    >
                        <img
                            className="h-16 w-16 aspect-square rounded-xl ring-1 ring-ring hover:shadow-2xl shadow transition-shadow "
                            alt={`Server icon for '${server.name}'`}
                            src={ImageURL.icon(server, 128)}
                        />
                        <div className="text-left items-center">
                            <p className="text-book font-semibold line-clamp-2">{server.name}</p>
                            <p className="text-book-alt font-light line-clamp-1">{server.uploadCount} clips • {server.categoryCount} categories</p>
                        </div>
                    </button>
                })}
            </div>
            {MissingSomething}
        </Section>
    </Content>
}