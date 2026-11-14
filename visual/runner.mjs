// Vizuális regressziós teszt (armands ökoszisztéma, v1)
// Használat:
//   node visual/runner.mjs --update   → baseline-ok (kanonikus állapot) rögzítése
//   node visual/runner.mjs            → összehasonlítás; kód 1, ha eltérés
// Követelmény: a repó gyökeréből futtatva; a config.json írja le az oldalakat.
// A baseline-ok a visual/baseline/<oldal>-<méret>-<téma>.jpg útvonalakon élnek.

import { chromium } from 'playwright-core';
import jpeg from 'jpeg-js';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, readdir, stat } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const cfg = JSON.parse(await readFile(join(root, 'visual', 'config.json'), 'utf8'));
const UPDATE = process.argv.includes('--update');
const NO_BUILD = process.argv.includes('--no-build');
const PORT = 8791;

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
    let err = '';
    p.stderr.on('data', (d) => { err += d; });
    p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(cmd + ' hiba ' + code + ': ' + err.slice(-500)))));
  });
}

async function serve(dir) {
  const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.json': 'application/json' };
  const server = createServer(async (req, res) => {
    try {
      let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      if (p.endsWith('/')) p += 'index.html';
      const file = join(dir, p);
      const data = await readFile(file);
      res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' });
      res.end(data);
    } catch {
      res.writeHead(404); res.end('nincs');
    }
  });
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  return server;
}

// dekódolt pixel-eltérés: a JPEG-tömörítés miatt bájtszintű diff használhatatlan
function pxDiff(a, b) {
  const da = jpeg.decode(a, { maxMemoryUsageInMB: 512 });
  const db = jpeg.decode(b, { maxMemoryUsageInMB: 512 });
  if (da.width !== db.width || da.height !== db.height) return 1;
  const A = da.data, B = db.data;
  const TOL = 16; // 0-255 skálán: a JPEG-tömörítési zaj felett
  let diff = 0;
  for (let i = 0; i < A.length; i += 4) {
    if (Math.abs(A[i] - B[i]) > TOL || Math.abs(A[i+1] - B[i+1]) > TOL || Math.abs(A[i+2] - B[i+2]) > TOL) diff++;
  }
  return diff / (A.length / 4);
}

if (!NO_BUILD) {
  console.log('1/4 hugo build...');
  await run(cfg.hugo, cfg.hugoArgs);
} else {
  console.log('1/4 hugo build (kihagyva, --no-build)');
}
const server = await serve(join(root, cfg.serveDir));

const results = { ok: 0, diff: [], missing: [] };
const baselineDir = join(root, 'visual', 'baseline');
await mkdir(baselineDir, { recursive: true });

console.log('2/4 böngésző...');
const browser = await chromium.launch({
  args: ['--no-sandbox'],
  executablePath: process.env.CHROMIUM_PATH || cfg.chromiumPath || undefined,
});

for (const page of cfg.pages) {
  for (const size of cfg.sizes) {
    const ctx = await browser.newContext({
      viewport: { width: size, height: 900 },
      deviceScaleFactor: 1,
      reducedMotion: 'reduce',
    });
    // téma a localStorage-ba, mielőtt az oldal JS futna
    for (const theme of cfg.themes) {
      const key = cfg.themeStorageKey || 'theme';
      await ctx.addInitScript(([k, t]) => { try { localStorage.setItem(k, t); } catch {} }, [key, theme]);
      const p = await ctx.newPage();
      const url = `http://127.0.0.1:${PORT}${page.path}`;
      await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
      // a lazy képek kényszerített betöltése (lazysizes data-src minta)
      await p.evaluate(() => {
        document.querySelectorAll('img[data-src]').forEach((img) => {
          img.src = img.getAttribute('data-src');
          img.removeAttribute('data-src');
          img.classList.remove('lazyload');
        });
      }).catch(() => {});
      await p.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {});
      await p.waitForTimeout(250);
      const shot = await p.screenshot({ type: 'jpeg', quality: 72, fullPage: false });
      const name = `${page.name}-${size}-${theme}.jpg`;
      const baseFile = join(baselineDir, name);
      if (UPDATE) {
        await writeFile(baseFile, shot);
        results.ok++;
      } else {
        try {
          const actualDir = join(root, 'visual', 'actual');
          await mkdir(actualDir, { recursive: true });
          await writeFile(join(actualDir, name), shot);
          const base = await readFile(baseFile);
          const d = pxDiff(shot, base);
          if (d > 0.02) results.diff.push({ name, d: (d * 100).toFixed(2) + '%' });
          else results.ok++;
        } catch {
          results.missing.push(name);
        }
      }
      await p.close();
      await ctx.clearCookies();
    }
    await ctx.close();
  }
}

await browser.close();
server.close();

console.log('3/4 összegzés...');
console.log(`rendben: ${results.ok}`);
if (results.missing.length) console.log('HIÁNYZÓ baseline:', results.missing.join(', '));
if (results.diff.length) {
  console.log('ELTÉRÉS (>2%):');
  for (const d of results.diff) console.log('  ' + d.name + ' ' + d.d);
}
console.log('4/4 kész.');
process.exit(results.missing.length || results.diff.length ? 1 : 0);
