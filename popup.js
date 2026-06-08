// --- Helper: tokenize a sentence into a bag-of-words frequency map ---
function cleanAndTokenize(text) {
  const words = text.toLowerCase().match(/\b[a-z]+\b/g) || [];
  const freq = {};
  for (const w of words) {
    if (w.length > 1) {                     // ignore single characters
      freq[w] = (freq[w] || 0) + 1;
    }
  }
  return freq;
}

// --- Native cosine similarity between two frequency objects ---
function calculateCosineSimilarity(vec1, vec2) {
  let dot = 0, mag1 = 0, mag2 = 0;
  for (const [word, freq] of Object.entries(vec1)) {
    dot += freq * (vec2[word] || 0);
    mag1 += freq * freq;
  }
  for (const freq of Object.values(vec2)) {
    mag2 += freq * freq;
  }
  const mag = Math.sqrt(mag1) * Math.sqrt(mag2);
  return mag === 0 ? 0 : dot / mag;
}

// --- Core two‑phase compression: spectral ranking + chromatin coiling ---
function spectralSentenceCoiling(text, keepRatio) {
  // Split into sentences
  const sentenceMatches = text.match(/[^.!?\n]+(?:[.!?]+|$)/g);
  if (!sentenceMatches || sentenceMatches.length === 0) {
    return { compressedText: text, originalTokens: 0, newTokens: 0 };
  }
  const sentences = sentenceMatches.map(s => s.trim().replace(/\s+/g, ' ')).filter(s => s.length > 0);
  const n = sentences.length;

  // Edge case: single sentence – apply coiling based on ratio threshold?
  // If n==1, we still apply the rule: if keepRatio >= 1 → exon (keep intact);
  // else intron → coil it. Makes the function consistent.
  if (n === 1) {
    const exonCount = Math.round(n * keepRatio);
    const finalSentence = exonCount >= 1 ? sentences[0] : coilSentence(sentences[0]);
    const originalTokens = text.split(/\s+/).filter(Boolean).length;
    const newTokens = finalSentence.split(/\s+/).filter(Boolean).length;
    return { compressedText: finalSentence, originalTokens, newTokens };
  }

  // Build frequency maps for all sentences
  const freqMaps = sentences.map(s => cleanAndTokenize(s));

  // Adjacency matrix of cosine similarities
  const adj = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      adj[i][j] = (i === j) ? 1 : calculateCosineSimilarity(freqMaps[i], freqMaps[j]);
    }
  }

  // Row‑normalize to stochastic transition matrix M
  const M = Array.from({ length: n }, () => new Array(n));
  for (let i = 0; i < n; i++) {
    const rowSum = adj[i].reduce((a, b) => a + b, 0);
    if (rowSum === 0) {
      for (let j = 0; j < n; j++) M[i][j] = 1 / n;    // dangling node → uniform
    } else {
      for (let j = 0; j < n; j++) {
        M[i][j] = adj[i][j] / rowSum;
      }
    }
  }

  // Power iteration for TextRank eigenvector
  const d = 0.85;
  const epsilon = 1e-5;
  const maxIter = 30;
  let p = new Array(n).fill(1 / n);

  for (let iter = 0; iter < maxIter; iter++) {
    const pNew = new Array(n).fill((1 - d) / n);
    for (let j = 0; j < n; j++) {
      let sum = 0;
      for (let i = 0; i < n; i++) {
        sum += p[i] * M[i][j];
      }
      pNew[j] += d * sum;
    }
    let maxDiff = 0;
    for (let k = 0; k < n; k++) {
      maxDiff = Math.max(maxDiff, Math.abs(pNew[k] - p[k]));
    }
    p = pNew;
    if (maxDiff < epsilon) break;
  }

  // Classify sentences: top keepRatio are exons, rest are introns
  const exonCount = Math.round(n * keepRatio);
  const indexed = p.map((score, idx) => ({ idx, score }));
  indexed.sort((a, b) => b.score - a.score);
  const exonSet = new Set(indexed.slice(0, exonCount).map(item => item.idx));

  // Reassemble in original chronological order
  const finalSentences = sentences.map((sentence, idx) => {
    if (exonSet.has(idx)) return sentence;                // exon: pristine
    return coilSentence(sentence);                        // intron: coiled
  });

  const compressedText = finalSentences.join(' ');

  const originalTokens = text.split(/\s+/).filter(Boolean).length;
  const newTokens = compressedText.split(/\s+/).filter(Boolean).length;

  return { compressedText, originalTokens, newTokens };
}

// --- Intron coiling: strip grammatical stop words, keep core keywords ---
function coilSentence(sentence) {
  const stopWords = /\b(the|is|are|was|were|to|of|and|in|that|it|on|with|as|for|highly)\b/gi;
  let coiled = sentence.replace(stopWords, '');
  // Clean whitespace: collapse multiple spaces, trim spaces before punctuation
  coiled = coiled.replace(/\s{2,}/g, ' ');
  coiled = coiled.replace(/\s+([.,!?;:])/g, '$1');
  coiled = coiled.trim();
  // Ensure no empty sentence – if everything stripped, keep original (safety)
  return coiled.length > 0 ? coiled : sentence;
}

// --- Popup UI and messaging logic ---
document.addEventListener('DOMContentLoaded', () => {
  const rawTextEl = document.getElementById('rawText');
  const sliderEl = document.getElementById('compressionSlider');
  const sliderValLabel = document.getElementById('sliderValueLabel');
  const processBtn = document.getElementById('processBtn');
  const statusDisplay = document.getElementById('statusDisplay');

  sliderEl.addEventListener('input', () => {
    const val = parseFloat(sliderEl.value);
    sliderValLabel.textContent = `${Math.round(val * 100)}%`;
  });

  processBtn.addEventListener('click', async () => {
    const text = rawTextEl.value.trim();
    if (!text) {
      statusDisplay.textContent = '⚠️ Please paste some text.';
      statusDisplay.className = 'error';
      return;
    }

    const keepRatio = parseFloat(sliderEl.value);
    statusDisplay.textContent = '⏳ Processing…';
    statusDisplay.className = '';

    // Allow UI to update before heavy computation
    setTimeout(async () => {
      try {
        const result = spectralSentenceCoiling(text, keepRatio);
        const saved = result.originalTokens - result.newTokens;
        const percentSaved = result.originalTokens > 0
          ? ((saved / result.originalTokens) * 100).toFixed(1)
          : 0;
        statusDisplay.textContent = `✅ Saved ${percentSaved}% tokens (${result.originalTokens} → ${result.newTokens})`;
        statusDisplay.className = 'success';

        // Send to active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab || !(tab.url.includes('claude.ai') || tab.url.includes('chatgpt.com'))) {
          statusDisplay.textContent = '❌ Active tab must be claude.ai or chatgpt.com.';
          statusDisplay.className = 'error';
          return;
        }
        await chrome.tabs.sendMessage(tab.id, { action: 'inject', text: result.compressedText });
      } catch (err) {
        console.error(err);
        statusDisplay.textContent = '❌ An error occurred during processing.';
        statusDisplay.className = 'error';
      }
    }, 50);
  });
});