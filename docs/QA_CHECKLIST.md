# Manual QA Checklist

Use this checklist before merging changes that touch the popup, content script, manifest, or compressor.

## Automated checks

```bash
npm test
npm run build
```

Expected result:

- compressor smoke tests pass
- extension validation passes
- `dist/spectral-chromatin-coiler.zip` is generated

## Chrome extension loading

- Open `chrome://extensions/`.
- Enable Developer mode.
- Click Load unpacked.
- Select the repository root.
- Confirm no manifest errors appear.
- Pin the extension.

## Popup behavior

- Paste a long prompt.
- Test each profile: Balanced, Aggressive, Faithful, Study notes.
- Confirm token metrics update.
- Confirm Ctrl/Command + Enter compresses.
- Confirm auto-compress can be toggled off.
- Confirm settings are restored after closing/reopening the popup.
- Confirm Clear resets input, preview, and metrics.
- Confirm Use preview as input performs a second compression pass.

## Preservation behavior

Use a prompt containing:

- a URL
- a code block
- a date
- a currency value
- a numbered list
- an explicit instruction such as `MUST preserve this output format`

Confirm those elements survive reasonable compression.

## ChatGPT injection

- Open ChatGPT.
- Compress a prompt.
- Click Inject Draft.
- Confirm text appears in the prompt box but is not sent.
- Click Auto-submit only after confirming you are okay sending the test prompt.

## Claude injection

- Open Claude.
- Repeat the Inject Draft test.
- Confirm text appears in the prompt box but is not sent.

## Regression risks

Review carefully if a change touches:

- `manifest.json` permissions
- `content.js` selectors
- auto-submit behavior
- clipboard behavior
- local storage behavior
- URL/code preservation
