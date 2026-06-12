import * as THREE from 'three';
import { BLOCKS, AIR } from './registry.js';

const HX = 0.3, HZ = 0.3, HEIGHT = 1.8, EYE = 1.62;
const GRAVITY = 26, JUMP = 8.6, EPS = 1e-3;

export class Player {
  constructor(world) {
    this.world = world;
    this.pos = new THREE.Vector3(0, 0, 0); // feet center
    this.vel = new THREE.Vector3();
    this.yaw = 0;   // around Y
    this.pitch = 0; // around X
    this.onGround = false;
    this.inWater = false;

    this.maxHealth = 20;
    this.health = 20;
    this.maxHunger = 20;
    this.hunger = 20;
    this.armor = 0;     // 0..1 damage reduction
    this.dead = false;

    this._regenT = 0;
    this._hungerT = 0;
    this._hurtFlash = 0;
  }

  spawnOn(x, z) {
    const y = this.world.highestSolidY(x, z);
    this.pos.set(x + 0.5, y + 1.05, z + 0.5);
    this.vel.set(0, 0, 0);
  }

  applyLook(dx, dy) {
    const s = 0.0022;
    this.yaw -= dx * s;
    this.pitch -= dy * s;
    const lim = Math.PI / 2 - 0.02;
    this.pitch = Math.max(-lim, Math.min(lim, this.pitch));
  }

  getForward() {
    return new THREE.Vector3(
      -Math.sin(this.yaw) * Math.cos(this.pitch),
      Math.sin(this.pitch),
      -Math.cos(this.yaw) * Math.cos(this.pitch)
    ).normalize();
  }

  eyePosition() { return new THREE.Vector3(this.pos.x, this.pos.y + EYE, this.pos.z); }

  solidAt(x, y, z) {
    const b = this.world.getBlock(Math.floor(x), Math.floor(y), Math.floor(z));
    return b !== AIR && BLOCKS[b].solid && !BLOCKS[b].liquid;
  }

  isWaterAt(x, y, z) {
    const b = this.world.getBlock(Math.floor(x), Math.floor(y), Math.floor(z));
    return b !== AIR && BLOCKS[b].liquid;
  }

  update(dt, input) {
    if (this.dead) return;
    dt = Math.min(dt, 0.05);

    this.inWater = this.isWaterAt(this.pos.x, this.pos.y + 0.6, this.pos.z);

    // desired horizontal direction from input, relative to yaw
    let fx = 0, fz = 0;
    if (input.forward) { fx -= Math.sin(this.yaw); fz -= Math.cos(this.yaw); }
    if (input.back)    { fx += Math.sin(this.yaw); fz += Math.cos(this.yaw); }
    if (input.left)    { fx -= Math.cos(this.yaw); fz += Math.sin(this.yaw); }
    if (input.right)   { fx += Math.cos(this.yaw); fz -= Math.sin(this.yaw); }
    const len = Math.hypot(fx, fz);
    if (len > 0) { fx /= len; fz /= len; }

    let speed = input.sprint && input.forward ? 6.6 : 4.4;
    if (this.inWater) speed *= 0.6;
    this.vel.x = fx * speed;
    this.vel.z = fz * speed;

    // vertical
    const g = this.inWater ? GRAVITY * 0.28 : GRAVITY;
    this.vel.y -= g * dt;
    if (this.inWater) {
      this.vel.y = Math.max(this.vel.y, -3);
      if (input.jump) this.vel.y = 4.2;
    } else if (input.jump && this.onGround) {
      this.vel.y = JUMP;
    }

    // integrate with collision, axis by axis
    this.onGround = false;
    this.move('x', this.vel.x * dt);
    this.move('z', this.vel.z * dt);
    this.move('y', this.vel.y * dt);

    // fall out of world safety
    if (this.pos.y < -5) this.damage(4, 'the void');

    this.updateStats(dt, input);
    if (this._hurtFlash > 0) this._hurtFlash -= dt;
  }

  move(axis, amount) {
    if (amount === 0) return;
    this.pos[axis] += amount;
    const minX = this.pos.x - HX, maxX = this.pos.x + HX;
    const minY = this.pos.y, maxY = this.pos.y + HEIGHT;
    const minZ = this.pos.z - HZ, maxZ = this.pos.z + HZ;

    const x0 = Math.floor(minX), x1 = Math.floor(maxX);
    const y0 = Math.floor(minY), y1 = Math.floor(maxY);
    const z0 = Math.floor(minZ), z1 = Math.floor(maxZ);

    for (let x = x0; x <= x1; x++) {
      for (let y = y0; y <= y1; y++) {
        for (let z = z0; z <= z1; z++) {
          if (!this.solidAt(x + 0.5, y + 0.5, z + 0.5)) continue;
          // overlapping a solid voxel -> resolve on this axis
          if (axis === 'x') {
            if (amount > 0) this.pos.x = x - HX - EPS;
            else this.pos.x = (x + 1) + HX + EPS;
            this.vel.x = 0;
          } else if (axis === 'z') {
            if (amount > 0) this.pos.z = z - HZ - EPS;
            else this.pos.z = (z + 1) + HZ + EPS;
            this.vel.z = 0;
          } else {
            if (amount > 0) { this.pos.y = y - HEIGHT - EPS; }
            else { this.pos.y = (y + 1) + EPS; this.onGround = true; }
            this.vel.y = 0;
          }
          return; // one resolution per axis is enough for a thin player
        }
      }
    }
  }

  updateStats(dt, input) {
    // hunger slowly drains, faster when sprinting
    this._hungerT += dt * (input.sprint && input.forward ? 2.2 : 1);
    if (this._hungerT > 6) { this._hungerT = 0; this.hunger = Math.max(0, this.hunger - 1); }

    if (this.hunger > 16 && this.health < this.maxHealth) {
      this._regenT += dt;
      if (this._regenT > 2.5) { this._regenT = 0; this.health = Math.min(this.maxHealth, this.health + 1); }
    } else if (this.hunger <= 0) {
      this._regenT += dt;
      if (this._regenT > 3) { this._regenT = 0; this.damage(1, 'starvation'); }
    }
  }

  damage(n, cause) {
    if (this.dead) return;
    n = n * (1 - this.armor);
    this.health = Math.max(0, this.health - n);
    this._hurtFlash = 0.35;
    if (this.health <= 0) { this.dead = true; this.deathCause = cause || 'the world'; }
  }

  heal(n) { this.health = Math.min(this.maxHealth, this.health + n); }
  feed(n) { this.hunger = Math.min(this.maxHunger, this.hunger + n); }
}
