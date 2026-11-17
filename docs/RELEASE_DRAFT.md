# v0.1.0 release draft (local only — not published)

Do not tag, push, or create this GitHub release until Tony approves.

## Proposed GitHub topics

Set these on https://github.com/tonygskrum-ux/steam-plugin (Settings → Topics, or `gh repo edit`):

- `mcp`
- `mcp-server`
- `cursor`
- `cursor-plugin`
- `steam`
- `steam-api`
- `gamedev`
- `indiedev`

Optional extras if you want a couple more: `nodejs`, `model-context-protocol`.

## Release

- **Tag:** `v0.1.0`
- **Title:** `v0.1.0 — Steam MCP plugin`
- **Target:** this `visibility-polish` commit, once it is on `main`

### Notes (paste into the GitHub release)

First public release of the Steam plugin: a zero-dependency MCP server and Cursor skill for looking up Steam games with no API key.

**Tools**

- `search_games` — resolve a name to an appid and US price
- `get_game` — store details, US price, release date, developers, genres, platforms
- `get_player_count` — live concurrent players
- `get_reviews` — review score and positive/negative totals
- `get_news` — latest announcements and patch notes

Install from [cursor.directory/plugins/steam](https://cursor.directory/plugins/steam), or point any stdio MCP client at `node server/index.mjs` (Node 18 or newer; nothing to install).

This project is not affiliated with, endorsed by, or sponsored by Valve Corporation.
