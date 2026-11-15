// Reszponzív audit (armands ökoszisztéma, v1)
// Strukturális invariánsokat ellenőriz szélesség-mátrixon – a vizuális
// runner (screenshot-diff) kiegészítése: az olyan hibákat fogja, amik a
// baseline-ban is benne lehetnek (törött fejléc, hiányzó FAB, hover-ugrás,
// anchor a fejléc alatt, tapadó gomb, vízszintes túlcsordulás).
//
// Használat (a repó gyökeréből):
//   node visual/audit.mjs            → audit, kód 1, ha bármelyik invariáns bukik
//   node visual/audit.mjs --no-build → külön build nélkül (meglévő serveDir)
// A visual/audit.config.json írja le az oldalakat és az oldalspecifikus
// ellenőrzéseket. A build + szolgáltatás a visual runnerével azonos módon megy.

import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const cfg = JSON.parse(await readFile(join(root, 'visual', 'audit.config.json'), 'utf8'));
const NO_BUILD = process.argv.includes('--no-build');
const PORT = cfg.port || 8792;

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
    let err = '';
    p.stderr.on('data', (d) => { err += d; });
    p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(cmd + ' hiba ' + code + ': ' + err.slice(-500)))));
  });
}

async function serve(dir) {
  const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };
  const server = createServer(async (req, res) => {
    try {
      let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      if (p.endsWith('/')) p += 'index.html';
      const file = join(dir, p);
      const data = await readFile(file);
      res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' });
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end('nincs');
    }
  });
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  return server;
}

const results = [];
let failures = 0;

function check(pageName, width, label, ok, detail = '') {
  if (!ok) failures++;
  results.push({ pageName, width, label, ok, detail });
}

async function auditPage(page, base, pageCfg, width) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(base + pageCfg.path, { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(500);

  // -- Univerzális invariánsok ------------------------------------------------
  const u = await page.evaluate((headerSel) => {
    const vw = window.innerWidth;
    let wide = [];
    document.querySelectorAll('body *').forEach((e) => {
      const cs = getComputedStyle(e);
      if (cs.display === 'none' || cs.visibility === 'hidden') return;
      if (cs.position === 'fixed') return; // viewport-horgonyú dekoráció; a scrollW-invariáns őrzi
      const r = e.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      // az off-canvas drawer (translateX-szel kitolt) nem számít túlcsordulásnak
      if (r.left >= vw - 1) return;
      if (r.right > vw + 1) wide.push((e.tagName + '.' + (e.className || '').toString().split(' ')[0]).slice(0, 50));
    });
    let smallTap = [];
    const header = headerSel ? document.querySelector(headerSel) : null;
    (header ? header.querySelectorAll('a, button') : []).forEach((e) => {
      const cs = getComputedStyle(e);
      if (cs.display === 'none' || cs.visibility === 'hidden') return;
      const r = e.getBoundingClientRect();
      if (r.width === 0) return;
      if (r.left < -100) return; // off-screen (skip-link), fókuszra jön elő
      if ((e.className || '').toString().split(' ').includes('skip-link')) return;
      if (r.width < 44 || r.height < 44) smallTap.push((e.className || e.tagName).toString().split(' ').slice(0, 2).join('.'));
    });
    return { scrollW: document.documentElement.scrollWidth, innerW: vw, wide: wide.slice(0, 3), smallTap: smallTap.slice(0, 3) };
  }, (pageCfg.checks && pageCfg.checks.header && pageCfg.checks.header.selector) || null);
  check(pageCfg.name, width, 'nincs vízszintes túlcsordulás', u.scrollW <= u.innerW + 1, `scrollW=${u.scrollW}`);
  check(pageCfg.name, width, 'nincs viewportnál szélesebb elem', u.wide.length === 0, u.wide.join(', '));
  if (u.smallTap.length) check(pageCfg.name, width, 'érintési célok ≥44px a fejlécben', u.smallTap.length === 0, u.smallTap.join(', '));

  const facts = [];
  const c = pageCfg.checks || {};

  // -- Fejléc magasság (a törött sávot fogja) ---------------------------------
  if (c.header) {
    const h = await page.evaluate((sel) => {
      const e = document.querySelector(sel);
      return e ? Math.round(e.getBoundingClientRect().height) : null;
    }, c.header.selector);
    facts.push('headerH=' + h);
    if (h !== null) check(pageCfg.name, width, 'fejléc ≤ ' + c.header.maxH + 'px', h <= c.header.maxH, `${h}px`);
  }

  // -- FAB: a drawer-módhoz kötelező -------------------------------------------
  if (c.fab) {
    const vis = await page.evaluate((sel) => {
      const e = document.querySelector(sel);
      return e ? getComputedStyle(e).display !== 'none' : false;
    }, c.fab.selector);
    facts.push('fab=' + vis);
    if (width <= c.fab.mustBeVisibleBelow) check(pageCfg.name, width, 'menünyitó (FAB) látszik a drawer-sávban', vis);
  }

  // -- Hover nem mozgatja a layoutot -------------------------------------------
  if (c.hover && width >= 1024) {
    const before = await page.evaluate(() => document.documentElement.scrollHeight);
    const el = page.locator(c.hover.selector).first();
    try {
      await el.hover({ timeout: 3000 });
      await page.waitForTimeout(400);
      const after = await page.evaluate(() => document.documentElement.scrollHeight);
      facts.push('hover=' + before + '→' + after);
      check(pageCfg.name, width, 'hover nem változtatja a magasságot', after === before, `${before}→${after}`);
    } catch { /* nincs ilyen elem ezen a szélességen */ }
  }

  // -- Anchor a ragadós fejléc alatt -------------------------------------------
  if (c.anchor && width >= 1024) {
    const ok = await page.evaluate((a) => {
      const link = document.querySelector(a.link);
      if (!link) return null;
      link.click();
      return true;
    }, c.anchor);
    if (ok) {
      await page.waitForTimeout(900);
      const vis = await page.evaluate((a) => {
        const t = document.querySelector(a.target);
        const h = document.querySelector(a.header);
        if (!t || !h) return null;
        return t.getBoundingClientRect().top >= h.getBoundingClientRect().bottom - 1;
      }, c.anchor);
      if (vis !== null) check(pageCfg.name, width, 'anchor-cím a fejléc alatt marad', vis);
    }
  }

  // -- Űrlap: a küldőgomb nem tapad az utolsó mezőhöz ---------------------------
  if (c.form) {
    const gap = await page.evaluate((f) => {
      const form = document.querySelector(f.form);
      if (!form) return null;
      const fields = [...form.querySelectorAll(f.field)];
      const btn = form.querySelector(f.button);
      if (!fields.length || !btn) return null;
      return Math.round(btn.getBoundingClientRect().top - fields[fields.length - 1].getBoundingClientRect().bottom);
    }, c.form);
    facts.push('formGap=' + gap);
    if (gap !== null) check(pageCfg.name, width, 'küldőgomb térköve az utolsó mezőtől', gap >= (c.form.minGap || 8), `${gap}px`);
  }

  return facts.join(' ');
}

// --- main --------------------------------------------------------------------
if (!NO_BUILD) {
  console.log('hugo build...');
  await run(cfg.hugo, cfg.hugoArgs);
}
const server = await serve(join(root, cfg.serveDir));
const browser = await chromium.launch({ executablePath: cfg.chromiumPath, args: ['--no-sandbox'] });
const page = await browser.newPage();

const base = `http://127.0.0.1:${PORT}`;
try {
  for (const pageCfg of cfg.pages) {
    for (const width of cfg.widths) {
      const facts = await auditPage(page, base, pageCfg, width);
      const marks = results.filter((r) => r.pageName === pageCfg.name && r.width === width);
      const bad = marks.filter((m) => !m.ok);
      console.log(`${bad.length ? '✗' : '✓'} ${pageCfg.name} @${width}px  ${facts}`);
    }
  }
} finally {
  await browser.close();
  server.close();
}

console.log('');
for (const r of results.filter((r) => !r.ok)) console.log(`HIBA: ${r.pageName} @${r.width}px – ${r.label} (${r.detail})`);
console.log(results.every((r) => r.ok) ? 'MINDEN INVARIÁNS RENDBEN' : `${failures} invariáns-bukás`);
process.exit(results.every((r) => r.ok) ? 0 : 1);
