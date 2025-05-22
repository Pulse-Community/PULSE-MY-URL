# AGENTS

This repository contains **PULSE MY URL**, a Chrome extension that sends the current tab URL and optional page content to configurable webhooks. The project is mostly written in German. Keep documentation and comments in German when possible.

## Repository Layout
- `html/` – Popup and options pages.
- `js/` – Background, content, popup and options scripts.
- `styles/` – Tailwind CSS sources under `styles/src`. Compiled CSS goes to `styles/dist` (ignored in git).
- `icons/` – Extension icon.
- `manifest.json` – Chrome extension manifest.

## Setup
1. Install dependencies (Node.js ≥16):
   ```bash
   npm install
   ```
2. Build the CSS after changing styles or the Tailwind config:
   ```bash
   npm run build:css
   ```
3. Load the extension unpacked via `chrome://extensions`.

## Contribution Guidelines
- Use ES6 JavaScript without frameworks.
- Run `npm run build:css` whenever you modify styles.
- Do not commit files in `node_modules/`, `dist/` or other ignored directories.
- Keep commit messages in German or English, short and descriptive.
- Update the README in German when adding features or changes.

## Packaging
To create a zip for the Chrome Web Store, follow the steps in `README.md` (see "Selbst packen für den Chrome Web Store").

