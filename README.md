# 🖥️ Portfolio 98

A personal **portfolio site styled as a Windows 98 desktop** — boot screen, draggable
windows, a working Start menu + taskbar with a live clock, and desktop icons.
Inspired by sites like [yumicoradio.net](https://yumicoradio.net/).

Pure HTML/CSS/JS, **no build step and no dependencies to install**. Authentic UI
chrome comes from [98.css](https://jdan.github.io/98.css/) (MIT), vendored locally so
it works offline and on any static host.

## ▶️ Run it

- **Easiest:** just **double-click `index.html`** — it opens in your browser. (It uses
  plain scripts, so `file://` works; no server needed.)
- **Or serve it** (nice for the full experience):
  ```bash
  python3 -m http.server 8000   # then open http://localhost:8000
  ```

## ✏️ Add your content — edit one file

Everything you'd normally change lives in **[`js/apps.js`](js/apps.js)**:

- `CONFIG` — your name (shown as `YourName98` on the boot screen + Start menu).
- `APPS` — the list of desktop icons / windows. Each entry is one app:

  ```js
  {
    id: "about",            // unique id
    title: "About Me",      // title bar + taskbar text
    icon: "📄",             // desktop icon (any emoji/text)
    width: 420, height: 320,
    body: `<div class="win-content"> ...your HTML... </div>`,
    // optional:
    desktop: false,         // hide the desktop icon (still in Start menu)
    openOnBoot: true,       // auto-open this window when the desktop loads
  }
  ```

  Add an entry → a new icon + window appear automatically. Remove one → it's gone.
  Inside `body` you can use any [98.css component](https://jdan.github.io/98.css/)
  (buttons, tabs, tree-views, tables, etc.).

The four placeholder apps (About / Projects / Contact / My Computer) and the Welcome
window are just examples — replace their text with yours.

## 🌐 Host it

It's a static site, so anything works:

- **GitHub Pages:** Settings → Pages → *Deploy from a branch* → your branch → `/ (root)`.
  Served at `https://<user>.github.io/<repo>/`.
- **Netlify / Vercel / Cloudflare Pages:** drag-and-drop the folder, or connect the repo.

## 📁 Structure

```
index.html            # boot screen + desktop markup
css/desktop.css       # wallpaper, taskbar, start menu, icons, window layout
js/
├── apps.js           # ← YOUR CONTENT lives here (CONFIG + APPS)
├── desktop.js        # window manager: open/focus/drag/min/max/close, taskbar, clock
└── boot.js           # loading screen + "click to start"
vendor/
├── 98.css            # Windows 98 UI kit (MIT)
└── ms_sans_serif*    # the pixel font 98.css uses
```

## 🎮 Controls

- **Double-click** a desktop icon (or use **Start**) to open a window.
- **Drag** a window by its title bar · **□** maximize · **_** minimize · **✕** close.
- Click a **taskbar** button to focus / minimize a window.
- **Start → Shut Down** for the classic "It is now safe to turn off your computer".

---

98.css © Jordan Scales, MIT — see `vendor/98css-LICENSE.txt`.
