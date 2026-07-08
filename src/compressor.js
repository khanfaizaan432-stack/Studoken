/* Spectral Chromatin Coiler engine: browser + Node compatible, dependency-free. */
(function attachScc(global) {
  'use strict';

  const STOP_WORDS = new Set([
    'the','is','are','was','were','to','of','and','in','that','it','on','with','as','for','a','an',
    'be','been','has','have','had','do','does','did','will','would','could','should','may','might',
    'shall','can','not','no','but','or','if','then','than','too','very','just','about','also','such',
    'this','these','those','each','every','both','few','more','most','other','some','only','own',
    'same','so','at','by','from','up','out','off','over','under','again','further','once','here',
    'there','when','where','why','how','all','any','into','during','before','after','above','below'
  ]);

  const DEFAULT_OPTIONS = Object.freeze({
    keepRatio: 0.5,
    targetTokens: null,
    minKeepRatio: 0.08,
    maxKeepRatio: 0.9,
    coilingStrength: 0.8,
    preserveCodeBlocks: true,
    preserveListItems: true
  });

  function clamp(value, min, max) {
    const n = Number(value);
    if (!Number.isFinite(n)) return min;
    return Math.min(max, Math.max(min, n));
  }

  function countApproxTokens(text) {
    if (!text) return 0;
    const matches = String(text).match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]|[A-Za-z]+(?:'[A-Za-z]+)?|\d+(?:\.\d+)?|[^\s\w]/gu);
    return matches ? matches.length : 0;
  }

  function splitProtectedBlocks(text) {
    const parts = [];
    const regex = /(```[\s\S]*?```|`[^`\n]+`)/g;
    let last = 0;
    let match;
    while ((match = regex.exec(text)) !== null) {
      if (match.index > last) parts.push({ type: 'text', value: text.slice(last, match.index) });
      parts.push({ type: 'code', value: match[0] });
      last = regex.lastIndex;
    }
    if (last < text.length) parts.push({ type: 'text', value: text.slice(last) });
    return parts;
  }

  function splitSentences(text) {
    return String(text)
      .replace(/\r\n/g, '\n')
      .split(/(?<=[.!?])\s+|\n{2,}/g)
      .map(s => s.trim().replace(/\s+/g, ' '))
      .filter(s => /[\p{L}\p{N}]/u.test(s));
  }

  function tokenizeWords(text) {
    const words = String(text).toLowerCase().match(/\b[a-z][a-z0-9'-]*\b/g) || [];
    return words.filter(w => w.length > 1 && !STOP_WORDS.has(w));
  }

  function sentenceBagOfWords(sentence) {
    const freq = Object.create(null);
    for (const word of tokenizeWords(sentence)) freq[word] = (freq[word] || 0) + 1;
    return freq;
  }

  function computeTFIDF(sentences) {
    const bags = sentences.map(sentenceBagOfWords);
    const docCount = Math.max(1, sentences.length);
    const df = Object.create(null);
    for (const bag of bags) for (const term of new Set(Object.keys(bag))) df[term] = (df[term] || 0) + 1;
    return bags.map(bag => {
      const vec = Object.create(null);
      const maxFreq = Math.max(1, ...Object.values(bag));
      for (const [term, freq] of Object.entries(bag)) {
        const tf = freq / maxFreq;
        const idf = Math.log((docCount + 1) / ((df[term] || 0) + 1)) + 1;
        vec[term] = tf * idf;
      }
      return vec;
    });
  }

  function cosineSimilarity(vecA, vecB) {
    let dot = 0, magA = 0, magB = 0;
    for (const [term, value] of Object.entries(vecA)) {
      dot += value * (vecB[term] || 0);
      magA += value * value;
    }
    for (const value of Object.values(vecB)) magB += value * value;
    const denom = Math.sqrt(magA) * Math.sqrt(magB);
    return denom === 0 ? 0 : dot / denom;
  }

  function buildSimilarityMatrix(vectors) {
    const n = vectors.length;
    const matrix = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      matrix[i][i] = 1;
      for (let j = i + 1; j < n; j++) {
        const sim = cosineSimilarity(vectors[i], vectors[j]);
        matrix[i][j] = sim;
        matrix[j][i] = sim;
      }
    }
    return matrix;
  }

  function spectralRank(simMatrix) {
    const n = simMatrix.length;
    if (n === 0) return [];
    const damping = 0.85;
    let rank = new Array(n).fill(1 / n);
    const transition = simMatrix.map(row => {
      const sum = row.reduce((a, b) => a + b, 0);
      return sum === 0 ? new Array(n).fill(1 / n) : row.map(v => v / sum);
    });
    for (let iter = 0; iter < 50; iter++) {
      const next = new Array(n).fill((1 - damping) / n);
      for (let from = 0; from < n; from++) for (let to = 0; to < n; to++) next[to] += damping * rank[from] * transition[from][to];
      let diff = 0;
      for (let i = 0; i < n; i++) diff = Math.max(diff, Math.abs(next[i] - rank[i]));
      rank = next;
      if (diff < 1e-6) break;
    }
    return rank;
  }

  function mmrSelect(scores, simMatrix, keepCount, lambda = 0.72) {
    const target = clamp(Math.round(keepCount), 0, scores.length);
    const selected = [];
    const remaining = new Set(scores.map((_, i) => i));
    while (selected.length < target && remaining.size > 0) {
      let bestIdx = -1, bestScore = -Infinity;
      for (const idx of remaining) {
        const redundancy = selected.reduce((max, selectedIdx) => Math.max(max, simMatrix[idx][selectedIdx] || 0), 0);
        const value = lambda * scores[idx] - (1 - lambda) * redundancy;
        if (value > bestScore) { bestScore = value; bestIdx = idx; }
      }
      selected.push(bestIdx);
      remaining.delete(bestIdx);
    }
    return new Set(selected);
  }

  function buildWordScores(sentences) {
    const scores = Object.create(null);
    for (const sentence of sentences) for (const word of tokenizeWords(sentence)) scores[word] = (scores[word] || 0) + 1;
    const max = Math.max(1, ...Object.values(scores));
    for (const word of Object.keys(scores)) scores[word] = scores[word] / max;
    return scores;
  }

  function isStructureLine(sentence) {
    return /^(\s*[-*+]\s+|\s*\d+[.)]\s+|#{1,6}\s+)/.test(sentence);
  }

  function extractKeyPhrases(sentence, wordScores, strength) {
    const rawWords = String(sentence).match(/[A-Za-z][A-Za-z0-9'-]*/g) || [];
    const phrases = [];
    let phrase = [], score = 0;
    function flush() {
      if (!phrase.length) return;
      phrases.push({ text: phrase.join(' '), score });
      phrase = []; score = 0;
    }
    for (const word of rawWords) {
      const lower = word.toLowerCase();
      if (STOP_WORDS.has(lower) || lower.length <= 1) flush();
      else { phrase.push(word); score += wordScores[lower] || 0.05; }
    }
    flush();
    if (!phrases.length) return sentence;
    const avg = phrases.reduce((sum, p) => sum + p.score, 0) / phrases.length;
    const threshold = avg * clamp(strength, 0.35, 1.25);
    const kept = phrases.filter(p => p.score >= threshold).sort((a, b) => sentence.indexOf(a.text) - sentence.indexOf(b.text)).map(p => p.text);
    return kept.length ? kept.join(' · ') : phrases.sort((a, b) => b.score - a.score).slice(0, 2).map(p => p.text).join(' · ');
  }

  function coilSentence(sentence, wordScores, options) {
    const clean = sentence
      .replace(/\s*\([^)]{0,120}\)/g, '')
      .replace(/,\s*(which|that|who)\s+[^,.;!?]+/gi, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
    if (options.preserveListItems && isStructureLine(clean)) return clean;
    if (countApproxTokens(clean) <= 14) return clean;
    const coiled = extractKeyPhrases(clean, wordScores, options.coilingStrength);
    return countApproxTokens(coiled) < Math.ceil(countApproxTokens(clean) * 0.85) ? coiled : clean;
  }

  function compressSegment(text, options) {
    const sentences = splitSentences(text);
    const originalTokens = countApproxTokens(text);
    if (sentences.length <= 1) return { compressedText: text.trim(), originalTokens, newTokens: originalTokens, sentenceCount: sentences.length };
    const vectors = computeTFIDF(sentences);
    const simMatrix = buildSimilarityMatrix(vectors);
    const scores = spectralRank(simMatrix);
    const keepCount = Math.max(1, Math.round(sentences.length * clamp(options.keepRatio, 0.01, 1)));
    const exonSet = mmrSelect(scores, simMatrix, keepCount);
    const wordScores = buildWordScores(sentences);
    const finalSentences = sentences.map((sentence, index) => exonSet.has(index) ? sentence : coilSentence(sentence, wordScores, options));
    const compressedText = finalSentences.join(' ').replace(/\s{2,}/g, ' ').trim();
    return { compressedText, originalTokens, newTokens: countApproxTokens(compressedText), sentenceCount: sentences.length };
  }

  function compressWithRatio(text, keepRatio = DEFAULT_OPTIONS.keepRatio, rawOptions = {}) {
    const options = { ...DEFAULT_OPTIONS, ...rawOptions, keepRatio };
    const originalTokens = countApproxTokens(text);
    const parts = options.preserveCodeBlocks ? splitProtectedBlocks(String(text)) : [{ type: 'text', value: String(text) }];
    let sentenceCount = 0;
    const compressedParts = parts.map(part => {
      if (part.type === 'code') return part.value.trim();
      const result = compressSegment(part.value, options);
      sentenceCount += result.sentenceCount;
      return result.compressedText;
    }).filter(Boolean);
    const compressedText = compressedParts.join('\n\n').trim();
    const newTokens = countApproxTokens(compressedText);
    return { compressedText, originalTokens, newTokens, savedTokens: Math.max(0, originalTokens - newTokens), percentSaved: originalTokens ? Math.max(0, ((originalTokens - newTokens) / originalTokens) * 100) : 0, sentenceCount, mode: 'ratio' };
  }

  function compressToTarget(text, targetTokens, rawOptions = {}) {
    const target = Math.max(1, Math.floor(Number(targetTokens) || 1));
    const originalTokens = countApproxTokens(text);
    if (originalTokens <= target) return { compressedText: String(text), originalTokens, newTokens: originalTokens, savedTokens: 0, percentSaved: 0, sentenceCount: splitSentences(text).length, mode: 'target', targetTokens: target, hitTarget: true };
    const options = { ...DEFAULT_OPTIONS, ...rawOptions };
    let low = options.minKeepRatio, high = options.maxKeepRatio, best = null;
    for (let i = 0; i < 18; i++) {
      const mid = (low + high) / 2;
      const result = compressWithRatio(text, mid, options);
      if (result.newTokens <= target) { best = result; low = mid; }
      else high = mid;
    }
    if (!best) best = compressWithRatio(text, options.minKeepRatio, { ...options, coilingStrength: 1.15 });
    return { ...best, mode: 'target', targetTokens: target, hitTarget: best.newTokens <= target };
  }

  function compress(text, rawOptions = {}) {
    const options = { ...DEFAULT_OPTIONS, ...rawOptions };
    if (options.targetTokens && Number(options.targetTokens) > 0) return compressToTarget(text, options.targetTokens, options);
    return compressWithRatio(text, options.keepRatio, options);
  }

  const api = { STOP_WORDS, countApproxTokens, splitSentences, tokenizeWords, computeTFIDF, cosineSimilarity, spectralRank, mmrSelect, compressWithRatio, compressToTarget, compress };
  global.SpectralChromatinCoiler = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
