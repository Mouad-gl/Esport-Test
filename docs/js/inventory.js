import { getItem } from './registry.js';

export const HOTBAR = 9;
export const SLOTS = 36; // first 9 are the hotbar

export class Inventory {
  constructor() {
    this.slots = new Array(SLOTS).fill(null); // each: { item, count }
    this.selected = 0;
    this.onChange = () => {};
  }

  changed() { this.onChange(); }

  getSelected() { return this.slots[this.selected]; }
  select(i) { this.selected = ((i % HOTBAR) + HOTBAR) % HOTBAR; this.changed(); }
  scroll(dir) { this.select(this.selected + (dir > 0 ? 1 : -1)); }

  count(item) {
    let n = 0;
    for (const s of this.slots) if (s && s.item === item) n += s.count;
    return n;
  }

  // add items; returns number that didn't fit (usually 0)
  add(item, count = 1) {
    const max = getItem(item)?.stack ?? 99;
    // fill existing stacks first
    for (const s of this.slots) {
      if (count <= 0) break;
      if (s && s.item === item && s.count < max) {
        const add = Math.min(max - s.count, count);
        s.count += add; count -= add;
      }
    }
    // new stacks
    for (let i = 0; i < this.slots.length && count > 0; i++) {
      if (!this.slots[i]) {
        const add = Math.min(max, count);
        this.slots[i] = { item, count: add };
        count -= add;
      }
    }
    this.changed();
    return count;
  }

  remove(item, count = 1) {
    if (this.count(item) < count) return false;
    for (let i = 0; i < this.slots.length && count > 0; i++) {
      const s = this.slots[i];
      if (s && s.item === item) {
        const take = Math.min(s.count, count);
        s.count -= take; count -= take;
        if (s.count <= 0) this.slots[i] = null;
      }
    }
    this.changed();
    return true;
  }

  has(inputs) {
    for (const [item, n] of Object.entries(inputs)) if (this.count(item) < n) return false;
    return true;
  }

  consume(inputs) {
    if (!this.has(inputs)) return false;
    for (const [item, n] of Object.entries(inputs)) this.remove(item, n);
    return true;
  }

  // remove one of the selected item (used when placing a block / eating)
  consumeSelected() {
    const s = this.getSelected();
    if (!s) return null;
    const item = s.item;
    s.count--;
    if (s.count <= 0) this.slots[this.selected] = null;
    this.changed();
    return item;
  }
}
