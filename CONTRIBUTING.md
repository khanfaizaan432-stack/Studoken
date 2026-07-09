# Contributing

Thanks for improving Spectral Chromatin Coiler. The project is intentionally small, local-first, and dependency-free.

## Development setup

```bash
npm test
npm run build
```

Load the repository folder as an unpacked extension from `chrome://extensions/` after making UI or content-script changes.

## Pull request checklist

Before opening or merging a pull request:

- Run `npm test`.
- Run `npm run build`.
- Test the popup as an unpacked Chrome extension.
- Confirm **Inject Draft** does not auto-send.
- Confirm **Auto-submit** is still an explicit user action.
- Test at least one ChatGPT prompt box and one Claude prompt box when changing `content.js`.
- Add or update tests when changing `src/compressor.js`.
- Update `README.md` or docs when changing user-facing behavior.

## Compression quality guidelines

Prioritize preserving meaning over maximizing token savings. Heavy compression should still keep:

- explicit user instructions and output format requirements
- URLs, code, commands, dates, numbers, names, and currency values
- list structure and headings when preservation is enabled

## Privacy guidelines

Do not add telemetry, network calls, remote inference, or API keys without documenting the change clearly and making it opt-in. The default product promise is local-only compression.
