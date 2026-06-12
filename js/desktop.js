/* =============================================================================
   PORTFOLIO 98 — desktop / window manager
   You normally don't need to touch this file; edit js/apps.js instead.
   ========================================================================== */
(function () {
  "use strict";

  const Desktop = {
    wins: new Map(),     // id -> { app, el, body, taskBtn, min, max, prevRect }
    z: 10,
    activeId: null,
    openedCount: 0,
  };

  const $ = (sel) => document.querySelector(sel);
  const el = (tag, cls) => { const e = document.createElement(tag); if (cls) e.className = cls; return e; };

  // ---------------------------------------------------------------- init
  Desktop.init = function () {
    const cfg = window.CONFIG || {};
    const brand = (cfg.name || "Portfolio") + "98";
    document.querySelectorAll(".start-side span").forEach((s) => {
      s.innerHTML = (cfg.name || "Portfolio") + "<b>98</b>";
    });
    document.title = brand;

    this.renderIcons();
    this.renderStartMenu();
    this.bindChrome();
    this.updateClock();
    this._clockTimer = setInterval(() => this.updateClock(), 1000);
  };

  Desktop.apps = function () { return window.APPS || []; };

  // ---------------------------------------------------------------- desktop icons
  Desktop.renderIcons = function () {
    const host = $("#icons");
    host.innerHTML = "";
    this.apps().filter((a) => a.desktop !== false).forEach((app) => {
      const icon = el("div", "desk-icon");
      icon.tabIndex = 0;
      icon.innerHTML = `<div class="glyph">${app.icon || "📄"}</div><div class="label">${app.title}</div>`;
      const open = () => this.openApp(app.id);
      icon.addEventListener("dblclick", open);
      icon.addEventListener("keydown", (e) => { if (e.key === "Enter") open(); });
      // single click selects; touch taps open
      icon.addEventListener("click", (e) => {
        document.querySelectorAll(".desk-icon.sel").forEach((n) => n.classList.remove("sel"));
        icon.classList.add("sel");
        if (e.pointerType === "touch") open();
      });
      host.appendChild(icon);
    });
    // click empty desktop clears selection
    $("#desktop").addEventListener("pointerdown", (e) => {
      if (e.target.id === "desktop" || e.target.id === "icons" || e.target.id === "windows") {
        document.querySelectorAll(".desk-icon.sel").forEach((n) => n.classList.remove("sel"));
        this.closeStart();
      }
    });
  };

  // ---------------------------------------------------------------- start menu
  Desktop.renderStartMenu = function () {
    const host = $("#startItems");
    host.innerHTML = "";
    this.apps().forEach((app) => {
      const item = el("button", "start-item");
      item.innerHTML = `<span class="si-icon">${app.icon || "📄"}</span> ${app.title}`;
      item.addEventListener("click", () => { this.openApp(app.id); this.closeStart(); });
      host.appendChild(item);
    });
  };

  // ---------------------------------------------------------------- chrome wiring
  Desktop.bindChrome = function () {
    $("#startBtn").addEventListener("click", (e) => { e.stopPropagation(); this.toggleStart(); });
    $("#startMenu").addEventListener("pointerdown", (e) => e.stopPropagation());
    $("#startShutdown").addEventListener("click", () => { this.closeStart(); this.shutdown(); });
    const back = $("#shutdownBack");
    if (back) back.addEventListener("click", () => location.reload());
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") this.closeStart();
    });
  };

  // ---------------------------------------------------------------- open / windows
  Desktop.openApp = function (id) {
    const app = this.apps().find((a) => a.id === id);
    if (!app) return;
    if (this.wins.has(id)) {            // already open -> restore + focus
      const w = this.wins.get(id);
      if (w.min) this.minimize(id, false);
      this.focus(id);
      return;
    }
    this.createWindow(app);
  };

  Desktop.createWindow = function (app) {
    const w = Math.max(180, app.width || 420);
    const h = Math.max(120, app.height || 300);
    const win = el("div", "win window");
    win.dataset.id = app.id;
    win.style.width = w + "px";
    win.style.height = h + "px";

    // cascade position within the desktop area
    const area = $("#windows");
    const maxX = Math.max(8, area.clientWidth - w - 8);
    const maxY = Math.max(8, area.clientHeight - h - 8);
    const off = (this.openedCount++ % 8) * 26;
    win.style.left = Math.min(24 + off, maxX) + "px";
    win.style.top = Math.min(20 + off, maxY) + "px";

    win.innerHTML =
      '<div class="title-bar">' +
        '<div class="title-bar-text"><span class="ti">' + (app.icon || "📄") + "</span>" + escapeHtml(app.title) + "</div>" +
        '<div class="title-bar-controls">' +
          '<button aria-label="Minimize"></button>' +
          '<button aria-label="Maximize"></button>' +
          '<button aria-label="Close"></button>' +
        "</div>" +
      "</div>" +
      '<div class="window-body">' + (app.body || "") + "</div>";

    area.appendChild(win);

    const titleBar = win.querySelector(".title-bar");
    const [btnMin, btnMax, btnClose] = win.querySelectorAll(".title-bar-controls button");
    btnMin.addEventListener("click", (e) => { e.stopPropagation(); this.minimize(app.id, true); });
    btnMax.addEventListener("click", (e) => { e.stopPropagation(); this.toggleMax(app.id); });
    btnClose.addEventListener("click", (e) => { e.stopPropagation(); this.close(app.id); });
    titleBar.addEventListener("dblclick", (e) => {
      if (e.target.closest(".title-bar-controls")) return;
      this.toggleMax(app.id);
    });
    win.addEventListener("pointerdown", () => this.focus(app.id));

    const taskBtn = el("button", "task-btn");
    taskBtn.innerHTML = '<span class="ti">' + (app.icon || "📄") + '</span><span class="tlabel">' + escapeHtml(app.title) + "</span>";
    taskBtn.addEventListener("click", () => {
      const rec = this.wins.get(app.id);
      if (rec.min) { this.minimize(app.id, false); this.focus(app.id); }
      else if (this.activeId === app.id) { this.minimize(app.id, true); }
      else { this.focus(app.id); }
    });
    $("#tasks").appendChild(taskBtn);

    const rec = { app, el: win, taskBtn, min: false, max: false, prevRect: null };
    this.wins.set(app.id, rec);
    this.makeDraggable(rec, titleBar);
    this.focus(app.id);
  };

  // ---------------------------------------------------------------- focus
  Desktop.focus = function (id) {
    const rec = this.wins.get(id);
    if (!rec || rec.min) return;
    this.activeId = id;
    rec.el.style.zIndex = ++this.z;
    this.wins.forEach((r, rid) => {
      const active = rid === id;
      r.el.querySelector(".title-bar").classList.toggle("inactive", !active);
      r.taskBtn.classList.toggle("active", active);
    });
  };

  // ---------------------------------------------------------------- minimize
  Desktop.minimize = function (id, on) {
    const rec = this.wins.get(id);
    if (!rec) return;
    rec.min = on;
    rec.el.classList.toggle("hidden", on);
    rec.taskBtn.classList.toggle("active", false);
    if (on && this.activeId === id) {
      this.activeId = null;
      // focus the next visible window, if any
      let next = null;
      this.wins.forEach((r, rid) => { if (!r.min && rid !== id) next = rid; });
      if (next) this.focus(next);
    }
  };

  // ---------------------------------------------------------------- maximize
  Desktop.toggleMax = function (id) {
    const rec = this.wins.get(id);
    if (!rec) return;
    const btnMax = rec.el.querySelectorAll(".title-bar-controls button")[1];
    if (!rec.max) {
      rec.prevRect = { left: rec.el.style.left, top: rec.el.style.top, width: rec.el.style.width, height: rec.el.style.height };
      rec.el.classList.add("maximized");
      Object.assign(rec.el.style, { left: "0px", top: "0px", width: "100%", height: "100%" });
      btnMax.setAttribute("aria-label", "Restore");
      rec.max = true;
    } else {
      rec.el.classList.remove("maximized");
      if (rec.prevRect) Object.assign(rec.el.style, rec.prevRect);
      btnMax.setAttribute("aria-label", "Maximize");
      rec.max = false;
    }
    this.focus(id);
  };

  // ---------------------------------------------------------------- close
  Desktop.close = function (id) {
    const rec = this.wins.get(id);
    if (!rec) return;
    rec.el.remove();
    rec.taskBtn.remove();
    this.wins.delete(id);
    if (this.activeId === id) this.activeId = null;
  };

  // ---------------------------------------------------------------- dragging
  Desktop.makeDraggable = function (rec, handle) {
    let startX, startY, baseL, baseT, dragging = false;
    const area = $("#windows");
    const onDown = (e) => {
      if (rec.max) return;
      if (e.target.closest(".title-bar-controls")) return;
      dragging = true;
      rec.el.classList.add("dragging");
      startX = e.clientX; startY = e.clientY;
      baseL = parseInt(rec.el.style.left, 10) || 0;
      baseT = parseInt(rec.el.style.top, 10) || 0;
      handle.setPointerCapture && handle.setPointerCapture(e.pointerId);
      e.preventDefault();
    };
    const onMove = (e) => {
      if (!dragging) return;
      const w = rec.el.offsetWidth, h = rec.el.offsetHeight;
      let nl = baseL + (e.clientX - startX);
      let nt = baseT + (e.clientY - startY);
      nl = Math.max(-(w - 90), Math.min(nl, area.clientWidth - 40));
      nt = Math.max(0, Math.min(nt, area.clientHeight - 24));
      rec.el.style.left = nl + "px";
      rec.el.style.top = nt + "px";
    };
    const onUp = () => { dragging = false; rec.el.classList.remove("dragging"); };
    handle.addEventListener("pointerdown", onDown);
    handle.addEventListener("pointermove", onMove);
    handle.addEventListener("pointerup", onUp);
    handle.addEventListener("pointercancel", onUp);
  };

  // ---------------------------------------------------------------- start menu toggle
  Desktop.toggleStart = function () {
    const open = $("#startMenu").classList.toggle("hidden");
    $("#startBtn").classList.toggle("active", !open);
  };
  Desktop.closeStart = function () {
    $("#startMenu").classList.add("hidden");
    $("#startBtn").classList.remove("active");
  };

  // ---------------------------------------------------------------- clock
  Desktop.updateClock = function () {
    const now = new Date();
    let h = now.getHours(), m = now.getMinutes();
    const ap = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    const mm = m < 10 ? "0" + m : m;
    const c = $("#clock");
    if (c) {
      c.textContent = h + ":" + mm + " " + ap;
      c.title = now.toDateString();
    }
  };

  // ---------------------------------------------------------------- shutdown
  Desktop.shutdown = function () {
    $("#desktop").classList.add("hidden");
    $("#shutdown").classList.remove("hidden");
  };

  // ---------------------------------------------------------------- boot apps
  Desktop.openBootApps = function () {
    this.apps().filter((a) => a.openOnBoot).forEach((a) => this.openApp(a.id));
  };

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  window.Desktop = Desktop;
})();
