# Sudoku Solver

A step-by-step Sudoku solver in plain HTML, CSS, and TypeScript (no framework).

## Run it

Open `index.html` in a browser. A prebuilt `dist/app.js` is included, so no install is needed.

## Edit the code

```
npm install
npm run build      # type-check, then bundle src/main.ts into dist/app.js
npm run watch      # rebuild on every change
npm run typecheck  # type-check only
```

## Files

- `index.html`: page structure (Solver and Learn views)
- `styles.css`: monochrome theme (light and dark)
- `src/solver.ts`: solving algorithm (bitmask backtracking, fewest candidates first)
- `src/main.ts`: grid, controls, step-through workflow, theme toggle
- `dist/app.js`: bundled output loaded by `index.html`

## Logo and icons

- `favicon.svg`: bulb-only tab icon (dark ink on light, light ink on dark, follows the browser theme); `assets/favicon-48.png` is the fallback for browsers without SVG favicons
- `assets/logo-on-light.svg`, `assets/logo-on-dark.svg`: fixed-color versions of the mark
- `assets/icon-192.png`, `icon-512.png`, `apple-touch-icon.png`: app icons (light mark on a dark tile)
- `manifest.webmanifest`: app name and icons for "Add to Home Screen"
- The navbar uses the same mark inline in `index.html`, drawn with `currentColor` so it inverts with the theme switch.
