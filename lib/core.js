/* STRETCH core: one set of checks for the server (api/stretch.js) and the browser (fallback).
   Data: Jupiter's free "about to graduate" feed (datapi.jup.ag/v1/pools/gems), no key. */
(function (root) {
  const LAUNCHPADS = ["pump.fun", "raydium-launchlab", "letsbonk.fun"];
  const GEMS = "https://datapi.jup.ag/v1/pools/gems";
  const MIN_CURVE = 85;
  const DEAD_AFTER = 60 * 60 * 1000;     // gone from the stretch for 60 min and never migrated = died
  const num = v => (v === null || v === undefined || v === "" || isNaN(+v)) ? null : +v;
  const r1 = v => v === null ? null : Math.round(v * 10) / 10;

  // Jupiter pool -> STRETCH coin
  function normalize(pool) {
    const b = pool.baseAsset || {}, a = b.audit || {}, s = b.stats5m || null;
    const lp = b.launchpad || pool.dex || "";
    const bot = Math.max(num(a.botHoldersPercentage) || 0, num(b.audit && b.audit.insiderPct) || 0, num(b.audit && b.audit.sniperPct) || 0);
    return {
      mint: b.id, pool: pool.id, sym: String(b.symbol || "?").replace(/^\$+/, "").slice(0, 14), name: String(b.name || "").slice(0, 40), icon: b.icon || "",
      lp, src: lp === "pump.fun" ? "pump" : "lab",
      p: r1(num(pool.bondingCurve) ?? num(b.bondingCurve) ?? 0), mcap: num(b.mcap) ?? num(b.fdv), liq: num(pool.liquidity),
      holders: num(b.holderCount), h5: s ? r1(num(s.holderChange)) : null,
      b5: s ? (num(s.numBuys) || 0) : null, s5: s ? (num(s.numSells) || 0) : null, t5: s ? (num(s.numTraders) || 0) : null,
      bv5: s ? num(s.buyVolume) || 0 : null, sv5: s ? num(s.sellVolume) || 0 : null,
      top10: r1(num(a.topHoldersPercentage)), dev: r1(num(a.devBalancePercentage) || 0), bot: r1(bot), devMints: num(a.devMints),
      organic: num(b.organicScore), created: Date.parse(b.createdAt || pool.createdAt) || null, updated: Date.parse(pool.updatedAt) || null,
      graduatedAt: Date.parse(b.graduatedAt) || null,
    };
  }

  // memory = { [mint]: { devMax, botMax } } so we can see a dev or a bundle selling while we watch
  function remember(mem, c) {
    const m = mem[c.mint] || (mem[c.mint] = { devMax: c.dev || 0, botMax: c.bot || 0, seen: Date.now() });
    const devDropping = m.devMax - (c.dev || 0) >= 0.3, botDropping = m.botMax - (c.bot || 0) >= 1;
    m.devMax = Math.max(m.devMax, c.dev || 0); m.botMax = Math.max(m.botMax, c.bot || 0); m.last = Date.now();
    return { devDropping, botDropping };
  }

  const CHECKS = [
    { id: "holders", name: "holders growing", test: c => ({ ok: c.h5 !== null && c.h5 > 0, v: c.h5 === null ? "no trades in 5m" : (c.h5 > 0 ? "+" : "") + c.h5 + "% holders in 5m" }) },
    { id: "dev", name: "dev hasn't sold", test: (c, d) => ({ ok: c.dev > 0 && !d.devDropping, hard: d.devDropping, v: d.devDropping ? "dev selling now · " + c.dev + "% left" : c.dev > 0 ? "dev still holds " + c.dev + "%" : "dev holds 0%" }) },
    { id: "bundle", name: "no bundle selling out", test: (c, d) => ({ ok: !d.botDropping && c.bot < 20, hard: d.botDropping, v: d.botDropping ? "bundles selling · " + c.bot + "% left" : "bundles / bots hold " + c.bot + "%" }) },
    { id: "top10", name: "top 10 under 30%", test: c => ({ ok: c.top10 !== null && c.top10 <= 30, v: c.top10 === null ? "unknown" : "top 10 hold " + c.top10 + "%" }) },
    { id: "flow", name: "more buys than sells (5m)", test: c => ({ ok: c.b5 !== null && c.b5 > c.s5, v: c.b5 === null ? "no trades in 5m" : c.b5 + " buys / " + c.s5 + " sells" }) },
    { id: "unique", name: "real unique buyers", test: c => ({ ok: c.t5 !== null && c.t5 >= 8, v: c.t5 === null ? "no wallets in 5m" : c.t5 + " wallets traded in 5m" }) },
  ];

  function grade(c, d) {
    d = d || { devDropping: false, botDropping: false };
    const res = CHECKS.map(k => Object.assign({ id: k.id, name: k.name }, k.test(c, d)));
    const miss = res.filter(r => !r.ok).length, hard = res.some(r => r.hard);
    const g = hard || miss >= 2 ? "fail" : miss === 1 ? "watch" : "clear";
    return { g, checks: res, pass: res.length - miss };
  }

  const engine = g => g === "clear" ? "buy" : g === "watch" ? "wait" : "skip";

  // ---- the log: every coin STRETCH graded in the stretch, and what happened next ----
  function newState() { return { since: Date.now(), mem: {}, log: {}, lastOut: 0 }; }

  function tick(state, gems, now) {
    now = now || Date.now();
    const atg = ((gems.aboutToGraduate || {}).pools || []).map(normalize).filter(c => c.mint && c.p >= MIN_CURVE && c.p < 100);
    const grad = ((gems.graduated || {}).pools || []).map(normalize).filter(c => c.mint);
    const gradBy = Object.fromEntries(grad.map(c => [c.mint, c]));
    const stretch = atg.map(c => { const d = remember(state.mem, c), gr = grade(c, d); return Object.assign(c, { g: gr.g, checks: gr.checks, pass: gr.pass, eng: engine(gr.g) }); })
      .sort((a, b) => b.p - a.p);
    for (const c of stretch) {
      const e = state.log[c.mint] || (state.log[c.mint] = { mint: c.mint, sym: c.sym, name: c.name, src: c.src, lp: c.lp, first: now, firstP: c.p, firstG: c.g, bought: 0, status: "live" });
      Object.assign(e, { lastP: c.p, lastMcap: c.mcap, lastSeen: now, lastG: c.g });
      if (c.g === "clear" && !e.bought && e.status === "live") Object.assign(e, { bought: now, boughtP: c.p, boughtMcap: c.mcap });
    }
    for (const e of Object.values(state.log)) {
      if (e.status !== "live") continue;
      const gc = gradBy[e.mint];
      if (gc) Object.assign(e, { status: "migrated", migratedAt: gc.graduatedAt || now, migMcap: e.lastMcap });
      else if (now - (e.lastSeen || e.first) > DEAD_AFTER) Object.assign(e, { status: "died", diedAt: now });
    }
    // keep the log small
    const all = Object.values(state.log).sort((a, b) => b.first - a.first);
    for (const e of all.slice(400)) delete state.log[e.mint];
    for (const k of Object.keys(state.mem)) if (!state.log[k] && now - (state.mem[k].last || 0) > DEAD_AFTER) delete state.mem[k];
    return { stretch, graduated: grad.slice(0, 12).map(c => ({ mint: c.mint, sym: c.sym, at: c.graduatedAt, src: c.src })) };
  }

  // DexScreener market caps for migrated coins (after = now vs at migration)
  function applyOutcomes(state, pairs) {
    const best = {};
    for (const p of pairs || []) { const m = p.baseToken && p.baseToken.address; if (!m) continue; const liq = (p.liquidity && p.liquidity.usd) || 0;
      if (!best[m] || liq > best[m].liq) best[m] = { liq, mcap: p.marketCap || p.fdv || null }; }
    for (const e of Object.values(state.log)) { const b = best[e.mint]; if (e.status === "migrated" && b && b.mcap) { e.nowMcap = b.mcap; if (e.migMcap) e.after = Math.round((b.mcap / e.migMcap - 1) * 1000) / 10; } }
  }
  const pendingOutcomes = state => Object.values(state.log).filter(e => e.status === "migrated" && Date.now() - (e.migratedAt || 0) < 24 * 3600e3).map(e => e.mint).slice(0, 30);

  function stats(state) {
    const L = Object.values(state.log), res = L.filter(e => e.status !== "live");
    const wins = res.filter(e => e.bought && e.status === "migrated"), losses = res.filter(e => e.bought && e.status === "died");
    const goodSkips = res.filter(e => !e.bought && e.status === "died"), missed = res.filter(e => !e.bought && e.status === "migrated");
    const held = wins.filter(e => typeof e.after === "number");
    return { logged: L.length, live: L.length - res.length, resolved: res.length, bought: L.filter(e => e.bought).length,
      wins: wins.length, losses: losses.length, goodSkips: goodSkips.length, missed: missed.length,
      hitRate: wins.length + losses.length ? Math.round(100 * wins.length / (wins.length + losses.length)) : null,
      callsRight: res.length ? Math.round(100 * (wins.length + goodSkips.length) / res.length) : null,
      heldAfter: held.length ? Math.round(100 * held.filter(e => e.after >= 0).length / held.length) : null,
      migrated: res.filter(e => e.status === "migrated").length, died: res.filter(e => e.status === "died").length };
  }

  const logList = (state, n) => Object.values(state.log).sort((a, b) => Math.max(b.migratedAt || 0, b.diedAt || 0, b.first) - Math.max(a.migratedAt || 0, a.diedAt || 0, a.first)).slice(0, n || 60);

  const gemsBody = () => ({ aboutToGraduate: { timeframe: "24h", launchpads: LAUNCHPADS, minBondingCurve: MIN_CURVE }, graduated: { timeframe: "24h", launchpads: LAUNCHPADS } });

  const CORE = { LAUNCHPADS, GEMS, MIN_CURVE, CHECKS, normalize, remember, grade, engine, newState, tick, applyOutcomes, pendingOutcomes, stats, logList, gemsBody };
  root.CORE = CORE;
  if (typeof module !== "undefined") module.exports = CORE;
})(typeof self !== "undefined" ? self : this);
