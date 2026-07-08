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

console.log('compressor smoke tests passed');
