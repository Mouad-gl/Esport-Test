import * as THREE from 'three';
import { World, W, H } from './world.js';
import { Player } from './player.js';
import { Inventory } from './inventory.js';
import { MobManager } from './mobs.js';
import { UI } from './ui.js';
import { BLOCKS, AIR, getBlock, getItem } from './registry.js';

const DAY_LENGTH = 200; // seconds for a full cycle
const DAY_SKY = new THREE.Color(0x87b9e6);
const NIGHT_SKY = new THREE.Color(0x0a0e1c);

class Game {
  constructor() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    document.body.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = DAY_SKY.clone();
    this.scene.fog = new THREE.Fog(DAY_SKY.clone(), 40, 110);

    this.camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 1000);

    this.hemi = new THREE.HemisphereLight(0xbfd6ff, 0x5a6b4a, 0.85);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xfff3d6, 1.0);
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);
    this.ambient = new THREE.AmbientLight(0xffffff, 0.25);
    this.scene.add(this.ambient);

    this.world = new World(0x1234 ^ (Date.now() & 0xffff));
    this.player = new Player(this.world);
    this.inventory = new Inventory();
    this.inventory.onChange = () => this.ui && this.ui.updateHotbar(this.inventory);
    this.mobs = new MobManager(this.world, this.scene);
    this.mobs.toast = (m) => this.ui.toast(m);

    this.ui = new UI(this);

    // block selection highlight
    const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.001, 1.001, 1.001));
    this.highlight = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.5 }));
    this.highlight.visible = false;
    this.scene.add(this.highlight);

    // overlays
    this.hurtEl = this.makeOverlay('radial-gradient(circle, transparent 35%, rgba(190,0,0,.55))');
    this.waterEl = this.makeOverlay('rgba(30,90,170,.35)');

    this.input = { forward: false, back: false, left: false, right: false, jump: false, sprint: false };
    this.locked = false;
    this.leftHeld = false;
    this.swingCd = 0;
    this.mineTarget = null;
    this.mineProgress = 0;
    this.timeOfDay = 0.28; // start mid-morning
    this.clock = new THREE.Clock();

    this.bindEvents();
  }

  makeOverlay(bg) {
    const d = document.createElement('div');
    d.style.cssText = `position:fixed;inset:0;pointer-events:none;z-index:15;opacity:0;transition:opacity .15s;background:${bg};`;
    document.body.appendChild(d);
    return d;
  }

  async start(onProgress) {
    this.world.generate();
    await this.world.buildAll(onProgress);
    this.scene.add(this.world.group);
    this.spawnPoint = this.world.findSpawn(W / 2, W / 2);
    this.player.spawnOn(this.spawnPoint[0], this.spawnPoint[1]);
    this.ui.updateHotbar(this.inventory);
    this.ui.updateStats(this.player);
  }

  // ---------------- events ----------------
  bindEvents() {
    addEventListener('resize', () => {
      this.camera.aspect = innerWidth / innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(innerWidth, innerHeight);
    });

    const canvas = this.renderer.domElement;
    canvas.addEventListener('mousedown', (e) => {
      if (!this.locked) return;
      if (e.button === 0) this.leftHeld = true;
      if (e.button === 2) this.useRight();
    });
    addEventListener('mouseup', (e) => { if (e.button === 0) { this.leftHeld = false; this.resetMine(); } });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    addEventListener('mousemove', (e) => {
      if (!this.locked) return;
      this.player.applyLook(e.movementX || 0, e.movementY || 0);
    });
    addEventListener('wheel', (e) => {
      if (!this.locked) return;
      this.inventory.scroll(e.deltaY);
    }, { passive: true });

    addEventListener('keydown', (e) => this.onKey(e, true));
    addEventListener('keyup', (e) => this.onKey(e, false));

    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === canvas;
      if (!this.locked) { this.clearInput(); this.leftHeld = false; }
    });
  }

  onKey(e, down) {
    switch (e.code) {
      case 'KeyW': this.input.forward = down; break;
      case 'KeyS': this.input.back = down; break;
      case 'KeyA': this.input.left = down; break;
      case 'KeyD': this.input.right = down; break;
      case 'Space': this.input.jump = down; break;
      case 'ShiftLeft': case 'ShiftRight': this.input.sprint = down; break;
      case 'KeyE':
        if (down) { this.ui.toggleCraft(); }
        break;
      case 'KeyF':
        if (down) this.eat();
        break;
      default:
        if (down && e.code.startsWith('Digit')) {
          const n = parseInt(e.code.slice(5), 10);
          if (n >= 1 && n <= 9) this.inventory.select(n - 1);
        }
    }
  }

  clearInput() { for (const k of Object.keys(this.input)) this.input[k] = false; }

  requestLock() { this.renderer.domElement.requestPointerLock(); }

  onCraftOpen() { if (document.pointerLockElement) document.exitPointerLock(); this.clearInput(); this.leftHeld = false; }
  onCraftClose() { this.requestLock(); }

  // ---------------- gameplay actions ----------------
  selectedTool() {
    const s = this.inventory.getSelected();
    if (s) { const it = getItem(s.item); if (it && it.type === 'tool') return it; }
    return null;
  }

  breakTime(block, tool) {
    if (!isFinite(block.hardness)) return Infinity;
    let t = block.hardness * 0.55 + 0.15;
    const good = tool && block.mineKind && tool.kind === block.mineKind && tool.tier >= (block.tier || 1);
    if (good) t /= (1 + tool.tier * 1.6);
    else if (block.requiresTool) t *= 3.2;
    else if (tool && block.mineKind && tool.kind === block.mineKind) t /= (1 + tool.tier * 0.8);
    return t;
  }

  canDrop(block, tool) {
    if (!block.requiresTool) return true;
    return !!(tool && tool.kind === block.mineKind && tool.tier >= (block.tier || 1));
  }

  mineBlock(dt) {
    const hit = this.world.raycast(this.player.eyePosition(), this.player.getForward(), 6);
    if (!hit) { this.resetMine(); this.highlight.visible = false; return; }
    const block = BLOCKS[hit.block];
    this.highlight.visible = true;
    this.highlight.position.set(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5);

    if (!isFinite(block.hardness)) { this.mineProgress = 0; return; } // bedrock/water

    const key = `${hit.x},${hit.y},${hit.z}`;
    if (this.mineTarget !== key) { this.mineTarget = key; this.mineProgress = 0; }
    const tool = this.selectedTool();
    const need = this.breakTime(block, tool);
    this.mineProgress += dt;
    const frac = Math.min(1, this.mineProgress / need);
    this.highlight.material.color.setRGB(frac, 1 - frac, 0);

    if (this.mineProgress >= need) {
      this.breakAt(hit.x, hit.y, hit.z, block, tool);
      this.resetMine();
    }
  }

  resetMine() { this.mineTarget = null; this.mineProgress = 0; this.highlight.material.color.setHex(0x000000); }

  breakAt(x, y, z, block, tool) {
    this.world.setBlock(x, y, z, AIR);
    // drops
    const drops = [];
    if (block.dropTable) {
      for (const d of block.dropTable) if (Math.random() < d.chance) drops.push([d.item, 1]);
    } else if (block.drop && this.canDrop(block, tool)) {
      drops.push([block.drop, 1]);
    }
    for (const [item, n] of drops) {
      this.inventory.add(item, n);
      this.ui.toast(`+${n} ${getItem(item).label}`);
    }
    if (drops.length === 0 && block.requiresTool && !this.canDrop(block, tool)) {
      this.ui.toast(`Need a ${block.mineKind} to collect ${block.label}`);
    }
  }

  useRight() {
    const sel = this.inventory.getSelected();
    const eye = this.player.eyePosition();
    const fwd = this.player.getForward();

    // feeding/taming a boar takes priority when holding food
    if (sel && getItem(sel.item)?.type === 'food') {
      const aim = this.mobs.aimMob(eye, fwd);
      if (aim && aim.type === 'boar') {
        const res = this.mobs.feedNearest(eye, fwd, 0);
        this.inventory.consumeSelected();
        if (res && res.tamed) this.ui.toast('🐗 Boar tamed! It will follow you.');
        else this.ui.toast('The boar munches happily…');
        return;
      }
    }

    // place a block
    if (sel && getItem(sel.item)?.type === 'block') {
      const hit = this.world.raycast(eye, fwd, 6);
      if (!hit) return;
      const px = hit.x + hit.nx, py = hit.y + hit.ny, pz = hit.z + hit.nz;
      if (this.world.getBlock(px, py, pz) !== AIR) return;
      if (this.collidesPlayer(px, py, pz)) return;
      const blockId = getItem(sel.item).place;
      this.world.setBlock(px, py, pz, blockId);
      this.inventory.consumeSelected();
    }
  }

  collidesPlayer(x, y, z) {
    const p = this.player.pos;
    const minX = p.x - 0.3, maxX = p.x + 0.3, minY = p.y, maxY = p.y + 1.8, minZ = p.z - 0.3, maxZ = p.z + 0.3;
    return (x + 1 > minX && x < maxX && y + 1 > minY && y < maxY && z + 1 > minZ && z < maxZ);
  }

  eat() {
    const sel = this.inventory.getSelected();
    if (!sel) return;
    const it = getItem(sel.item);
    if (!it || it.type !== 'food') { this.ui.toast('Hold food to eat (or aim at an animal + right-click to feed it)'); return; }
    if (this.player.hunger >= this.player.maxHunger && this.player.health >= this.player.maxHealth) { this.ui.toast('Not hungry right now'); return; }
    this.player.heal(it.heal || 0);
    this.player.feed(it.hunger || 0);
    this.inventory.consumeSelected();
    this.ui.toast(`Ate ${it.label}`);
  }

  tryCraft(recipe) {
    if (!this.inventory.consume(recipe.in)) return false;
    this.inventory.add(recipe.out.item, recipe.out.count);
    this.ui.toast(`Crafted ${getItem(recipe.out.item).label}${recipe.out.count > 1 ? ' ×' + recipe.out.count : ''}`);
    return true;
  }

  // ---------------- day/night ----------------
  updateSky() {
    const ang = this.timeOfDay * Math.PI * 2;
    const sunHeight = Math.sin(ang);           // -1..1
    const daylight = THREE.MathUtils.clamp((sunHeight + 0.25) / 1.0, 0, 1);
    this.night = 1 - THREE.MathUtils.smoothstep(daylight, 0.0, 0.35);

    const sky = NIGHT_SKY.clone().lerp(DAY_SKY, daylight);
    this.scene.background.copy(sky);
    this.scene.fog.color.copy(sky);

    this.sun.intensity = 0.15 + daylight * 0.95;
    this.hemi.intensity = 0.25 + daylight * 0.7;
    this.ambient.intensity = 0.18 + daylight * 0.15;

    const cx = this.player.pos.x, cz = this.player.pos.z;
    this.sun.position.set(cx + Math.cos(ang) * 60, 30 + sunHeight * 60, cz + Math.sin(ang) * 30);
    this.sun.target.position.set(cx, 0, cz);
  }

  // ---------------- loop ----------------
  loop() {
    requestAnimationFrame(() => this.loop());
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const paused = this.ui.isCraftOpen() || !this.started;

    this.timeOfDay = (this.timeOfDay + dt / DAY_LENGTH) % 1;
    this.updateSky();

    if (!paused && !this.player.dead) {
      this.player.update(dt, this.input);

      // mining / attacking with left hold
      if (this.leftHeld && this.locked) {
        const eye = this.player.eyePosition(), fwd = this.player.getForward();
        const aim = this.mobs.aimMob(eye, fwd);
        if (aim) {
          this.resetMine(); this.highlight.visible = false;
          this.swingCd -= dt;
          if (this.swingCd <= 0) {
            const dmg = this.selectedTool()?.attack || 1;
            const r = this.mobs.attack(eye, fwd, dmg);
            this.swingCd = 0.45;
            if (r && r.died) this.ui.toast(`Defeated ${r.mob.type === 'boar' ? 'Boar' : 'Zombie'}`);
          }
        } else {
          this.mineBlock(dt);
        }
      } else if (this.locked) {
        // show highlight where looking
        const hit = this.world.raycast(this.player.eyePosition(), this.player.getForward(), 6);
        if (hit) { this.highlight.visible = true; this.highlight.position.set(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5); }
        else this.highlight.visible = false;
      }

      const ctx = {
        player: this.player, inventory: this.inventory, night: this.night,
        onPickup: (item, n) => this.ui.toast(`+${n} ${getItem(item).label}`),
        onPlayerHurt: () => this.flashHurt(),
      };
      this.mobs.update(dt, ctx);
      this.mobs.updateParticles(dt);
    }

    // camera follows player eye
    const eye = this.player.eyePosition();
    this.camera.position.copy(eye);
    this.camera.rotation.set(this.player.pitch, this.player.yaw, 0, 'YXZ');

    // overlays
    this.hurtEl.style.opacity = this.player._hurtFlash > 0 ? Math.min(1, this.player._hurtFlash * 2) : 0;
    this.waterEl.style.opacity = this.player.inWater ? 1 : 0;

    if (this.player.dead && !this._deathShown) this.onDeath();

    this.ui.updateStats(this.player);
    this.renderer.render(this.scene, this.camera);
  }

  flashHurt() { this.player._hurtFlash = Math.max(this.player._hurtFlash, 0.3); }

  onDeath() {
    this._deathShown = true;
    if (document.pointerLockElement) document.exitPointerLock();
    document.getElementById('deathMsg').textContent = `Killed by ${this.player.deathCause || 'the world'}.`;
    document.getElementById('deathScreen').classList.remove('hidden');
  }

  respawn() {
    this.player.dead = false;
    this._deathShown = false;
    this.player.health = this.player.maxHealth;
    this.player.hunger = this.player.maxHunger;
    const [sx, sz] = this.spawnPoint || [Math.floor(W / 2), Math.floor(W / 2)];
    this.player.spawnOn(sx, sz);
    document.getElementById('deathScreen').classList.add('hidden');
    this.requestLock();
  }
}

// ---------------- bootstrap ----------------
const game = new Game();
window._game = game;

const playBtn = document.getElementById('playBtn');
const loadFill = document.getElementById('loadbar-fill');
const loadText = document.getElementById('loadtext');

game.start((p) => {
  loadFill.style.width = Math.round(p * 100) + '%';
}).then(() => {
  loadText.textContent = 'Ready!';
  playBtn.disabled = false;
  playBtn.textContent = 'Click to Play';
});

function enterGame() {
  document.getElementById('overlay').classList.add('hidden');
  document.getElementById('hud').classList.remove('hidden');
  game.started = true;
  game.requestLock();
  game.ui.toast('Punch a tree to get wood — then press E to craft!');
}
playBtn.addEventListener('click', () => { if (!playBtn.disabled) enterGame(); });
document.getElementById('respawnBtn').addEventListener('click', () => game.respawn());

game.loop();
