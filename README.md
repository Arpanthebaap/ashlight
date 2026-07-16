# ASHLIGHT — Operation Lastlight

**Stellar Hack — Round 2 Submission**
**Team:** Moho Maya
**Members:** Arpan Ghosh (Lead) · Asmita Karmakar
**Theme:** Cosmic Frontiers (Space)

> *"In the last light of dying stars, someone has to keep the way open."*

Station Ashlight-7 orbits a dying star, Ember Vel. A Driftfleet of 3 refugee ships is inbound through the Wayline corridor. As the Lightkeeper, you allocate the station's last reserves of power across **Beacon**, **Shield**, and **Stabilizer**, track the convoy on a live starmap, and respond to real-time distress signals, stellar flares, and debris fields — before Ember Vel's Luminance runs out.

## Live Demo

**Deployed link:** _[add your live URL here after deploying — see below]_

## Screens & Modules

| Module | What it does |
|---|---|
| **Boot Screen** | A Three.js hero star — faceted, glowing, orbited by drifting ember particles — sets the tone before the mission even starts. Falls back gracefully to a 2D SVG version if WebGL/ES modules aren't available. |
| **Header** | Station status, a continuously-pulsing star that visibly dims as Luminance falls, mission clock |
| **Power Allocation** | Three dials (Beacon / Shield / Stabilizer) drawing from a shared 100% power pool, with GSAP-animated smooth fills |
| **Wayline Starmap** | Live radar view — ships move with continuous GSAP-tweened motion between ticks instead of snapping, and spiral from the outer ring toward the station as they make progress |
| **Comms & Log** | Color-coded event feed plus the "Lightkeeper's Log" — new entries animate in with a stagger, older entries stay put |
| **Convoy Status Cards** | Per-ship progress, hull integrity, and status (Nominal / Warning / Distress / Through) |
| **Decision Modal** | Branching two-choice events with a GSAP elastic entrance and a proper exit animation, plus a live countdown — no response auto-resolves to the riskier option |
| **Screen Feedback** | A subtle screen-shake + red vignette pulse on stellar flares and when Luminance first crosses the critical threshold |

## Why It's Built This Way

Every system, ship, and event type lives in a config object at the top of `script.js` (`SYSTEMS`, `SHIP_NAMES`, `EVENT_TYPES`). The simulation loop reads from these configs rather than hardcoding behavior — so a new power system, a new ship class, or a brand-new event type can be added as **data**, not a rebuild.

All GSAP tweens respect `prefers-reduced-motion` — if a judge's or user's system has that set, animations fall back to instant state changes automatically, no separate code path to maintain.

## Tech Stack

- **HTML / CSS / JavaScript** — no build step, no bundler, no framework overhead for the core app
- **GSAP** (`vendor/gsap.min.js`) — smooth ship movement, power dial fills, modal/end-screen entrances and exits, event feed stagger, screen-shake feedback
- **Three.js** (`vendor/three.module.min.js` + `vendor/three.core.min.js`) — the boot screen's hero star, loaded as a native ES module (`boot-star.js`), no bundler required
- Both libraries are vendored locally rather than pulled from a CDN, so the deployed site has zero external runtime dependencies and zero risk of a CDN outage during judging
- Fonts: Orbitron (display), Rajdhani (body), Share Tech Mono (data/log) via Google Fonts

## Running Locally

**Important:** `index.html`, `style.css`, `script.js`, `boot-star.js`, and the `vendor/` folder must all stay together in the same directory structure — the page loads several of these as separate files by relative path, and `boot-star.js` specifically requires being served over `http://` or `https://` (a browser security restriction on ES module scripts blocks them under `file://`, regardless of what's in the folder).

For the full experience including the 3D boot star:
```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

For a quick look with zero setup (no server, open directly from anywhere), use `ashlight-standalone.html` instead. It's the same dashboard and the same GSAP-powered gameplay, bundled into one file — the only difference is the boot star renders as its 2D SVG version rather than the 3D one, since the 3D star's module script can't run under `file://` no matter how it's packaged. Every actual game mechanic is identical between the two.

## Deploying (pick one — all are free and take under 2 minutes)

**Netlify (drag-and-drop, fastest):**
1. Go to [app.netlify.com/drop](https://app.netlify.com/drop)
2. Drag the whole `ashlight-dashboard` folder onto the page
3. Copy the live URL it gives you into this README and your submission form

**Vercel:**
1. `npm i -g vercel` (one-time)
2. From inside the project folder: `vercel --prod`
3. Follow the prompts — no config needed for a static site

**GitHub Pages:**
1. Push this folder to a public GitHub repo
2. Repo → Settings → Pages → Deploy from branch → `main` → `/ (root)`
3. Your live link will be `https://<username>.github.io/<repo-name>/`

## Pushing to GitHub

```bash
cd ashlight-dashboard
git init
git add .
git commit -m "ASHLIGHT — Operation Lastlight, Round 2 submission"
git branch -M main
git remote add origin <your-empty-repo-url>
git push -u origin main
```

## Evolution Challenge Readiness

If the surprise Evolution Challenge introduces a new mechanic, the fastest path is almost always:
1. Add a new entry to `SYSTEMS`, `SHIP_NAMES`, or `EVENT_TYPES` in `script.js`
2. If it's a wholly new panel, copy the pattern of an existing `.panel` block in `index.html`/`style.css`

No part of the simulation loop needs to change for additive content.

---

*Built during Stellar Hack: The Vibe-a-thon, 15–16 July 2026.*
