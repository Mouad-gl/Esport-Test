import * as THREE from 'three';
import { buildAtlas, tileUV } from './textures.js';
import { BLOCKS, AIR, getBlock, faceTile } from './registry.js';
import { fbm, makeRng } from './noise.js';

export const CHUNK = 16;
export const WORLD_CHUNKS = 8;
export const W = CHUNK * WORLD_CHUNKS; // world width/depth in blocks
export const H = 40;                   // world height
export const SEA = 13;

// Face geometry table (known-good winding, faces point outward).
const FACES = [
  { dir: [-1, 0, 0], face: 'side',   corners: [ {p:[0,1,0],uv:[0,1]}, {p:[0,0,0],uv:[0,0]}, {p:[0,1,1],uv:[1,1]}, {p:[0,0,1],uv:[1,0]} ] },
  { dir: [ 1, 0, 0], face: 'side',   corners: [ {p:[1,1,1],uv:[0,1]}, {p:[1,0,1],uv:[0,0]}, {p:[1,1,0],uv:[1,1]}, {p:[1,0,0],uv:[1,0]} ] },
  { dir: [ 0,-1, 0], face: 'bottom', corners: [ {p:[1,0,1],uv:[1,0]}, {p:[0,0,1],uv:[0,0]}, {p:[1,0,0],uv:[1,1]}, {p:[0,0,0],uv:[0,1]} ] },
  { dir: [ 0, 1, 0], face: 'top',    corners: [ {p:[0,1,1],uv:[1,1]}, {p:[1,1,1],uv:[0,1]}, {p:[0,1,0],uv:[1,0]}, {p:[1,1,0],uv:[0,0]} ] },
  { dir: [ 0, 0,-1], face: 'side',   corners: [ {p:[1,0,0],uv:[0,0]}, {p:[0,0,0],uv:[1,0]}, {p:[1,1,0],uv:[0,1]}, {p:[0,1,0],uv:[1,1]} ] },
  { dir: [ 0, 0, 1], face: 'side',   corners: [ {p:[0,0,1],uv:[0,0]}, {p:[1,0,1],uv:[1,0]}, {p:[0,1,1],uv:[0,1]}, {p:[1,1,1],uv:[1,1]} ] },
];

const AO_LEVEL = [0.45, 0.62, 0.8, 1.0];
function aoValue(s1, s2, c) { if (s1 && s2) return 0; return 3 - (s1 + s2 + c); }

export class World {
  constructor(seed = 1337) {
    this.seed = seed;
    this.blocks = new Uint8Array(W * W * H);
    this.atlas = buildAtlas();
    this.group = new THREE.Group();
    this.chunks = new Map(); // key -> { group, opaque, foliage, water }

    this.opaqueMat = new THREE.MeshLambertMaterial({ map: this.atlas, vertexColors: true });
    this.foliageMat = new THREE.MeshLambertMaterial({ map: this.atlas, vertexColors: true, transparent: true, alphaTest: 0.35, side: THREE.DoubleSide });
    this.waterMat = new THREE.MeshLambertMaterial({ map: this.atlas, vertexColors: true, transparent: true, opacity: 0.72, depthWrite: false, side: THREE.DoubleSide });
  }

  idx(x, y, z) { return x + W * (z + W * y); }
  inBounds(x, y, z) { return x >= 0 && x < W && z >= 0 && z < W && y >= 0 && y < H; }

  getBlock(x, y, z) {
    x |= 0; y |= 0; z |= 0;
    if (!this.inBounds(x, y, z)) return AIR;
    return this.blocks[this.idx(x, y, z)];
  }
  setRaw(x, y, z, id) { if (this.inBounds(x, y, z)) this.blocks[this.idx(x, y, z)] = id; }

  occludes(x, y, z) {
    const b = this.getBlock(x, y, z);
    return b !== AIR && BLOCKS[b].solid && !BLOCKS[b].transparent;
  }
  // for face culling: should we draw a face between `self` and the neighbor block?
  shouldDrawFace(selfId, nx, ny, nz) {
    const nb = this.getBlock(nx, ny, nz);
    if (nb === AIR) return true;
    const n = BLOCKS[nb];
    if (!n.transparent) return false;
    return nb !== selfId; // hide internal faces between identical transparent blocks
  }

  highestSolidY(x, z) {
    for (let y = H - 1; y >= 0; y--) {
      const b = this.getBlock(x, y, z);
      if (b !== AIR && BLOCKS[b].solid) return y;
    }
    return -1;
  }

  // find dry land (grass/sand top above sea level) spiralling out from a point
  findSpawn(cx, cz) {
    cx = Math.floor(cx); cz = Math.floor(cz);
    for (let r = 0; r < W / 2; r++) {
      for (let dx = -r; dx <= r; dx++) {
        for (let dz = -r; dz <= r; dz++) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue; // ring only
          const x = cx + dx, z = cz + dz;
          if (x < 2 || z < 2 || x >= W - 2 || z >= W - 2) continue;
          const top = this.highestSolidY(x, z);
          const b = this.getBlock(x, top, z);
          if (top >= SEA && (b === 1 || b === 5)) return [x, z];
        }
      }
    }
    return [cx, cz];
  }

  // ---------------- terrain generation ----------------
  generate() {
    const rng = makeRng(this.seed ^ 0x9e3779b9);
    const treeSpots = [];
    for (let x = 0; x < W; x++) {
      for (let z = 0; z < W; z++) {
        const e = fbm(x, z, this.seed, 4, 1 / 64, 2, 0.5);
        const hills = fbm(x, z, this.seed + 99, 2, 1 / 140, 2, 0.5);
        // centre around sea level with a slight land bias, so valleys form lakes/oceans
        let height = Math.floor(SEA + 3 + (e - 0.5) * 30 + (hills - 0.5) * 14);
        height = Math.max(3, Math.min(H - 8, height));

        for (let y = 0; y <= height; y++) {
          let id;
          if (y === 0) id = 15;                          // bedrock
          else if (y >= height - 3) id = 2;              // dirt layer
          else id = 3;                                   // stone
          // ores in stone
          if (id === 3) {
            const o = this.oreNoise(x, y, z);
            if (y < 10 && o > 0.86) id = 10;             // iron deep
            else if (o > 0.82) id = 9;                   // coal
          }
          this.setRaw(x, y, z, id);
        }
        // surface block
        if (height < SEA) {
          this.setRaw(x, height, z, 5); // sand under/near water
        } else if (height === SEA) {
          this.setRaw(x, height, z, 5);
        } else {
          this.setRaw(x, height, z, 1); // grass
          if (rng() < 0.012 && x > 2 && z > 2 && x < W - 3 && z < W - 3) treeSpots.push([x, height, z]);
        }
        // water fill
        for (let y = height + 1; y <= SEA; y++) this.setRaw(x, y, z, 12);
      }
    }
    for (const [x, y, z] of treeSpots) this.placeTree(x, y, z, rng);
  }

  oreNoise(x, y, z) {
    let h = (x * 73856093) ^ (y * 19349663) ^ (z * 83492791) ^ (this.seed * 2654435761);
    h = (h ^ (h >>> 13)) >>> 0;
    h = (h * 1274126177) >>> 0;
    return (h & 0xffff) / 0xffff;
  }

  placeTree(x, y, z, rng) {
    const h = 4 + Math.floor(rng() * 3);
    for (let i = 1; i <= h; i++) this.setRaw(x, y + i, z, 6);
    const top = y + h;
    for (let dy = -1; dy <= 1; dy++) {
      const r = dy === 1 ? 1 : 2;
      for (let dx = -r; dx <= r; dx++) {
        for (let dz = -r; dz <= r; dz++) {
          if (dx === 0 && dz === 0 && dy < 1) continue;
          if (Math.abs(dx) === r && Math.abs(dz) === r && rng() < 0.5) continue;
          const lx = x + dx, ly = top + dy, lz = z + dz;
          if (this.getBlock(lx, ly, lz) === AIR) this.setRaw(lx, ly, lz, 8);
        }
      }
    }
    this.setRaw(x, top + 1, z, 8);
  }

  // ---------------- meshing ----------------
  buildAll(onProgress) {
    return new Promise(async (resolve) => {
      const total = WORLD_CHUNKS * WORLD_CHUNKS;
      let done = 0;
      for (let cx = 0; cx < WORLD_CHUNKS; cx++) {
        for (let cz = 0; cz < WORLD_CHUNKS; cz++) {
          this.meshChunk(cx, cz);
          done++;
          if (onProgress) onProgress(done / total);
          if (done % 4 === 0) await new Promise(r => setTimeout(r, 0));
        }
      }
      resolve();
    });
  }

  chunkKey(cx, cz) { return cx + ',' + cz; }

  meshChunk(cx, cz) {
    const key = this.chunkKey(cx, cz);
    let chunk = this.chunks.get(key);
    if (chunk) {
      for (const m of [chunk.opaque, chunk.foliage, chunk.water]) {
        if (m) { m.geometry.dispose(); this.group.remove(m); }
      }
    } else {
      chunk = {};
      this.chunks.set(key, chunk);
    }

    const layers = {
      opaque:  { pos: [], norm: [], uv: [], col: [], idx: [], mat: this.opaqueMat, key: 'opaque' },
      foliage: { pos: [], norm: [], uv: [], col: [], idx: [], mat: this.foliageMat, key: 'foliage' },
      water:   { pos: [], norm: [], uv: [], col: [], idx: [], mat: this.waterMat, key: 'water' },
    };

    const x0 = cx * CHUNK, z0 = cz * CHUNK;
    for (let lx = 0; lx < CHUNK; lx++) {
      for (let lz = 0; lz < CHUNK; lz++) {
        const x = x0 + lx, z = z0 + lz;
        for (let y = 0; y < H; y++) {
          const id = this.getBlock(x, y, z);
          if (id === AIR) continue;
          const block = BLOCKS[id];
          const layer = block.liquid ? layers.water : (block.transparent ? layers.foliage : layers.opaque);
          for (const f of FACES) {
            const nx = x + f.dir[0], ny = y + f.dir[1], nz = z + f.dir[2];
            if (!this.shouldDrawFace(id, nx, ny, nz)) continue;
            this.emitFace(layer, block, f, x, y, z);
          }
        }
      }
    }

    const g = new THREE.Group();
    for (const L of Object.values(layers)) {
      if (L.pos.length === 0) continue;
      const geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.Float32BufferAttribute(L.pos, 3));
      geom.setAttribute('normal', new THREE.Float32BufferAttribute(L.norm, 3));
      geom.setAttribute('uv', new THREE.Float32BufferAttribute(L.uv, 2));
      geom.setAttribute('color', new THREE.Float32BufferAttribute(L.col, 3));
      geom.setIndex(L.idx);
      const mesh = new THREE.Mesh(geom, L.mat);
      mesh.renderOrder = L.key === 'water' ? 2 : 0;
      chunk[L.key] = mesh;
      this.group.add(mesh);
    }
  }

  emitFace(L, block, f, x, y, z) {
    const tile = faceTile(block, f.face);
    const { u0, v0, u1, v1 } = tileUV(tile);
    const base = L.pos.length / 3;
    const liquid = !!block.liquid;
    // per-face brightness baked lightly (Lambert also lights it)
    for (let i = 0; i < 4; i++) {
      const c = f.corners[i];
      const px = x + c.p[0], py = y + c.p[1], pz = z + c.p[2];
      // top of water sits slightly lower
      const yy = (liquid && f.face === 'top') ? py - 0.12 : py;
      L.pos.push(px, yy, pz);
      L.norm.push(f.dir[0], f.dir[1], f.dir[2]);
      L.uv.push(u0 + c.uv[0] * (u1 - u0), v1 + c.uv[1] * (v0 - v1));
      // ambient occlusion
      let bright = 1;
      if (!block.transparent && !liquid) bright = AO_LEVEL[this.cornerAO(f, x, y, z, c.p)];
      L.col.push(bright, bright, bright);
    }
    L.idx.push(base, base + 1, base + 2, base + 2, base + 1, base + 3);
  }

  cornerAO(f, x, y, z, p) {
    // axes in the face plane (where dir component is 0)
    const dir = f.dir;
    const planeAxes = [0, 1, 2].filter(a => dir[a] === 0);
    const a1 = planeAxes[0], a2 = planeAxes[1];
    const s1 = p[a1] === 1 ? 1 : -1;
    const s2 = p[a2] === 1 ? 1 : -1;
    const nb = [x + dir[0], y + dir[1], z + dir[2]];
    const off = (ax, s) => { const v = [0, 0, 0]; v[ax] = s; return v; };
    const o1 = off(a1, s1), o2 = off(a2, s2);
    const side1 = this.occludes(nb[0] + o1[0], nb[1] + o1[1], nb[2] + o1[2]) ? 1 : 0;
    const side2 = this.occludes(nb[0] + o2[0], nb[1] + o2[1], nb[2] + o2[2]) ? 1 : 0;
    const corner = this.occludes(nb[0] + o1[0] + o2[0], nb[1] + o1[1] + o2[1], nb[2] + o1[2] + o2[2]) ? 1 : 0;
    return aoValue(side1, side2, corner);
  }

  // edit a block and re-mesh affected chunk(s)
  setBlock(x, y, z, id) {
    if (!this.inBounds(x, y, z)) return;
    this.setRaw(x, y, z, id);
    const cx = Math.floor(x / CHUNK), cz = Math.floor(z / CHUNK);
    const lx = x - cx * CHUNK, lz = z - cz * CHUNK;
    this.meshChunk(cx, cz);
    if (lx === 0 && cx > 0) this.meshChunk(cx - 1, cz);
    if (lx === CHUNK - 1 && cx < WORLD_CHUNKS - 1) this.meshChunk(cx + 1, cz);
    if (lz === 0 && cz > 0) this.meshChunk(cx, cz - 1);
    if (lz === CHUNK - 1 && cz < WORLD_CHUNKS - 1) this.meshChunk(cx, cz + 1);
  }

  // ---------------- raycast (voxel DDA) ----------------
  raycast(origin, dir, maxDist = 6) {
    let x = Math.floor(origin.x), y = Math.floor(origin.y), z = Math.floor(origin.z);
    const stepX = Math.sign(dir.x), stepY = Math.sign(dir.y), stepZ = Math.sign(dir.z);
    const tDeltaX = stepX !== 0 ? Math.abs(1 / dir.x) : Infinity;
    const tDeltaY = stepY !== 0 ? Math.abs(1 / dir.y) : Infinity;
    const tDeltaZ = stepZ !== 0 ? Math.abs(1 / dir.z) : Infinity;
    const distTo = (i, o, s) => s > 0 ? (Math.floor(o) + 1 - o) : (o - Math.floor(o));
    let tMaxX = stepX !== 0 ? distTo(x, origin.x, stepX) * tDeltaX : Infinity;
    let tMaxY = stepY !== 0 ? distTo(y, origin.y, stepY) * tDeltaY : Infinity;
    let tMaxZ = stepZ !== 0 ? distTo(z, origin.z, stepZ) * tDeltaZ : Infinity;
    let nx = 0, ny = 0, nz = 0;
    let t = 0;
    while (t <= maxDist) {
      const b = this.getBlock(x, y, z);
      if (b !== AIR && BLOCKS[b].solid) {
        return { x, y, z, nx, ny, nz, block: b };
      }
      if (tMaxX < tMaxY && tMaxX < tMaxZ) { x += stepX; t = tMaxX; tMaxX += tDeltaX; nx = -stepX; ny = 0; nz = 0; }
      else if (tMaxY < tMaxZ) { y += stepY; t = tMaxY; tMaxY += tDeltaY; nx = 0; ny = -stepY; nz = 0; }
      else { z += stepZ; t = tMaxZ; tMaxZ += tDeltaZ; nx = 0; ny = 0; nz = -stepZ; }
    }
    return null;
  }
}
