// Regression tests for the stdio server. Run with `node --test` (Node 18+, no dependencies).
// Each test talks JSON-RPC to a real server process whose fetch is stubbed, so nothing hits Steam.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";

// Runs in the child before the server loads. MOCK_FETCH is a JSON list of { match, status, body };
// the first entry whose `match` appears in the requested URL is served.
const BOOT = `
  const routes = JSON.parse(process.env.MOCK_FETCH);
  globalThis.fetch = async (url) => {
    const route = routes.find((r) => String(url).includes(r.match));
    if (!route) throw new Error("no mock for " + url);
    return new Response(JSON.stringify(route.body ?? null), { status: route.status ?? 200 });
  };
  await import(process.env.SERVER_URL);
`;

function start(t, routes = []) {
  const child = spawn(process.execPath, ["--input-type=module", "-e", BOOT], {
    env: { ...process.env, MOCK_FETCH: JSON.stringify(routes), SERVER_URL: new URL("../server/index.mjs", import.meta.url).href },
    stdio: ["pipe", "pipe", "inherit"],
  });
  t.after(() => child.kill());
  const replies = createInterface({ input: child.stdout })[Symbol.asyncIterator]();
  const exited = new Promise((resolve) => child.on("close", resolve));
  const tell = (line) => child.stdin.write((typeof line === "string" ? line : JSON.stringify(line)) + "\n");
  return {
    // Sends one line without waiting for a reply.
    tell,
    // Sends one line and resolves with the server's next message.
    async ask(line) {
      tell(line);
      const { value, done } = await replies.next();
      if (done) throw new Error(`server exited without answering ${JSON.stringify(line)}`);
      return JSON.parse(value);
    },
    // Closes stdin and resolves with the exit code and any messages nobody asked for.
    async close() {
      child.stdin.end();
      const unread = [];
      for (let r; !(r = await replies.next()).done;) unread.push(JSON.parse(r.value));
      return { code: await exited, unread };
    },
  };
}

const ping = (id) => ({ jsonrpc: "2.0", id, method: "ping" });
const call = (name, args) => ({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } });
const errorText = (reply) => { assert.equal(reply.result.isError, true); return reply.result.content[0].text; };
const results = (reply) => { assert.equal(reply.result.isError, undefined); return reply.result.structuredContent.results; };

test("a message that is not a JSON object gets Invalid Request and the server keeps serving", { timeout: 10000 }, async (t) => {
  const server = start(t);
  for (const line of ["null", "42", '"hi"', "[]"]) {
    assert.deepEqual(await server.ask(line), { jsonrpc: "2.0", id: null, error: { code: -32600, message: "Invalid Request" } });
  }
  assert.deepEqual(await server.ask(ping(7)), { jsonrpc: "2.0", id: 7, result: {} });
  assert.deepEqual(await server.close(), { code: 0, unread: [] });
});

test("notifications are never answered", { timeout: 10000 }, async (t) => {
  const server = start(t); // No routes: a tool that ran anyway would come back as an error reply.
  for (const method of ["notifications/initialized", "ping", "initialize", "tools/list", "no/such/method"]) server.tell({ jsonrpc: "2.0", method });
  server.tell({ jsonrpc: "2.0", method: "tools/call", params: { name: "get_news", arguments: { appid: 620 } } });
  assert.deepEqual(await server.ask(ping(7)), { jsonrpc: "2.0", id: 7, result: {} });
  assert.deepEqual(await server.close(), { code: 0, unread: [] });
});

test("initialize echoes a supported protocol version and answers any other with the newest", { timeout: 10000 }, async (t) => {
  const server = start(t);
  const negotiated = async (protocolVersion) => {
    const params = { protocolVersion, capabilities: {}, clientInfo: { name: "test", version: "0" } };
    return (await server.ask({ jsonrpc: "2.0", id: 1, method: "initialize", params })).result.protocolVersion;
  };
  for (const version of ["2025-11-25", "2025-06-18", "2024-11-05"]) assert.equal(await negotiated(version), version);
  // 2025-03-26 requires JSON-RPC batch support, which the server lacks, so it is not echoed either.
  for (const version of ["2026-07-28", "2025-03-26", "1999-01-01", undefined, 5]) assert.equal(await negotiated(version), "2025-11-25");
});

// Clients that also speak the stateless 2026-07-28 revision probe with server/discover and fall
// back to initialize on any error that is not a modern one, so this must be answered, and promptly.
test("a server/discover probe gets Method not found", { timeout: 10000 }, async (t) => {
  const server = start(t);
  const params = { _meta: { "io.modelcontextprotocol/protocolVersion": "2026-07-28" } };
  const reply = await server.ask({ jsonrpc: "2.0", id: 1, method: "server/discover", params });
  assert.deepEqual(reply, { jsonrpc: "2.0", id: 1, error: { code: -32601, message: "Method not found: server/discover" } });
});

test("every tool reports a Steam 5xx as a Steam error", { timeout: 10000 }, async (t) => {
  const server = start(t, [{ match: "steampowered.com", status: 502 }]);
  const calls = [["search_games", { query: "hades" }], ["get_game", { appid: 620 }], ["get_player_count", { appid: 620 }],
    ["get_reviews", { appid: 620 }], ["get_news", { appid: 620 }]];
  for (const [name, args] of calls) {
    const text = errorText(await server.ask(call(name, args)));
    assert.match(text, /HTTP 502/, name);
    assert.doesNotMatch(text, /unknown appid/i, name);
  }
});

test("get_player_count and get_news still report an unknown appid on Steam's 404 and 403", { timeout: 10000 }, async (t) => {
  const server = start(t, [{ match: "GetNumberOfCurrentPlayers", status: 404 }, { match: "GetNewsForApp", status: 403 }]);
  assert.match(errorText(await server.ask(call("get_player_count", { appid: 999999999 }))), /HTTP 404; unknown appid/);
  assert.match(errorText(await server.ask(call("get_news", { appid: 999999999 }))), /HTTP 403; unknown appid/);
});

test("get_player_count names what is missing when Steam's reply has no result", { timeout: 10000 }, async (t) => {
  const server = start(t, [{ match: "GetNumberOfCurrentPlayers", body: {} }]);
  assert.match(errorText(await server.ask(call("get_player_count", { appid: 620 }))), /result=missing/);
});

test("search_games reports a non-2xx as an error instead of an empty list", { timeout: 10000 }, async (t) => {
  const server = start(t, [{ match: "storesearch", status: 403 }]);
  assert.match(errorText(await server.ask(call("search_games", { query: "hades" }))), /HTTP 403/);
});

test("search_games reports an error when Steam's reply has no result list", { timeout: 10000 }, async (t) => {
  const server = start(t, [{ match: "storesearch", body: null }]);
  assert.match(errorText(await server.ask(call("search_games", { query: "hades" }))), /unexpected response/);
});

test("search_games still returns an empty list when Steam finds nothing", { timeout: 10000 }, async (t) => {
  const server = start(t, [{ match: "storesearch", body: { total: 0, items: [] } }]);
  assert.deepEqual(results(await server.ask(call("search_games", { query: "zzqxjv" }))), []);
});

test("search_games maps matches to appid, name and price", { timeout: 10000 }, async (t) => {
  const items = [
    { id: 1145360, name: "Hades", price: { currency: "USD", initial: 2499, final: 1249 } },
    { id: 730, name: "Counter-Strike 2" },
  ];
  const server = start(t, [{ match: "storesearch", body: { total: 2, items } }]);
  assert.deepEqual(results(await server.ask(call("search_games", { query: "hades" }))), [
    { appid: 1145360, name: "Hades", price: { final: 12.49, initial: 24.99, currency: "USD" } },
    { appid: 730, name: "Counter-Strike 2", price: null },
  ]);
});

test("get_game reports a non-2xx as a Steam error instead of an unknown appid", { timeout: 10000 }, async (t) => {
  const server = start(t, [{ match: "appdetails", status: 403 }]);
  const text = errorText(await server.ask(call("get_game", { appid: 620 })));
  assert.match(text, /HTTP 403/);
  assert.doesNotMatch(text, /^Unknown appid/);
});

test("get_game still reports an unknown appid when Steam says there is none", { timeout: 10000 }, async (t) => {
  const server = start(t, [{ match: "appdetails", body: { 999999999: { success: false } } }]);
  assert.match(errorText(await server.ask(call("get_game", { appid: 999999999 }))), /^Unknown appid 999999999/);
});

test("get_news asks Steam for 5 items when count is omitted or null, and clamps it to 1-10", { timeout: 10000 }, async (t) => {
  const route = (n) => ({ match: `count=${n}&`, body: { appnews: { newsitems: [{ title: `asked for ${n}`, date: 1700000000 }] } } });
  const server = start(t, [1, 3, 5, 10].map(route));
  const asked = async (count) => results(await server.ask(call("get_news", { appid: 620, count })))[0].title;
  assert.equal(await asked(undefined), "asked for 5");
  assert.equal(await asked(null), "asked for 5");
  assert.equal(await asked(3), "asked for 3");
  assert.equal(await asked(0), "asked for 1");
  assert.equal(await asked(99), "asked for 10");
});

test("get_news keeps every item when one has no usable date", { timeout: 10000 }, async (t) => {
  const item = (title, date) => ({ title, url: `https://example.com/${title}`, author: "", contents: "…", date });
  const newsitems = [item("dated", 1700000000), item("undated", undefined), item("zero", 0), item("garbage", "soon"), item("huge", 1e20)];
  const server = start(t, [{ match: "GetNewsForApp", body: { appnews: { appid: 620, newsitems } } }]);
  assert.deepEqual(results(await server.ask(call("get_news", { appid: 620 }))).map((n) => [n.title, n.date]), [
    ["dated", "2023-11-14T22:13:20.000Z"], ["undated", null], ["zero", null], ["garbage", null], ["huge", null],
  ]);
});
