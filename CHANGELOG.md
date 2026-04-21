# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] — 2026-04-21

### Added

- `ccm init` to clone or create a memory repo and install services/hooks in one shot.
- `ccm status`, `ccm sync`, `ccm uninstall` user-facing commands.
- `ccm watch`, `ccm pull`, `ccm hook <event>` internal commands for services/hooks.
- macOS `launchd` and Linux `systemd --user` service installers.
- `chokidar`-based file watchdog with debounced commit+push.
- `SessionStart` hook injects `MEMORY.md`, `projects.md`, `user_profile.md`, and the latest daily note.
- `UserPromptSubmit` hook does throttled background pull and notifies on SHA change.
- Starter PARA content for `ccm init --empty`.
- Optional `.claude-memory.json` per-repo config.
