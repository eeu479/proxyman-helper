This app will act as a server with a frontend to control the server responses. 

The server will accept all requests at a wildcard /*
Requests will be mapped through profile -> subprofile -> Request
Values will be filled in by each datatype.

Example:
request: "/api/account/{account_id}/something/{customer_id}"

The Profile `params` is ONLY used to define what params the subProfile should have.

The url params are filled in using the `request` paramers if they exist, defaulting to the parameters from `subProfile` if they do not exist in request.

query parameters are part of a `request` and will be used as to form the url matching pattern. 

eg.
URL: "/api/account/{account_id}/something/{customer_id}"

Profile {
    name: "test",
    params: ["account_id", "customer_id"]
}
Subprofile {
    name: "SubTest",
    params: {
        "account_id": "12312",
        "customer_id": "9876"
    }
}
Request {
    name: "TestRequest",
    method: "GET",
    queryParameters: {
        "testParam": true
    }
}

url to match: "/api/account/{account_id}/something/{customer_id}?testParam=true"

This is a standalone desktop app that can be run on mac or windows.

Architecture:
• Frontend: React + Vite
• Desktop shell: Tauri (v2)
• Backend logic: Rust HTTP server embedded in the app

## Development

Requirements:
- Node.js 18+
- Rust toolchain (stable)
- Tauri prerequisites: https://tauri.app/start/prerequisites/

Install dependencies:
- `npm install`

Run the app (frontend + Rust server):
- `npm run tauri dev`

The HTTP server listens on `127.0.0.1:3000` by default. To change it, set
`MAPY_PORT` before launching the app.

Profiles are stored in the OS app data directory as `profiles.json` and are
seeded with the example profile on first launch.

## API

- `GET /api/health`
- `GET /api/profiles`
- `GET /api/profiles/:profileName`
- `POST /api/profiles`
- `POST /api/profiles/:profileName/subprofiles`
- `POST /api/profiles/:profileName/requests`

A profile `interfaces/profile.ts` is the base level of customization.
A subprofile `interfaces/subprofile.ts` always lives within a profile.
A request lives within a profile.
