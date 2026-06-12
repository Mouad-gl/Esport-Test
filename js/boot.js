/* =============================================================================
   PORTFOLIO 98 — boot / loading screen
   ========================================================================== */
(function () {
  "use strict";

  const $ = (s) => document.querySelector(s);
  const Boot = {};

  function brand() {
    const name = (window.CONFIG && window.CONFIG.name) || "Portfolio";
    document.querySelectorAll(".boot-logo").forEach((logoEl) => {
      logoEl.innerHTML = "💾 " + name + "<span>98</span>";
    });
  }

  const MESSAGES = [
    [0, "Detecting hardware…"],
    [25, "Loading system files…"],
    [55, "Starting Portfolio98…"],
    [80, "Preparing the desktop…"],
    [100, "Ready."],
  ];

  Boot.run = function () {
    brand();
    const fill = $("#bootFill"), pct = $("#bootPct"), msg = $("#bootMsg");
    let p = 0;
    const tick = () => {
      p = Math.min(100, p + 4 + Math.random() * 12);
      fill.style.width = p + "%";
      pct.textContent = Math.floor(p) + "%";
      for (let i = MESSAGES.length - 1; i >= 0; i--) {
        if (p >= MESSAGES[i][0]) { msg.textContent = MESSAGES[i][1]; break; }
      }
      if (p >= 100) { clearInterval(this._t); setTimeout(() => this.showEnter(), 450); }
    };
    this._t = setInterval(tick, 220);
  };

  Boot.showEnter = function () {
    $("#boot").classList.add("hidden");
    $("#enter").classList.remove("hidden");
  };

  Boot.enterDesktop = function () {
    $("#boot").classList.add("hidden");
    $("#enter").classList.add("hidden");
    $("#desktop").classList.remove("hidden");
    window.Desktop.init();
    window.Desktop.openBootApps();
  };

  function start() {
    brand();
    const btn = $("#enterBtn");
    if (btn) btn.addEventListener("click", () => Boot.enterDesktop());
    Boot.run();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }

  window.Boot = Boot;
})();
