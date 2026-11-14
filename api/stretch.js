// GET /api/stretch -> the live "in the stretch" board, graded, plus the migration log.
// Free, keyless sources: Jupiter (about to graduate + graduated) and DexScreener (market cap after migration).
// The log is shared across visitors. It lives in memory, and in Upstash Redis if KV env vars are set (optional).
const CORE = require("../lib/core.js");

const KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "";
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";
const KEY = "stretch:state:v1";
let STATE = null, lastTick = 0, payload = null, savedSig = "", savedAt = 0;

async function kvGet() {
  if (!KV_URL) return null;
  const r = await fetch(`${KV_URL}/get/${KEY}`, { headers: { Authorization: `Bearer ${KV_TOKEN}` } });
  const j = await r.json(); return j && j.result ? JSON.parse(j.result) : null;
}
async function kvSet(state) {
  if (!KV_URL) return;
  await fetch(`${KV_URL}/set/${KEY}`, { method: "POST", headers: { Authorization: `Bearer ${KV_TOKEN}` }, body: JSON.stringify(state) });
}
const sig = s => Object.values(s.log).map(e => e.mint.slice(0, 6) + e.status[0] + (e.bought ? 1 : 0) + (e.after ?? "")).join("");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  try {
    if (!STATE) { STATE = (await kvGet().catch(() => null)) || CORE.newState(); }
    const now = Date.now();
    if (!payload || now - lastTick > 4000) {
      const r = await fetch(CORE.GEMS, { method: "POST", headers: { "content-type": "application/json", accept: "application/json" }, body: JSON.stringify(CORE.gemsBody()) });
      if (!r.ok) throw new Error("jupiter " + r.status);
      const t = CORE.tick(STATE, await r.json(), now);
      if (now - (STATE.lastOut || 0) > 60000) {
        STATE.lastOut = now;
        const mints = CORE.pendingOutcomes(STATE);
        if (mints.length) { try { const pairs = await fetch("https://api.dexscreener.com/tokens/v1/solana/" + mints.join(",")).then(x => x.json()); CORE.applyOutcomes(STATE, pairs); } catch (e) { /* next round */ } }
      }
      lastTick = now;
      payload = { t: now, source: "jupiter", storage: KV_URL ? "shared" : "memory", since: STATE.since, stretch: t.stretch, graduated: t.graduated, log: CORE.logList(STATE, 60), stats: CORE.stats(STATE) };
      const s = sig(STATE);
      if (KV_URL && (s !== savedSig || now - savedAt > 120000)) { savedSig = s; savedAt = now; await kvSet(STATE).catch(() => {}); }
    }
    res.setHeader("Cache-Control", "public, s-maxage=5, stale-while-revalidate=25");
    res.status(200).json(payload);
  } catch (e) {
    res.setHeader("Cache-Control", "no-store");
    res.status(502).json({ error: String((e && e.message) || e) });
  }
};
