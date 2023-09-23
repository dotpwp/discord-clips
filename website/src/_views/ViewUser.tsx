import { FC, useEffect, useState } from "react";
import { DatabaseUser } from "../types/database";
import { useParams } from "react-router-dom";
import Session from "../modules/Session";
import API from "../modules/API";
import { View } from "../components/Section";

export const ViewUser: FC = () => {
    const params = useParams<{ userId: string }>()

    const [errorNotFound, setNotFound] = useState(false)
    const [errorMessage, setErrorMessage] = useState("")
    const [dataUser, setDataUser] = useState<DatabaseUser>()

    useEffect(() => {
        if (!Session.loggedIn || dataUser) return
        API.fetch<DatabaseUser>(
            "GET", `/api/users/${params.userId === "@me" ? Session.userId : params.userId}`, null,
            data => setDataUser(data),
            () => setErrorMessage("Unauthorized"),
            () => setNotFound(true),
            er => setError(er.message),
            () => setLoading(false)
        )
    }, [dataUser])

    // return <></>
    return <View title="" stateError={error} stateLoading= />
}