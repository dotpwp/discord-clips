/** @type {import('webpack').Configuration} */
const nodeExternals = require("webpack-node-externals")
const path = require("path")

module.exports = (env) => {
    const inProd = Boolean(env.production)
    console.debug("Building for production:", inProd)

    return {
        target: "node",
        mode: (inProd ? "production" : "development"),
        externals: [nodeExternals()],
        entry: "./dist/transpiled/index.js",
        output: {
            path: path.join(__dirname, "dist"),
            filename: "service.js",
        },
        optimization: {
            minimize: inProd,
        },
    }
}