# PHIT DAN

A small browser game about inserting a USB drive, with three endless modes.

## Run locally

From this folder, run `python -m http.server 8000 --bind 127.0.0.1` and visit `http://localhost:8000/`. See [README-GAME.md](README-GAME.md) for controls, local data, phone testing, and the optional transition preview.

## Tests

Run each `tests/*.cjs` file with Node.js. The game has no build step.

## Licensing

The game source is under the [MIT license](LICENSE). Bundled three.js has its own [MIT notice](vendor/THREE-LICENSE.txt). DM Sans and Kanit are distributed under the SIL Open Font License; see the notices in `assets/fonts/`.

The Info menu's optional links start unconfigured. Names, scores, settings, and player messages are stored in the browser; sharing is initiated by the player.
