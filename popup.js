// ==================================================================
// Stop‑word list
// ==================================================================
const STOP_WORDS = new Set([
  'the','is','are','was','were','to','of','and','in','that','it','on',
  'with','as','for','highly','a','an','be','been','has','have','had',
  'do','does','did','will','would','could','should','may','might','shall',
  'can','not','no','but','or','if','then','than','too','very','just',
  'about','also','such','this','these','those','each','every','both',
  'few','more','most','other','some','only','own','same','so','at','by',
  'from','up','out','off','over','under','again','further','once','here',
  'there','when','where','why','how','all','any'
]);

// ==================================================================
// Tokenization (stop‑words removed)
// ==================================================================
function tokenizeWords(text) {
  const words = text.toLowerCase().match(/\b[a-z]+\b/g) || [];
  return words.filter(w => w.length > 1 && !STOP_WORDS.has(w));
}

function sentenceBagOfWords(sentence) {
  const words = tokenizeWords(sentence);
  const freq = {};
  for (const w of words) freq[w] = (freq[w] || 0) + 1;
  return freq;
}

// ==================================================================
// TF‑IDF
// ==================================================================
function computeTFIDF(sentences) {
  const allBags = sentences.map(s => sentenceBagOfWords(s));
  const docCount = sentences.length;
  const df = {};
  allBags.forEach(bag => {
    const terms = new Set(Object.keys(bag));
    terms.forEach(t => { df[t] = (df[t] || 0) + 1; });
  });
  return allBags.map(bag => {
    const vec = {};
    const maxFreq = Math.max(1, ...Object.values(bag));
    for (const [term, freq] of Object.entries(bag)) {
      const tf = freq / maxFreq;
      const idf = Math.log((docCount + 1) / (df[term] + 1)) + 1;
      vec[term] = tf * idf;
    }
    return vec;
  });
}

// ==================================================================
// Cosine similarity
// ==================================================================
function cosineSimilarity(vec1, vec2) {
  let dot = 0, mag1 = 0, mag2 = 0;
  for (const [term, val] of Object.entries(vec1)) {
    dot += val * (vec2[term] || 0);
    mag1 += val * val;
  }
  for (const val of Object.values(vec2)) mag2 += val * val;
  const mag = Math.sqrt(mag1) * Math.sqrt(mag2);
  return mag === 0 ? 0 : dot / mag;
}

// ==================================================================
// Spectral ranking
// ==================================================================
function spectralRank(tfidfVectors) {
  const n = tfidfVectors.length;
  const adj = Array.from({length:n}, () => new Array(n).fill(0));
  for (let i=0; i<n; i++)
    for (let j=0; j<n; j++)
      adj[i][j] = i===j ? 1 : cosineSimilarity(tfidfVectors[i], tfidfVectors[j]);

  const M = Array.from({length:n}, () => new Array(n));
  for (let i=0; i<n; i++) {
    const sum = adj[i].reduce((a,b)=>a+b, 0);
    if (sum === 0) for (let j=0; j<n; j++) M[i][j] = 1/n;
    else for (let j=0; j<n; j++) M[i][j] = adj[i][j] / sum;
  }

  const d = 0.85, eps = 1e-5, maxIter = 30;
  let p = new Array(n).fill(1/n);
  for (let iter=0; iter<maxIter; iter++) {
    const pNew = new Array(n).fill((1-d)/n);
    for (let j=0; j<n; j++) {
      let sum = 0;
      for (let i=0; i<n; i++) sum += p[i] * M[i][j];
      pNew[j] += d * sum;
    }
    let diff = 0;
    for (let k=0; k<n; k++) diff = Math.max(diff, Math.abs(pNew[k]-p[k]));
    p = pNew;
    if (diff < eps) break;
  }
  return p;
}

// ==================================================================
// MMR
// ==================================================================
function mmrSelect(scores, simMatrix, keepCount) {
  const n = scores.length;
  if (n === 0) return new Set();
  const target = Math.min(keepCount, n);
  if (target <= 0) return new Set();
  const candidates = scores.map((s,i)=>i).sort((a,b)=>scores[b]-scores[a]);
  const selected = [];
  const remaining = new Set(candidates);
  while (selected.length < target && remaining.size > 0) {
    let best = -1, bestScore = -Infinity;
    for (const idx of remaining) {
      const rel = scores[idx];
      let maxSim = 0;
      for (const sel of selected) maxSim = Math.max(maxSim, simMatrix[idx][sel]);
      const mmr = 0.7*rel - 0.3*maxSim;
      if (mmr > bestScore) { bestScore = mmr; best = idx; }
    }
    if (best === -1) break;
    selected.push(best);
    remaining.delete(best);
  }
  return new Set(selected);
}

// ==================================================================
// RAKE
// ==================================================================
function rakeKeyPhrases(sentence, wordScores) {
  const wordsAll = sentence.match(/\b[a-z]+\b/gi) || [];
  const phrases = [];
  let cur = [], curScore = 0;
  for (const w of wordsAll) {
    const lower = w.toLowerCase();
    if (STOP_WORDS.has(lower) || lower.length <= 1) {
      if (cur.length) { phrases.push({text:cur.join(' '), score:curScore}); cur=[]; curScore=0; }
    } else {
      cur.push(w);
      curScore += (wordScores[lower] || 0);
    }
  }
  if (cur.length) phrases.push({text:cur.join(' '), score:curScore});
  if (phrases.length === 0) return sentence;
  const avg = phrases.reduce((s,p)=>s+p.score,0)/phrases.length;
  const kept = phrases.filter(p => p.score >= avg*0.8).map(p => p.text);
  return kept.join(' ') || sentence;
}

function coilIntron(sentence, wordScores) {
  let clean = sentence.replace(/\(.*?\)/g, '');
  clean = clean.replace(/,\s*which\s+[^,]+/gi, '');
  clean = clean.replace(/,\s*such\s+as\s+[^,]+/gi, '');
  clean = clean.replace(/\s{2,}/g, ' ').trim();
  const rakified = rakeKeyPhrases(clean, wordScores);
  if (rakified.split(/\s+/).length < 3) return clean;
  return rakified;
}

// ==================================================================
// Compression
// ==================================================================
function compressWithRatio(text, keepRatio) {
  const sentenceMatches = text.match(/[^.!?\n]+(?:[.!?]+|$)/g);
  if (!sentenceMatches || sentenceMatches.length===0)
    return {compressedText:text, originalTokens:text.split(/\s+/).filter(Boolean).length, newTokens:0};

  let sentences = sentenceMatches.map(s=>s.trim().replace(/\s+/g,' ')).filter(s=>s.length>0);
  sentences = sentences.filter(s => /[a-zA-Z0-9]/.test(s));
  if (sentences.length===0)
    return {compressedText:text, originalTokens:text.split(/\s+/).filter(Boolean).length, newTokens:0};

  let tfidfVectors;
  try { tfidfVectors = computeTFIDF(sentences); }
  catch(e) { throw new Error(`TF‑IDF failed: ${e.message}`); }

  let scores;
  try { scores = spectralRank(tfidfVectors); }
  catch(e) { throw new Error(`Spectral ranking failed: ${e.message}`); }

  const n = sentences.length;
  const simMatrix = Array.from({length:n}, () => new Array(n).fill(0));
  try {
    for (let i=0; i<n; i++)
      for (let j=0; j<n; j++)
        simMatrix[i][j] = i===j ? 1 : cosineSimilarity(tfidfVectors[i], tfidfVectors[j]);
  } catch(e) { throw new Error(`Similarity matrix failed: ${e.message}`); }

  const exonCount = Math.max(1, Math.round(n * keepRatio));
  let exonSet;
  try { exonSet = mmrSelect(scores, simMatrix, exonCount); }
  catch(e) { throw new Error(`MMR selection failed: ${e.message}`); }

  let wordScores = {};
  try {
    const wordFreq = {};
    sentences.forEach(s => tokenizeWords(s).forEach(w => wordFreq[w]=(wordFreq[w]||0)+1));
    const maxFreq = Math.max(1, ...Object.values(wordFreq));
    for (const [w,f] of Object.entries(wordFreq)) wordScores[w] = f/maxFreq;
  } catch(e) { throw new Error(`Word score build failed: ${e.message}`); }

  const finalSentences = sentences.map((s,i) => {
    if (exonSet.has(i)) return s;
    try { return coilIntron(s, wordScores); }
    catch(e) { console.warn('Coil fallback:', e); return s; }
  });

  const compressedText = finalSentences.join(' ');
  const originalTokens = text.split(/\s+/).filter(Boolean).length;
  const newTokens = compressedText.split(/\s+/).filter(Boolean).length;
  return {compressedText, originalTokens, newTokens};
}

function compressToTarget(text, targetTokens) {
  const origTokens = text.split(/\s+/).filter(Boolean).length;
  if (origTokens <= targetTokens)
    return {compressedText:text, originalTokens:origTokens, newTokens:origTokens};

  let low=0.1, high=0.9, best=null;
  for (let iter=0; iter<15; iter++) {
    const mid = (low+high)/2;
    let result;
    try { result = compressWithRatio(text, mid); }
    catch(e) { result = {compressedText:text, originalTokens:origTokens, newTokens:origTokens}; }
    if (result.newTokens <= targetTokens) {
      best = result;
      high = mid;
    } else low = mid;
    if (high-low < 0.01) break;
  }
  if (!best) {
    try { best = compressWithRatio(text, 0.2); }
    catch(e) { best = {compressedText:text, originalTokens:origTokens, newTokens:origTokens}; }
  }
  return best;
}

// ==================================================================
// DOM injection function (executed in the tab)
// ==================================================================
function injectIntoPage(compressedText) {
  // Find input
  let inputEl = document.querySelector('textarea#prompt-textarea');
  if (!inputEl) {
    const editables = document.querySelectorAll('[contenteditable="true"]');
    for (const div of editables) {
      if (div.offsetParent !== null && (div.getAttribute('data-placeholder') || div.getAttribute('aria-label'))) {
        inputEl = div;
        break;
      }
    }
    if (!inputEl && editables.length > 0) inputEl = editables[0];
  }
  if (!inputEl) throw new Error('No input element found on page.');

  // Set text
  if (inputEl.tagName === 'TEXTAREA' || inputEl.tagName === 'INPUT') {
    inputEl.value = compressedText;
    inputEl.dispatchEvent(new Event('input', { bubbles: true }));
    inputEl.dispatchEvent(new Event('change', { bubbles: true }));
  } else {
    inputEl.textContent = compressedText;
    inputEl.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true }));
    inputEl.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // Find and click send button
  function findSendButton() {
    let btn = document.querySelector('[data-testid="send-button"]');
    if (btn) return btn;
    btn = document.querySelector('button[aria-label*="Send" i]');
    if (btn) return btn;
    const forms = document.querySelectorAll('form');
    for (const form of forms) {
      btn = form.querySelector('button[type="submit"]');
      if (btn) return btn;
    }
    const allBtns = document.querySelectorAll('button');
    for (const b of allBtns) {
      const label = (b.getAttribute('aria-label') || '').toLowerCase();
      const text = (b.textContent || '').toLowerCase();
      if (label.includes('send') || text.includes('send')) return b;
    }
    return null;
  }
  const sendBtn = findSendButton();
  if (sendBtn) sendBtn.click();
}

// ==================================================================
// Popup UI
// ==================================================================
document.addEventListener('DOMContentLoaded', () => {
  const rawTextEl = document.getElementById('rawText');
  const sliderEl = document.getElementById('compressionSlider');
  const sliderValLabel = document.getElementById('sliderValueLabel');
  const targetTokensInput = document.getElementById('targetTokens');
  const processBtn = document.getElementById('processBtn');
  const statusDisplay = document.getElementById('statusDisplay');

  sliderEl.addEventListener('input', () => {
    sliderValLabel.textContent = `${Math.round(parseFloat(sliderEl.value)*100)}%`;
  });

  processBtn.addEventListener('click', async () => {
    const text = rawTextEl.value.trim();
    if (!text) {
      statusDisplay.textContent = '⚠️ Please paste some text.';
      statusDisplay.className = 'error';
      return;
    }

    const targetTokensVal = targetTokensInput.value.trim();
    const useTarget = targetTokensVal && !isNaN(targetTokensVal) && parseInt(targetTokensVal) > 0;
    statusDisplay.textContent = useTarget ? '⏳ Compressing to token budget…' : '⏳ Compressing…';
    statusDisplay.className = '';

    await new Promise(resolve => setTimeout(resolve, 50));

    try {
      // Get active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !(tab.url.includes('claude.ai') || tab.url.includes('chatgpt.com'))) {
        statusDisplay.textContent = '❌ Active tab must be claude.ai or chatgpt.com.';
        statusDisplay.className = 'error';
        return;
      }

      // Compress text
      let result;
      if (useTarget) {
        const maxTokens = parseInt(targetTokensVal, 10);
        result = compressToTarget(text, maxTokens);
      } else {
        const keepRatio = parseFloat(sliderEl.value);
        if (isNaN(keepRatio)) throw new Error('Invalid precision value');
        result = compressWithRatio(text, keepRatio);
      }

      const saved = result.originalTokens - result.newTokens;
      const percentSaved = result.originalTokens > 0 ? ((saved / result.originalTokens) * 100).toFixed(1) : 0;
      statusDisplay.textContent = `✅ Saved ${percentSaved}% tokens (${result.originalTokens} → ${result.newTokens})`;
      statusDisplay.className = 'success';

      // Inject directly using a function (no content script needed)
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: injectIntoPage,
        args: [result.compressedText]
      });

    } catch (err) {
      console.error(err);
      statusDisplay.textContent = `❌ Error: ${err.message || err}`;
      statusDisplay.className = 'error';
    }
  });
});