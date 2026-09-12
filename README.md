# Dice Tray

A simple dice tray for tabletop role-playing games. Pick how many of each die you
want (d4, d6, d8, d10, d12, d20, d100) in the side panel, add a modifier, and roll.
The dice tumble across a green felt tray in 3D, and the results panel shows every
individual die, per-die subtotals and the grand total. A history of recent rolls
lets you roll the same set again.

Built with Angular and Angular Material. The 3D tray is
[@3d-dice/dice-box](https://www.npmjs.com/package/@3d-dice/dice-box), which runs its
physics in a web worker; the value shown for each die is the face it lands on. If
WebGL is unavailable the app falls back to a plain random-number roll. Your selection
and history are kept in the browser's local storage, so they survive a reload.

## Development

Requires Node.js 22.22.3 or newer (24 recommended).

```sh
npm install
npm start        # dev server at http://localhost:4200
npm test         # unit tests (Vitest)
npm run build    # production build in dist/dice-tray/browser
```

The dice models, textures and physics engine that dice-box needs are copied from
`node_modules/@3d-dice/dice-box/dist/assets` into `assets/dice-box/` by the build
(see the `assets` entry in `angular.json`), so nothing has to be checked in.

## Hosting on GitHub Pages

The workflow in `.github/workflows/deploy.yml` builds the app and publishes it to
GitHub Pages on every push to `main`. To enable it once:

1. Open the repository's **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.

The next push to `main` (or a manual run of the workflow) deploys the app to
`https://<owner>.github.io/<repository>/`. The build passes `--base-href` with the
repository name, so the app also works if the repository is renamed.
