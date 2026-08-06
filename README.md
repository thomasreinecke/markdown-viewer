# markdown-viewer

A zero-dependency local Markdown viewer you can drop into any project directory and start in seconds.

**Three-pane layout** · sticky table of contents with scrollspy · dark mode · Mermaid diagrams · syntax highlighting · GitHub-style alerts · per-document scroll memory · resizable panes

---

## Install

### Global (run from any directory)

```bash
npm install -g @thomasreinecke/markdown-viewer
```

Then, in any directory that contains `.md` files:

```bash
markdown-viewer
```

### Local (per project)

```bash
npm install --save-dev @reineckef/markdown-viewer
```

Add to your `package.json`:

```json
{
  "scripts": {
    "docs": "markdown-viewer"
  }
}
```

Run with:

```bash
npm run docs
```

---

## Usage

```
markdown-viewer [port]
```

| Argument | Default | Description                        |
|----------|---------|------------------------------------|
| `port`   | `8080`  | Port to listen on (auto-increments if busy) |

The viewer automatically opens in your default browser and recursively scans all `.md` files in the **current working directory** (the directory you ran the command from).

---

## Features

| Feature | Details |
|---------|---------|
| **Three-pane layout** | Document list · Table of Contents · Content |
| **Scrollspy ToC** | Active heading tracked as you scroll; ToC auto-scrolls to keep it visible |
| **Instant ToC navigation** | Clicking a heading jumps instantly (no smooth-scroll lag) |
| **Dark mode** | Toggleable; respects `prefers-color-scheme` on first load |
| **Font size controls** | ±1px steps, persisted in localStorage |
| **Resizable panes** | Drag the dividers between all three panes |
| **Syntax highlighting** | Via [highlight.js](https://highlightjs.org/) |
| **Mermaid diagrams** | Fenced code blocks with ` ```mermaid ` are rendered |
| **GitHub alerts** | `[!NOTE]`, `[!TIP]`, `[!IMPORTANT]`, `[!WARNING]`, `[!CAUTION]` |
| **Copy code button** | Appears on hover on every code block |
| **Image serving** | Relative image paths resolved via the local server |
| **Scroll memory** | Scroll position saved per document across page reloads |
| **Collapsible sidebar** | Document list can be hidden |

---

## How it works

`markdown-viewer` starts a tiny **Node.js HTTP server** (no external npm dependencies) that:

1. Recursively scans `*.md` files in the current working directory (skipping `node_modules`, `.git`, `dist`, `build`, etc.)
2. Serves a self-contained `index.html` UI that fetches and renders documents on demand
3. Serves images and other assets referenced in the Markdown via a `/api/image` endpoint

All rendering happens **client-side** using [marked.js](https://marked.js.org/), [highlight.js](https://highlightjs.org/), and [Mermaid](https://mermaid.js.org/) — loaded from CDN.

---

## Skipped directories

`node_modules` · `.git` · `__pycache__` · `.svelte-kit` · `dist` · `build` · `.next` · `.nuxt` · `coverage` · `.cache` · `_viewer`

---

## Requirements

- Node.js ≥ 18

No npm dependencies — the server uses only Node.js built-ins.

---

## License

MIT © Thomas Reinecke
