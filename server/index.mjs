#!/usr/bin/env node
// Zero-dependency stdio MCP server for public Steam endpoints (no API key).
import { createInterface } from "node:readline";

const VERSION = "0.1.1";
const UA = { "User-Agent": `steam-agent-plugin/${VERSION}` };
// Handshake-era MCP revisions this server implements, newest first. `initialize` echoes a requested
// version only if it is listed here and otherwise answers with the newest. 2025-03-26 is left out
// on purpose: it obliges servers to accept JSON-RPC batches, which this server does not.
const PROTOCOLS = ["2025-11-25", "2025-06-18", "2024-11-05"];

class ToolError extends Error {}

async function getJson(url) {
  let res;
  try { res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(15000) }); }
  catch (e) { throw new ToolError(`Network error contacting Steam: ${e.message}`); }
  if (res.status === 429) throw new ToolError("Steam rate limit hit (HTTP 429). Wait a minute and retry.");
  // A 5xx is Steam failing, never "not found". Other non-2xx statuses go back to the caller,
  // because some endpoints answer an unknown appid with 403 or 404.
  if (res.status >= 500) throw new ToolError(`Steam server error (HTTP ${res.status}). The problem is on Steam's side; retry later.`);
  if (!res.ok) return { __status: res.status };
  try { return await res.json(); } catch { throw new ToolError(`Steam returned non-JSON (HTTP ${res.status}).`); }
}

function appidArg(a) {
  const n = Number(a?.appid);
  if (!Number.isInteger(n) || n <= 0) throw new ToolError("appid must be a positive integer (use search_games to find one).");
  return n;
}

const price = (p) => p ? {
  final: p.final / 100, initial: p.initial / 100, discountPercent: p.discount_percent ?? 0,
  currency: p.currency, formatted: p.final_formatted ?? null,
} : null;

async function searchGames(a) {
  const q = String(a?.query ?? "").trim();
  if (!q) throw new ToolError("query is required.");
  const j = await getJson(`https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(q)}&cc=us&l=en`);
  // No matches is HTTP 200 with items: []. Anything else is a failure and must not look like an empty result.
  if (!Array.isArray(j?.items)) throw new ToolError(`Steam search failed (${j?.__status ? `HTTP ${j.__status}` : "unexpected response"}). This is a Steam error, not an empty result; retry later.`);
  return j.items.map((i) => ({
    appid: i.id, name: i.name,
    price: i.price ? { final: i.price.final / 100, initial: i.price.initial / 100, currency: i.price.currency } : null,
  }));
}

async function getGame(a) {
  const id = appidArg(a);
  const j = await getJson(`https://store.steampowered.com/api/appdetails?appids=${id}&cc=us&l=en`);
  // An unknown appid is HTTP 200 with success: false, so a non-2xx here is always Steam failing.
  if (j?.__status) throw new ToolError(`Steam store request failed for appid ${id} (HTTP ${j.__status}). This is a Steam error, not an unknown appid; retry later.`);
  const e = j?.[id];
  if (!e?.success || !e.data) throw new ToolError(`Unknown appid ${id}: Steam store has no details for it (or it is region-locked/unlisted).`);
  const d = e.data;
  return {
    appid: d.steam_appid, name: d.name, type: d.type, isFree: !!d.is_free,
    price: price(d.price_overview),
    releaseDate: { comingSoon: !!d.release_date?.coming_soon, date: d.release_date?.date ?? null },
    developers: d.developers ?? [], publishers: d.publishers ?? [],
    genres: (d.genres ?? []).map((g) => g.description),
    platforms: d.platforms ?? {},
    shortDescription: d.short_description ?? "",
    storeUrl: `https://store.steampowered.com/app/${d.steam_appid}/`,
  };
}

async function getPlayerCount(a) {
  const id = appidArg(a);
  const j = await getJson(`https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=${id}`);
  const r = j?.response;
  if (r?.result !== 1) throw new ToolError(`No player count for appid ${id} (Steam ${j?.__status ? `HTTP ${j.__status}` : `result=${r?.result ?? "missing"}`}; unknown appid or not a game).`);
  return { appid: id, currentPlayers: r.player_count };
}

async function getReviews(a) {
  const id = appidArg(a);
  // store.steampowered.com/appreviews was retired (it now 302s to the store homepage).
  // Official public replacement; no API key. purchase_type 1 = all, review_type 0 = all
  // (score totals are only returned when review_type is all).
  const input = encodeURIComponent(JSON.stringify({
    appid: id, num_per_page: 1, languages: ["all"],
    purchase_type: 1, review_type: 0, display_language: "english",
  }));
  const j = await getJson(`https://api.steampowered.com/IUserReviewsService/GetAppReviews/v1/?input_json=${input}`);
  const s = j?.response?.query_summary;
  if (!s) throw new ToolError(`Could not fetch reviews for appid ${id}${j?.__status ? ` (Steam HTTP ${j.__status})` : ""}.`);
  return { appid: id, scoreDescription: s.review_score_desc, totalPositive: s.total_positive,
    totalNegative: s.total_negative, totalReviews: s.total_reviews };
}

// Steam dates are Unix seconds. One that is missing or unusable becomes null instead of throwing.
function isoDate(sec) {
  const d = new Date(Number.isFinite(sec) && sec > 0 ? sec * 1000 : NaN);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

async function getNews(a) {
  const id = appidArg(a);
  const asked = Number(a?.count ?? 5); // an explicit null means "not given", like leaving it out
  const count = Number.isInteger(asked) ? Math.min(10, Math.max(1, asked)) : 5;
  const j = await getJson(`https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=${id}&count=${count}&maxlength=300&format=json`);
  if (!j?.appnews) throw new ToolError(`No news for appid ${id} (Steam HTTP ${j?.__status ?? "?"}; unknown appid).`);
  return (j.appnews.newsitems ?? []).map((n) => ({
    title: n.title, url: n.url, author: n.author || null,
    date: isoDate(n.date), excerpt: n.contents,
  }));
}

const appidSchema = { type: "integer", minimum: 1, description: "Steam appid (resolve names with search_games)" };
const TOOLS = [
  { name: "search_games", description: "Search the Steam store by name; returns [{appid,name,price}] (US prices).", fn: searchGames,
    inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] } },
  { name: "get_game", description: "Store details for a Steam app: price (USD), release date, devs, genres, platforms, description.", fn: getGame,
    inputSchema: { type: "object", properties: { appid: appidSchema }, required: ["appid"] } },
  { name: "get_player_count", description: "Current concurrent players for a Steam app.", fn: getPlayerCount,
    inputSchema: { type: "object", properties: { appid: appidSchema }, required: ["appid"] } },
  { name: "get_reviews", description: "Steam user review summary (all languages): score description and positive/negative totals.", fn: getReviews,
    inputSchema: { type: "object", properties: { appid: appidSchema }, required: ["appid"] } },
  { name: "get_news", description: "Latest news/announcements for a Steam app (excerpts up to 300 chars).", fn: getNews,
    inputSchema: { type: "object", properties: { appid: appidSchema, count: { type: "integer", minimum: 1, maximum: 10, default: 5 } }, required: ["appid"] } },
];

const send = (m) => process.stdout.write(JSON.stringify(m) + "\n");
const ok = (id, result) => send({ jsonrpc: "2.0", id, result });
const err = (id, code, message) => send({ jsonrpc: "2.0", id, error: { code, message } });

async function handle(msg) {
  const { id, method, params } = msg;
  if (id === undefined || id === null) return; // No id means a notification, and those are never answered.
  switch (method) {
    case "initialize":
      return ok(id, { protocolVersion: PROTOCOLS.includes(params?.protocolVersion) ? params.protocolVersion : PROTOCOLS[0],
        capabilities: { tools: {} }, serverInfo: { name: "steam", version: VERSION } });
    case "ping": return ok(id, {});
    case "tools/list":
      return ok(id, { tools: TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })) });
    case "tools/call": {
      const t = TOOLS.find((x) => x.name === params?.name);
      if (!t) return err(id, -32602, `Unknown tool: ${params?.name}`);
      try {
        const data = await t.fn(params.arguments ?? {});
        return ok(id, { content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
          structuredContent: Array.isArray(data) ? { results: data } : data });
      } catch (e) {
        return ok(id, { isError: true, content: [{ type: "text", text: e instanceof ToolError ? e.message : `Internal error: ${e.message}` }] });
      }
    }
    default:
      return err(id, -32601, `Method not found: ${method}`);
  }
}

createInterface({ input: process.stdin }).on("line", (line) => {
  if (!line.trim()) return;
  let msg;
  try { msg = JSON.parse(line); } catch { return err(null, -32700, "Parse error"); }
  // Only a JSON object can be a message. Reject anything else here: handle() and the catch below
  // both read properties of msg, which throws on null and would take the process down.
  if (msg === null || typeof msg !== "object" || Array.isArray(msg)) return err(null, -32600, "Invalid Request");
  handle(msg).catch((e) => err(msg.id ?? null, -32603, e.message));
});
