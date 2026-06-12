import { TILES } from './textures.js';

// ----------------------------------------------------------------------------
// BLOCKS — indexed by numeric id (used in the voxel array)
// ----------------------------------------------------------------------------
export const AIR = 0;

export const BLOCKS = {
  1:  { id: 1,  item: 'grass',       label: 'Grass Block', tiles: { top: TILES.grass_top, side: TILES.grass_side, bottom: TILES.dirt }, solid: true, hardness: 0.6, drop: 'dirt' },
  2:  { id: 2,  item: 'dirt',        label: 'Dirt',        tiles: { all: TILES.dirt }, solid: true, hardness: 0.5, drop: 'dirt' },
  3:  { id: 3,  item: 'stone',       label: 'Stone',       tiles: { all: TILES.stone }, solid: true, hardness: 1.5, mineKind: 'pickaxe', requiresTool: true, tier: 1, drop: 'cobblestone' },
  4:  { id: 4,  item: 'cobblestone', label: 'Cobblestone', tiles: { all: TILES.cobblestone }, solid: true, hardness: 2.0, mineKind: 'pickaxe', requiresTool: true, tier: 1, drop: 'cobblestone' },
  5:  { id: 5,  item: 'sand',        label: 'Sand',        tiles: { all: TILES.sand }, solid: true, hardness: 0.5, drop: 'sand' },
  6:  { id: 6,  item: 'log',         label: 'Oak Log',     tiles: { top: TILES.log_top, side: TILES.log_side, bottom: TILES.log_top }, solid: true, hardness: 1.0, mineKind: 'axe', drop: 'log' },
  7:  { id: 7,  item: 'planks',      label: 'Oak Planks',  tiles: { all: TILES.planks }, solid: true, hardness: 1.0, mineKind: 'axe', drop: 'planks' },
  8:  { id: 8,  item: 'leaves',      label: 'Leaves',      tiles: { all: TILES.leaves }, solid: true, transparent: true, hardness: 0.2, drop: null, dropTable: [{ item: 'apple', chance: 0.14 }, { item: 'wheat', chance: 0.10 }] },
  9:  { id: 9,  item: 'coal_ore',    label: 'Coal Ore',    tiles: { all: TILES.coal_ore }, solid: true, hardness: 3.0, mineKind: 'pickaxe', requiresTool: true, tier: 1, drop: 'coal' },
  10: { id: 10, item: 'iron_ore',    label: 'Iron Ore',    tiles: { all: TILES.iron_ore }, solid: true, hardness: 3.0, mineKind: 'pickaxe', requiresTool: true, tier: 2, drop: 'raw_iron' },
  11: { id: 11, item: 'glass',       label: 'Glass',       tiles: { all: TILES.glass }, solid: true, transparent: true, hardness: 0.3, drop: null },
  12: { id: 12, item: 'water',       label: 'Water',       tiles: { all: TILES.water }, solid: false, transparent: true, liquid: true, hardness: Infinity, drop: null },
  13: { id: 13, item: 'lantern',     label: 'Lantern',     tiles: { all: TILES.lantern }, solid: true, light: 1.0, hardness: 0.3, drop: 'lantern' },
  14: { id: 14, item: 'table',       label: 'Crafting Table', tiles: { top: TILES.table_top, side: TILES.table_side, bottom: TILES.planks }, solid: true, hardness: 1.0, mineKind: 'axe', drop: 'table' },
  15: { id: 15, item: 'bedrock',     label: 'Bedrock',     tiles: { all: TILES.bedrock }, solid: true, hardness: Infinity, drop: null },
};

export function getBlock(id) { return BLOCKS[id]; }
export function isSolid(id) { return id !== AIR && BLOCKS[id] && BLOCKS[id].solid; }
export function isTransparent(id) { return id === AIR || (BLOCKS[id] && BLOCKS[id].transparent); }

export function faceTile(block, face) {
  const t = block.tiles;
  if (t.all !== undefined) return t.all;
  if (face === 'top') return t.top;
  if (face === 'bottom') return t.bottom !== undefined ? t.bottom : t.side;
  return t.side;
}

// ----------------------------------------------------------------------------
// ITEMS — everything that can sit in a slot (blocks, materials, tools, food)
// ----------------------------------------------------------------------------
// type: 'block' | 'material' | 'food' | 'tool' | 'armor'
export const ITEMS = {
  // placeable blocks
  grass:       { label: 'Grass Block', type: 'block', place: 1,  icon: { g: '🌱', c: '#569e40' }, stack: 99 },
  dirt:        { label: 'Dirt',        type: 'block', place: 2,  icon: { g: '🟫', c: '#7d583a' }, stack: 99 },
  stone:       { label: 'Stone',       type: 'block', place: 3,  icon: { g: '🪨', c: '#808084' }, stack: 99 },
  cobblestone: { label: 'Cobblestone', type: 'block', place: 4,  icon: { g: '🧱', c: '#787880' }, stack: 99 },
  sand:        { label: 'Sand',        type: 'block', place: 5,  icon: { g: '🟨', c: '#ded296' }, stack: 99 },
  log:         { label: 'Oak Log',     type: 'block', place: 6,  icon: { g: '🪵', c: '#6e5030' }, stack: 99 },
  planks:      { label: 'Oak Planks',  type: 'block', place: 7,  icon: { g: '🟧', c: '#b0895a' }, stack: 99 },
  leaves:      { label: 'Leaves',      type: 'block', place: 8,  icon: { g: '🍃', c: '#387a30' }, stack: 99 },
  glass:       { label: 'Glass',       type: 'block', place: 11, icon: { g: '🟦', c: '#bfe6f0' }, stack: 99 },
  lantern:     { label: 'Lantern',     type: 'block', place: 13, icon: { g: '🏮', c: '#ffd76b' }, stack: 99 },
  table:       { label: 'Crafting Table', type: 'block', place: 14, icon: { g: '🛠️', c: '#b0895a' }, stack: 99 },

  // materials
  coal:        { label: 'Coal',        type: 'material', icon: { g: '⚫', c: '#2b2b2b' }, stack: 99 },
  raw_iron:    { label: 'Raw Iron',    type: 'material', icon: { g: '🟤', c: '#d9a679' }, stack: 99 },
  iron_ingot:  { label: 'Iron Ingot',  type: 'material', icon: { g: '⬜', c: '#e3e3ea' }, stack: 99 },
  stick:       { label: 'Stick',       type: 'material', icon: { g: '➗', c: '#a07840' }, stack: 99 },
  leather:     { label: 'Leather',     type: 'material', icon: { g: '🟫', c: '#8a5a2b' }, stack: 99 },

  // food
  apple:       { label: 'Apple',       type: 'food', heal: 3, hunger: 3, tame: true, icon: { g: '🍎', c: '#d23b3b' }, stack: 16 },
  wheat:       { label: 'Wheat',       type: 'food', heal: 1, hunger: 1, tame: true, icon: { g: '🌾', c: '#e0c060' }, stack: 16 },
  raw_meat:    { label: 'Raw Meat',    type: 'food', heal: 2, hunger: 2, icon: { g: '🥩', c: '#c45b5b' }, stack: 16 },
  cooked_meat: { label: 'Cooked Steak',type: 'food', heal: 6, hunger: 6, icon: { g: '🍖', c: '#9c5a2e' }, stack: 16 },
  rotten_flesh:{ label: 'Rotten Flesh',type: 'food', heal: 1, hunger: 1, icon: { g: '🫛', c: '#6a7a4a' }, stack: 16 },

  // tools
  wood_pickaxe:  { label: 'Wooden Pickaxe', type: 'tool', kind: 'pickaxe', tier: 1, attack: 2, icon: { g: '⛏️', c: '#b0895a' }, stack: 1 },
  stone_pickaxe: { label: 'Stone Pickaxe',  type: 'tool', kind: 'pickaxe', tier: 2, attack: 3, icon: { g: '⛏️', c: '#9a9aa0' }, stack: 1 },
  iron_pickaxe:  { label: 'Iron Pickaxe',   type: 'tool', kind: 'pickaxe', tier: 3, attack: 4, icon: { g: '⛏️', c: '#e3e3ea' }, stack: 1 },
  wood_axe:      { label: 'Wooden Axe',     type: 'tool', kind: 'axe', tier: 1, attack: 3, icon: { g: '🪓', c: '#b0895a' }, stack: 1 },
  stone_axe:     { label: 'Stone Axe',      type: 'tool', kind: 'axe', tier: 2, attack: 4, icon: { g: '🪓', c: '#9a9aa0' }, stack: 1 },
  wood_sword:    { label: 'Wooden Sword',   type: 'tool', kind: 'sword', tier: 1, attack: 4, icon: { g: '🗡️', c: '#b0895a' }, stack: 1 },
  stone_sword:   { label: 'Stone Sword',    type: 'tool', kind: 'sword', tier: 2, attack: 6, icon: { g: '🗡️', c: '#9a9aa0' }, stack: 1 },
  iron_sword:    { label: 'Iron Sword',     type: 'tool', kind: 'sword', tier: 3, attack: 8, icon: { g: '🗡️', c: '#e3e3ea' }, stack: 1 },

  // armor
  leather_armor: { label: 'Leather Tunic', type: 'armor', defense: 0.4, icon: { g: '🦺', c: '#8a5a2b' }, stack: 1 },
};

export function getItem(id) { return ITEMS[id]; }

// ----------------------------------------------------------------------------
// CRAFTING — shapeless recipes. inputs: {item: count}. out: {item, count}
// ----------------------------------------------------------------------------
export const RECIPES = [
  { out: { item: 'planks', count: 4 }, in: { log: 1 } },
  { out: { item: 'stick', count: 4 }, in: { planks: 2 } },
  { out: { item: 'table', count: 1 }, in: { planks: 4 } },
  { out: { item: 'iron_ingot', count: 1 }, in: { raw_iron: 1, coal: 1 } },
  { out: { item: 'cooked_meat', count: 1 }, in: { raw_meat: 1, coal: 1 } },
  { out: { item: 'glass', count: 1 }, in: { sand: 1, coal: 1 } },

  { out: { item: 'wood_pickaxe', count: 1 }, in: { planks: 3, stick: 2 } },
  { out: { item: 'wood_axe', count: 1 }, in: { planks: 3, stick: 2 } },
  { out: { item: 'wood_sword', count: 1 }, in: { planks: 2, stick: 1 } },

  { out: { item: 'stone_pickaxe', count: 1 }, in: { cobblestone: 3, stick: 2 } },
  { out: { item: 'stone_axe', count: 1 }, in: { cobblestone: 3, stick: 2 } },
  { out: { item: 'stone_sword', count: 1 }, in: { cobblestone: 2, stick: 1 } },

  { out: { item: 'iron_pickaxe', count: 1 }, in: { iron_ingot: 3, stick: 2 } },
  { out: { item: 'iron_sword', count: 1 }, in: { iron_ingot: 2, stick: 1 } },

  { out: { item: 'lantern', count: 4 }, in: { coal: 1, iron_ingot: 1 } },
  { out: { item: 'leather_armor', count: 1 }, in: { leather: 5 } },
];

// Tool helpers ---------------------------------------------------------------
export function toolStats(itemId) {
  const it = ITEMS[itemId];
  if (it && it.type === 'tool') return it;
  return null;
}
