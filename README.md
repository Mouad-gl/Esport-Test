# ⛏️ Cubeworld

A tiny **Minecraft-like 3D voxel sandbox** that runs entirely in the browser — no
build step, no backend. Walk around a procedurally generated world, **mine** and
**build** with blocks, **craft** tools and gear from a recipe tree, **tame**
wandering boars, and **fight** zombies at night for loot you feed back into crafting.

Built with [three.js](https://threejs.org) (vendored locally, so it works offline).

![voxel](https://img.shields.io/badge/engine-three.js%20r160-blue) ![nobuild](https://img.shields.io/badge/build-none-success)

## ▶️ Play

**Easiest — single file:** download [`cubeworld.html`](cubeworld.html) and just
**double-click it** to open in any modern browser. Everything (game code + the 3D
engine) is inlined into that one file, so it runs straight from `file://` with no
server and no internet. *(Rebuild it after changing the source with
`node tools/build-singlefile.mjs` — see below.)*

The game is also a static site under [`docs/`](docs/). Because that version uses ES
modules split across files, it must be served over HTTP (opening `docs/index.html`
from `file://` will not work).

**Locally:**
```bash
cd docs
python3 -m http.server 8000
# then open http://localhost:8000
```

**GitHub Pages:** enable Pages for this repo with source **“Deploy from a branch”**
→ branch with this code → **`/docs`** folder. It will be served at
`https://<user>.github.io/<repo>/`.

## 🎮 Controls

| Input | Action |
|-------|--------|
| **W A S D** | Move |
| **Space** | Jump / swim up |
| **Shift** | Sprint |
| **Mouse** | Look around |
| **Left click** (hold) | Mine the targeted block / attack a mob in front |
| **Right click** | Place the held block · or **feed & tame** an animal you're aiming at |
| **1–9 / scroll** | Select hotbar slot |
| **E** | Open / close crafting |
| **F** | Eat the held food |
| **Esc** | Release the mouse |

## 🌟 Features

- **Procedural world** — seeded value-noise terrain with hills, beaches, lakes/oceans,
  trees, and underground **coal** & **iron** ore. Day/night cycle.
- **Mine & build** — face-culled chunk meshing with ambient occlusion. Break blocks
  (speed depends on your tool) and place them back anywhere.
- **Crafting tree** — punch a tree → planks → sticks → wood tools → mine stone →
  stone tools → mine iron → iron tools, plus glass, lanterns, cooked food and armor.
  Tool tiers gate what you can harvest (e.g. iron ore needs a stone pickaxe).
- **Mobs & loot**
  - 🐗 **Boars** — passive; right-click with food (apple/wheat) to **tame** one so it
    follows you. Kill any boar for **leather** (→ armor) and **raw meat** (→ cook it).
  - 🧟 **Zombies** — spawn at night, chase and hit you, and burn in daylight. Defeat
    them for **rotten flesh** and the occasional **iron**.
  - Drops pop out as collectible items you walk over.
- **Survival** — hearts + hunger, fall/void/starvation damage, leather armor reduces
  hits, eat food to heal, respawn on death.

## 📁 Structure

```
docs/
├── index.html          # entry point + import map
├── styles.css          # HUD / menus
├── vendor/
│   └── three.module.js # vendored three.js r160 (MIT)
└── js/
    ├── main.js         # bootstrap, game loop, input, mining/placing/combat
    ├── world.js        # voxel storage, terrain gen, meshing, raycast
    ├── player.js       # first-person controller, AABB physics, stats
    ├── mobs.js         # boar/zombie AI, taming, combat, item drops
    ├── inventory.js    # slots, hotbar, stacking
    ├── registry.js     # blocks, items, tools, crafting recipes
    ├── textures.js     # procedural pixel-art texture atlas
    ├── ui.js           # hotbar, hearts/hunger, crafting screen, toasts
    └── noise.js        # seeded fractal value noise
```

## 🛠️ Tech notes

- **No dependencies to install** and **no bundler** — just static files and an
  `<script type="importmap">` pointing at the local `three.module.js`.
- Rendering uses one merged mesh per chunk (only visible faces are emitted) with
  three passes: opaque, alpha-tested foliage/glass, and translucent water.

three.js is included under its MIT license — see `docs/vendor/three-LICENSE.txt`.
