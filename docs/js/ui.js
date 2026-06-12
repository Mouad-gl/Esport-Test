import { RECIPES, getItem } from './registry.js';
import { HOTBAR } from './inventory.js';

function iconEl(item, size = 34) {
  const it = getItem(item);
  const d = document.createElement('div');
  d.className = 'icon';
  d.style.width = d.style.height = size + 'px';
  d.style.background = it ? it.icon.c : '#888';
  d.textContent = it ? it.icon.g : '?';
  d.style.fontSize = Math.round(size * 0.62) + 'px';
  return d;
}

export class UI {
  constructor(game) {
    this.game = game;
    this.hotbarEl = document.getElementById('hotbar');
    this.heartsEl = document.getElementById('hearts');
    this.hungerEl = document.getElementById('hunger');
    this.toastEl = document.getElementById('toast');
    this.craftScreen = document.getElementById('craftScreen');
    this.recipeList = document.getElementById('recipeList');
    this.invGrid = document.getElementById('invGrid');

    document.getElementById('closeCraft').addEventListener('click', () => this.closeCraft());
    this.buildHotbarSlots();
  }

  buildHotbarSlots() {
    this.hotbarEl.innerHTML = '';
    this.slotEls = [];
    for (let i = 0; i < HOTBAR; i++) {
      const slot = document.createElement('div');
      slot.className = 'slot';
      const label = document.createElement('div'); label.className = 'label';
      const count = document.createElement('div'); count.className = 'count';
      slot.appendChild(label); slot.appendChild(count);
      this.hotbarEl.appendChild(slot);
      this.slotEls.push({ slot, label, count, icon: null });
    }
  }

  updateHotbar(inv) {
    for (let i = 0; i < HOTBAR; i++) {
      const ref = this.slotEls[i];
      const s = inv.slots[i];
      ref.slot.classList.toggle('sel', i === inv.selected);
      if (ref.icon) { ref.icon.remove(); ref.icon = null; }
      if (s) {
        const ic = iconEl(s.item);
        ref.slot.insertBefore(ic, ref.label.nextSibling);
        ref.icon = ic;
        ref.count.textContent = s.count > 1 ? s.count : '';
        ref.label.textContent = getItem(s.item)?.label || s.item;
      } else {
        ref.count.textContent = '';
        ref.label.textContent = '';
      }
    }
  }

  updateStats(player) {
    // hearts: 10 hearts = 20 hp
    const hp = Math.round(player.health);
    let html = '';
    for (let i = 0; i < 10; i++) {
      const lvl = hp - i * 2;
      html += `<span>${lvl >= 2 ? '❤️' : lvl === 1 ? '💔' : '🖤'}</span>`;
    }
    this.heartsEl.innerHTML = html;

    const hg = Math.round(player.hunger);
    let h2 = '';
    for (let i = 0; i < 10; i++) {
      const on = hg - i * 2 >= 1;
      h2 += `<span style="opacity:${on ? 1 : 0.25}">🍗</span>`;
    }
    this.hungerEl.innerHTML = h2;
  }

  toast(msg) {
    const line = document.createElement('div');
    line.className = 'toast-line';
    line.textContent = msg;
    this.toastEl.appendChild(line);
    setTimeout(() => line.remove(), 2100);
  }

  // ---------------- crafting ----------------
  isCraftOpen() { return !this.craftScreen.classList.contains('hidden'); }

  toggleCraft() { this.isCraftOpen() ? this.closeCraft() : this.openCraft(); }

  openCraft() {
    this.renderCraft();
    this.craftScreen.classList.remove('hidden');
    this.game.onCraftOpen && this.game.onCraftOpen();
  }
  closeCraft() {
    this.craftScreen.classList.add('hidden');
    this.game.onCraftClose && this.game.onCraftClose();
  }

  renderCraft() {
    const inv = this.game.inventory;
    this.recipeList.innerHTML = '';
    for (const recipe of RECIPES) {
      const can = inv.has(recipe.in);
      const card = document.createElement('div');
      card.className = 'recipe' + (can ? ' can' : '');

      const out = document.createElement('div'); out.className = 'r-out';
      const oi = iconEl(recipe.out.item, 22); oi.classList.add('r-icon');
      out.appendChild(oi);
      const oname = document.createElement('span');
      oname.textContent = `${getItem(recipe.out.item).label}${recipe.out.count > 1 ? ' ×' + recipe.out.count : ''}`;
      out.appendChild(oname);

      const ins = document.createElement('div'); ins.className = 'r-in';
      ins.textContent = Object.entries(recipe.in)
        .map(([it, n]) => `${getItem(it).label} ×${n} (${inv.count(it)})`)
        .join(' · ');

      card.appendChild(out); card.appendChild(ins);
      card.addEventListener('click', () => {
        if (this.game.tryCraft(recipe)) this.renderCraft();
      });
      this.recipeList.appendChild(card);
    }

    // inventory grid
    this.invGrid.innerHTML = '';
    for (const s of inv.slots) {
      if (!s) continue;
      const slot = document.createElement('div'); slot.className = 'slot';
      slot.style.width = slot.style.height = '40px';
      const ic = iconEl(s.item, 28);
      const c = document.createElement('div'); c.className = 'count'; c.textContent = s.count > 1 ? s.count : '';
      slot.appendChild(ic); slot.appendChild(c);
      this.invGrid.appendChild(slot);
    }
  }
}
