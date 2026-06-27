# Portfolio Relaunch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the live F1-racing-themed "coming soon" site with a single-page minimal/tech "Dark + Glow" portfolio with three sections — About, Game (a 3D Tetris built in Three.js), and Contact — navigable via a fixed side-dot indicator, while the previous Three.js racing attempt stays untouched in its own separate worktree.

**Architecture:** `index.html` is rewritten from scratch with three full-height `<section>`s. `css/site.css` (new, replacing `css/landing.css`) provides the dark/glow visual language, typography, and section layout. `js/nav.js` drives the side-dot navigation via `IntersectionObserver` + smooth-scroll. `js/tetris.js` is a self-contained Three.js Tetris implementation (board logic + rendering + input), independent of everything else on the page. The old racing-themed files (`js/race.js`, `js/hero-gl.js`, `js/main.js`, `css/landing.css`) are deleted — none of their logic is reused.

**Tech Stack:** Three.js (ES module, CDN import map, no build step), vanilla JS, Google Fonts (Space Grotesk + JetBrains Mono).

## Global Constraints

- Visual direction: "Dark + Glow" — near-black blue/purple background (`#0a0a0f`/`#1a1a2e`), soft purple/blue radial glows behind key elements, accent color `#9b8cff`. (Spec: Decisioni di stile prese)
- Navigation shows **only** About / Game / Contact — no placeholder entries for future Work/Blog sections. (Spec: Decisioni di navigazione/struttura prese)
- Navigation pattern: fixed vertical dots on the right edge of the screen, one per section, active dot highlighted, click scrolls smoothly to that section. (Spec: Decisioni di navigazione/struttura prese)
- Typography: **Space Grotesk** for headings, **JetBrains Mono** for labels/details/HUD text. (Spec: Decisioni di tipografia prese)
- Tetris: real 3D cube pieces rendered in Three.js, not flat 2D squares. (Spec: Decisioni sul gioco prese)
- Tetris block colors: classic arcade Tetris-guideline colors per piece type (cyan/yellow/purple/green/red/blue/orange), solid and saturated, no glow/transparency applied to the pieces themselves — the "Dark + Glow" treatment stays in the scene's ambient lighting/background, not on the blocks. (Spec: Decisioni sul gioco prese)
- About section copy (exact, verbatim): "Il sito è in lavorazione. Torna più avanti per vedere tutte le novità. Ma nel frattempo, se vuoi, fatti una partita!" (Spec: Copy deciso)
- Contact section keeps the existing email address `info@stebarto.com`; the rest of the copy is rewritten (the current F1-themed text is dropped). (Spec: Copy deciso)
- Logo asset: reuse `assets/img/logo.png` (already present in the working tree, but not yet committed to `main`). (Spec: Architettura tecnica)
- Nothing from `js/race.js`, `js/hero-gl.js`, the old `css/landing.css`, or the abandoned `worktree-threejs-scroll-journey` worktree is reused. (Spec: Fuori scope)
- This project has no build step and no test runner — verification throughout is manual, via browser preview tools, exactly as in prior work on this codebase.

---

## File Structure

- **Create `index.html`** (full rewrite) — document head (fonts, meta), three `<section>` placeholders (`#about`, `#game`, `#contact`), the side-dot nav markup, script tags.
- **Create `css/site.css`** (replaces `css/landing.css`) — CSS variables, reset, fonts, glow backgrounds, per-section layout, nav-dot styles.
- **Create `js/nav.js`** — builds/wires the side-dot navigation: `IntersectionObserver` to track which section is active, click-to-scroll.
- **Create `js/tetris.js`** — the entire Tetris game: board state, tetromino shapes/rotation, gravity/input/collision, line-clear/scoring, and the Three.js rendering of the board and pieces. One file, since it's a single cohesive feature with no other consumer.
- **Delete `js/race.js`, `js/hero-gl.js`, `js/main.js`, `css/landing.css`** — fully superseded, no logic reused.
- **Modify `manifest.webmanifest`** — update name/description/orientation for the new site (the current one is F1-racing-themed and locks `orientation: landscape`, wrong for a scrolling portfolio).
- **Add `assets/img/logo.png`** to git (currently present on disk but untracked).

---

## Task 1: Page skeleton, global Dark+Glow CSS, cleanup of old site

**Files:**
- Create: `index.html`
- Create: `css/site.css`
- Delete: `js/race.js`, `js/hero-gl.js`, `js/main.js`, `css/landing.css`
- Modify: `manifest.webmanifest`
- Add: `assets/img/logo.png`

**Interfaces:**
- Produces: three empty section containers `<section id="about">`, `<section id="game">`, `<section id="contact">`, each `min-height: 100vh`, that Tasks 2–6 fill in. Produces CSS custom properties (`--bg`, `--bg-2`, `--accent`, `--accent-glow`, `--white`, `--muted`, `--font-display`, `--font-mono`) that every later CSS task reuses.

- [ ] **Step 1: Add the logo to git**

```bash
git add assets/img/logo.png
```

- [ ] **Step 2: Delete the old racing-themed files**

```bash
git rm js/race.js js/hero-gl.js js/main.js css/landing.css
```

- [ ] **Step 3: Update the PWA manifest**

Replace the full contents of `manifest.webmanifest` with:

```json
{
    "name": "Stebarto",
    "short_name": "Stebarto",
    "description": "Portfolio in lavorazione — nel frattempo, una partita a Tetris.",
    "start_url": "/",
    "display": "browser",
    "background_color": "#0a0a0f",
    "theme_color": "#0a0a0f",
    "icons": [
        {
            "src": "assets/img/logo.png",
            "sizes": "374x225",
            "type": "image/png",
            "purpose": "any"
        }
    ]
}
```

- [ ] **Step 4: Write `index.html`**

```html
<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#0a0a0f" />
    <link rel="manifest" href="manifest.webmanifest" />
    <link rel="apple-touch-icon" href="assets/img/logo.png" />
    <title>Stebarto.com</title>
    <meta name="description" content="Il sito di Stebarto è in lavorazione. Nel frattempo, una partita a Tetris." />
    <meta property="og:title" content="Stebarto.com" />
    <meta property="og:description" content="Sito in lavorazione. Nel frattempo, una partita a Tetris." />
    <meta property="og:type" content="website" />
    <link rel="icon" href="assets/favicon.ico" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="css/site.css?v=1" />
    <script type="importmap">
    {
      "imports": {
        "three": "https://unpkg.com/three@0.160.0/build/three.module.js"
      }
    }
    </script>
</head>
<body>

    <nav class="side-nav" aria-label="Navigazione sezioni">
        <a class="side-nav-dot" data-target="about" href="#about" aria-label="About"></a>
        <a class="side-nav-dot" data-target="game" href="#game" aria-label="Game"></a>
        <a class="side-nav-dot" data-target="contact" href="#contact" aria-label="Contact"></a>
    </nav>

    <main>
        <section class="page-section" id="about"></section>
        <section class="page-section" id="game"></section>
        <section class="page-section" id="contact"></section>
    </main>

    <script src="js/nav.js?v=1"></script>
    <script type="module" src="js/tetris.js?v=1"></script>
</body>
</html>
```

- [ ] **Step 5: Write `css/site.css`**

```css
:root {
    --bg: #0a0a0f;
    --bg-2: #1a1a2e;
    --accent: #9b8cff;
    --accent-glow: rgba(155, 140, 255, 0.35);
    --white: #f5f5f7;
    --muted: #8a8aa0;
    --font-display: "Space Grotesk", sans-serif;
    --font-mono: "JetBrains Mono", monospace;
}

* { margin: 0; padding: 0; box-sizing: border-box; }

html { scroll-behavior: smooth; }

body {
    background: var(--bg);
    color: var(--white);
    font-family: var(--font-display);
    line-height: 1.6;
    overflow-x: clip;
}

a { color: inherit; text-decoration: none; }

::selection { background: var(--accent); color: #0a0a0f; }

:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 3px;
}

.page-section {
    position: relative;
    min-height: 100vh;
    min-height: 100svh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4rem clamp(1.2rem, 6vw, 4rem);
    overflow: hidden;
}

.page-section::before {
    content: "";
    position: absolute;
    inset: -20%;
    background: radial-gradient(circle at 30% 35%, var(--accent-glow) 0%, transparent 55%);
    pointer-events: none;
    z-index: 0;
}

#about { background: linear-gradient(180deg, var(--bg) 0%, var(--bg-2) 100%); }
#game { background: var(--bg); }
#contact { background: linear-gradient(180deg, var(--bg-2) 0%, var(--bg) 100%); }

/* ============ Side-dot navigation ============ */

.side-nav {
    position: fixed;
    top: 50%;
    right: clamp(1.2rem, 4vw, 2.5rem);
    transform: translateY(-50%);
    z-index: 20;
    display: flex;
    flex-direction: column;
    gap: 1.1rem;
}

.side-nav-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    border: 1px solid var(--muted);
    background: transparent;
    transition: background 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
}

.side-nav-dot:hover { transform: scale(1.3); }

.side-nav-dot.active {
    background: var(--accent);
    border-color: var(--accent);
    box-shadow: 0 0 10px var(--accent-glow);
    transform: scale(1.2);
}

@media (max-width: 560px) {
    .side-nav { right: 0.9rem; gap: 0.9rem; }
    .side-nav-dot { width: 8px; height: 8px; }
}
```

- [ ] **Step 6: Verify in the browser preview**

Start a preview server on this checkout (e.g. `python3 -m http.server 8000` from the project root, or use the `mcp__Claude_Preview__*` tools — add a `.claude/launch.json` config if one doesn't already exist for this directory). Reload and confirm via the console-logs tool there are no errors (the `three` import map resolving is enough at this stage — `tetris.js` doesn't use it yet). Confirm via screenshot: three stacked dark sections with a subtle purple glow each, three nav dots fixed on the right edge. Confirm via `preview_eval` that `document.querySelectorAll('.page-section').length === 3`.

- [ ] **Step 7: Commit**

```bash
git add index.html css/site.css manifest.webmanifest
git commit -m "Rebuild page skeleton with Dark+Glow CSS foundation, remove old racing-themed site"
```

---

## Task 2: About section

**Files:**
- Modify: `index.html:#about` section
- Modify: `css/site.css`

**Interfaces:**
- Consumes: `.page-section#about` container and CSS variables from Task 1.

- [ ] **Step 1: Fill in the About section markup**

In `index.html`, replace:
```html
<section class="page-section" id="about"></section>
```
with:
```html
<section class="page-section" id="about">
    <div class="about-inner">
        <img class="about-logo" src="assets/img/logo.png" alt="Stebarto" />
        <p class="about-kicker">// ABOUT</p>
        <h1 class="about-title">Stebarto<span class="about-dot">.</span></h1>
        <p class="about-lead">Il sito è in lavorazione. Torna più avanti per vedere tutte le novità.<br />Ma nel frattempo, se vuoi, fatti una partita!</p>
    </div>
</section>
```

- [ ] **Step 2: Style it**

Add to `css/site.css`:

```css
/* ============ About ============ */

.about-inner {
    position: relative;
    z-index: 1;
    max-width: 640px;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
}

.about-logo {
    width: 64px;
    height: auto;
    margin-bottom: 1.6rem;
    filter: drop-shadow(0 4px 18px var(--accent-glow));
}

.about-kicker {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    letter-spacing: 0.4em;
    color: var(--accent);
    margin-bottom: 1rem;
}

.about-title {
    font-weight: 700;
    font-size: clamp(3rem, 9vw, 6.5rem);
    letter-spacing: -0.02em;
    line-height: 1;
}

.about-dot { color: var(--accent); }

.about-lead {
    margin-top: 1.4rem;
    font-size: clamp(1rem, 2vw, 1.25rem);
    color: var(--muted);
    max-width: 46ch;
}
```

- [ ] **Step 3: Verify in the browser preview**

Reload, screenshot the first viewport. Confirm: logo, "// ABOUT" kicker in accent purple, large "Stebarto." title, the lead paragraph with the exact decided copy, all centered, legible against the dark/glow background. Confirm no console errors.

- [ ] **Step 4: Commit**

```bash
git add index.html css/site.css
git commit -m "Add About section content and styling"
```

---

## Task 3: Contact section

**Files:**
- Modify: `index.html:#contact` section
- Modify: `css/site.css`

**Interfaces:**
- Consumes: `.page-section#contact` container and CSS variables from Task 1.

- [ ] **Step 1: Fill in the Contact section markup**

In `index.html`, replace:
```html
<section class="page-section" id="contact"></section>
```
with:
```html
<section class="page-section" id="contact">
    <div class="contact-inner">
        <p class="about-kicker">// CONTACT</p>
        <h2 class="contact-title">Scriviamoci.</h2>
        <p class="contact-lead">Idee, domande, o solo due chiacchiere — la mail è sempre aperta.</p>
        <a class="contact-link" href="mailto:info@stebarto.com">info@stebarto.com</a>
    </div>
</section>
```

- [ ] **Step 2: Style it**

Add to `css/site.css`:

```css
/* ============ Contact ============ */

.contact-inner {
    position: relative;
    z-index: 1;
    max-width: 640px;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
}

.contact-title {
    font-weight: 700;
    font-size: clamp(2.2rem, 6vw, 3.5rem);
    letter-spacing: -0.01em;
}

.contact-lead {
    margin-top: 1rem;
    color: var(--muted);
    max-width: 40ch;
}

.contact-link {
    margin-top: 2rem;
    font-family: var(--font-mono);
    font-size: clamp(1rem, 2.4vw, 1.4rem);
    color: var(--accent);
    border-bottom: 1px solid var(--accent);
    padding-bottom: 0.3rem;
    transition: opacity 0.2s ease;
}

.contact-link:hover { opacity: 0.7; }
```

- [ ] **Step 3: Verify in the browser preview**

Scroll to the bottom section. Confirm: "// CONTACT" kicker, "Scriviamoci." title, lead text, and the `info@stebarto.com` mailto link styled with the accent underline. Confirm no console errors.

- [ ] **Step 4: Commit**

```bash
git add index.html css/site.css
git commit -m "Add Contact section content and styling"
```

---

## Task 4: Side-dot navigation behavior

**Files:**
- Create: `js/nav.js`

**Interfaces:**
- Consumes: `.side-nav-dot[data-target]` elements and `.page-section` elements with matching `id`s (both from Task 1).
- Produces: nothing consumed by later tasks — this is a leaf feature.

- [ ] **Step 1: Write `js/nav.js`**

```js
(function () {
    "use strict";

    var dots = Array.prototype.slice.call(document.querySelectorAll(".side-nav-dot"));
    var sections = dots.map(function (dot) {
        return document.getElementById(dot.getAttribute("data-target"));
    });

    function setActive(id) {
        dots.forEach(function (dot) {
            dot.classList.toggle("active", dot.getAttribute("data-target") === id);
        });
    }

    dots.forEach(function (dot) {
        dot.addEventListener("click", function (e) {
            e.preventDefault();
            var target = document.getElementById(dot.getAttribute("data-target"));
            if (target) target.scrollIntoView({ behavior: "smooth" });
        });
    });

    if ("IntersectionObserver" in window) {
        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) setActive(entry.target.id);
            });
        }, { threshold: 0.5 });
        sections.forEach(function (section) {
            if (section) observer.observe(section);
        });
    } else {
        setActive("about");
    }
})();
```

- [ ] **Step 2: Verify in the browser preview**

Reload at the top of the page — confirm via screenshot/`preview_eval` (`document.querySelector('.side-nav-dot.active').dataset.target`) that the "about" dot is active. Scroll down to the game section and confirm the "game" dot becomes active; scroll to contact and confirm "contact" becomes active. Click the "about" dot from the bottom of the page and confirm the page smooth-scrolls back to the top. Confirm no console errors.

- [ ] **Step 3: Commit**

```bash
git add js/nav.js
git commit -m "Add side-dot navigation with scroll-spy and click-to-scroll"
```

---

## Task 5: Tetris — Three.js scene scaffold and static board

**Files:**
- Modify: `index.html:#game` section
- Modify: `css/site.css`
- Create: `js/tetris.js`

**Interfaces:**
- Consumes: `three` from the import map (Task 1).
- Produces: `js/tetris.js` exposes no external interface yet (self-contained IIFE-style module); later tasks in this file extend the same file in place.

- [ ] **Step 1: Add the Game section markup**

In `index.html`, replace:
```html
<section class="page-section" id="game"></section>
```
with:
```html
<section class="page-section" id="game">
    <div class="game-inner">
        <p class="about-kicker">// GAME</p>
        <div class="tetris-stage">
            <canvas id="tetris-canvas"></canvas>
            <div class="tetris-hud" aria-hidden="true">
                <span id="tetris-score">SCORE 0</span>
                <span id="tetris-level">LVL 1</span>
            </div>
        </div>
    </div>
</section>
```

- [ ] **Step 2: Style the Tetris stage**

Add to `css/site.css`:

```css
/* ============ Game ============ */

.game-inner {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
}

.tetris-stage {
    position: relative;
    width: min(90vw, 360px);
    aspect-ratio: 1 / 2;
    margin-top: 1.2rem;
    border: 1px solid rgba(155, 140, 255, 0.25);
    background: #050507;
    box-shadow: 0 0 40px rgba(155, 140, 255, 0.12);
}

#tetris-canvas {
    display: block;
    width: 100%;
    height: 100%;
}

.tetris-hud {
    position: absolute;
    top: 0; left: 0; right: 0;
    display: flex;
    justify-content: space-between;
    padding: 0.6rem 0.8rem;
    font-family: var(--font-mono);
    font-size: 0.78rem;
    letter-spacing: 0.08em;
    color: var(--white);
    text-shadow: 0 1px 4px #000;
    pointer-events: none;
}
```

- [ ] **Step 3: Write the Three.js scaffold in `js/tetris.js`**

```js
import * as THREE from "three";

const COLS = 10;
const ROWS = 20;
const CELL = 1;

const canvas = document.getElementById("tetris-canvas");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050507);

const boardWidth = COLS * CELL;
const boardHeight = ROWS * CELL;
const camera = new THREE.OrthographicCamera(
    -boardWidth / 2 - 0.5, boardWidth / 2 + 0.5,
    boardHeight / 2 + 0.5, -boardHeight / 2 - 0.5,
    0.1, 100
);
camera.position.set(0, 0, 20);
camera.lookAt(0, 0, 0);

scene.add(new THREE.AmbientLight(0x9b8cff, 0.5));
const keyLight = new THREE.DirectionalLight(0xffffff, 1.1);
keyLight.position.set(3, 6, 10);
scene.add(keyLight);

// Static board outline (one thin frame around the play field)
const outlineGeometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(boardWidth, boardHeight, 0.1));
const outlineMaterial = new THREE.LineBasicMaterial({ color: 0x9b8cff, transparent: true, opacity: 0.5 });
scene.add(new THREE.LineSegments(outlineGeometry, outlineMaterial));

function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    renderer.setSize(rect.width, rect.height, false);
}
window.addEventListener("resize", resize);
resize();

function tick() {
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
}
tick();
```

- [ ] **Step 4: Verify in the browser preview**

Reload, scroll to the Game section. Confirm via screenshot: a dark square stage with a thin purple wireframe outline matching a 10×20 board proportion, "SCORE 0" / "LVL 1" HUD text in the top corners. Resize the browser window and confirm the canvas keeps filling its container without distortion. Confirm no console errors (in particular, no errors resolving `three`).

- [ ] **Step 5: Commit**

```bash
git add index.html css/site.css js/tetris.js
git commit -m "Add Tetris Three.js scene scaffold with static board outline"
```

---

## Task 6: Tetris — piece shapes, spawning, gravity, and rendering

**Files:**
- Modify: `js/tetris.js`

**Interfaces:**
- Produces (module-level state and functions used by Tasks 7–8, all defined in the same file): `board` (2D array, `ROWS×COLS`, each cell `null` or a hex color number), `current` (`{ shape: number[][], color: number, row: number, col: number }` or `null`), `spawnPiece()`, `collides(shape, row, col)`, `lockPiece()`, `render()`.

- [ ] **Step 1: Add tetromino definitions and board state**

In `js/tetris.js`, after the `tick`/render setup from Task 5 but before the `function tick()` definition, add:

```js
const SHAPES = {
    I: { color: 0x00f0f0, cells: [[1, 1, 1, 1]] },
    O: { color: 0xf0f000, cells: [[1, 1], [1, 1]] },
    T: { color: 0xa000f0, cells: [[0, 1, 0], [1, 1, 1]] },
    S: { color: 0x00f000, cells: [[0, 1, 1], [1, 1, 0]] },
    Z: { color: 0xf00000, cells: [[1, 1, 0], [0, 1, 1]] },
    J: { color: 0x0000f0, cells: [[1, 0, 0], [1, 1, 1]] },
    L: { color: 0xf0a000, cells: [[0, 0, 1], [1, 1, 1]] }
};
const SHAPE_KEYS = Object.keys(SHAPES);

const board = [];
for (let r = 0; r < ROWS; r++) board.push(new Array(COLS).fill(null));

let current = null;

function randomShapeKey() {
    return SHAPE_KEYS[Math.floor(Math.random() * SHAPE_KEYS.length)];
}

function collides(shape, row, col) {
    for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
            if (!shape[r][c]) continue;
            const br = row + r, bc = col + c;
            if (bc < 0 || bc >= COLS || br >= ROWS) return true;
            if (br >= 0 && board[br][bc]) return true;
        }
    }
    return false;
}

function spawnPiece() {
    const key = randomShapeKey();
    const def = SHAPES[key];
    const shape = def.cells;
    const col = Math.floor((COLS - shape[0].length) / 2);
    current = { shape: shape, color: def.color, row: 0, col: col };
    if (collides(shape, 0, col)) {
        current = null; // game over, handled in Task 8
    }
}

function lockPiece() {
    if (!current) return;
    for (let r = 0; r < current.shape.length; r++) {
        for (let c = 0; c < current.shape[r].length; c++) {
            if (!current.shape[r][c]) continue;
            const br = current.row + r, bc = current.col + c;
            if (br >= 0 && br < ROWS) board[br][bc] = current.color;
        }
    }
    current = null;
}
```

- [ ] **Step 2: Add the cube-pool renderer**

Right after the code from Step 1, add:

```js
const cellMeshes = [];
for (let r = 0; r < ROWS; r++) {
    const rowMeshes = [];
    for (let c = 0; c < COLS; c++) {
        const mesh = new THREE.Mesh(
            new THREE.BoxGeometry(CELL * 0.92, CELL * 0.92, CELL * 0.92),
            new THREE.MeshStandardMaterial({ color: 0xffffff })
        );
        mesh.position.set(
            (c - COLS / 2 + 0.5) * CELL,
            (ROWS / 2 - r - 0.5) * CELL,
            0
        );
        mesh.visible = false;
        scene.add(mesh);
        rowMeshes.push(mesh);
    }
    cellMeshes.push(rowMeshes);
}

function render() {
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const mesh = cellMeshes[r][c];
            const locked = board[r][c];
            mesh.visible = !!locked;
            if (locked) mesh.material.color.setHex(locked);
        }
    }
    if (current) {
        for (let r = 0; r < current.shape.length; r++) {
            for (let c = 0; c < current.shape[r].length; c++) {
                if (!current.shape[r][c]) continue;
                const br = current.row + r, bc = current.col + c;
                if (br < 0 || br >= ROWS || bc < 0 || bc >= COLS) continue;
                const mesh = cellMeshes[br][bc];
                mesh.visible = true;
                mesh.material.color.setHex(current.color);
            }
        }
    }
}
```

- [ ] **Step 3: Wire gravity and rendering into the loop**

Replace the existing `tick`/start code at the bottom of the file:
```js
function tick() {
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
}
tick();
```
with:
```js
let lastDrop = 0;
const DROP_INTERVAL_MS = 800;

spawnPiece();

function tick(now) {
    if (current && now - lastDrop > DROP_INTERVAL_MS) {
        lastDrop = now;
        if (!collides(current.shape, current.row + 1, current.col)) {
            current.row += 1;
        } else {
            lockPiece();
            spawnPiece();
        }
    }
    render();
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
```

- [ ] **Step 4: Verify in the browser preview**

Reload, scroll to the Game section, watch for at least 15-20 seconds. Confirm via screenshots a few seconds apart: a colored piece (cyan/yellow/purple/green/red/blue/orange depending on random spawn) appears at the top-center of the board and visibly moves downward over time; when it reaches the bottom it stays in place (locked) and a new piece spawns above it. Confirm via `preview_eval` (`board.flat().some(c => c !== null)`, run after waiting for at least one piece to lock) that the board state actually records locked cells, not just visual placeholders. Confirm no console errors.

- [ ] **Step 5: Commit**

```bash
git add js/tetris.js
git commit -m "Add Tetris piece shapes, spawning, gravity, and cube-pool rendering"
```

---

## Task 7: Tetris — keyboard input (move, rotate, soft/hard drop)

**Files:**
- Modify: `js/tetris.js`

**Interfaces:**
- Consumes: `current`, `board`, `collides()`, `lockPiece()`, `spawnPiece()` from Task 6.
- Produces: `rotateShape(shape)` (used only internally in this task).

- [ ] **Step 1: Add the rotation helper**

In `js/tetris.js`, add near the other piece-related functions (after `lockPiece`, before the renderer section):

```js
function rotateShape(shape) {
    const rows = shape.length, cols = shape[0].length;
    const result = [];
    for (let c = 0; c < cols; c++) {
        const newRow = [];
        for (let r = rows - 1; r >= 0; r--) newRow.push(shape[r][c]);
        result.push(newRow);
    }
    return result;
}
```

- [ ] **Step 2: Add keyboard input handling**

Add this block right after the `rotateShape` function:

```js
function moveCurrent(dRow, dCol) {
    if (!current) return false;
    const newRow = current.row + dRow, newCol = current.col + dCol;
    if (collides(current.shape, newRow, newCol)) return false;
    current.row = newRow;
    current.col = newCol;
    return true;
}

function rotateCurrent() {
    if (!current) return;
    const rotated = rotateShape(current.shape);
    if (!collides(rotated, current.row, current.col)) {
        current.shape = rotated;
        return;
    }
    // simple wall-kick: try shifting one column left or right
    if (!collides(rotated, current.row, current.col - 1)) {
        current.shape = rotated;
        current.col -= 1;
    } else if (!collides(rotated, current.row, current.col + 1)) {
        current.shape = rotated;
        current.col += 1;
    }
}

function hardDrop() {
    if (!current) return;
    while (moveCurrent(1, 0)) { /* keep dropping */ }
    lockPiece();
    spawnPiece();
    lastDrop = performance.now();
}

document.addEventListener("keydown", function (e) {
    if (!current) return;
    if (e.key === "ArrowLeft") { moveCurrent(0, -1); e.preventDefault(); }
    else if (e.key === "ArrowRight") { moveCurrent(0, 1); e.preventDefault(); }
    else if (e.key === "ArrowDown") { moveCurrent(1, 0); e.preventDefault(); }
    else if (e.key === "ArrowUp") { rotateCurrent(); e.preventDefault(); }
    else if (e.key === " ") { hardDrop(); e.preventDefault(); }
});
```

`lastDrop` is the variable already declared in Task 6's `tick` setup (`let lastDrop = 0;`) — `hardDrop()` reuses it directly since it's in the same module scope, resetting the gravity timer so the next piece doesn't immediately auto-drop.

- [ ] **Step 3: Verify in the browser preview**

Reload, scroll to the Game section, and exercise each control: press ArrowLeft/ArrowRight and confirm the piece visibly shifts horizontally (and stops at the board edges without moving further); press ArrowUp and confirm the piece's shape visibly rotates; press ArrowDown a few times and confirm it drops faster than gravity alone; press Space and confirm it instantly slams to the bottom and locks, with a new piece spawning immediately. Confirm no console errors during any of this.

- [ ] **Step 4: Commit**

```bash
git add js/tetris.js
git commit -m "Add Tetris keyboard controls: move, rotate, soft drop, hard drop"
```

---

## Task 8: Tetris — line clear, scoring, level speed-up, game over

**Files:**
- Modify: `js/tetris.js`
- Modify: `index.html:#game` section (game-over overlay markup)
- Modify: `css/site.css`

**Interfaces:**
- Consumes: `board`, `ROWS`, `COLS`, `spawnPiece()`, `current` from Tasks 6–7.
- Produces: nothing consumed by later tasks (this is the last Tetris-logic task).

- [ ] **Step 1: Add the game-over overlay markup**

In `index.html`, inside `.tetris-stage` (after the `<canvas>` and HUD elements added in Task 5), add:

```html
            <div class="tetris-overlay" id="tetris-overlay">
                <p class="tetris-overlay-title">GAME OVER</p>
                <button class="tetris-restart" id="tetris-restart">RIGIOCA</button>
            </div>
```

So the full `.tetris-stage` block becomes:

```html
        <div class="tetris-stage">
            <canvas id="tetris-canvas"></canvas>
            <div class="tetris-hud" aria-hidden="true">
                <span id="tetris-score">SCORE 0</span>
                <span id="tetris-level">LVL 1</span>
            </div>
            <div class="tetris-overlay" id="tetris-overlay">
                <p class="tetris-overlay-title">GAME OVER</p>
                <button class="tetris-restart" id="tetris-restart">RIGIOCA</button>
            </div>
        </div>
```

- [ ] **Step 2: Style the overlay**

Add to `css/site.css`:

```css
.tetris-overlay {
    position: absolute;
    inset: 0;
    display: none;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    background: rgba(5, 5, 7, 0.85);
    backdrop-filter: blur(3px);
    z-index: 2;
}
.tetris-overlay.show { display: flex; }
.tetris-overlay-title {
    font-family: var(--font-display);
    font-weight: 700;
    font-size: 1.6rem;
    color: var(--white);
}
.tetris-restart {
    font-family: var(--font-mono);
    font-size: 0.85rem;
    letter-spacing: 0.12em;
    color: var(--bg);
    background: var(--accent);
    border: none;
    padding: 0.7rem 1.4rem;
    cursor: pointer;
}
.tetris-restart:hover { opacity: 0.85; }
```

- [ ] **Step 3: Add line-clear, scoring, and level logic**

In `js/tetris.js`, add this block right after `lockPiece()` (before `rotateShape`):

```js
let score = 0;
let level = 1;
const scoreEl = document.getElementById("tetris-score");
const levelEl = document.getElementById("tetris-level");

const LINE_SCORES = [0, 100, 300, 500, 800]; // indexed by lines cleared at once

function clearLines() {
    let cleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
        if (board[r].every(function (cell) { return cell !== null; })) {
            board.splice(r, 1);
            board.unshift(new Array(COLS).fill(null));
            cleared++;
            r++; // re-check this row index since rows shifted down
        }
    }
    if (cleared > 0) {
        score += LINE_SCORES[cleared] * level;
        level = 1 + Math.floor(score / 1000);
        scoreEl.textContent = "SCORE " + score;
        levelEl.textContent = "LVL " + level;
        dropInterval = Math.max(150, 800 - (level - 1) * 60);
    }
}
```

- [ ] **Step 4: Add game-over handling**

In `js/tetris.js`, find `spawnPiece()` (from Task 6) and replace its body's game-over branch:
```js
    if (collides(shape, 0, col)) {
        current = null; // game over, handled in Task 8
    }
```
with:
```js
    if (collides(shape, 0, col)) {
        current = null;
        gameOver = true;
        document.getElementById("tetris-overlay").classList.add("show");
    }
```

Then, still in `js/tetris.js`, add the supporting state and restart logic near the top-level `let current = null;` line (from Task 6):
```js
let current = null;
let gameOver = false;
```
(replace the single `let current = null;` line with both of the above two lines.)

Add the restart handler after the `clearLines` function:
```js
function resetGame() {
    for (let r = 0; r < ROWS; r++) board[r].fill(null);
    score = 0;
    level = 1;
    dropInterval = 800;
    scoreEl.textContent = "SCORE 0";
    levelEl.textContent = "LVL 1";
    gameOver = false;
    document.getElementById("tetris-overlay").classList.remove("show");
    spawnPiece();
}
document.getElementById("tetris-restart").addEventListener("click", resetGame);
```

- [ ] **Step 5: Wire `clearLines()`, `dropInterval`, and the game-over guard into the loop**

In `js/tetris.js`, change the gravity-tick declaration (from Task 6):
```js
let lastDrop = 0;
const DROP_INTERVAL_MS = 800;
```
to:
```js
let lastDrop = 0;
let dropInterval = 800;
```

Then update the `tick` function body — replace:
```js
function tick(now) {
    if (current && now - lastDrop > DROP_INTERVAL_MS) {
        lastDrop = now;
        if (!collides(current.shape, current.row + 1, current.col)) {
            current.row += 1;
        } else {
            lockPiece();
            spawnPiece();
        }
    }
    render();
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
}
```
with:
```js
function tick(now) {
    if (!gameOver && current && now - lastDrop > dropInterval) {
        lastDrop = now;
        if (!collides(current.shape, current.row + 1, current.col)) {
            current.row += 1;
        } else {
            lockPiece();
            clearLines();
            if (!gameOver) spawnPiece();
        }
    }
    render();
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
}
```

And in `hardDrop()` (Task 7), replace:
```js
function hardDrop() {
    if (!current) return;
    while (moveCurrent(1, 0)) { /* keep dropping */ }
    lockPiece();
    spawnPiece();
    lastDrop = performance.now();
}
```
with:
```js
function hardDrop() {
    if (!current || gameOver) return;
    while (moveCurrent(1, 0)) { /* keep dropping */ }
    lockPiece();
    clearLines();
    if (!gameOver) spawnPiece();
    lastDrop = performance.now();
}
```

Finally, guard the keyboard listener (Task 7) against input while game over — change:
```js
document.addEventListener("keydown", function (e) {
    if (!current) return;
```
to:
```js
document.addEventListener("keydown", function (e) {
    if (!current || gameOver) return;
```

- [ ] **Step 6: Verify in the browser preview**

Reload, scroll to the Game section. Play long enough to fill an entire row deliberately (use ArrowLeft/ArrowRight/hard-drop to line pieces up across the full width) and confirm: the row disappears, everything above shifts down one row, `#tetris-score` updates to a non-zero value, and after enough lines `#tetris-level` increments and pieces visibly fall faster. Then deliberately stack pieces to the top until a new piece can't spawn, and confirm the "GAME OVER" overlay appears with a "RIGIOCA" button; click it and confirm the board clears, score/level reset to 0/1, and play resumes normally. Confirm no console errors throughout.

- [ ] **Step 7: Commit**

```bash
git add index.html css/site.css js/tetris.js
git commit -m "Add Tetris line-clear, scoring, level speed-up, and game-over/restart flow"
```

---

## Task 9: Mobile touch controls for Tetris

**Files:**
- Modify: `index.html:#game` section
- Modify: `css/site.css`
- Modify: `js/tetris.js`

**Interfaces:**
- Consumes: `moveCurrent()`, `rotateCurrent()`, `hardDrop()` from Tasks 6–8.

- [ ] **Step 1: Add on-screen control buttons**

In `index.html`, inside `.game-inner`, right after the closing `</div>` of `.tetris-stage`, add:

```html
        <div class="tetris-touch-controls" id="tetris-touch-controls">
            <button class="tetris-btn" id="tt-left" aria-label="Sinistra">◀</button>
            <button class="tetris-btn" id="tt-rotate" aria-label="Ruota">⟳</button>
            <button class="tetris-btn" id="tt-right" aria-label="Destra">▶</button>
            <button class="tetris-btn" id="tt-drop" aria-label="Drop">⬇</button>
        </div>
```

- [ ] **Step 2: Style the controls (touch devices only)**

Add to `css/site.css`:

```css
.tetris-touch-controls {
    display: none;
    gap: 0.8rem;
    margin-top: 1rem;
}
.tetris-btn {
    width: 52px;
    height: 52px;
    border-radius: 50%;
    border: 1px solid var(--accent);
    background: rgba(155, 140, 255, 0.1);
    color: var(--white);
    font-size: 1.3rem;
    cursor: pointer;
}
.tetris-btn:active { background: var(--accent-glow); }

@media (pointer: coarse) {
    .tetris-touch-controls { display: flex; }
}
```

- [ ] **Step 3: Wire the buttons in `js/tetris.js`**

Add at the end of the file:

```js
const touchLeft = document.getElementById("tt-left");
const touchRight = document.getElementById("tt-right");
const touchRotate = document.getElementById("tt-rotate");
const touchDrop = document.getElementById("tt-drop");

if (touchLeft) touchLeft.addEventListener("click", function () { if (!gameOver) moveCurrent(0, -1); });
if (touchRight) touchRight.addEventListener("click", function () { if (!gameOver) moveCurrent(0, 1); });
if (touchRotate) touchRotate.addEventListener("click", function () { if (!gameOver) rotateCurrent(); });
if (touchDrop) touchDrop.addEventListener("click", function () { hardDrop(); });
```

- [ ] **Step 4: Verify in the browser preview**

Resize the preview to a mobile width (e.g. 390×844) and confirm the four round control buttons appear below the board (they should be hidden on the desktop-width screenshot taken in earlier tasks — confirm that's still true by also checking a desktop-width screenshot here). Tap/click each mobile button and confirm it performs the same action as its keyboard equivalent (left/right move, rotate, hard drop). Confirm no console errors.

- [ ] **Step 5: Commit**

```bash
git add index.html css/site.css js/tetris.js
git commit -m "Add on-screen touch controls for Tetris on coarse-pointer devices"
```

---

## Task 10: Full manual verification pass

**Files:** none (verification only)

- [ ] **Step 1: Desktop end-to-end**

Fresh reload at desktop width. Scroll through all three sections via mouse wheel and confirm: side-dot nav highlights the correct section throughout, About/Contact copy and styling match the spec, Game section's Tetris is playable start to finish (spawn → move/rotate → line clear → game over → restart), HUD score/level update correctly.

- [ ] **Step 2: Mobile end-to-end**

Resize to 390×844. Confirm no layout overlap between the side-dot nav and section content, confirm the Tetris touch controls work, confirm text remains legible at this width (check `clamp()` font sizes didn't shrink anything below a readable size).

- [ ] **Step 3: Console and network cleanliness**

Fresh reload, full console/network audit: zero errors, zero 404s (in particular confirm no requests for the deleted `js/race.js`, `js/hero-gl.js`, `js/main.js`, `css/landing.css`, and no `gsap`/GLTF/`.glb` requests — none of that should exist in this rebuild at all).

- [ ] **Step 4: Cross-check against the deleted old site**

Grep the repo for any leftover reference to the deleted files or old racing-theme strings that might have survived by accident:

```bash
grep -rn "race.js\|hero-gl.js\|landing.css\|PIT STOP\|STEBARTO GP\|build-fill\|build-pct" --include="*.html" --include="*.js" --include="*.css" .
```

Expected: no output (aside from this plan/spec documentation files under `docs/`, which are historical and fine to mention old names).

- [ ] **Step 5: Final commit**

If any fixes were needed during this pass, commit them individually with descriptive messages. If no fixes were needed, no commit is required for this task.
