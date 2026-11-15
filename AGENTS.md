# AGENTS.md — Az armands ökoszisztéma működési szabályai

4 Hugo-oldal (armands.dev, armands.site, armands.cv, armands.blog) + egy közös
dizájnrendszer-réteg (`armands-ui`). A réteg a single-source: ha komponenst,
színt vagy viselkedést változtatsz, az mind a 4 oldalon egyszerre érvényesül.

## 1. A réteg (`armands-ui`, v1.2.2)

- **Fájlok**: dev/site `static/assets/stylesheets/armands-ui.css`; CV
  `themes/hugo-theme-cv/assets/sass/_armands-ui.scss`; blog-theme
  `assets/sass/_armands-ui.scss` + vendored másolat az
  `armands-blog/themes/armands-blog/assets/sass/_` alatt.
- **Szinkron**: „1 szerkesztés + 3 másolás + 5 push” — nem npm, nem submodule.
  Minden módosításnál a fájl nevében/verzió-kommentjében (pl. `v1.2.2`) tartasd
  nyilván, hogy az eltérések azonnal látszanak (`grep "v1\.2" <fájl>`).
- **Szerződés**: a réteg definiálja a szerkezeti tokeneket (távolság, radius,
  fluid skála `--au-fs-*`) és a teljes szín-palettát (v0.9 óta sötét+világos is).
  Az oldalak NE írják felül a szerződéses tokeneket; csak oldalextra tokenek
  maradnak a `main.css`/`main.scss`-ben (pl. CV `--chip-bg`, blog híd-nélkül).
- **Shim-minta**: új komponens = réteg-primitív (`.au-card`, `.au-pill` stb.)
  + max 2–3 sor oldalspecifikus finomítás a `main.css`-ben, kommenttel.

## 2. Reszponzivitás — minden új komponensnél

- Szélesség: **`100%`, soha `100vw`** (a helyfoglaló görgetősáv ~15 px-cel
  kinyomja az oldalt vízszintesen — lásd a site `.sp-landing` javítását).
- Méretek: fluid `clamp()` a réteg tokenjeivel (`--au-fs-display/h1/h2/h3`,
  `--au-flow`); media query CSAK viselkedésváltáshoz (kanonikus: 500/800/1200).
- Érintési célok ≥ 44 px; minden doboz `box-sizing: border-box`.
- Hover: ha a háttér átlátszóvá válik, a SZÖVEGSZÍN is változzon (a réteg
  `.au-pill--bordered:hover` a minta) — különben az `accent-text` eltűnik.
- Gyors audit minden változás után: 320 / 768 / 1920 px + legalább egy
  oldal, ahol `document.documentElement.scrollWidth <= innerWidth`.

## 3. Ikonok (`.au-icon`, Iconoir 7.12)

- Nem-brand ikon: Iconoir SVG, inline partial-lal
  (`{{ partial "icon.html" "home" }}`), a réteg `.au-icon` konvenciójával
  (currentColor, 1.05em).
- **Brand ikonok** (GitLab, Twitter, Facebook, Instagram, LinkedIn, YouTube,
  Reddit, Keybase, Microsoft, Dribbble): az Iconoir licenc kizárja őket →
  FontAwesome Brands (`fab`) marad. Ne kerüljön be új `fas` ikon.

## 4. CSP és erőforrások

- dev/site/CV: `script-src 'self'` — inline JS tiltva (külső fájl + `defer`).
  A blog-on nincs szigorú CSP, de a minta azonos.
- Vendor JS (pl. three.js) self-hosted `static/assets/vendor/` alatt, min +
  source map; képek/képernyő-artwork a `static/assets/` alatt, relatív URL-lel.
- Nagy interaktív JS (pl. 3D mockup): **kattintásra/igény szerinti** betöltés
  (dinamikus `import()`), ne a lap nyitásakor — LCP/TTS védelem.

## 5. Tesztelés

- Build: `/tmp/opencode/hugo` (v0.147.7 extended — az élő CF-builddel azonos, a blog CSS-fingerprintje így egyezik). Lokális:
  `hugo --destination /tmp/opencode/<név>` + `python3 -m http.server <port>`.
  CV-nél kötelező `--baseURL http://localhost:<port>` (fingerprinted CSS).
- Paritás: localStorage `theme` = `dark`/`monolight` per origin beállítandó;
  a Playwright perzisztens profil cache-el → `?<kulcs>=<timestamp>` cache-bust
  vagy új port.
- Reszponzív audit: `node visual/audit.mjs` (a repó gyökeréből) – strukturális
  invariánsok szélesség-mátrixon (túlcsordulás, fejléc-törés, FAB a drawer-
  sávban, hover-stabilitás, anchor a fejléc alatt, űrlap-gomb térköve, ≥44px
  fejléc-célok). Commit előtt minden változásnál le kell futnia hiba nélkül.
- Lighthouse 100 a cél (perf/a11y/bp/seo); a CF challenge-platform inline
  injekciója miatt a bp élőn 92 lehet — az nem a mi kódunk.
- A blog workflow: blog-theme (origin main) commit → vendored másolás a
  blog repó `themes/armands-blog/` alá → „Sync theme" commit (gitlab master).

## 6. Szándékosan külön (ne egységesítsd)

- Blog zzo-témájának szerkezete és menüje; a CV hero-középre igazítása és
  print-CSS-je; a neumann/bar archívumok.
- Homelab-infrastruktúra: nincs beépítve az oldalakba.

## 7. Vizuális regressziós teszt (visual/)

Minden tartalmi repóban (`visual/`): kanonikus screenshot-ok oldalanként,
méretenként (390/768/1280/1920) és témánként (dark/monolight). A baseline a
`visual/baseline/`-ban él; eltérés >2% vagy hiányzó baseline = nem-nulla kód.

- Telepítés egyszer: `npm install playwright-core` (a repó gyökerében).
- Baseline rögzítése szándékos megjelenés-változás után:
  `node visual/runner.mjs --update` (mindig nézd meg a diffet commit előtt!).
- Ellenőrzés: `node visual/runner.mjs`.
- A futtató a helyi Hugót (`/tmp/opencode/hugo`) és a helyi Chromiumot használja
  (a config `chromiumPath`-ja); CI-ban a `CHROMIUM_PATH` env-felülírható.
