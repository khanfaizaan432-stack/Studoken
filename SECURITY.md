# Security Policy

## Supported versions

The `main` branch is the supported development line.

## Reporting a vulnerability

If you find a security issue, please open a private advisory if available or contact the repository owner directly. Avoid posting sensitive exploit details in a public issue.

## Security expectations

This extension should remain:

- local-first by default
- free of telemetry and hidden network calls
- minimal-permission under Manifest V3
- preview-first before sending text to a chat interface

## Areas to review carefully

Security-sensitive changes include:

- new permissions in `manifest.json`
- new network calls
- content-script selector changes
- auto-submit behavior
- clipboard behavior
- persistence of user-provided prompt text

Any pull request touching those areas should include manual testing notes.
