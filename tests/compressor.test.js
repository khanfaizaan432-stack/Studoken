const assert = require('assert');
const scc = require('../src/compressor.js');

const sample = `
Machine learning models require careful validation. The validation process prevents overfitting and exposes data leakage.
The dataset contains patient records, laboratory values, and longitudinal outcomes. Patient identifiers must never be sent to external services.
The model should report sensitivity, specificity, calibration, and confidence intervals.
The deployment plan should include monitoring, rollback, audit logs, and human review.
`;

const compressed = scc.compressWithRatio(sample, 0.45);

assert.ok(compressed.compressedText.length > 0, 'compressed text should not be empty');
assert.ok(compressed.newTokens <= compressed.originalTokens, 'compression should not increase token count');
assert.ok(compressed.sentenceCount >= 3, 'should detect multiple sentences');

const targeted = scc.compressToTarget(sample, Math.max(10, Math.floor(compressed.originalTokens * 0.65)));
assert.ok(targeted.compressedText.length > 0, 'target compression should return text');
assert.strictEqual(targeted.mode, 'target');

const codeSample = 'Keep this code:\n```js\nfunction hello() { return "world"; }\n```\nThis paragraph can be compressed because it repeats repeated repeated details.';
const codeResult = scc.compress(codeSample, { keepRatio: 0.2, preserveCodeBlocks: true });
assert.ok(codeResult.compressedText.includes('function hello()'), 'code fences should be preserved');

const instructionSample = `
Ignore casual commentary if needed. IMPORTANT: always preserve the output format exactly.
The background section repeats repeats repeats implementation context for compression testing.
Return JSON with keys summary, risks, and next_steps. Do not include markdown.
The team met on 2026-07-09 and approved Budget ₹50000 for Project Aiden.
`;
const aggressive = scc.compress(instructionSample, { profile: 'aggressive', targetTokens: 45 });
assert.ok(/always preserve/i.test(aggressive.compressedText), 'critical instruction should be preserved');
assert.ok(/Return JSON/i.test(aggressive.compressedText), 'output format instruction should be preserved');
assert.ok(/2026-07-09|₹50000|Project Aiden/.test(aggressive.compressedText), 'entity/numeric details should survive');
assert.ok(aggressive.newTokens <= aggressive.originalTokens, 'aggressive compression should not expand');

const urlSample = 'Read https://example.com/paper?id=123 before summarizing. This sentence is filler filler filler filler filler.';
const urlResult = scc.compress(urlSample, { profile: 'aggressive', keepRatio: 0.1, preserveCodeBlocks: true });
assert.ok(urlResult.compressedText.includes('https://example.com/paper?id=123'), 'URLs should be preserved');

console.log('compressor smoke tests passed');
