# Changelog

All notable changes to Spectral Chromatin Coiler are documented here.

## 2.1.0 - Unreleased

### Added

- Reusable dependency-free compression engine in `src/compressor.js`.
- Compression profiles: Balanced, Aggressive, Faithful, and Study notes.
- Instruction-aware preservation for constraints and output-format requirements.
- Entity-aware scoring for names, acronyms, dates, numbers, percentages, currency values, and URLs.
- Protected handling for code blocks, inline code, and URLs.
- Popup controls for profiles and preservation toggles.
- Preview-first workflow with Copy, Inject Draft, and explicit Auto-submit actions.
- Local settings persistence and auto-compress while typing.
- Ctrl/Command + Enter compression shortcut.
- Dependency-free smoke tests, extension validation, and zip packaging.
- GitHub Actions CI workflow.
- Privacy, security, contribution, and QA documentation.

### Changed

- Refactored popup code into UI/controller logic only.
- Centralized ChatGPT/Claude text injection in `content.js`.
- Removed unnecessary Manifest V3 `scripting` permission.
- Rewrote README around installation, usage, architecture, and limitations.

### Security

- Default behavior is draft injection rather than automatic submission.
- No telemetry, API keys, remote inference, or network calls are included.
