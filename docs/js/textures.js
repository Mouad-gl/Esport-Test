import * as THREE from 'three';
import { makeRng } from './noise.js';

// Atlas of 16x16 tiles. flipY=false so v=0 is the TOP of each tile (canvas top).
const TILE = 16;
const COLS = 8;
const ROWS = 4;

// Tile indices
export const TILES = {
  grass_top: 0,
  grass_side: 1,
  dirt: 2,
  stone: 3,
  cobblestone: 4,
  sand: 5,
  log_side: 6,
  log_top: 7,
  planks: 8,
  leaves: 9,
  coal_ore: 10,
  iron_ore: 11,
  glass: 12,
  water: 13,
  lantern: 14,
  table_side: 15,
  table_top: 16,
  bedrock: 17,
};

function hex(c) { return `rgb(${c[0]},${c[1]},${c[2]})`; }

// draw a noisy fill into a tile region
function noisy(ctx, ox, oy, base, variance, rng) {
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      const n = (rng() - 0.5) * variance;
      ctx.fillStyle = `rgb(${clamp(base[0]+n)},${clamp(base[1]+n)},${clamp(base[2]+n)})`;
      ctx.fillRect(ox + x, oy + y, 1, 1);
    }
  }
}
function clamp(v) { return Math.max(0, Math.min(255, Math.round(v))); }

function speckle(ctx, ox, oy, color, count, rng) {
  ctx.fillStyle = hex(color);
  for (let i = 0; i < count; i++) {
    const x = Math.floor(rng() * TILE), y = Math.floor(rng() * TILE);
    ctx.fillRect(ox + x, oy + y, 1, 1);
  }
}

function origin(index) {
  const col = index % COLS, row = Math.floor(index / COLS);
  return [col * TILE, row * TILE];
}

export function buildAtlas() {
  const cv = document.createElement('canvas');
  cv.width = COLS * TILE;
  cv.height = ROWS * TILE;
  const ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const draw = (tile, fn) => {
    const [ox, oy] = origin(tile);
    fn(ox, oy, makeRng(tile * 9173 + 7));
  };

  draw(TILES.grass_top, (ox, oy, r) => { noisy(ctx, ox, oy, [86, 158, 64], 22, r); speckle(ctx, ox, oy, [70, 132, 52], 18, r); });
  draw(TILES.dirt, (ox, oy, r) => { noisy(ctx, ox, oy, [125, 88, 58], 24, r); speckle(ctx, ox, oy, [99, 68, 44], 14, r); });
  draw(TILES.grass_side, (ox, oy, r) => {
    noisy(ctx, ox, oy, [125, 88, 58], 24, r);                 // dirt body
    // grass overhang on top rows
    for (let y = 0; y < 5; y++) for (let x = 0; x < TILE; x++) {
      const n = (r() - 0.5) * 22;
      const drip = (x * 37 % 5 === 0 && y === 4) ? 1 : 0;     // little drips
      if (y < 4 || drip) { ctx.fillStyle = `rgb(${clamp(86+n)},${clamp(158+n)},${clamp(64+n)})`; ctx.fillRect(ox + x, oy + y, 1, 1); }
    }
  });
  draw(TILES.stone, (ox, oy, r) => { noisy(ctx, ox, oy, [128, 128, 132], 16, r); speckle(ctx, ox, oy, [105, 105, 110], 12, r); });
  draw(TILES.cobblestone, (ox, oy, r) => {
    noisy(ctx, ox, oy, [120, 120, 124], 10, r);
    // chunky cobbles
    for (let i = 0; i < 6; i++) {
      const x = Math.floor(r() * 12), y = Math.floor(r() * 12), w = 3 + Math.floor(r()*3), h = 3 + Math.floor(r()*3);
      ctx.fillStyle = `rgb(${clamp(140+ (r()-0.5)*20)},${clamp(140)},${clamp(144)})`;
      ctx.fillRect(ox + x, oy + y, w, h);
      ctx.fillStyle = 'rgba(40,40,44,.5)';
      ctx.strokeRect(ox + x + .5, oy + y + .5, w, h);
    }
  });
  draw(TILES.sand, (ox, oy, r) => { noisy(ctx, ox, oy, [222, 205, 150], 16, r); speckle(ctx, ox, oy, [205, 188, 132], 14, r); });
  draw(TILES.log_side, (ox, oy, r) => {
    noisy(ctx, ox, oy, [110, 80, 48], 14, r);
    for (let x = 2; x < TILE; x += 4) { ctx.fillStyle = 'rgba(70,48,28,.7)'; ctx.fillRect(ox + x, oy, 1, TILE); }
  });
  draw(TILES.log_top, (ox, oy, r) => {
    noisy(ctx, ox, oy, [150, 112, 70], 12, r);
    ctx.strokeStyle = 'rgba(90,64,38,.8)';
    for (let rad = 2; rad < 8; rad += 2) { ctx.beginPath(); ctx.arc(ox + 8, oy + 8, rad, 0, 7); ctx.stroke(); }
  });
  draw(TILES.planks, (ox, oy, r) => {
    noisy(ctx, ox, oy, [176, 137, 86], 12, r);
    for (let y = 0; y < TILE; y += 4) { ctx.fillStyle = 'rgba(120,92,55,.7)'; ctx.fillRect(ox, oy + y, TILE, 1); }
    ctx.fillStyle = 'rgba(120,92,55,.5)'; ctx.fillRect(ox + 8, oy, 1, 4); ctx.fillRect(ox + 4, oy + 8, 1, 4); ctx.fillRect(ox + 12, oy + 12, 1, 4);
  });
  draw(TILES.leaves, (ox, oy, r) => {
    // transparent-ish leaves with holes
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
      if (r() < 0.12) { ctx.clearRect(ox + x, oy + y, 1, 1); continue; }
      const n = (r() - 0.5) * 30;
      ctx.fillStyle = `rgb(${clamp(56+n)},${clamp(122+n)},${clamp(48+n)})`;
      ctx.fillRect(ox + x, oy + y, 1, 1);
    }
  });
  draw(TILES.coal_ore, (ox, oy, r) => {
    noisy(ctx, ox, oy, [128, 128, 132], 16, r);
    for (let i = 0; i < 5; i++) { const x = Math.floor(r()*12), y = Math.floor(r()*12); ctx.fillStyle = '#222'; ctx.fillRect(ox+x, oy+y, 2+Math.floor(r()*2), 2+Math.floor(r()*2)); }
  });
  draw(TILES.iron_ore, (ox, oy, r) => {
    noisy(ctx, ox, oy, [128, 128, 132], 16, r);
    for (let i = 0; i < 5; i++) { const x = Math.floor(r()*12), y = Math.floor(r()*12); ctx.fillStyle = '#d9a679'; ctx.fillRect(ox+x, oy+y, 2+Math.floor(r()*2), 2+Math.floor(r()*2)); }
  });
  draw(TILES.glass, (ox, oy, r) => {
    ctx.clearRect(ox, oy, TILE, TILE);
    ctx.strokeStyle = 'rgba(210,235,245,.9)'; ctx.strokeRect(ox + .5, oy + .5, TILE - 1, TILE - 1);
    ctx.fillStyle = 'rgba(200,230,245,.18)'; ctx.fillRect(ox, oy, TILE, TILE);
    ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.moveTo(ox+2, oy+11); ctx.lineTo(ox+6, oy+3); ctx.stroke();
  });
  draw(TILES.water, (ox, oy, r) => { noisy(ctx, ox, oy, [54, 110, 196], 14, r); ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fillRect(ox, oy + 3, TILE, 1); ctx.fillRect(ox, oy + 10, TILE, 1); });
  draw(TILES.lantern, (ox, oy, r) => {
    noisy(ctx, ox, oy, [90, 70, 40], 10, r);
    ctx.fillStyle = '#ffd76b'; ctx.fillRect(ox + 4, oy + 4, 8, 8);
    ctx.fillStyle = '#fff2b0'; ctx.fillRect(ox + 6, oy + 6, 4, 4);
    ctx.strokeStyle = '#3a2c18'; ctx.strokeRect(ox + 3.5, oy + 3.5, 9, 9);
  });
  draw(TILES.table_side, (ox, oy, r) => {
    noisy(ctx, ox, oy, [150, 110, 66], 12, r);
    ctx.fillStyle = '#5a4226'; ctx.fillRect(ox, oy, TILE, 3);
    ctx.fillStyle = 'rgba(90,64,38,.6)'; for (let y = 4; y < TILE; y += 3) ctx.fillRect(ox, oy + y, TILE, 1);
  });
  draw(TILES.table_top, (ox, oy, r) => {
    noisy(ctx, ox, oy, [176, 137, 86], 10, r);
    ctx.strokeStyle = '#5a4226'; ctx.strokeRect(ox + .5, oy + .5, TILE - 1, TILE - 1);
    ctx.strokeRect(ox + 4.5, oy + 4.5, 7, 7);
  });
  draw(TILES.bedrock, (ox, oy, r) => {
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
      const v = 30 + Math.floor(r() * 70);
      ctx.fillStyle = `rgb(${v},${v},${v+4})`; ctx.fillRect(ox + x, oy + y, 1, 1);
    }
  });

  const texture = new THREE.CanvasTexture(cv);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.flipY = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// UV rect for a tile, inset half a texel to avoid bleeding.
export function tileUV(index) {
  const col = index % COLS, row = Math.floor(index / COLS);
  const e = 0.0;
  const u0 = (col * TILE + e) / (COLS * TILE);
  const u1 = ((col + 1) * TILE - e) / (COLS * TILE);
  const v0 = (row * TILE + e) / (ROWS * TILE);       // top of tile (flipY=false)
  const v1 = ((row + 1) * TILE - e) / (ROWS * TILE); // bottom of tile
  return { u0, v0, u1, v1 };
}
