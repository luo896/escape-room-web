# Project guidance

- This is a dependency-free static web game.
- Keep all player-facing text in Japanese unless requested otherwise.
- Preserve keyboard accessibility and mobile layouts.
- Do not add a build step unless a feature genuinely requires one.
- After JavaScript changes, run `node --check game.js`.
- Test the complete path: start, inspect four objects, open door, reach ending, replay.
- For mobile regressions, run `node tests/mobile-smoke.mjs` against a Chrome CDP session.
