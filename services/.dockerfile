# docker build -t clips-services -f .dockerfile .

# Build target is linux/x64 as the ffprobe-static package doesn't include an arm64 binary.
# https://hub.docker.com/layers/library/node/20-alpine/images/sha256-1ccb0c0ded3b21cee95fe6b6ce1ac23bd6680c8f152cbfb3047d5d9ea490b098?context=explore

# [1] Build Application
FROM node:20-alpine@sha256:1ccb0c0ded3b21cee95fe6b6ce1ac23bd6680c8f152cbfb3047d5d9ea490b098 AS BUILD
WORKDIR /build
COPY package*.json .
RUN npm install --save-optional --save-dev
COPY . .
RUN npm run build
RUN npm prune --production
# RUN rm node_modules/ffprobe-static/bin/linux/x64/ffprobe
RUN rm node_modules/ffprobe-static/bin/linux/ia32/ffprobe
RUN rm node_modules/ffprobe-static/bin/darwin/x64/ffprobe
RUN rm node_modules/ffprobe-static/bin/darwin/arm64/ffprobe
RUN rm node_modules/ffprobe-static/bin/win32/x64/ffprobe.exe
RUN rm node_modules/ffprobe-static/bin/win32/ia32/ffprobe.exe

# [2] Copy Required Files
FROM node:20-alpine@sha256:1ccb0c0ded3b21cee95fe6b6ce1ac23bd6680c8f152cbfb3047d5d9ea490b098 AS RUNTIME
WORKDIR /app
COPY --from=BUILD /build/node_modules /app/node_modules
COPY --from=BUILD /build/dist/service.js /app/service.js

# [3] Expose Application
ENV DATA_DIR="/data"
ENV NODE_ENV="production"
EXPOSE 3000
CMD ["node", "service.js"]