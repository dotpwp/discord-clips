const RegEx = {
    validUsername: new RegExp("^[A-Za-z0-9_]{3,32}$"),
    validPassword: new RegExp("^[A-Za-z0-9~!@#$%^&*()_+]{3,256}$"),
    includesAlphanumeric: new RegExp("[A-Za-z0-9]"),
    includesSpecial: new RegExp(`[~!@#$%^&*()_+]`),
}
export default RegEx;