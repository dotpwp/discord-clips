import * as Router from "react-router-dom";
import React from "react";
import { ResponseGetClip, ResponseGetClips, ResponseGetHeart, ResponseUseHeart } from "../types/responses";
import { DatabaseFormat, DatabaseHeart } from "../types/database";
import API from "../modules/API";
import { Content } from "../components/Content";
import { NavigationButton } from "../components/NavigationButton";
import { faDownload, faEdit, faHeart, faShare } from "@fortawesome/free-solid-svg-icons";
import Session from "../modules/Session";
import { Modal } from "../components/Modal";
import ImageURL from "../modules/ImageURL";
import TimeAgo from "timeago-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Style from "../modules/Style";
import { Tooltip } from "../components/Tooltip";
import { Section } from "../components/Section";

export const ViewClip: React.FC = () => {
    const navigate = Router.useNavigate()
    const location = Router.useLocation()
    const params = Router.useParams()
    const categoryId = React.useRef<string>(location.state?.categoryId || "0")
    // Modal: Settings
    const [editorSubmitting, setSubmitting] = React.useState(false)
    const [openedSettings, setOpenedSettings] = React.useState(false)
    const [canModifyClip, setModifyClip] = React.useState(false)
    const [editorEdited, setEdited] = React.useState(false)
    const [editorThumbnail, setThumbnail] = React.useState<string>()
    // Section: Heart
    const [heartBusy, setHeartBusy] = React.useState(true)
    const [hearted, setHearted] = React.useState(false)
    const [heartCount, setHeartCount] = React.useState(0)
    const [hearts, setHearts] = React.useState<DatabaseHeart[]>([])
    // Section: Next
    const [isLoadingNext, setLoadingNext] = React.useState(true)
    const [errorNext, setErrorNext] = React.useState("")
    const [dataNext, setDataNext] = React.useState<ResponseGetClips>()
    // Default
    const [isLoading, setLoading] = React.useState(true)
    const [isNotFound, setNotFound] = React.useState(false)
    const [errorMessage, setError] = React.useState("")
    const [dataClip, setDataClip] = React.useState<ResponseGetClip>()
    const [dataFormat, setFormat] = React.useState<DatabaseFormat>()

    React.useEffect(() => {
        // Fetch Clip Data
        API.fetch<ResponseGetClip>(
            "GET", `clips/${params.clipId}`, null,
            data => {
                // Find best playback format
                const bestFormat = data.formats
                    .filter(f => f.codecVideo === "H264")
                    .sort((a, b) => a.bitrateVideo - b.bitrateVideo)

                if (bestFormat.length === 0)
                    return setError("Unable to find suitable playback format")
                setDataClip(data)
                setFormat(bestFormat[0])
                setHeartCount(data.approximateHeartCount)
                setHearts(data.hearts)
                setLoading(false)

                // Fetch Next
                const query = new URLSearchParams()
                query.set("limit", "8")
                query.set("cursor", data.id)
                if (categoryId.current !== "0")
                    query.set("category", categoryId.current)
                API.fetch<ResponseGetClips>(
                    "GET", `servers/${data.server.id}/clips?${query.toString()}`, null,
                    data => setDataNext(data),
                    () => setErrorNext("Sorry! This server doesn't allow guests!"),
                    () => setErrorNext("Not Found"),
                    er => setErrorNext(er.message),
                    () => setLoadingNext(false)
                )

                // Fetch Heart Status
                API.fetch<ResponseGetHeart>(
                    "GET", `clips/${params.clipId}/hearts`, null,
                    state => {
                        setHeartBusy(false)
                        setHearted(state)
                    },
                    () => alert("Fetch Heart: Unauthorized"),
                    () => alert("Fetch Heart: Not Found"),
                    er => alert(`Fetch Heart: ${er.message}`),
                    () => { }
                )
            },
            () => setError("Unauthorized"),
            () => setNotFound(true),
            er => setError(er.message),
            () => { }
        )
    }, [])

    return <Content
        title={dataClip?.title || "Some Clip"}
        isLoading={isLoading}
        isNotFound={isNotFound}
        isErrored={errorMessage !== ""}
        messageError={errorMessage}
        messageNotFound="Unknown Clip"
        messageLoading="loading clip"
        navigation={{
            canBack: true,
            buttons: [
                <NavigationButton
                    id="Nav-Edit"
                    icon={faEdit}
                    content="Edit Video"
                    hidden={dataClip?.user.id !== Session.userId}
                    onClick={() => setOpenedSettings(!openedSettings)}
                />
            ]
        }}
    >
        {/* Modal: Edit */}
        <Modal isVisible={openedSettings}>
        </Modal>

        <div className="pt-16 px-4 gap-[2%] mx-auto w-full max-w-6xl h-full flex flex-row flex-wrap">
            {/* Left-Side */}
            <div className="basis-12/12 lg:basis-[64%] h-fit grid gap-2">
                {/* Section: Video */}
                <video
                    autoPlay
                    controls
                    controlsList="nodownload"
                    className="w-full aspect-video bg-black rounded-2xl "
                    src={`/content/videos/${dataClip?.id}/${dataFormat?.id}.mp4`}
                    // Persist volume between pages
                    onCanPlay={ev => ev.currentTarget.volume =
                        parseInt(localStorage.getItem("playerVolume") || "0") / 100
                    }
                    onVolumeChange={ev => localStorage.setItem(
                        "playerVolume",
                        ((ev.currentTarget.volume * 100) | 0).toString()
                    )}
                />

                {/* Section: Metadata */}
                <p className="text-book lg:text-xl font-bold line-clamp-2">{dataClip?.title}</p>
                <div className="flex justify-between flex-wrap lg:flex-nowrap ">
                    <button
                        className="pl-1 pr-4 h-10 w-full mx-auto lg:mx-0 lg:w-fit lg:max-w-xs hover:ring-accent ring-ring hover:ring-2 ring-1 flex items-center gap-2 rounded-full transition-shadow"
                        onClick={() => navigate(`/user/${dataClip?.user.id}`)}
                    >
                        <img
                            className="h-8 w-8 ring-1 ring-ring aspect-square rounded-full"
                            src={ImageURL.avatar(dataClip?.user, 48)}
                        />
                        <p className="text-book-alt text-left whitespace-nowrap overflow-hidden text-ellipsis">
                            From <b className="text-book">{dataClip?.user.username}</b>
                        </p>
                    </button>
                    <div className="flex flex-row gap-2 w-full lg:w-fit pt-2 lg:pt-0">
                        <button
                            disabled={heartBusy}
                            data-tooltip-id="TT-Hearts"
                            className={Style.classIf(
                                hearted, "text-red-500", "text-book",
                                Style.classIf(
                                    heartBusy, "", "",
                                    "basis-full lg:basis-0 px-4 py-2 h-10 flex items-center justify-center gap-2 hover:ring-2 ring-1 hover:ring-accent ring-ring rounded-xl transition-shadow"
                                )
                            )}
                            onClick={() => {
                                if (heartBusy) return
                                setHeartBusy(true)
                                API.fetch<ResponseUseHeart>(
                                    (hearted ? "DELETE" : "PUT"),
                                    `clips/${dataClip?.id}/hearts`, null,
                                    count => {
                                        setHeartCount(count)
                                        setHearted(!hearted)
                                        if (!hearted) {
                                            // Add self to list of hearts
                                            console.log("ADD")
                                            setHearts([...hearts, {
                                                user: {
                                                    id: Session.userId,
                                                    avatar: Session.avatar,
                                                    username: Session.username
                                                }
                                            } as any])

                                            console.log(hearts)
                                        } else {
                                            // Remove self from list
                                            setHearts(hearts.filter(h => h.user.id !== Session.userId))
                                            console.log("REMOVE")
                                        }
                                    },
                                    () => alert("Heart Error: Unauthorized"),
                                    () => alert("Heart Error: Not Found"),
                                    er => alert(`Heart Error: ${er.message}`),
                                    () => setHeartBusy(false)
                                )
                            }}
                        >
                            <FontAwesomeIcon icon={faHeart} className={Style.classIf(hearted, "animate-hearted", "", "")} />
                            <p className="w-4">{heartCount.toLocaleString()}</p>
                        </button>
                        <Tooltip id="TT-Hearts" place="top" clickable={true} className="grid gap-2 text-center">
                            <p className="text-book-alt">Hearted by</p>
                            <p className="text-book-alt pb-2" hidden={hearts.length !== 0}>nobody...</p>
                            {hearts.slice(0, 10).map(heart => {
                                return <button
                                    key={heart.id}
                                    className="group flex gap-2 align-middle mx-auto pb-1"
                                    onClick={() => navigate(`/user/${heart.user.id}`)}
                                >
                                    <img
                                        src={ImageURL.avatar(heart.user)}
                                        alt={`Avatar for '${heart.user.username}'`}
                                        className="h-6 w-6 aspect-square group-hover:ring-accent ring-ring ring-2 bg-background-alt rounded-full transition-shadow"
                                    />
                                    <p>{heart.user.username}</p>
                                </button>
                            })}
                        </Tooltip>
                        <button
                            className="basis-full lg:basis-0 px-4 py-2 h-10 min-w-8 hidden lg:flex items-center justify-center gap-2 hover:text-book text-book-alt hover:ring-2 ring-1 hover:ring-accent ring-ring rounded-xl transition-all"
                            onClick={() => {
                                const elem = document.createElement("a")
                                elem.download = (dataClip?.title || dataClip?.id || "CLIP")
                                elem.href = `/content/videos/${dataClip?.id}/${dataFormat?.id}.mp4`
                                elem.click()
                                elem.remove()
                            }}
                        >
                            <FontAwesomeIcon icon={faDownload} /> Download
                        </button>
                        <button
                            className="basis-full lg:basis-0 px-4 py-2 h-10 min-w-8 flex items-center justify-center gap-2 hover:text-book text-book-alt hover:ring-2 ring-1 hover:ring-accent ring-ring rounded-xl transition-all"
                            onClick={async () => {
                                const url = new URL(`https://clips.robobot.dev/clip/${dataClip?.id}`)
                                // Append Referral
                                if (Session.loggedIn && Session.userId)
                                    url.searchParams.set("ref", Session.userId.toString())

                                await navigator.clipboard.writeText(url.toString())
                                alert("URL copied to clipboard!")
                            }}
                        >
                            <FontAwesomeIcon icon={faShare} /> Share
                        </button>
                    </div>
                </div>

                {/* Section: Description */}
                <div className="px-4 pt-1 pb-4 text-book-alt ring-1 ring-ring rounded-2xl shadow-2xl">
                    {/* Info */}
                    <div className="py-1 my-1 flex gap-2">
                        <p>{dataClip?.approximateViewCount.toLocaleString()} views</p>
                        <p>•</p>
                        <TimeAgo className="line-clamp-1" datetime={dataClip?.created || new Date()} />
                    </div>
                    {/* Description */}
                    <div className="max-h-64 overflow-scroll">
                        {dataClip?.description.split("\n").map(text => {
                            // Needs proxy implementation before implementing hyperlinks!
                            // For the users sake, and I guess analytics too.
                            return <p>{text}</p>
                        })}
                    </div>
                </div>
            </div>

            {/* Right-Side */}
            <div className="basis-full lg:basis-[34%] mt-2 lg:mt-0">
                {/* Section: Server */}
                <button
                    className="p-2 w-full h-18 flex gap-2 items-center hover:ring-2 ring-1 hover:ring-accent ring-ring rounded-2xl transition-shadow"
                    onClick={() => navigate(`/server/${dataClip?.server.id}`)}
                >
                    <img src={ImageURL.icon(dataClip?.server)} className="w-12 h-12 ring-2 ring-ring rounded-2xl" />
                    <div className="text-left grid">
                        <p className="text-book text-wrangler">{dataClip?.server.name}</p>
                        <p className="text-book-alt text-wrangler">{dataClip?.server.uploadCount} clips • {dataClip?.server.categoryCount} categories</p>
                    </div>
                </button>
                {/* Section: Next */}
                <Section
                    className="flex flex-wrap gap-2 mt-2 w-full"
                    fullscreen={false}
                    isLoading={isLoadingNext}
                    isEmpty={dataNext?.items.length === 0}
                    emptyMessage="no more clips"
                    loadingMessage="finding next clips"
                >
                    {dataNext?.items.map(clip => {
                        return <button
                            key={clip.id}
                            onClick={() => navigate(`/clip/${clip.id}`)}
                            className="w-full h-24 flex gap-2 text-book items-center rounded-2xl transition-shadow"
                        >
                            <img
                                className="h-full aspect-video rounded-2xl"
                                src={ImageURL.thumbnail(clip.id, 128)}
                            />
                            <div className="text-left">
                                <p>{clip.title}</p>
                                <p className="text-book-alt">{clip.user.username}</p>
                                <p className="text-book-alt">{clip.approximateViewCount} views - <TimeAgo datetime={clip.created} /></p>
                            </div>
                        </button>
                    })}
                </Section>
            </div>
        </div>
    </Content >
}