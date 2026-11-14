// Vizuális regressziós teszt (armands ökoszisztéma, v1)
// Használat:
//   node visual/runner.mjs --update   → baseline-ok (kanonikus állapot) rögzítése
//   node visual/runner.mjs            → összehasonlítás; kód 1, ha eltérés
// Követelmény: a repó gyökeréből futtatva; a config.json írja le az oldalakat.
// A baseline-ok a visual/baseline/<oldal>-<méret>-<téma>.jpg útvonalakon élnek.

import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, readdir, stat } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const cfg = JSON.parse(await readFile(join(root, 'visual', 'config.json'), 'utf8'));
const UPDATE = process.argv.includes('--update');
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

const pxDiff = (a, b) => {
  // egyszerű, függőség-mentes eltérés-számláló (RGBA buffer-ek)
  let diff = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) if (a[i] !== b[i]) diff++;
  return diff / n;
};

console.log('1/4 hugo build...');
await run(cfg.hugo, cfg.hugoArgs);
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
      await p.goto(url, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
      await p.waitForTimeout(800);
      const shot = await p.screenshot({ type: 'jpeg', quality: 72, fullPage: false });
      const name = `${page.name}-${size}-${theme}.jpg`;
      const baseFile = join(baselineDir, name);
      if (UPDATE) {
        await writeFile(baseFile, shot);
        results.ok++;
      } else {
        try {
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
