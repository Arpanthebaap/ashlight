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
| **Header** | Station status, animated Ember Vel star that visibly dims as Luminance falls, mission clock |
| **Power Allocation** | Three dials (Beacon / Shield / Stabilizer) drawing from a shared 100% power pool |
| **Wayline Starmap** | Live radar view — ships spiral from the outer ring toward the station as they make progress |
| **Comms & Log** | Color-coded event feed plus the "Lightkeeper's Log" — short narrative lines that react to your choices |
| **Convoy Status Cards** | Per-ship progress, hull integrity, and status (Nominal / Warning / Distress / Through) |
| **Decision Modal** | Branching two-choice events (distress signals, flares, debris) with a live countdown — no response auto-resolves to the riskier option |

## Why It's Built This Way

Every system, ship, and event type lives in a config object at the top of `script.js` (`SYSTEMS`, `SHIP_NAMES`, `EVENT_TYPES`). The simulation loop reads from these configs rather than hardcoding behavior — so a new power system, a new ship class, or a brand-new event type can be added as **data**, not a rebuild. This was a deliberate choice going into Round 2 with the Evolution Challenge in mind.

## Tech Stack

Plain **HTML / CSS / JavaScript** — no build step, no dependencies, no framework overhead. Chosen deliberately: it keeps the entire simulation inspectable in one file, deploys instantly to any static host, and removes any risk of a build failing at demo time.

- `index.html` — structure
- `style.css` — full design system (tokens, layout, animation)
- `script.js` — game state, simulation loop, rendering
- Fonts: Orbitron (display), Rajdhani (body), Share Tech Mono (data/log) via Google Fonts

## Running Locally

**Important:** `index.html`, `style.css`, and `script.js` must stay together in the same folder — the page loads the CSS and JS as separate files by relative path. If you only have `index.html` on its own (for example, a single file downloaded outside its folder), it will load unstyled. For that situation, use `ashlight-standalone.html` instead — it's the identical dashboard with everything inlined into one file, safe to open on its own from anywhere.

No install required either way. From the project folder:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

Or just open `index.html` directly in a browser (as long as `style.css` and `script.js` are still next to it) — no server dependency at all.

---

*Built during Stellar Hack: The Vibe-a-thon, 15–16 July 2026.*
