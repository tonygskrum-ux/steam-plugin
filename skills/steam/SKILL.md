---
name: steam
description: Use when the user asks about a Steam game's price, discount, release date, developer/publisher, genres, platforms, current player count, user review score, or latest news/patch notes. Resolve game names to an appid with search_games first, then call get_game, get_player_count, get_reviews, or get_news.
---

# Steam lookups

Tools (MCP server `steam`, public endpoints, no API key):

- `search_games(query)` → `[{appid, name, price}]`. Use first whenever you only have a name; pick the exact title match, and ask if ambiguous (e.g. "Hades" vs "Hades II").
- `get_game(appid)` → store details. Prices are US store (USD); `price` is null for free or unreleased games.
- `get_player_count(appid)` → live concurrent players (a snapshot, not a peak).
- `get_reviews(appid)` → all-language review summary. A nonexistent appid also returns "No user reviews", so confirm the appid with `get_game` if results look empty.
- `get_news(appid, count≤10)` → recent announcements with ISO dates and short excerpts.

Rules:
- Only report numbers the tools returned; never estimate or recall Steam figures from memory.
- State that player counts and prices are point-in-time values.
- If a tool returns an error (unknown appid, rate limit), say so plainly; on rate limits, wait before retrying.
