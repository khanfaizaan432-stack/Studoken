(() => {
  'use strict';

  const STORAGE_KEY = 'scc.popup.settings.v1';
  const DEBOUNCE_MS = 350;
  const $ = (id) => document.getElementById(id);
  let debounceTimer = null;

  function setStatus(message, kind = '') {
    const status = $('statusDisplay');
    status.textContent = message;
    status.className = kind;
  }

  function getOptions() {
    const targetRaw = $('targetTokens').value.trim();
    const targetTokens = targetRaw ? Number.parseInt(targetRaw, 10) : null;
    return {
      keepRatio: Number.parseFloat($('compressionSlider').value),
      targetTokens: Number.isFinite(targetTokens) && targetTokens > 0 ? targetTokens : null,
      coilingStrength: Number.parseFloat($('coilingStrength').value),
      preserveCodeBlocks: $('preserveCode').checked,
      preserveListItems: $('preserveLists').checked
    };
  }

  function getSettings() {
    return {
      compressionSlider: $('compressionSlider').value,
      targetTokens: $('targetTokens').value,
      coilingStrength: $('coilingStrength').value,
      preserveCode: $('preserveCode').checked,
      preserveLists: $('preserveLists').checked,
      autoCompress: $('autoCompress').checked
    };
  }

  function saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(getSettings()));
    } catch (_error) {
      // Ignore storage failures; extension still works without persistence.
    }
  }

  function loadSettings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const settings = JSON.parse(raw);
      if (settings.compressionSlider) $('compressionSlider').value = settings.compressionSlider;
      if (settings.targetTokens) $('targetTokens').value = settings.targetTokens;
      if (settings.coilingStrength) $('coilingStrength').value = settings.coilingStrength;
      if (typeof settings.preserveCode === 'boolean') $('preserveCode').checked = settings.preserveCode;
      if (typeof settings.preserveLists === 'boolean') $('preserveLists').checked = settings.preserveLists;
      if (typeof settings.autoCompress === 'boolean') $('autoCompress').checked = settings.autoCompress;
    } catch (_error) {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  function renderMetrics(result) {
    $('previewText').value = result.compressedText;
    $('metricOriginal').textContent = String(result.originalTokens);
    $('metricCompressed').textContent = String(result.newTokens);
    $('metricSaved').textContent = `${result.percentSaved.toFixed(1)}%`;
    $('metricSentences').textContent = String(result.sentenceCount);
    $('copyBtn').disabled = !result.compressedText;
    $('injectBtn').disabled = !result.compressedText;
    $('autoSubmitBtn').disabled = !result.compressedText;
    $('swapBtn').disabled = !result.compressedText;
  }

  function syncLabels() {
    $('sliderValueLabel').textContent = `${Math.round(Number.parseFloat($('compressionSlider').value) * 100)}%`;
    $('strengthValueLabel').textContent = `${Math.round(Number.parseFloat($('coilingStrength').value) * 100)}%`;
  }

  function compressNow({ quiet = false } = {}) {
    const text = $('rawText').value.trim();
    saveSettings();
    syncLabels();

    if (!text) {
      renderMetrics({ compressedText: '', originalTokens: 0, newTokens: 0, percentSaved: 0, sentenceCount: 0 });
      if (!quiet) setStatus('⚠️ Paste text first.', 'error');
      return null;
    }

    try {
      if (!quiet) setStatus('⏳ Compressing…');
      const result = SpectralChromatinCoiler.compress(text, getOptions());
      renderMetrics(result);

      const budgetNote = result.mode === 'target'
        ? (result.hitTarget ? ` under target ${result.targetTokens}` : ` best effort; still above target ${result.targetTokens}`)
        : '';
      setStatus(`✅ Saved ${result.percentSaved.toFixed(1)}% approx tokens (${result.originalTokens} → ${result.newTokens}${budgetNote}).`, 'success');
      return result;
    } catch (error) {
      console.error(error);
      if (!quiet) setStatus(`❌ Compression failed: ${error.message || error}`, 'error');
      return null;
    }
  }

  function scheduleAutoCompress() {
    saveSettings();
    syncLabels();
    if (!$('autoCompress').checked) return;
    window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(() => compressNow({ quiet: true }), DEBOUNCE_MS);
  }

  async function getActiveSupportedTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id || !tab.url) throw new Error('No active tab found.');
    const supported = /^https:\/\/([a-z0-9-]+\.)?(chatgpt\.com|claude\.ai)\//i.test(tab.url);
    if (!supported) throw new Error('Open ChatGPT or Claude in the active tab first.');
    return tab;
  }

  async function inject(autoSubmit) {
    const compressedText = $('previewText').value.trim();
    if (!compressedText) {
      setStatus('⚠️ Compress something before injecting.', 'error');
      return;
    }

    const tab = await getActiveSupportedTab();
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: 'SCC_INJECT_TEXT',
      text: compressedText,
      autoSubmit
    });

    if (!response || response.status !== 'ok') {
      throw new Error(response?.message || 'The page did not accept the injected text.');
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    syncLabels();

    ['compressionSlider', 'coilingStrength', 'targetTokens', 'preserveCode', 'preserveLists', 'autoCompress']
      .forEach(id => $(id).addEventListener('input', scheduleAutoCompress));

    $('rawText').addEventListener('input', scheduleAutoCompress);

    document.addEventListener('keydown', (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        compressNow();
      }
    });

    $('processBtn').addEventListener('click', () => compressNow());

    $('copyBtn').addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText($('previewText').value);
        setStatus('📋 Compressed prompt copied.', 'success');
      } catch (_error) {
        setStatus('⚠️ Clipboard failed. Select the preview and copy manually.', 'error');
      }
    });

    $('injectBtn').addEventListener('click', async () => {
      try {
        await inject(false);
        setStatus('✅ Injected as draft. Review it, then send manually.', 'success');
      } catch (error) {
        console.error(error);
        setStatus(`❌ Inject failed: ${error.message || error}`, 'error');
      }
    });

    $('autoSubmitBtn').addEventListener('click', async () => {
      try {
        await inject(true);
        setStatus('✅ Injected and submitted.', 'success');
      } catch (error) {
        console.error(error);
        setStatus(`❌ Auto-submit failed: ${error.message || error}`, 'error');
      }
    });

    $('swapBtn').addEventListener('click', () => {
      const preview = $('previewText').value.trim();
      if (!preview) return;
      $('rawText').value = preview;
      compressNow({ quiet: true });
      setStatus('↩️ Preview moved back into input for another compression pass.', 'success');
    });

    $('clearBtn').addEventListener('click', () => {
      $('rawText').value = '';
      renderMetrics({ compressedText: '', originalTokens: 0, newTokens: 0, percentSaved: 0, sentenceCount: 0 });
      setStatus('Cleared.');
    });
  });
})();
