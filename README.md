# Steam plugin for Cursor

Ask your Cursor agent about any Steam game: store details and price, how many people are playing right now, its review score, and its latest news. Includes an MCP server and a skill that tells the agent when to use it.

- **No API key needed.** It only calls Steam's public, unauthenticated endpoints.
- **No dependencies.** One Node.js file (Node 18 or newer); nothing to `npm install`.
- **Read-only.** It never signs in to Steam or changes anything.

## Tools

| Tool | Arguments | Returns |
|---|---|---|
| `search_games` | `query` | `[{ appid, name, price }]` — resolve a game name to its appid |
| `get_game` | `appid` | `{ appid, name, type, isFree, price{final, initial, discountPercent, currency, formatted}, releaseDate{comingSoon, date}, developers, publishers, genres, platforms, shortDescription, storeUrl }` |
| `get_player_count` | `appid` | `{ appid, currentPlayers }` |
| `get_reviews` | `appid` | `{ appid, scoreDescription, totalPositive, totalNegative, totalReviews }` |
| `get_news` | `appid`, `count` (1–10, default 5) | `[{ title, url, author, date (ISO 8601), excerpt }]` |

Example prompts: *"How many people are playing Counter-Strike 2 right now?"*, *"What's Hades' review score and price?"*, *"Show the latest news for appid 1145360."*

## Install in Cursor

Clone this repo, then link it into Cursor's local plugins folder:

```bash
git clone <repo-url> steam-plugin
mkdir -p ~/.cursor/plugins/local
ln -s "$(pwd)/steam-plugin" ~/.cursor/plugins/local/steam   # or copy the folder there
```

Reload the Cursor window. The `steam` MCP server and skill then appear under the plugin.

## Notes and limits

- **Prices are from the US store** (`cc=us`), in USD. Prices and availability differ by region.
- `price` is `null` for free-to-play games and for games with no price set.
- Player counts are a live snapshot, not a peak or an average.
- Review totals count all languages and all purchase types.
- Steam's reviews endpoint returns "No user reviews" even for appids that don't exist. Check the appid with `get_game` if a result looks empty.
- Steam rate-limits its public endpoints. If you get HTTP 429, wait a minute.

## Data source and disclaimer

All data comes live from Steam's public web endpoints (`store.steampowered.com` and `api.steampowered.com`). This project is **not affiliated with, endorsed by, or sponsored by Valve Corporation**. Steam and the Steam logo are trademarks of Valve Corporation.

## License

MIT © 2026 Anthony Krum
