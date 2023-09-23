// TODO: NEEDS REFACTORING
import { faBackspace, faDownload, faEdit, faFileImport, faHeart, faL, faShare, faTrash, faUpload, faX } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ReactNode, useEffect, useState, FC, createRef } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Tooltip } from "react-tooltip";
import { Helmet } from "react-helmet";

import { ResponseGetClip, ResponseGetClips, ResponseGetHeart, ResponseUseHeart } from "../types/responses";
import { ViewError, ViewNotFound } from "../components/Alert";
import { DatabaseFormat } from "../types/database";
import { Navbar } from "../_components/Navbar";
import Loading from "../components/Loading";
import ImageURL from "../modules/ImageURL";
import Session from "../modules/Session";
import TimeAgo from "timeago-react";
import API from "../modules/API";

const Centered: FC<{ children: ReactNode }> = ({ children }) => {
    return <>
        <div className="w-full h-full flex items-center justify-center text-gray-400">
            <div className="text-center">
                {children}
            </div>
        </div>
    </>
}

export const ViewClip: FC<{ modalEdit: boolean }> = (props) => {
    const [heartCount, setHeartCount] = useState(0)
    const refTitleInput = createRef<HTMLInputElement>()
    const refDescInput = createRef<HTMLTextAreaElement>()
    const refImageInput = createRef<HTMLInputElement>()
    const refImagePreview = createRef<HTMLButtonElement>()

    function patchClip(editingClip: boolean) {
        if (editBusy) return
        setEditBusy(true)

        const body: { [key: string]: string | undefined } = {}
        if (editingClip && clip) {
            const titleInput = refTitleInput.current
            if (titleInput && titleInput.value !== clip.title)
                body.title = titleInput.value

            const titleDesc = refDescInput.current
            if (titleDesc && titleDesc.value !== clip.description)
                body.description = titleDesc.value

            if (thumbnailData) body.thumbnail = thumbnailData
        }

        if (Object.keys(body).length === 0 && editingClip) {
            alert("No fields have been edited!")
            setEditBusy(false)
            return
        }

        API.fetch(
            `/api/clips/${clip?.id}`,
            res => {
                setEditBusy(false)
                // Clip Deleted. Return to Server
                if (!editingClip) return navigate(`/server/${clip?.server.id}`)

                // Merge Updated Fields
                setClip(Object.assign({}, clip, res))
                navigate(`/clip/${clip?.id}`)
            },
            () => {
                setEditBusy(false)
                alert("PatchClipError: Unauthorized")
            },
            () => {
                setEditBusy(false)
                alert("PatchClipError: Not Found")
            },
            e => {
                setEditBusy(false)
                console.error(e)
                alert(`PatchClipError: ${e.message}`)
            },
            editingClip ? "PATCH" : "DELETE",
            body
        )
    }


{/* Modal: Edit */}
<div
    className={`${props.modalEdit ? "" : "hidden"} px-2 absolute w-full h-screen flex items-center justify-center bg-gray-900/90 z-10`}
    onLoad={() => {
        if (clip) {
            // Only server managers & clips owners can modify their clips
            const allowedToEdit = (clip.user.id === Session.userId) || Session.canModifyServer(clip.server.id)
            if (!allowedToEdit) navigate("/clip/" + clip.id)
        }
    }}
>
    <div className="w-full max-w-md h-fit bg-gray-800 ring-1 ring-gray-600 rounded-2xl px-4  py-2 shadow-2xl">

        {/* Title */}
        <label>
            <h1 className="text-lg text-gray-400 font-semibold py-1">Title:</h1>
            <input
                type="text"
                maxLength={320}
                ref={refTitleInput}
                defaultValue={clip?.title}
                className="w-full px-2 py-2 rounded-xl bg-gray-700 text-gray-200 outline-none focus:ring-2 focus:ring-blurple ring-1 ring-gray-600 transition-shadow"
                placeholder="Title for your video (Max. 320 Characters)"
            />
        </label>

        {/* Description */}
        <label>
            <h1 className="text-lg text-gray-400 font-semibold py-1">Description:</h1>
            <textarea
                maxLength={4096}
                ref={refDescInput}
                defaultValue={clip?.description}
                className="resize-none w-full h-32 px-2 py-2 rounded-xl bg-gray-700 text-gray-200 outline-none focus:ring-2 focus:ring-blurple ring-1 ring-gray-600 transition-shadow"
                placeholder="Description for your video (Max. 4096 Characters)"
            />
        </label>

        {/* Thumbnail */}
        <label>
            <h1 className="text-lg text-gray-400 font-semibold py-1">Thumbnail:</h1>
            {/* Preview */}
            <button
                ref={refImagePreview}
                className="group w-full h-full aspect-video rounded-2xl bg-black ring-2 ring-gray-600 text-gray-300 flex items-center justify-center bg-contain bg-center bg-no-repeat"
                onClick={() => refImageInput.current?.click()}
                style={{
                    backgroundImage: thumbnailData
                        ? `url("${thumbnailData}")`
                        : `url('${ImageURL.appThumbnail(clip?.id || "", 256)}')`
                }}
            >
                <div className="w-full h-full flex justify-center items-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded-2xl">
                    <div>
                        <FontAwesomeIcon icon={faFileImport} className="text-2xl pr-2" />
                        <span className="text-xl">Upload Thumbnail</span>
                    </div>
                </div>
            </button>
            {/* File Input */}
            <input
                ref={refImageInput}
                accept="image/png, image/jpeg, image/gif, image/webp, image/avif"
                className="hidden w-full px-2 py-2 rounded-xl bg-gray-700 text-gray-200 outline-none focus:ring-2 focus:ring-blurple ring-1 ring-gray-600 transition-shadow"
                type="file"
                onChange={ev => {
                    // Read File and Store as Base64
                    const files = ev.currentTarget.files
                    if (files && files.length !== 0) {
                        const reader = new FileReader()
                        reader.readAsDataURL(files[0])
                        reader.onload = e => {
                            if (refImagePreview.current && e.target) {
                                setThumbnailData(e.target.result as string)
                            }
                        }
                    }
                }}
            />
        </label>

        {/* Actions */}
        <div className="w-full grid grid-cols-3 gap-2 pt-6">
            {/* Exit */}
            <button
                onClick={() => navigate(`/clip/${clip?.id}`)}
                className={`h-full w-full px-4 py-2 rounded-2xl hover:ring-2 hover:ring-blurple ring-1 ring-gray-600 transition-all bg-gray-900 text-gray-400 hover:text-white`}
            >
                <FontAwesomeIcon icon={faBackspace} className="pr-1" /> Exit
            </button>
            {/* Delete */}
            <button
                onClick={() => patchClip(false)}
                className={`${editBusy ? "opacity-50" : ""} h-full w-full px-4 py-2 rounded-2xl hover:ring-2 hover:ring-red-700 ring-1 ring-gray-600 transition-all bg-gray-900 text-gray-400 hover:text-white`}
            >
                <FontAwesomeIcon icon={faTrash} className="pr-1" /> Delete
            </button>
            {/* Edit */}
            <button
                onClick={() => patchClip(true)}
                className={`${editBusy ? "opacity-50" : ""} h-full w-full px-4 py-2 rounded-2xl hover:ring-2 hover:ring-blurple ring-1 ring-gray-600 transition-all bg-gray-900 text-gray-400 hover:text-white`}
            >
                <FontAwesomeIcon icon={faEdit} className="pr-1" /> Edit
            </button>
        </div>

    </div>
</div >


{/* Right-Side */}
<div className="lg:w-96 lg:pt-0 sm:pt-2">
    {/* Server */}
    <button
        onClick={() => navigate(`/server/${clip?.server.id}`)}
        className="w-full h-fit flex group gap-4 px-4 py-2 bg-gray-900 rounded-xl hover:ring-2 ring-1 hover:ring-blurple ring-gray-600 shadow-2xl transition-all"
    >
        <img
            alt={`Icon for the server '${clip?.server.name}'`}
            className="group-hover:ring-blurple group-hover:ring-3 ring-2 ring-gray-400 bg-gray-800 rounded-full h-12 w-12 transition-all"
            src={ImageURL.serverIcon(clip?.server, 256)}
        />
        <div className="h-full w-full text-left">
            <p className="text-white font-semibold line-clamp-1">{clip?.server.name}</p>
            <p className="text-gray-400 font-light line-clamp-1">{clip?.server.uploadCount} clips • {clip?.server.categoryCount} categories</p>
        </div>
    </button>
    {/* Recommendations */}
    <div className="w-full h-96 pt-2">
        {(errorNext)
            // Request Error
            ? <Centered>
                <img className="h-24 aspect-video opacity-50" src="/favicon.png" />
                <p className="font-light">{errorNext}</p>
            </Centered>
            : (loadingNext)
                // Loading...
                ? <Centered><Loading /></Centered>
                : (!next?.items.length)
                    // No Clips Found
                    ? <Centered>
                        <p className="text-4xl font-bold pb-2">{`(>_<)`}</p>
                        <p className="text-lg font-light">no clips found</p>
                    </Centered>
                    // Clips List
                    : <>
                        {next?.items.map(clip => {
                            return <>
                                <a
                                    key={clip.id}
                                    href={`/clip/${clip.id}`}
                                    className="w-full text-white flex items-center gap-2 h-16 mb-2 bg-gray-900 rounded-xl hover:ring-2 ring-1 hover:ring-blurple ring-gray-600 shadow-2xl transition-all"
                                >
                                    <img src={ImageURL.appThumbnail(clip.id, 128)} className="h-16 aspect-video rounded-xl" />
                                    <div className="text-gray-400">
                                        <p className="w-36 text-white line-clamp-1">{clip.title}</p>
                                        <p className="w-36 text-xs line-clamp-1">{clip.user.username}</p>
                                        <p className="w-36 text-xs line-clamp-1">{clip.approximateViewCount} views • <TimeAgo datetime={clip.created} /></p>
                                    </div>
                                </a>
                            </>
                        })}
                    </>
        }
    </div>
</div>