## Example Environment Variable File
```py
# Discord OAuth2 Settings
DISCORD_OAUTH_AUTH_URL="<OAuth2 URL>"
DISCORD_OAUTH_REDIRECT="<Redirects>"
DISCORD_OAUTH_CLIENT_ID="<Client ID>"
DISCORD_OAUTH_SECRET="<Client Secret>"

# Application Settings
DB_POSTGRES_URL="<Postgres Login URL>"
PROXY_MODE="<Choose Yours: none,cloudflare,nginx>"
HMAC_KEY="<JWT Secret>"

# Encoder Settings
ENCODER_OPTIONS='{
    "workerCount": 1,
    "encoders": {
        "H264": "libx264",
        "AAC": "aac",
        "VP9": "libvpx-vp9",
        "OPUS": "libopus"
    },
    "encodings": [
        {
            "enabled": true,
            "codecVideo": "H264",
            "codecAudio": "AAC",
            "videoBitrate": 6000,
            "audioBitrate": 256,
            "maxWidth": 1920,
            "maxHeight": 1080,
            "maxFPS": 60
        },
        {
            "enabled": false,
            "codecVideo": "VP9",
            "codecAudio": "OPUS",
            "videoBitrate": 6000,
            "audioBitrate": 128,
            "maxWidth": 1920,
            "maxHeight": 1080,
            "maxFPS": 60
        }
    ]
}'
```