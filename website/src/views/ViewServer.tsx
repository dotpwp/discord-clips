import { faBell, faCaretDown, faCirclePlus, faEye, faEyeSlash, faFolder, faGear, faLock, faLockOpen, faSave, faTrash, faVideo } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import * as Router from "react-router-dom";
import TimeAgo from "timeago-react";
import React from "react";
import { DatabaseCategory, DatabaseServer, JsonWebhook } from "../types/database";
import { ResponseGetClips, ResponseGetServer } from "../types/responses";
import { NavigationButton } from "../components/NavigationButton";
import { ModalSection } from "../components/ModalSection";
import { ModalToggle } from "../components/ModalToggle";
import { ModalAction } from "../components/ModalAction";
import { Loading } from "../components/Loading";
import { Content } from "../components/Content";
import { Section } from "../components/Section";
import { Modal } from "../components/Modal";
import { IconMapping } from "../modules/Icons";
import ImageURL from "../modules/ImageURL";
import Session from "../modules/Session";
import Style from "../modules/Style";
import API from "../modules/API";

/**
 * Page that displays a sever. With infinite scrolling list of clips.
 * Also includes modal for editing and uploading videos.
*/

export const ViewServer: React.FC = () => {
    const params = Router.useParams<{ serverId: string }>()
    const navigate = Router.useNavigate()
    // Modal: Settings
    const [webhookIndex, setIndex] = React.useState(0)
    const [allowGuests, setAllowGuests] = React.useState(true)
    const [openedSettings, setOpenedSettings] = React.useState(false)
    const [canModifyServer, setModifyServer] = React.useState(false)
    const [editorWebhooks, setEditorWebhooks] = React.useState<({ id: string; } & JsonWebhook)[]>([])
    const [editorCategories, setEditorCategories] = React.useState<DatabaseCategory[]>([])
    const [editorSubmitting, setSubmitting] = React.useState(false)
    const [editorEdited, setEdited] = React.useState(false)
    // Modal: Upload
    const [openedUpload, setOpenedUpload] = React.useState(false)
    // Default
    const [errorMessage, setError] = React.useState("")
    const [isLoadingServer, setLoadingServer] = React.useState(true)
    const [isLoadingClips, setLoadingClips] = React.useState(true)
    const [isNotFound, setNotFound] = React.useState(false)
    const [dataClips, setClips] = React.useState<ResponseGetClips>()
    const [dataServer, setServer] = React.useState<DatabaseServer>()
    const [cacheClips, setCache] = React.useState<{ [key: string]: ResponseGetClips; }>({})
    const [filterCategory, setCategory] = React.useState("")
    const [filterPage, setPage] = React.useState(1)

    React.useEffect(() => {
        if (!dataServer) API.fetch<ResponseGetServer>(
            "GET", `servers/${params.serverId}`, null,
            data => {
                setServer(data)
                setCategory(data.categories.find(c => c.flags === "ALL")?.id || "")
                if (Session.canModifyServer(data.id)) {
                    setModifyServer(true)
                    setAllowGuests(data.allowGuests)
                    setEditorCategories(data.categories)
                    setEditorWebhooks(data.webhooks.map(w => {
                        setIndex(webhookIndex + 1)
                        return Object.assign({ id: webhookIndex.toString() }, w)
                    }))
                }
            },
            () => setError("Sorry! This server doesn't allow guests!"),
            () => setNotFound(true),
            er => setError(er.message),
            () => setLoadingServer(false)
        )
        if (dataServer) {
            setLoadingClips(true)
            if (cacheClips[filterCategory] && filterPage === 1) {
                setClips(cacheClips[filterCategory])
                setLoadingClips(false)
                return
            }

            const query = new URLSearchParams()
            query.set("category", filterCategory)
            query.set("page", filterPage.toString())
            query.set("limit", "24")

            API.fetch<ResponseGetClips>(
                "GET", `servers/${params.serverId}/clips?${query.toString()}`, null,
                data => {
                    const cachedData = cacheClips[filterCategory]
                    if (filterPage > 1 && cachedData) {
                        // Add Items to Cache
                        cacheClips[filterCategory].items = [...cacheClips[filterCategory].items, ...data.items]
                        setCache(cacheClips)
                        setClips(cacheClips[filterCategory])
                    } else {
                        // Create Page in Cache
                        cacheClips[filterCategory] = data
                        setCache(cacheClips)
                        setClips(data)
                    }
                },
                () => setError("Sorry! This server doesn't allow guests!"),
                () => setNotFound(true),
                er => setError(er.message),
                () => setLoadingClips(false)
            )
        }
    }, [filterCategory, filterPage])

    return <Content
        title={`Browsing ${dataServer?.name || "Server"}`}
        isLoading={isLoadingServer}
        isErrored={errorMessage !== ""}
        messageError={errorMessage}
        isNotFound={isNotFound}
        messageNotFound="Unknown Server"
        messageLoading="loading server"
        navigation={{
            canBack: true,
            buttons: [
                <NavigationButton
                    id="Nav-Settings"
                    hidden={!canModifyServer}
                    icon={faGear}
                    content="Server Settings"
                    onClick={() => setOpenedSettings(!openedSettings)}
                />,
                <NavigationButton
                    id={"Nav-Uploader"}
                    hidden={!Session.loggedIn}
                    icon={faVideo}
                    content="Upload Video"
                    onClick={() => setOpenedUpload(!openedUpload)}
                />
            ]
        }}
    >
        {/* Modal: Upload */}
        <Modal isVisible={openedUpload}>
        </Modal>

        {/* Modal: Settings */}
        <Modal isVisible={openedSettings}>
            <ModalSection icon={faGear} title={"Settings"} description={
                "Enable or disable special features for this server.\n" +
                "Guests are individuals who are not members of this Discord server. " +
                "If this option is turned off, they won't have access to browse this server."
            }>
                <div className="flex justify-between pt-4">
                    <p className="text-book">Allow Guests</p>
                    <ModalToggle
                        iconEnabled={faEye}
                        iconDisabled={faEyeSlash}
                        toggled={allowGuests}
                        disabled={editorSubmitting}
                        onClick={() => {
                            setEdited(true)
                            setAllowGuests(!allowGuests)
                        }}
                    />
                </div>
            </ModalSection>

            <ModalSection icon={faBell} title="Webhooks" description={
                "Configure a webhook to send a message whenever a new clip is uploaded to a category."
            }>
                {editorWebhooks.map(webhook => {
                    return <div key={webhook.id} className="py-2 flex flex-wrap gap-2">
                        <select
                            disabled={editorSubmitting}
                            defaultValue={webhook.categoryId}
                            className={Style.classIf(
                                editorSubmitting, "opacity-50", "",
                                "p-2 flex-grow basis-12/12 text-book focus:ring-2 ring-1 focus:ring-accent ring-ring focus:bg-button bg-button-alt rounded outline-none transition-shadow"
                            )}
                            onChange={ev => {
                                setEdited(true)
                                webhook.categoryId = ev.target.value
                            }}
                        >
                            {editorCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <input
                            type="text"
                            disabled={editorSubmitting}
                            defaultValue={webhook.webhookUrl}
                            placeholder="https://discord.com/api/webhooks/1234567890123456789/ABCDEFGHIJKLMNOPQRSTUVWXYZ"
                            className={Style.classIf(
                                editorSubmitting, "opacity-50", "",
                                "p-2 flex-grow basis-10/12 text-book focus:ring-2 ring-1 focus:ring-accent ring-ring focus:bg-button bg-button-alt rounded outline-none transition-shadow"
                            )}
                            onChange={ev => {
                                setEdited(true)
                                webhook.webhookUrl = ev.target.value
                            }}
                        />
                        <ModalToggle
                            toggled={false}
                            iconEnabled={faTrash}
                            iconDisabled={faTrash}
                            disabled={editorSubmitting}
                            onClick={() => {
                                setEdited(true)
                                setEditorWebhooks(editorWebhooks.filter(w => w.id !== webhook.id))
                            }}
                        />
                    </div>
                })}
                <ModalAction
                    isDisabled={editorWebhooks.length > 50}
                    icon={faCirclePlus}
                    content="New Webhook"
                    onClick={() => {
                        setEdited(true)
                        setIndex(webhookIndex + 1)
                        setEditorWebhooks([
                            ...editorWebhooks, {
                                id: webhookIndex.toString(),
                                categoryId: "",
                                webhookUrl: ""
                            }])
                    }}
                />
                <ModalAction
                    isDisabled={editorSubmitting || !editorEdited}
                    icon={faSave}
                    content="Save Changes"
                    onClick={() => {
                        if (!dataServer || editorSubmitting) return
                        setSubmitting(true)
                        API.fetch(
                            "PATCH", `servers/${dataServer.id}`,
                            {
                                ["allowGuests"]: allowGuests,
                                ["webhooks"]: editorWebhooks.map<JsonWebhook>(c => {
                                    return {
                                        ["categoryId"]: c.categoryId,
                                        ["webhookUrl"]: c.webhookUrl
                                    }
                                })
                            },
                            () => setEdited(false),
                            () => alert("Unable to create category: Not Found"),
                            () => alert("Unable to create category: Unauthorized"),
                            er => alert("Unable to create category: " + er.message),
                            () => setSubmitting(false),
                        )
                    }}
                />
            </ModalSection>

            <ModalSection icon={faFolder} title={"Categories"} description={
                `Organize your items by creating categories. If you delete a category that contains clips, those clips will be automatically moved to the 'All' category.\n` +
                `Managers are members with the "Administrator" or "Manage Server" permission. The lock restricts category management to Managers.\n` +
                `The default categories All, Clips, and Videos cannot be edited.`
            }>
                {editorCategories
                    .sort((a, b) => new Date(a.created).getTime() - new Date(b.created).getTime())
                    .map(category => {
                        let isManaged = category.managed
                        let isDisabled = (editorSubmitting || category.flags !== "NONE")
                        function patchCategory(body: object, onFinish?: () => void) {
                            if (editorSubmitting || !dataServer) return
                            setSubmitting(true)
                            API.fetch<DatabaseCategory>(
                                "PATCH", `servers/${dataServer.id}/categories/${category.id}`, body,
                                data => {
                                    const updatedCategories = editorCategories.filter(c => c.id !== data.id)
                                    updatedCategories.push(data)
                                    setEditorCategories(updatedCategories)
                                    setServer(Object.assign(dataServer, { categories: updatedCategories }))
                                },
                                () => alert("Unable to edit category: Unauthorized"),
                                () => alert("Unable to edit category: Not Found"),
                                er => alert("Unable to edit category:" + er.message),
                                () => {
                                    setSubmitting(false)
                                    if (onFinish) onFinish()
                                }
                            )
                        }
                        return <div key={category.id} className="py-2 w-full flex flex-wrap gap-2">
                            <input
                                type="text"
                                maxLength={32}
                                defaultValue={category.name}
                                disabled={isDisabled}
                                placeholder="Name"
                                className={Style.classIf(
                                    isDisabled, "opacity-50", "",
                                    "p-2 h-10 flex-grow basis-12/12 text-book focus:ring-2 ring-1 focus:ring-accent ring-ring focus:bg-button bg-button-alt rounded outline-none transition-shadow"
                                )}
                                onChange={ev => {
                                    const currentValue = ev.target.value
                                    setTimeout(() => {
                                        if (currentValue !== ev.target.value || currentValue === "") return
                                        patchCategory({ name: currentValue }, () => {
                                            ev.target.disabled = false
                                            ev.target.focus()
                                        })
                                    }, 1_250)
                                }}
                            />
                            <select
                                disabled={isDisabled}
                                defaultValue={category.icon}
                                onChange={ev => patchCategory({ ["icon"]: ev.currentTarget.value })}
                                className={Style.classIf(
                                    isDisabled,
                                    "opacity-50", "",
                                    "p-2 h-10 flex-grow basis-9/12 text-book focus:ring-2 ring-1 focus:ring-accent ring-ring focus:bg-button bg-button-alt rounded outline-none transition-shadow"
                                    // "flex-grow basis-8/12 h-10 text-gray-200 px-2 py-1 rounded focus:bg-gray-700 bg-transparent focus:ring-2 ring-1 focus:ring-blurple ring-gray-600 outline-none transition-shadow"
                                )}
                            >
                                {IconMapping.map((icon, index) =>
                                    <option key={index.toString()} value={icon.name.toLowerCase()}>{icon.name}</option>
                                )}
                            </select>
                            <ModalToggle
                                className="flex-grow basis-1/12"
                                toggled={isManaged}
                                iconEnabled={faLock}
                                iconDisabled={faLockOpen}
                                disabled={editorSubmitting || (category.flags !== "NONE")}
                                onClick={() => {
                                    isManaged = !isManaged
                                    patchCategory({ ["managed"]: isManaged })
                                }}
                            />
                            <ModalToggle
                                className="flex-grow basis-1/12"
                                toggled={false}
                                iconEnabled={faTrash}
                                iconDisabled={faTrash}
                                disabled={editorSubmitting || (category.flags !== "NONE")}
                                onClick={() => {
                                    if (!dataServer || editorSubmitting) return
                                    setSubmitting(true)
                                    API.fetch<true>(
                                        "DELETE", `/api/servers/${dataServer.id}/categories/${category.id}`, null,
                                        () => {
                                            setServer(Object.assign(dataServer, { categories: dataServer.categories.filter(c => c.id !== category.id) }))
                                            setEditorCategories(editorCategories.filter(c => c.id !== category.id))
                                        },
                                        () => alert("Error: Unauthorized"),
                                        () => alert("Error: Not Found"),
                                        er => alert("Error: " + er.message),
                                        () => setSubmitting(false)
                                    )
                                }}
                            />
                        </div>
                    })
                }
                <ModalAction
                    isDisabled={editorCategories.length > 25}
                    icon={faCirclePlus}
                    content="New Category"
                    onClick={() => {
                        if (!dataServer || editorSubmitting) return
                        setSubmitting(true)
                        API.fetch<DatabaseCategory>(
                            "POST", `servers/${dataServer.id}/categories`,
                            {
                                ["name"]: `New Category (#${editorCategories.length + 1})`,
                                ["icon"]: IconMapping[0].name.toLowerCase(),
                                ["managed"]: false,
                            },
                            data => {
                                setServer(Object.assign(dataServer, { categories: [...dataServer.categories, data] }))
                                setEditorCategories([...editorCategories, data])
                            },
                            () => alert("Error: Not Found"),
                            () => alert("Error: Unauthorized"),
                            er => alert("Error: " + er.message),
                            () => setSubmitting(false)
                        )
                    }}
                />
            </ModalSection>
        </Modal>

        {/* Section: Server */}
        <div className="pt-24 px-8 pb-4 w-full bg-background-alt border-b border-b-accent" >
            <div className="mx-auto max-w-5xl flex gap-4 items-end">
                <img
                    className="h-14 lg:h-32 w-14 lg:w-32 aspect-square bg-background ring ring-accent rounded-xl"
                    src={ImageURL.icon(dataServer, 256)}
                    alt={`Server icon for '${dataServer?.name}'`}
                />
                <div className="h-full w-full">
                    <p className="text-base lg:text-2xl text-book-alt font-light line-clamp-1">{dataServer?.uploadCount} clips • {dataServer?.categoryCount} categories</p>
                    <p className="text-2xl lg:text-6xl text-book font-semibold line-clamp-1">{dataServer?.name}</p>
                </div>
            </div>

            {/* Section: Categories */}
            <div className="mx-auto max-w-5xl pt-4 flex flex-wrap gap-2">
                {dataServer?.categories
                    .sort((a, b) => new Date(a.created).getTime() - new Date(b.created).getTime())
                    .map(category => <button
                        disabled={isLoadingClips}
                        key={category.id}
                        onClick={() => {
                            if (category.id === filterCategory) return
                            setCategory(category.id)
                            setPage(1)
                        }}
                        className={Style.classIf(
                            filterCategory === category.id,
                            "bg-accent ring-accent", "bg-background",
                            "px-4 py-1 min-w-fit ring-1 text-book hover:ring-accent ring-ring rounded-full transition-colors"
                        )}
                    >
                        <FontAwesomeIcon
                            className="pr-2"
                            icon={IconMapping.find(i => category.icon === i.name.toLowerCase())?.icon || IconMapping[0].icon}
                        />
                        {category.name}
                    </button>
                    )
                }
            </div>
        </div>

        {/* Section: Clips */}
        <Section
            className="px-4 py-4 mx-auto w-full max-w-5xl grid gap-4 lg:grid-cols-3 md:grid-cols-2 sm:grid-cols-1"
            fullscreen={false}
            isLoading={isLoadingClips}
            isEmpty={!isLoadingClips && (dataClips?.items.length === 0)}
            emptyMessage="no clips found"
            loadingMessage="loading clips"
        >
            {dataClips?.items.map(clip => {
                return <button
                    key={clip.id}
                    className="text-book rounded-2xl hover:ring-2 ring-1 hover:ring-accent ring-ring bg-background-alt hover:shadow-2xl shadow transition-shadow"
                    onClick={() => navigate(`/clip/${clip.id}`)}
                >
                    <img
                        className="w-full aspect-video rounded-tr-2xl rounded-tl-2xl bg-black "
                        alt={`Thumbnail for '${clip.title}'`}
                        src={ImageURL.thumbnail(clip.id, 512)}
                    />
                    <div className="w-full p-4">
                        <h1 className="font-semibold text-xl line-clamp-2">{clip.title}</h1>
                        <p className="font-light text-book-alt">{clip.approximateViewCount} views • <TimeAgo datetime={clip.created} /></p>
                        <div className="pt-1 w-full items-center mx-auto flex gap-1 justify-center align-middle">
                            <img
                                className="h-6 w-6 ring-2 ring-ring rounded-full aspect-square"
                                alt={`Avatar for '${clip.user.id}'`}
                                src={ImageURL.avatar(clip.user, 48)}
                            />
                            <p>{clip.user.username}</p>
                        </div>
                    </div>
                </button>
            })}
        </Section>
    </Content >
}