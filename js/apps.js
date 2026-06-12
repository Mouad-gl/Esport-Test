/* =============================================================================
   PORTFOLIO 98 — CONTENT REGISTRY
   -----------------------------------------------------------------------------
   This is the ONLY file you normally need to edit.

   • Change CONFIG for the name shown on the boot screen / start menu.
   • Add, remove or edit entries in APPS to change the desktop.

   Each app = one desktop icon + one window. Fields:
     id        unique string (no spaces)
     title     text in the window title bar + taskbar
     icon      emoji (or any text) shown on the desktop icon
     body      HTML string shown inside the window  ← put your content here
     width     window width  in px   (optional, default 420)
     height    window height in px   (optional, default 300)
     desktop   set false to hide the desktop icon (still openable from Start)
     openOnBoot set true to auto-open the window when the desktop loads
   ========================================================================== */

window.CONFIG = {
  name: "Portfolio",          // shown as  Portfolio98
  author: "Your Name",
};

window.APPS = [
  {
    id: "welcome",
    title: "Welcome",
    icon: "👋",
    desktop: false,
    openOnBoot: true,
    width: 440, height: 250,
    body: `
      <div class="win-content">
        <h2>👋 Welcome to my desktop</h2>
        <p>This is a Windows 98 themed portfolio. Double-click the icons on the
        desktop, or use the <b>Start</b> menu, to explore.</p>
        <p>Drag windows by their title bar. Minimize / maximize / close with the
        buttons in the top-right of each window.</p>
        <div class="placeholder-note">📝 Placeholder text — edit me in
        <code>js/apps.js</code>.</div>
      </div>`,
  },

  {
    id: "about",
    title: "About Me",
    icon: "📄",
    width: 420, height: 320,
    body: `
      <div class="win-content">
        <h2>About Me</h2>
        <p>Hi, I'm <b>Your Name</b> — a [role] based in [place]. I like building
        [things] and [interests].</p>
        <h3>Skills</h3>
        <ul>
          <li>Thing one</li>
          <li>Thing two</li>
          <li>Thing three</li>
        </ul>
        <div class="placeholder-note">📝 Replace this with your real bio.</div>
      </div>`,
  },

  {
    id: "projects",
    title: "My Projects",
    icon: "📁",
    width: 500, height: 360,
    body: `
      <div class="win-content">
        <h2>My Projects</h2>
        <ul class="tree-view" style="height:auto">
          <li>📦 <a href="#">Project One</a> — short description</li>
          <li>📦 <a href="#">Project Two</a> — short description</li>
          <li>📦 <a href="#">Project Three</a> — short description</li>
        </ul>
        <p style="margin-top:10px">Click a project to link out to it (add your
        real URLs in <code>js/apps.js</code>).</p>
        <div class="placeholder-note">📝 List your real projects here.</div>
      </div>`,
  },

  {
    id: "contact",
    title: "Contact",
    icon: "✉️",
    width: 380, height: 280,
    body: `
      <div class="win-content">
        <h2>Get in touch</h2>
        <p>📧 <a href="mailto:you@example.com">you@example.com</a></p>
        <p>🐙 <a href="#" target="_blank" rel="noopener">github.com/you</a></p>
        <p>💼 <a href="#" target="_blank" rel="noopener">linkedin.com/in/you</a></p>
        <p>🐦 <a href="#" target="_blank" rel="noopener">@you</a></p>
        <div class="placeholder-note">📝 Swap in your real links.</div>
      </div>`,
  },

  {
    id: "mycomputer",
    title: "My Computer",
    icon: "🖥️",
    width: 460, height: 300,
    body: `
      <div class="win-content">
        <h2>🖥️ My Computer</h2>
        <table style="width:100%">
          <thead><tr><th>Device</th><th>Detail</th></tr></thead>
          <tbody>
            <tr><td>💾 Local Disk (C:)</td><td>nostalgia, 640 KB free</td></tr>
            <tr><td>🧠 Processor</td><td>Pentium™ (vibes)</td></tr>
            <tr><td>🎨 Theme</td><td>98.css</td></tr>
          </tbody>
        </table>
        <div class="placeholder-note">📝 Just for fun — customize freely.</div>
      </div>`,
  },
];
