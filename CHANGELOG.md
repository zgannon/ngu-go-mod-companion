# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog.

## [0.1.0] - 2026-06-27

### Added

- Initial Chrome Extension (Manifest V3) release for NGU GO Mod Companion.
- Core GO action runner via popup UI with grouped sections:
  - Sync NGU -> GO
  - Sync GO -> NGU
  - Custom helpers
  - Danger zone
- Danger-zone arming flow for destructive hack-target reset action.
- Theme toggle (light/dark) and persistent theme preference.
- About page content sourced from README sections.
- Popout view mode.
- Side panel view mode and background-side behavior routing for supported windows.
- View switching controls between popup, popout, and side panel.

### Changed

- GO tab detection now supports cross-window targeting for persistent views.
- Non-GO state now supports actionable status controls:
  - Switch to an already open GO tab
  - Open a new GO tab
- Header view buttons now use compact icon controls.
- View-switch availability is restricted when current tab is not GO.
- Side panel controls are disabled in unsupported PWA/app window contexts.

### Notes

- Version `0.1.0` is the initial publish/release baseline.
