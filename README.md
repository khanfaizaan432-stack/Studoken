# Spectral Chromatin Coiler

[![CI](https://github.com/khanfaizaan432-stack/Studoken/actions/workflows/ci.yml/badge.svg)](https://github.com/khanfaizaan432-stack/Studoken/actions/workflows/ci.yml)

Spectral Chromatin Coiler is a privacy-first Chrome extension for compressing long LLM prompts locally in the browser. It combines semantic sentence ranking, redundancy reduction, phrase coiling, and preservation controls so long notes, transcripts, and prompts become shorter while keeping the important constraints intact.

## Highlights

- **Local-first:** no API keys, telemetry, server calls, or remote inference.
- **Semantic compression:** TF-IDF sentence vectors, spectral ranking, and MMR deduplication.
- **Preservation-aware:** protects instructions, output formats, code, URLs, names, dates, numbers, and list structure.
- **Preview-first workflow:** review compressed text before copying, injecting a draft, or explicitly auto-submitting.
- **Dependency-free:** tests, validation, and packaging run with Node.js only.
- **Manifest V3:** minimal extension permissions with `activeTab` only.

## Compression profiles

| Profile | Use case | Behavior |
| --- | --- | --- |
| Balanced | General prompts | Good default tradeoff between compression and fidelity |
| Aggressive | Hard token budgets | Stronger coiling and final budget trimming |
| Faithful | Important context | Keeps more context and avoids strict final trimming |
| Study notes | Lectures and notes | Tuned for explanatory text and revision material |

## Installation

1. Clone or download this repository.
2. Open Chrome and go to `chrome://extensions/`.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the repository folder containing `manifest.json`.
6. Pin the extension.

## Usage

1. Open ChatGPT or Claude in the active tab.
2. Open the extension popup.
3. Paste a long prompt, transcript, notes, or document excerpt.
4. Choose a compression profile and optionally set a **Max approx tokens** budget.
5. Use preservation toggles for code/URLs, lists/headings, instructions, and names/numbers.
6. Click **Compress** or press Ctrl/Command + Enter.
7. Review the preview.
8. Choose **Copy**, **Inject Draft**, or **Auto-submit**.

## Development

Run all checks:

```bash
npm test
```

Build a Chrome-extension zip:

```bash
npm run build
```

The build output is written to `dist/spectral-chromatin-coiler.zip`.

## Repository structure

```text
.github/                 # CI workflow and issue/PR templates
docs/                    # Architecture and QA documentation
scripts/                 # Dependency-free validation and zip packaging
src/compressor.js        # Browser + Node compatible compression engine
tests/                   # Compressor smoke tests
content.js               # ChatGPT/Claude draft injection
manifest.json            # Manifest V3 extension config
popup.html               # Popup UI
popup.js                 # Popup controller, metrics, settings, injection calls
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Manual QA checklist](docs/QA_CHECKLIST.md)
- [Privacy policy](PRIVACY.md)
- [Security policy](SECURITY.md)
- [Contributing guide](CONTRIBUTING.md)
- [Changelog](CHANGELOG.md)

## Privacy and safety

Compression runs locally in your browser. The extension does not send prompt text to a server, analytics provider, model API, or remote database. UI settings may be saved locally so the popup can restore your preferred profile and toggles.

The default workflow is **Inject Draft**, not silent sending. **Auto-submit** is exposed as a separate explicit button.

## Limitations

The token count is an approximation, not a provider-specific tokenizer. It is useful for relative savings and budget targeting, but it is not guaranteed to exactly match OpenAI, Anthropic, or other tokenizer counts.

Heavy compression can remove nuance. Review the preview before sending critical prompts.
