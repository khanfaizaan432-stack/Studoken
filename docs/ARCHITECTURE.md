# Architecture

Spectral Chromatin Coiler is a small Manifest V3 Chrome extension. It is intentionally dependency-free so it can be reviewed, loaded, and packaged with only Node.js and Chrome.

## Runtime pieces

```text
manifest.json
popup.html
popup.js
content.js
src/compressor.js
```

## Data flow

1. The user pastes text into the popup.
2. `popup.js` reads the selected profile, token budget, and preservation toggles.
3. `src/compressor.js` compresses the prompt locally in the popup context.
4. The user reviews the compressed preview.
5. The user chooses one of:
   - Copy
   - Inject Draft
   - Auto-submit
6. `content.js` receives an explicit message from the popup and injects text into the supported active page.

## Compression engine

The engine combines several lightweight techniques:

- approximate token counting
- sentence splitting with list/heading awareness
- protected block splitting for code and URLs
- TF-IDF sentence vectors
- spectral graph ranking
- MMR selection to reduce redundancy
- phrase coiling for lower-ranked sentences
- instruction and entity preservation boosts
- optional final target-budget pass

## Safety boundaries

The extension should not silently send text. Auto-submit exists only as an explicit button separate from Inject Draft.

The extension should not store raw prompt text permanently. UI settings are allowed to persist; pasted prompt content should remain session-local.

The extension should not add remote inference or telemetry unless it becomes an explicit, documented, opt-in feature.

## Testing strategy

Automated tests cover the compressor and extension manifest validation. Manual QA is still required for browser DOM injection because ChatGPT and Claude can change their prompt-box markup.
