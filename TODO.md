# Development Progress for 'clips.robobot.dev' 

```
Legend:
🟢 = Complete
🟡 = In Progress
🔴 = Cancelled
⚪️ = Scheduled
🔵 = Testing

🟢 Step 1: Creating Backend
Language: TypeScript
Framework: Express.js
Testing: Postman

🟢 ~clips.robobot.dev/api*
|__ 🟢 /auth  
|   |__ 🟢 /auth/login
|   |   |__ 🟢 GET 
|   |__ 🟢 /auth/logout
|       |__ 🟢 GET 
|__ 🟢 /users
|   |__ 🟢 /users/@me
|   |   |__ 🟢 GET
|   |__ /users/:user_id
|       |__ 🟢 GET
|__ 🟢 /servers
    |   |__ 🟢 GET
    |__ 🟢 servers/:server_id
    |   |__ 🟢 PATCH
    |   |__ 🟢 GET
    |__ 🟢 /servers/:server_id/categories
    |   |__ 🟢 POST
    |   |__ 🟢 PATCH
    |   |__ 🟢 DELETE
    |__ 🟢 /servers/clips
    |   |__ 🟢 GET
    |   |__ 🟢 POST
    |__ 🟢 /servers/clips/:clip_id
    |   |__ 🟢 GET
    |   |__ 🟢 PATCH
    |   |__ 🟢 DELETE
    |__ 🟢 /servers/clips/:clip_id/hearts
        |__ 🟢 PUT
        |__ 🟢 DELETE

⚪️ Step 2: Creating Frontend
Language: TypeScript
Framework: React.js
Testing: TBD

⚪️ ~clips.robobot.dev
|__ ⚪️ /
|__ ⚪️ /server/:server_id/edit
|__ ⚪️ /server/:server_id/upload
|__ ⚪️ /server/:server_id/clips
|__ ⚪️ /server/:server_id/clips/:clip_id
|__ ⚪️ /server/:server_id/clips/:clip_id/edit
|__ ⚪️ /user/:user_id

⚪️ Step 3: Beta Testing
Short beta testing period consisting of release to the 'Broke Phi Broke' Discord Server

⚪️ Step 4: Full Release
Public announcement and release to all Discord Servers
```