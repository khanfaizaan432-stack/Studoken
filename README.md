# 🧬 Spectral Chromatin Coiler

A privacy-first Chrome Extension that compresses long LLM prompts locally in the browser. It uses TF-IDF sentence vectors, spectral ranking, MMR deduplication, and lightweight phrase coiling to reduce prompt size while preserving the most central context.

## Why this exists

Most prompt compressors either require a server/GPU call or produce unreadable binary-style compression. SCC keeps everything client-side and outputs natural language that ChatGPT, Claude, and other LLMs can still read.

## What changed in v2.1

- Split the compression engine into `src/compressor.js` so it can be tested outside the popup.
- Removed duplicated injection logic from `popup.js`; `content.js` now owns page injection.
- Changed default behavior from auto-submit to safer **Inject Draft**.
- Added explicit **Copy** fallback and separate **Auto-submit** button.
- Added approximate-token counting that handles words, punctuation, numbers, CJK characters, and URLs better than raw whitespace counting.
- Added compression profiles: **Balanced**, **Aggressive**, **Faithful**, and **Study notes**.
- Added instruction-aware preservation for constraints such as must/never/always/format/return.
- Added entity-aware scoring for names, acronyms, numbers, dates, percentages, currency values, and URLs.
- Added code-block, URL, list, heading, instruction, and entity preservation controls.
- Added a final budget pass for target-token compression.
- Added local settings persistence, auto-compress while typing, and Ctrl/⌘ + Enter compression.
- Added dependency-free extension validation and zip packaging.
- Added GitHub Actions CI that runs tests and uploads an extension zip artifact.
- Reduced MV3 permissions by removing unnecessary `scripting`.

## Features

- **Local-only:** no API keys, no telemetry, no server.
- **Spectral sentence ranking:** finds central sentences using graph convergence.
- **MMR deduplication:** avoids keeping multiple sentences that say the same thing.
- **Constraint preservation:** keeps important instructions, output-format requirements, dates, numbers, names, URLs, and code blocks safer during compression.
- **Biological coiling:** low-ranked sentences are compressed into keyword phrases instead of simply deleted.
- **Safe workflow:** preview → copy/inject draft → send manually, unless you explicitly choose auto-submit.
- **Fast UX:** optional auto-compress, saved slider/settings, keyboard shortcut, clear button, and second-pass compression.
- **Manifest V3:** modern Chrome extension format with minimal permissions.

## Compression profiles

- **Balanced:** default mode for general prompts.
- **Aggressive:** higher savings, stronger coiling, final budget pass enabled.
- **Faithful:** keeps more context and avoids the strict final budget pass.
- **Study notes:** tuned for lecture notes and long explanatory text.

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
3. Paste a long prompt, notes, transcript, or document excerpt.
4. Choose a compression profile and optionally set a **Max approx tokens** budget.
5. Use the preservation toggles if you need to protect code, URLs, instructions, entities, lists, or headings.
6. Click **Compress** or press Ctrl/⌘ + Enter.
7. Review the preview.
8. Use **Copy**, **Inject Draft**, or **Auto-submit**.

## Development

Run all checks:

```bash
npm test
```

Build an unpacked-extension zip:

```bash
npm run build
```

The extension has no npm dependency requirement. The build script writes `dist/spectral-chromatin-coiler.zip`.

## Architecture

```text
.github/workflows/ci.yml   # CI test + package artifact
manifest.json
popup.html                 # Extension UI
popup.js                   # Popup controls, saved settings, metrics
content.js                 # ChatGPT/Claude text injection
src/compressor.js          # Compression engine, browser + Node compatible
scripts/                   # Validation and zip packaging
tests/                     # Dependency-free smoke tests
```

## Limits

The token count is an approximation, not a provider tokenizer. It is useful for relative savings and budget targeting, but it is not guaranteed to match OpenAI/Anthropic tokenizers exactly. Heavy compression can still remove nuance, so review the preview before sending critical prompts.
