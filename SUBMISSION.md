# cursor.directory submission draft (NOT submitted)

Where: https://cursor.directory/plugins/new. Sign in with GitHub or Google, paste the public GitHub repo URL, check the auto-detected fields, then Submit.

The site auto-detects these from the repo:
- Manifest from `.cursor-plugin/plugin.json`: name, description, keywords, author, logo. The site does not read the root `plugin.json`, which is why both files exist.
- MCP server `steam` from `mcp.json`
- Skill `steam` from `skills/steam/SKILL.md`

## Listing fields

**Name:** steam
(The form requires at least 2 characters. If the name is taken or too generic, consider `steam-store` or `steam-games`.)

**Short description** (form minimum is 10 characters):
Look up Steam games from Cursor: store details and US price, live player count, review summary, latest news, and name search. Uses Steam's public endpoints; no API key needed.

**Long description** (for the README or an editable description field):
Ask your Cursor agent about any Steam game without leaving the editor. The plugin bundles a zero-dependency MCP server and a skill:
- search_games: find a game's appid by name
- get_game: store details (US price and discount, release date, developers, publishers, genres, platforms)
- get_player_count: live concurrent players
- get_reviews: Steam review score and positive/negative totals
- get_news: the latest announcements and patch notes

It only calls Steam's public, unauthenticated endpoints, so it needs no API key and no account. It is read-only. Prices come from the US store. Useful for game developers who want to check comparable games, track their own launch, or follow competitors' updates. Not affiliated with Valve Corporation.

**Category:** cursor.directory's plugin form has no category field (its create-plugin schema takes name, description, logo, repository, homepage, keywords, and components). If one shows up during review, pick "Data / APIs" or "Game development".

**Tags / keywords:** steam, gaming, game-dev, indie, mcp, player-count, reviews

**Repository:** https://github.com/<tony-github-user>/steam-plugin (fill in after the repo exists)
**Homepage:** same as repository (optional)
**Logo:** optional and none yet. If added, commit `assets/logo.svg`, set `"logo": "assets/logo.svg"` in `.cursor-plugin/plugin.json` only (the root Agent Plugins schema rejects a logo field), and don't use Valve's Steam logo.
**License:** MIT
