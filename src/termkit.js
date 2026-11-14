/* termkit.js: pixel objects, long shadow, LED text. Shared by graphics.html and the site. */
const TK = (() => {
  const THEMES = {
    paper: { bg:"#f0e7d8", shadow:"#dcd2bf", ink:"#2b2a26", muted:"#8b8474", accent:"#2f9e4f", red:"#c9452e", card:"#f8f3ea", line:"#3a372f",
      outline:"#2e2a23", body:"#ece2c9", hi:"#faf5e8", shade:"#cdbf9f", dark:"#a39372", screen:"#16211a", glare:"#24372b", glow:"#45e07f", led:"#45e07f", slot:"#4a4337", glowBlur:0 },
    phosphor: { bg:"#050806", shadow:"#020302", ink:"#d6ffe2", muted:"#5d8a6b", accent:"#4cf28d", red:"#ff3b30", card:"#0b120d", line:"#1f3b29",
      outline:"#0d0f0c", body:"#e6dcc0", hi:"#f6f0de", shade:"#c4b693", dark:"#9a8a68", screen:"#0b1a10", glare:"#173323", glow:"#5cff9a", led:"#5cff9a", slot:"#3b352a", glowBlur:.9 },
    graphite: { bg:"#131210", shadow:"#0a0908", ink:"#efe7d8", muted:"#6f6a60", accent:"#efe7d8", red:"#e0533d", card:"#1a1916", line:"#33302a",
      outline:"#0a0908", body:"#ece4d3", hi:"#faf6ec", shade:"#c9bfa9", dark:"#9d927b", screen:"#1b1a17", glare:"#2b2925", glow:"#efe7d8", led:"#7fe0a0", slot:"#3d3a33", glowBlur:.5 },
    // ---- STRETCH proposals: cool blues only, no orange / yellow / gold ----
    frost: { bg:"#e6ebf2", shadow:"#d0d8e4", ink:"#14213a", muted:"#76839a", accent:"#2457e6", red:"#d2453a", card:"#f3f6fa", line:"#26344d",
      outline:"#111c33", body:"#f4f6fa", hi:"#ffffff", shade:"#c6d0df", dark:"#8a98b1", screen:"#122039", glare:"#1d2f4f", glow:"#6f9bff", led:"#2457e6", slot:"#2a3851",
      chkW:"#f4f6fa", chkK:"#14213a", glowBlur:0 },
    lane: { bg:"#0a0e1b", shadow:"#05070e", ink:"#e5ebf6", muted:"#67748d", accent:"#5a86ff", red:"#ff5a4e", card:"#10162a", line:"#252f49",
      outline:"#03050b", body:"#dde4f1", hi:"#f6f8fc", shade:"#aab7cf", dark:"#7a88a3", screen:"#0d1530", glare:"#1a2547", glow:"#82a6ff", led:"#5a86ff", slot:"#2a3450",
      chkW:"#eef2f9", chkK:"#141b2e", glowBlur:.6 },
    cobalt: { bg:"#1d3ccc", shadow:"#1630a6", ink:"#f2f5ff", muted:"#a3b4f0", accent:"#ffffff", red:"#ff6b6b", card:"#2244d6", line:"#0d1f7d",
      outline:"#0a1660", body:"#f2f5ff", hi:"#ffffff", shade:"#c2cdf4", dark:"#8493d6", screen:"#0c1a6b", glare:"#192a88", glow:"#ffffff", led:"#9fe6ff", slot:"#22338f",
      chkW:"#ffffff", chkK:"#0a1660", glowBlur:.35 },
  };

  // 3x5 pixel font (M, N, W wider). Rows top to bottom.
  const FONT = {
    A:["010","101","111","101","101"],B:["110","101","110","101","110"],C:["011","100","100","100","011"],D:["110","101","101","101","110"],
    E:["111","100","110","100","111"],F:["111","100","110","100","100"],G:["011","100","101","101","011"],H:["101","101","111","101","101"],
    I:["111","010","010","010","111"],J:["001","001","001","101","010"],K:["101","101","110","101","101"],L:["100","100","100","100","111"],
    M:["10001","11011","10101","10001","10001"],N:["1001","1101","1011","1001","1001"],O:["010","101","101","101","010"],P:["110","101","110","100","100"],
    Q:["010","101","101","110","011"],R:["110","101","110","101","101"],S:["011","100","010","001","110"],T:["111","010","010","010","010"],
    U:["101","101","101","101","111"],V:["101","101","101","101","010"],W:["10001","10001","10101","11011","10001"],X:["101","101","010","101","101"],
    Y:["101","101","010","010","010"],Z:["111","001","010","100","111"],
    0:["111","101","101","101","111"],1:["010","110","010","010","111"],2:["110","001","010","100","111"],3:["110","001","010","001","110"],
    4:["101","101","111","001","001"],5:["111","100","110","001","110"],6:["011","100","111","101","111"],7:["111","001","010","010","010"],
    8:["111","101","111","101","111"],9:["111","101","111","001","110"]," ":["0","0","0","0","0"],"-":["000","000","111","000","000"],
    ".":["0","0","0","0","1"],"+":["000","010","111","010","000"],"%":["101","001","010","100","101"],">":["100","010","001","010","100"],"_":["000","000","000","000","111"],
  };
  const glyph = ch => FONT[ch.toUpperCase()] || FONT[" "];
  const textWidth = (s, k = 1) => [...s].reduce((w, ch, i) => w + glyph(ch)[0].length * k + (i ? k : 0), 0);

  function Grid(w, h) {
    const c = new Array(w * h).fill(null);
    return {
      w, h, c,
      get(x, y) { return x < 0 || y < 0 || x >= w || y >= h ? null : c[y * w + x]; },
      set(x, y, v) { if (x >= 0 && y >= 0 && x < w && y < h) c[y * w + x] = v; },
      rect(x, y, rw, rh, v) { for (let j = 0; j < rh; j++) for (let i = 0; i < rw; i++) this.set(x + i, y + j, v); },
      text(s, x, y, v, k = 1) {
        let cx = x;
        for (const ch of s) { const g = glyph(ch);
          g.forEach((row, j) => [...row].forEach((b, i) => { if (b === "1") this.rect(cx + i * k, y + j * k, k, k, v); }));
          cx += g[0].length * k + k; }
      },
      outline(v = "outline") { // 1-cell outline around everything that is filled
        const add = [];
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++)
          if (!this.get(x, y) && (this.get(x - 1, y) || this.get(x + 1, y) || this.get(x, y - 1) || this.get(x, y + 1))) add.push([x, y]);
        add.forEach(([x, y]) => this.set(x, y, v));
      },
    };
  }

  // ---------- Objects. Each returns a Grid of palette keys. Build inside a 1-cell margin, then outline. ----------
  const OBJECTS = {
    computer({ ticker = "" } = {}) {
      const t = ticker.replace(/^\$/, "").toUpperCase();
      const k = t.length <= 4 ? 2 : 1;
      const tw = textWidth(t, k);
      const sw = Math.max(24, tw + 8);                    // screen width grows with the ticker
      const sh = Math.max(16, Math.round(sw * .52));      // and keeps a CRT-ish ratio
      const mw = sw + 10, mh = sh + 13;                   // monitor housing
      const W = mw + 6, H = mh + 18, g = Grid(W, H);
      const mx = 3, my = 1, sx = mx + 4, sy = my + 3;
      // monitor housing
      g.rect(mx, my, mw, mh, "body"); g.set(mx, my, null); g.set(mx + mw - 1, my, null);
      g.rect(mx + 1, my + 1, mw - 2, 1, "hi"); g.rect(mx + 1, my + 1, 1, mh - 3, "hi");
      g.rect(mx + mw - 2, my + 1, 1, mh - 2, "shade"); g.rect(mx + 1, my + mh - 2, mw - 2, 1, "shade");
      // bezel + screen
      g.rect(sx - 1, sy - 1, sw + 2, sh + 2, "shade"); g.rect(sx - 1, sy - 1, sw + 2, 1, "dark"); g.rect(sx - 1, sy - 1, 1, sh + 2, "dark");
      g.rect(sx, sy, sw, sh, "screen");
      [[sx, sy], [sx + sw - 1, sy], [sx, sy + sh - 1], [sx + sw - 1, sy + sh - 1]].forEach(([x, y]) => g.set(x, y, "shade"));
      // screen content: ticker, then a prompt (big ticker) or a little bar chart (long ticker)
      const th = 5 * k, ty = sy + Math.max(2, Math.floor((sh - th - 5) / 2));
      g.text(t, sx + Math.floor((sw - tw) / 2), ty, "glow", k);
      const by = sy + sh - 3;
      if (k === 2) { g.set(sx + 3, by - 1, "glow"); g.set(sx + 4, by, "glow"); g.set(sx + 3, by + 1, "glow"); g.rect(sx + 6, by + 1, 3, 1, "glow"); }
      else { [1, 2, 1, 3, 2, 3, 2, 4, 3, 4].forEach((b, i) => g.rect(sx + Math.floor((sw - 19) / 2) + i * 2, by + 2 - b, 1, b, i === 4 ? "red" : "glow")); }
      // front panel
      const py = my + mh - 5;
      g.rect(mx + 4, py, 2, 1, "led"); g.set(mx + 7, py, "red");
      const fw = Math.min(12, mw - 16); g.rect(mx + mw - 4 - fw, py, fw, 1, "slot"); g.rect(mx + mw - 4 - fw, py + 1, fw, 1, "hi");
      // neck (3 rows so the outlines of monitor and keyboard stay separate)
      const ny = my + mh, nx = mx + Math.floor(mw / 2) - 6;
      g.rect(nx, ny, 12, 3, "shade"); g.rect(nx, ny, 12, 1, "dark");
      // keyboard slab
      const kx = 1, kw = W - 2, ky = ny + 3, kh = 10;
      g.rect(kx, ky, kw, kh, "body"); g.set(kx, ky, null); g.set(kx + kw - 1, ky, null);
      g.rect(kx + 1, ky + 1, kw - 2, 1, "hi"); g.rect(kx + 1, ky + kh - 1, kw - 2, 1, "shade");
      const k0 = kx + 3 + ((kw - 6) % 2 ? 1 : 0), k1 = kx + kw - 3;
      for (let x = k0; x < k1; x += 2) { g.set(x, ky + 3, "dark"); g.set(x, ky + 5, "dark"); }
      const mid = kx + Math.floor(kw / 2);
      for (let x = k0; x < k1; x += 2) if (x < mid - 9 || x > mid + 8) g.set(x, ky + 7, "dark");
      g.rect(mid - 8, ky + 7, 16, 1, "dark");
      g.outline();
      return g;
    },
    // Example of a custom object: a framed token with a halo. Copy this pattern for new narratives.
    frame({ ticker = "" } = {}) {
      const g = Grid(30, 38), t = ticker.replace(/^\$/, "").toUpperCase().slice(0, 1);
      g.rect(2, 8, 26, 28, "body"); g.rect(3, 9, 24, 1, "hi"); g.rect(3, 9, 1, 26, "hi"); g.rect(26, 9, 1, 26, "shade"); g.rect(3, 34, 24, 1, "shade");
      g.rect(6, 12, 18, 20, "screen");
      g.rect(10, 16, 10, 12, "shade"); g.rect(9, 17, 12, 10, "shade"); g.rect(11, 17, 8, 10, "body"); g.rect(10, 18, 10, 8, "body");
      g.text(t, 14, 20, "dark");
      g.outline();
      // details drawn after the outline stay thin: a halo ring floating above
      g.rect(11, 1, 8, 1, "hi"); g.rect(8, 2, 3, 1, "hi"); g.rect(19, 2, 3, 1, "hi"); g.set(7, 3, "hi"); g.set(22, 3, "shade");
      g.rect(8, 4, 3, 1, "shade"); g.rect(19, 4, 3, 1, "shade"); g.rect(11, 5, 8, 1, "shade");
      return g;
    },

    // ---- STRETCH option A: a progress bar module stuck at 92%, the last stretch is a checkered finish ----
    bar() {
      const W = 46, H = 30, g = Grid(W, H);
      const x0 = 1, y0 = 1, w = 44, h = 28;
      g.rect(x0, y0, w, h, "body");
      [[x0, y0], [x0 + w - 1, y0], [x0, y0 + h - 1], [x0 + w - 1, y0 + h - 1]].forEach(([x, y]) => g.set(x, y, null));
      g.rect(x0 + 1, y0 + 1, w - 2, 1, "hi"); g.rect(x0 + 1, y0 + 1, 1, h - 3, "hi");
      g.rect(x0 + w - 2, y0 + 1, 1, h - 2, "shade"); g.rect(x0 + 1, y0 + h - 2, w - 2, 1, "shade");
      g.text("92", 5, 4, "outline", 2);                          // 14 x 10
      // a proper 5x5 percent sign at 2x
      ["11001", "11010", "00100", "01011", "10011"].forEach((row, j) => [...row].forEach((b, i) => { if (b === "1") g.rect(21 + i * 2, 4 + j * 2, 2, 2, "outline"); }));
      g.rect(36, 5, 2, 2, "led"); g.rect(39, 5, 2, 2, "dark");   // status lamps
      g.rect(36, 9, 5, 1, "dark");
      // the bar
      const bx = 4, by = 17, bw = 38, bh = 8;
      g.rect(bx, by, bw, bh, "screen");
      const ix = bx + 1, iy = by + 1, ih = bh - 2;               // inner 36 x 6
      for (let i = 0; i < 9; i++) g.rect(ix + i * 3, iy, 2, ih, "glow");       // filled: cells 0..25
      // the final stretch: a 6-cell checkered finish at the end of the track
      for (let yy = 0; yy < ih; yy++) for (let xx = 0; xx < 6; xx++) g.set(ix + 30 + xx, iy + yy, (Math.floor(xx / 2) + Math.floor(yy / 2)) % 2 ? "chkK" : "chkW");
      g.outline();
      return g;
    },

    // ---- STRETCH option B: a waving checkered finish flag ----
    flag() {
      const W = 40, H = 46, g = Grid(W, H);
      // pole + finial + foot
      g.rect(4, 3, 4, 4, "body"); g.rect(4, 3, 2, 1, "hi"); g.set(4, 4, "hi"); g.rect(7, 4, 1, 3, "shade");
      g.rect(5, 7, 2, 36, "shade"); g.rect(5, 7, 1, 36, "hi");
      g.rect(3, 43, 6, 2, "dark"); g.rect(3, 43, 6, 1, "shade");
      // cloth: 6 x 4 checks of 5 cells, one smooth wave
      const fx = 7, fy = 8, cw = 30, ch = 20, sq = 5;
      for (let x = 0; x < cw; x++) {
        const ph = x / cw * Math.PI * 1.6, off = Math.round(Math.sin(ph) * 2 + x * .05), slope = Math.cos(ph);
        for (let y = 0; y < ch; y++) {
          const dark = (Math.floor(x / sq) + Math.floor(y / sq)) % 2;
          let v = dark ? "chkK" : "chkW";
          if (!dark && slope < -.5) v = "shade";
          g.set(fx + x, fy + y + off, v);
        }
      }
      g.outline();
      return g;
    },

    // ---- STRETCH option C (Claude's pick): the curve, drawn as rising bars, running into a finish post ----
    curve() {
      const W = 44, H = 42, g = Grid(W, H);
      const base = 35, n = 8;
      for (let i = 0; i < n; i++) {
        const x = 2 + i * 4, hgt = Math.round(4 + 26 * Math.pow(i / (n - 1), 2.2)), y = base - hgt;
        const lit = i >= n - 2;
        g.rect(x, y, 3, hgt, lit ? "glow" : "body");
        if (!lit) { g.rect(x, y, 1, hgt, "hi"); g.rect(x + 2, y, 1, hgt, "shade"); }
        else g.rect(x + 2, y, 1, hgt, "led");
      }
      // ground plate
      g.rect(1, base, 41, 3, "body"); g.rect(1, base, 41, 1, "hi"); g.rect(1, base + 2, 41, 1, "shade");
      // the finish post, taller than every bar
      for (let y = 1; y < base; y++) for (let x = 0; x < 4; x++) g.set(36 + x, y, (Math.floor(x / 2) + Math.floor((y - 1) / 2)) % 2 ? "chkK" : "chkW");
      g.outline();
      return g;
    },
  };

  // ---------- Rendering ----------
  function draw(ctx, grid, o) {
    const th = typeof o.theme === "string" ? THEMES[o.theme] : o.theme;
    const cell = o.cell, ox = Math.round(o.x), oy = Math.round(o.y);
    if (o.shadow !== false) {
      const len = o.shadowLen ?? 2000, dir = o.shadowDir ?? [1, 1];
      const sil = document.createElement("canvas"); sil.width = grid.w * cell; sil.height = grid.h * cell;
      const s = sil.getContext("2d"); s.fillStyle = o.shadowColor || th.shadow;
      for (let y = 0; y < grid.h; y++) for (let x = 0; x < grid.w; x++) if (grid.get(x, y)) s.fillRect(x * cell, y * cell, cell, cell);
      for (let i = 1; i <= len; i++) ctx.drawImage(sil, ox + dir[0] * i, oy + dir[1] * i);
    }
    for (let y = 0; y < grid.h; y++) for (let x = 0; x < grid.w; x++) {
      const v = grid.get(x, y); if (!v) continue;
      ctx.fillStyle = th[v] || v;
      const glowing = (v === "glow" || v === "led") && th.glowBlur;
      if (glowing) { ctx.shadowColor = th[v]; ctx.shadowBlur = cell * 2.2 * th.glowBlur; } else ctx.shadowBlur = 0;
      ctx.fillRect(ox + x * cell, oy + y * cell, cell, cell);
    }
    ctx.shadowBlur = 0;
    return { w: grid.w * cell, h: grid.h * cell };
  }

  // Big LED-matrix text (WIM-style). Square dots with a gap, optional glow.
  function led(ctx, s, o) {
    const k = o.cell, gap = o.gap ?? Math.max(1, Math.round(k * .18));
    let cx = o.x;
    ctx.fillStyle = o.color; ctx.shadowColor = o.color; ctx.shadowBlur = o.glow ? k * 1.4 : 0;
    for (const ch of s.toUpperCase()) { const g = glyph(ch);
      g.forEach((row, j) => [...row].forEach((b, i) => {
        const sub = o.sub ?? 2; // each font pixel is drawn as sub×sub dots
        if (b === "1") for (let a = 0; a < sub; a++) for (let c = 0; c < sub; c++)
          ctx.fillRect(cx + (i * sub + c) * k, o.y + (j * sub + a) * k, k - gap, k - gap);
        else if (o.dim) { ctx.save(); ctx.globalAlpha = .07; ctx.shadowBlur = 0;
          for (let a = 0; a < sub; a++) for (let c = 0; c < sub; c++) ctx.fillRect(cx + (i * sub + c) * k, o.y + (j * sub + a) * k, k - gap, k - gap); ctx.restore(); }
      }));
      cx += (g[0].length + 1) * (o.sub ?? 2) * k; }
    ctx.shadowBlur = 0;
    return cx - o.x;
  }

  // Fit a canvas to an element at device pixel ratio and return a ctx in CSS pixels.
  function canvasFor(el) {
    const c = document.createElement("canvas"), r = el.getBoundingClientRect(), d = window.devicePixelRatio || 1;
    c.width = Math.round(r.width * d); c.height = Math.round(r.height * d);
    c.style.cssText = "position:absolute;inset:0;width:100%;height:100%;image-rendering:pixelated";
    el.prepend(c); const ctx = c.getContext("2d"); ctx.scale(d, d); ctx.imageSmoothingEnabled = false; return ctx;
  }

  return { THEMES, FONT, OBJECTS, Grid, draw, led, canvasFor, textWidth };
})();
if (typeof module !== "undefined") module.exports = TK;
