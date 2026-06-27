# Browser Targets

This folder reserves target-specific files for browser ports while keeping the current project behavior unchanged.

## Current state

- Chrome remains the active target.
- The canonical manifest is at the repository root: `manifest.json`.
- Shared UI/runtime code stays under `src/`.

## Target folders

- `targets/chrome`: Chrome-specific overrides if needed later.
- `targets/firefox`: Firefox-specific overrides for future porting.
- `targets/edge`: Edge-specific overrides for future porting.

## Rules

- Prefer shared code first.
- Add only minimal per-browser differences in target folders.
- Do not duplicate full source trees per browser unless divergence becomes large.
