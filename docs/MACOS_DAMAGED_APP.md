# "Mapy is damaged" on macOS

If macOS says **"Mapy is damaged and can't be opened"**, Gatekeeper is blocking the app because it’s unsigned (or was downloaded from the internet and quarantined).

## Quick fix

Remove the quarantine attribute from the app:

```bash
# If you're running the .app directly (e.g. from src-tauri/target/release/bundle/macos/):
xattr -cr /path/to/Mapy.app

# Example when built locally:
xattr -cr target/release/bundle/macos/Mapy.app
```

If you installed from a **DMG** you downloaded:

1. Mount the DMG and copy Mapy to Applications (or leave it where it is).
2. In Terminal:
   ```bash
   xattr -cr /Applications/Mapy.app
   ```
3. Open Mapy as usual.

After that, the app should open. You only need to do this once per copy of the app.

## Why this happens

- Unsigned apps (or apps not notarized by Apple) can be blocked by Gatekeeper.
- Downloaded files get a quarantine flag; Gatekeeper then refuses to run them and shows "damaged" as a generic message.

Removing the quarantine with `xattr -cr` tells macOS to stop treating that copy as untrusted. For wider distribution without this step, the app would need to be **code-signed and notarized** with an Apple Developer account.
