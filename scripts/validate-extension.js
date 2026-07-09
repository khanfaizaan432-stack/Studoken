const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const manifestPath = path.join(root, 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const requiredFiles = new Set(['manifest.json']);

function fail(message) {
  console.error(`extension validation failed: ${message}`);
  process.exit(1);
}

function requireFile(relativePath) {
  requiredFiles.add(relativePath);
  if (!fs.existsSync(path.join(root, relativePath))) fail(`missing ${relativePath}`);
}

if (manifest.manifest_version !== 3) fail('manifest_version must be 3');
if (!manifest.name || !manifest.version || !manifest.description) fail('manifest name/version/description required');
if (!manifest.action || !manifest.action.default_popup) fail('action.default_popup required');
requireFile(manifest.action.default_popup);

for (const script of ['src/compressor.js', 'popup.js', 'content.js']) requireFile(script);

for (const contentScript of manifest.content_scripts || []) {
  for (const js of contentScript.js || []) requireFile(js);
  if (!Array.isArray(contentScript.matches) || contentScript.matches.length === 0) fail('content script matches required');
}

const html = fs.readFileSync(path.join(root, manifest.action.default_popup), 'utf8');
for (const scriptMatch of html.matchAll(/<script\s+src="([^"]+)"/g)) requireFile(scriptMatch[1]);

const forbiddenPermissions = new Set(['tabs', 'history', 'bookmarks', 'cookies', 'webRequest']);
for (const permission of manifest.permissions || []) {
  if (forbiddenPermissions.has(permission)) fail(`overbroad permission detected: ${permission}`);
}

console.log(`extension validation passed (${requiredFiles.size} required files checked)`);
