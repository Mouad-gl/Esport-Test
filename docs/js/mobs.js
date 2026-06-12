import * as THREE from 'three';
import { getItem } from './registry.js';
import { W } from './world.js';

const G = 22;

function box(w, h, d, color) {
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color }));
}

function makeHealthBar() {
  const cv = document.createElement('canvas');
  cv.width = 48; cv.height = 8;
  const tex = new THREE.CanvasTexture(cv);
  tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter;
  const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true });
  const sp = new THREE.Sprite(mat);
  sp.scale.set(1.0, 0.16, 1);
  sp.center.set(0.5, 0);
  sp.visible = false;
  sp.userData = { cv, tex };
  return sp;
}
function drawHealthBar(sp, frac, tamed) {
  const { cv, tex } = sp.userData;
  const ctx = cv.getContext('2d');
  ctx.clearRect(0, 0, 48, 8);
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 48, 8);
  ctx.fillStyle = tamed ? '#ff6fae' : (frac > 0.5 ? '#5ad65a' : frac > 0.25 ? '#e0c040' : '#e05050');
  ctx.fillRect(1, 1, Math.max(0, Math.round(46 * frac)), 6);
  tex.needsUpdate = true;
}

// ---------------------------------------------------------------------------
class Mob {
  constructor(type, x, y, z) {
    this.type = type;
    this.pos = new THREE.Vector3(x, y, z);
    this.vel = new THREE.Vector3();
    this.onGround = false;
    this.dir = Math.random() * Math.PI * 2;
    this.wanderT = 0;
    this.attackCd = 0;
    this.dead = false;
    this.tamed = false;
    this.tameProgress = 0;
    this.flash = 0;
    this.bob = Math.random() * 6;

    const cfg = MOB_CFG[type];
    this.maxHealth = cfg.health;
    this.health = cfg.health;
    this.height = cfg.height;
    this.group = cfg.build();
    this.group.position.copy(this.pos);

    this.bar = makeHealthBar();
    this.bar.position.set(0, this.height + 0.35, 0);
    this.group.add(this.bar);
  }

  faceDir(angle) { this.group.rotation.y = angle; }

  hit(dmg, dir) {
    this.health -= dmg;
    this.flash = 0.18;
    this.bar.visible = true;
    this._barT = 3;
    drawHealthBar(this.bar, Math.max(0, this.health) / this.maxHealth, this.tamed);
    if (dir) { this.vel.x += dir.x * 6; this.vel.z += dir.z * 6; this.vel.y = 4.5; }
    if (this.type === 'boar') { this.fleeT = 4; this.tameProgress = Math.max(0, this.tameProgress - 1); }
    if (this.health <= 0) { this.dead = true; return true; }
    return false;
  }
}

const MOB_CFG = {
  boar: {
    health: 8, height: 0.85, speed: 1.7, sight: 0,
    build() {
      const g = new THREE.Group();
      const body = box(1.0, 0.62, 0.6, 0x9c6b43); body.position.y = 0.5; g.add(body);
      const head = box(0.5, 0.5, 0.5, 0xa9774d); head.position.set(0, 0.55, 0.5); g.add(head);
      const snout = box(0.22, 0.2, 0.16, 0xc98e9a); snout.position.set(0, 0.5, 0.78); g.add(snout);
      const tuskL = box(0.05, 0.12, 0.05, 0xffffff); tuskL.position.set(-0.12, 0.44, 0.74); g.add(tuskL);
      const tuskR = tuskL.clone(); tuskR.position.x = 0.12; g.add(tuskR);
      for (const [sx, sz] of [[-0.34, 0.22], [0.34, 0.22], [-0.34, -0.22], [0.34, -0.22]]) {
        const leg = box(0.18, 0.4, 0.18, 0x6f4a2c); leg.position.set(sx, 0.2, sz); g.add(leg);
      }
      return g;
    },
  },
  zombie: {
    health: 14, height: 1.8, speed: 2.5, sight: 16,
    build() {
      const g = new THREE.Group();
      const legs = box(0.5, 0.8, 0.3, 0x274a6b); legs.position.y = 0.4; g.add(legs);
      const body = box(0.55, 0.7, 0.32, 0x4f7a3a); body.position.y = 1.15; g.add(body);
      const head = box(0.46, 0.46, 0.46, 0x6aa24a); head.position.y = 1.73; g.add(head);
      const arms = box(0.9, 0.22, 0.24, 0x6aa24a); arms.position.set(0, 1.35, 0.28); g.add(arms);
      g.userData.arms = arms; g.userData.head = head;
      return g;
    },
  },
};

// ---------------------------------------------------------------------------
class ItemDrop {
  constructor(item, count, x, y, z) {
    this.item = item; this.count = count;
    this.pos = new THREE.Vector3(x, y, z);
    this.vel = new THREE.Vector3((Math.random() - 0.5) * 2, 3, (Math.random() - 0.5) * 2);
    this.age = 0;
    const col = getItem(item)?.icon.c || '#fff';
    this.mesh = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), new THREE.MeshLambertMaterial({ color: col, emissive: col, emissiveIntensity: 0.25 }));
    this.mesh.position.copy(this.pos);
  }
}

export class MobManager {
  constructor(world, scene) {
    this.world = world;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.mobs = [];
    this.drops = [];
    this.spawnT = 2;
    this.toast = () => {};
  }

  groundY(x, z) { return this.world.highestSolidY(Math.floor(x), Math.floor(z)) + 1; }

  spawn(type, x, z) {
    const y = this.groundY(x, z);
    if (y < 1) return null;
    const m = new Mob(type, x + 0.0, y, z + 0.0);
    this.mobs.push(m);
    this.group.add(m.group);
    return m;
  }

  spawnDrop(item, count, x, y, z) {
    const d = new ItemDrop(item, count, x, y, z);
    this.drops.push(d);
    this.group.add(d.mesh);
  }

  countType(t) { let n = 0; for (const m of this.mobs) if (m.type === t && !m.dead) n++; return n; }

  trySpawn(ctx, dt) {
    this.spawnT -= dt;
    if (this.spawnT > 0) return;
    this.spawnT = 3;
    const p = ctx.player.pos;
    const place = () => {
      const a = Math.random() * Math.PI * 2;
      const d = 16 + Math.random() * 18;
      const x = THREE.MathUtils.clamp(Math.floor(p.x + Math.cos(a) * d), 2, W - 3);
      const z = THREE.MathUtils.clamp(Math.floor(p.z + Math.sin(a) * d), 2, W - 3);
      return [x, z];
    };
    // boars (daytime friendly cap)
    if (this.countType('boar') < 6) {
      const [x, z] = place();
      const gy = this.groundY(x, z);
      if (gy > 0 && this.world.getBlock(x, gy - 1, z) === 1) this.spawn('boar', x, z);
    }
    // zombies at night
    if (ctx.night > 0.55 && this.countType('zombie') < 8) {
      const [x, z] = place();
      const gy = this.groundY(x, z);
      if (gy > 0) this.spawn('zombie', x, z);
    }
  }

  update(dt, ctx) {
    this.trySpawn(ctx, dt);
    const player = ctx.player;

    for (const m of this.mobs) {
      if (m.dead) continue;
      this.updateMob(m, dt, ctx);
    }
    // cleanup dead
    for (let i = this.mobs.length - 1; i >= 0; i--) {
      const m = this.mobs[i];
      if (m.dead && m._removed) { this.mobs.splice(i, 1); }
    }
    this.updateDrops(dt, ctx);

    // face health bars / flashes already handled per-mob; orient bars to camera handled by Sprite
  }

  updateMob(m, dt, ctx) {
    const cfg = MOB_CFG[m.type];
    const player = ctx.player;
    const toPlayer = new THREE.Vector3().subVectors(player.pos, m.pos);
    const dist = toPlayer.length();

    // ---- AI ----
    let wishX = 0, wishZ = 0, speed = cfg.speed;
    if (m.type === 'zombie') {
      // burn in daylight (thin them out)
      if (ctx.night < 0.35) { m.health -= dt * 1.5; if (m.health <= 0) { this.killMob(m, false); return; } }
      if (dist < cfg.sight) {
        const dirxz = new THREE.Vector3(toPlayer.x, 0, toPlayer.z).normalize();
        wishX = dirxz.x; wishZ = dirxz.z;
        m.faceDir(Math.atan2(dirxz.x, dirxz.z));
        if (dist < 1.6) {
          m.attackCd -= dt;
          if (m.attackCd <= 0) { m.attackCd = 1; player.damage(3, 'a zombie'); ctx.onPlayerHurt && ctx.onPlayerHurt(); }
        }
        // arm swing
        if (m.group.userData.arms) m.group.userData.arms.rotation.x = Math.sin(performance.now() / 120) * 0.5;
      } else {
        this.wander(m, dt);
        wishX = Math.sin(m.dir); wishZ = Math.cos(m.dir); speed = cfg.speed * 0.4;
      }
    } else { // boar
      if (m.fleeT > 0) {
        m.fleeT -= dt;
        const away = new THREE.Vector3(-toPlayer.x, 0, -toPlayer.z).normalize();
        wishX = away.x; wishZ = away.z; speed = 4.2;
        m.faceDir(Math.atan2(away.x, away.z));
      } else if (m.tamed && dist > 5) {
        const dirxz = new THREE.Vector3(toPlayer.x, 0, toPlayer.z).normalize();
        wishX = dirxz.x; wishZ = dirxz.z; speed = 3.4;
        m.faceDir(Math.atan2(dirxz.x, dirxz.z));
      } else {
        this.wander(m, dt);
        wishX = Math.sin(m.dir); wishZ = Math.cos(m.dir); speed = cfg.speed;
        if (m.idle) { wishX = 0; wishZ = 0; }
      }
    }

    // ---- physics ----
    m.vel.y -= G * dt;
    // horizontal proposed
    let nx = m.pos.x + (wishX * speed + m.vel.x) * dt;
    let nz = m.pos.z + (wishZ * speed + m.vel.z) * dt;
    m.vel.x *= 0.8; m.vel.z *= 0.8; // damp knockback

    const curGround = this.groundY(m.pos.x, m.pos.z);
    const newGround = this.groundY(nx, nz);
    if (newGround - curGround <= 1.1) {
      m.pos.x = THREE.MathUtils.clamp(nx, 1, W - 2);
      m.pos.z = THREE.MathUtils.clamp(nz, 1, W - 2);
      if (newGround > curGround && m.onGround) m.pos.y = newGround;
    } else {
      m.dir += 2.2 * dt; // turn away from wall
    }

    m.pos.y += m.vel.y * dt;
    const gy = this.groundY(m.pos.x, m.pos.z);
    if (m.pos.y <= gy) { m.pos.y = gy; m.vel.y = 0; m.onGround = true; } else m.onGround = false;

    // ---- visuals ----
    m.group.position.copy(m.pos);
    m.bob += dt * 8;
    const moving = Math.abs(wishX) + Math.abs(wishZ) > 0.1;
    m.group.position.y += moving ? Math.abs(Math.sin(m.bob)) * 0.05 : 0;

    if (m.flash > 0) {
      m.flash -= dt;
      m.group.traverse(o => { if (o.material && o.material.emissive) o.material.emissive.setHex(0x661111); });
    } else {
      m.group.traverse(o => { if (o.material && o.material.emissive) o.material.emissive.setHex(0x000000); });
    }

    if (m._barT > 0) { m._barT -= dt; if (m._barT <= 0 && !m.tamed) m.bar.visible = false; }
    if (m.tamed) { m.bar.visible = true; drawHealthBar(m.bar, m.health / m.maxHealth, true); }
  }

  wander(m, dt) {
    m.wanderT -= dt;
    if (m.wanderT <= 0) {
      m.wanderT = 1.5 + Math.random() * 2.5;
      m.idle = Math.random() < 0.3;
      m.dir = Math.random() * Math.PI * 2;
      if (!m.idle) m.faceDir(m.dir);
    }
  }

  updateDrops(dt, ctx) {
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const d = this.drops[i];
      d.age += dt;
      d.vel.y -= G * dt;
      d.pos.addScaledVector(d.vel, dt);
      d.vel.x *= 0.9; d.vel.z *= 0.9;
      const gy = this.groundY(d.pos.x, d.pos.z) + 0.15;
      if (d.pos.y <= gy) { d.pos.y = gy; d.vel.y = 0; d.vel.x *= 0.6; d.vel.z *= 0.6; }

      const to = new THREE.Vector3().subVectors(ctx.player.eyePosition(), d.pos);
      const dist = to.length();
      if (d.age > 0.6 && dist < 1.8) { d.pos.addScaledVector(to.normalize(), dt * 6); }
      d.mesh.position.copy(d.pos);
      d.mesh.rotation.y += dt * 2;

      if (d.age > 0.6 && dist < 0.9) {
        ctx.inventory.add(d.item, d.count);
        ctx.onPickup && ctx.onPickup(d.item, d.count);
        this.group.remove(d.mesh); d.mesh.geometry.dispose();
        this.drops.splice(i, 1);
        continue;
      }
      if (d.age > 120) { this.group.remove(d.mesh); this.drops.splice(i, 1); }
    }
  }

  killMob(m, byPlayer) {
    if (m._removed) return;
    m.dead = true; m._removed = true;
    this.group.remove(m.group);
    if (byPlayer) {
      const loot = this.lootFor(m.type);
      for (const [item, count] of loot) this.spawnDrop(item, count, m.pos.x, m.pos.y + 0.5, m.pos.z);
    }
  }

  lootFor(type) {
    const out = [];
    const rint = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
    if (type === 'boar') {
      out.push(['leather', rint(1, 2)]);
      out.push(['raw_meat', rint(1, 3)]);
    } else if (type === 'zombie') {
      out.push(['rotten_flesh', rint(1, 2)]);
      if (Math.random() < 0.15) out.push(['iron_ingot', 1]);
      if (Math.random() < 0.08) out.push(['coal', 1]);
    }
    return out;
  }

  // closest mob in front within reach (no damage) — used to choose attack vs mine
  aimMob(eyePos, forward) {
    let best = null, bestD = 3.6;
    const dir = new THREE.Vector3().copy(forward).normalize();
    for (const m of this.mobs) {
      if (m.dead) continue;
      const center = new THREE.Vector3(m.pos.x, m.pos.y + m.height * 0.5, m.pos.z);
      const to = new THREE.Vector3().subVectors(center, eyePos);
      const dist = to.length();
      if (dist > bestD) continue;
      if (to.normalize().dot(dir) < 0.55) continue;
      best = m; bestD = dist;
    }
    return best;
  }

  // player attacking: pick the closest mob in front within reach
  attack(eyePos, forward, damage) {
    let best = null, bestD = 3.6;
    const dir = new THREE.Vector3().copy(forward).normalize();
    for (const m of this.mobs) {
      if (m.dead) continue;
      const center = new THREE.Vector3(m.pos.x, m.pos.y + m.height * 0.5, m.pos.z);
      const to = new THREE.Vector3().subVectors(center, eyePos);
      const dist = to.length();
      if (dist > bestD) continue;
      if (to.normalize().dot(dir) < 0.55) continue;
      best = m; bestD = dist;
    }
    if (!best) return null;
    const kb = new THREE.Vector3(best.pos.x - eyePos.x, 0, best.pos.z - eyePos.z).normalize();
    const died = best.hit(damage, kb);
    if (died) this.killMob(best, true);
    return { mob: best, died };
  }

  // right-click interact: feed nearest boar in front to tame it
  feedNearest(eyePos, forward, foodHeal) {
    let best = null, bestD = 3.2;
    const dir = new THREE.Vector3().copy(forward).normalize();
    for (const m of this.mobs) {
      if (m.dead || m.type !== 'boar') continue;
      const center = new THREE.Vector3(m.pos.x, m.pos.y + 0.4, m.pos.z);
      const to = new THREE.Vector3().subVectors(center, eyePos);
      const dist = to.length();
      if (dist > bestD) continue;
      if (to.normalize().dot(dir) < 0.4) continue;
      best = m; bestD = dist;
    }
    if (!best) return null;
    best.fleeT = 0;
    best.tameProgress += 1;
    best.health = Math.min(best.maxHealth, best.health + 2);
    this.heartBurst(best);
    if (!best.tamed && best.tameProgress >= 3) {
      best.tamed = true;
      best.bar.visible = true;
      drawHealthBar(best.bar, best.health / best.maxHealth, true);
      return { tamed: true };
    }
    return { tamed: false };
  }

  heartBurst(m) {
    for (let i = 0; i < 5; i++) {
      const heart = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0xff6fae, depthTest: false }));
      heart.scale.set(0.18, 0.18, 0.18);
      heart.position.set(m.pos.x + (Math.random() - 0.5), m.pos.y + m.height + Math.random(), m.pos.z + (Math.random() - 0.5));
      heart.userData.life = 0.8;
      this.group.add(heart);
      this._particles = this._particles || [];
      this._particles.push(heart);
    }
  }

  updateParticles(dt) {
    if (!this._particles) return;
    for (let i = this._particles.length - 1; i >= 0; i--) {
      const p = this._particles[i];
      p.userData.life -= dt;
      p.position.y += dt * 0.8;
      if (p.userData.life <= 0) { this.group.remove(p); this._particles.splice(i, 1); }
    }
  }
}
