# v0.1.1 release draft (not published)

Do not tag, push, or create this GitHub release until Tony approves.

The previous release, v0.1.0, is published at https://github.com/tonygskrum-ux/steam-plugin/releases/tag/v0.1.0.

## Release

- **Tag:** `v0.1.1`
- **Title:** `v0.1.1 — Crash and error-reporting fixes`
- **Target:** `main`, once the version bump is merged
- **Asset:** `steam-plugin.mcpb`, SHA-256 `d7d06e36807ea4b54edd6ab5412d06981dd877f63dc6289de9ff459047a7c80f`

`server.json` pins that SHA-256, so the release must carry the exact file it was computed from. Packing is not reproducible: running `mcpb pack` twice on the same tree gives two different hashes. If the bundle is rebuilt for any reason, put the new file's hash in `server.json` before publishing to the registry.

## Steps

Do these in order. The registry does not allow a published version to be changed, so a wrong hash there cannot be fixed without releasing 0.1.2.

1. Merge the version bump into `main`.
2. Create the GitHub release: tag `v0.1.1` on `main`, the title above, the notes below, and `steam-plugin.mcpb` attached under that exact name.
3. Check that the published file is the pinned one. This must print the SHA-256 above:

   ```bash
   curl -sL https://github.com/tonygskrum-ux/steam-plugin/releases/download/v0.1.1/steam-plugin.mcpb | openssl dgst -sha256
   ```

4. Publish `server.json` to the MCP Registry from the repository root:

   ```bash
   mcp-publisher login github
   ```

   ```bash
   mcp-publisher publish
   ```

The cursor.directory and Glama listings are tied to the repository, not to this release asset. Check both afterwards.

### Rebuilding the bundle

Only needed if the attached file is lost or the bundled files change (`LICENSE`, `README.md`, `manifest.json`, `server/index.mjs`):

```bash
npx @anthropic-ai/mcpb pack . steam-plugin.mcpb
```

```bash
openssl dgst -sha256 steam-plugin.mcpb
```

Then update `fileSha256` in `server.json` and the SHA-256 in this file.

### Notes (paste into the GitHub release)

Bug-fix release. No new tools, and successful results are unchanged apart from the one field noted below.

**Fixes**

- The server no longer exits when a client sends a line of JSON that is not an object, such as `null`. It answers with a JSON-RPC Invalid Request error and keeps serving.
- `search_games` returns an error when Steam's search fails, instead of an empty list that looked like "no matches".
- `get_game` reports a Steam failure as a Steam failure, instead of "Unknown appid".
- Every tool reports a Steam outage (HTTP 5xx) as a Steam server error. `get_player_count` and `get_news` used to blame the appid.
- `get_news` no longer fails when one news item has no date. That item's `date` is `null` and the others are returned.
- `get_news` treats `count: null` as the default of 5, instead of returning one item.

**Protocol**

- `initialize` answers with a protocol version the server implements (`2025-11-25`, `2025-06-18` or `2024-11-05`), instead of repeating back whatever the client asked for. A client that offers only `2025-03-26` is now offered `2025-11-25`.
- Messages with no `id` are notifications and are no longer answered.

**Changes to be aware of**

- `date` in `get_news` results can now be `null`.
- Several error messages are reworded, so do not match on their exact text.

Install from [cursor.directory/plugins/steam](https://cursor.directory/plugins/steam), or point any stdio MCP client at `node server/index.mjs` (Node 18 or newer; nothing to install).

This project is not affiliated with, endorsed by, or sponsored by Valve Corporation.
