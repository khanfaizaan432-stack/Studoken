(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);

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

  function renderMetrics(result) {
    $('previewText').value = result.compressedText;
    $('metricOriginal').textContent = String(result.originalTokens);
    $('metricCompressed').textContent = String(result.newTokens);
    $('metricSaved').textContent = `${result.percentSaved.toFixed(1)}%`;
    $('metricSentences').textContent = String(result.sentenceCount);
    $('copyBtn').disabled = !result.compressedText;
    $('injectBtn').disabled = !result.compressedText;
    $('autoSubmitBtn').disabled = !result.compressedText;
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
    const rawText = $('rawText');
    const slider = $('compressionSlider');
    const strength = $('coilingStrength');

    function syncLabels() {
      $('sliderValueLabel').textContent = `${Math.round(Number.parseFloat(slider.value) * 100)}%`;
      $('strengthValueLabel').textContent = `${Math.round(Number.parseFloat(strength.value) * 100)}%`;
    }

    slider.addEventListener('input', syncLabels);
    strength.addEventListener('input', syncLabels);
    syncLabels();

    $('processBtn').addEventListener('click', () => {
      const text = rawText.value.trim();
      if (!text) {
        setStatus('⚠️ Paste text first.', 'error');
        return;
      }

      try {
        setStatus('⏳ Compressing…');
        const result = SpectralChromatinCoiler.compress(text, getOptions());
        renderMetrics(result);

        const budgetNote = result.mode === 'target'
          ? (result.hitTarget ? ` under target ${result.targetTokens}` : ` best effort; still above target ${result.targetTokens}`)
          : '';
        setStatus(`✅ Saved ${result.percentSaved.toFixed(1)}% approx tokens (${result.originalTokens} → ${result.newTokens}${budgetNote}).`, 'success');
      } catch (error) {
        console.error(error);
        setStatus(`❌ Compression failed: ${error.message || error}`, 'error');
      }
    });

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
  });
})();
