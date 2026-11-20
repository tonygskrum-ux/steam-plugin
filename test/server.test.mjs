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
  return {
    // Sends one line and resolves with the server's next message.
    async ask(line) {
      child.stdin.write((typeof line === "string" ? line : JSON.stringify(line)) + "\n");
      const { value, done } = await replies.next();
      if (done) throw new Error(`server exited without answering ${JSON.stringify(line)}`);
      return JSON.parse(value);
    },
    // Closes stdin and resolves with the exit code.
    close() { child.stdin.end(); return exited; },
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
  assert.equal(await server.close(), 0);
});

test("search_games reports a Steam error instead of an empty list", { timeout: 10000 }, async (t) => {
  const server = start(t, [{ match: "storesearch", status: 500 }]);
  assert.match(errorText(await server.ask(call("search_games", { query: "hades" }))), /HTTP 500/);
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

test("get_game reports a Steam error instead of an unknown appid", { timeout: 10000 }, async (t) => {
  const server = start(t, [{ match: "appdetails", status: 503 }]);
  const text = errorText(await server.ask(call("get_game", { appid: 620 })));
  assert.match(text, /HTTP 503/);
  assert.doesNotMatch(text, /^Unknown appid/);
});

test("get_game still reports an unknown appid when Steam says there is none", { timeout: 10000 }, async (t) => {
  const server = start(t, [{ match: "appdetails", body: { 999999999: { success: false } } }]);
  assert.match(errorText(await server.ask(call("get_game", { appid: 999999999 }))), /^Unknown appid 999999999/);
});

test("get_news keeps every item when one has no usable date", { timeout: 10000 }, async (t) => {
  const item = (title, date) => ({ title, url: `https://example.com/${title}`, author: "", contents: "…", date });
  const newsitems = [item("dated", 1700000000), item("undated", undefined), item("zero", 0), item("garbage", "soon"), item("huge", 1e20)];
  const server = start(t, [{ match: "GetNewsForApp", body: { appnews: { appid: 620, newsitems } } }]);
  assert.deepEqual(results(await server.ask(call("get_news", { appid: 620 }))).map((n) => [n.title, n.date]), [
    ["dated", "2023-11-14T22:13:20.000Z"], ["undated", null], ["zero", null], ["garbage", null], ["huge", null],
  ]);
});
