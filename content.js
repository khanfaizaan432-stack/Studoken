(function() {
  'use strict';

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'inject' && request.text) {
      injectText(request.text).then(() => sendResponse({ status: 'ok' }));
      return true;
    }
  });

  async function injectText(compressedText) {
    let inputEl = null;
    inputEl = document.querySelector('textarea#prompt-textarea');
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

    if (!inputEl) {
      console.error('No input element found.');
      return;
    }

    if (inputEl.tagName === 'TEXTAREA' || inputEl.tagName === 'INPUT') {
      inputEl.value = compressedText;
      inputEl.dispatchEvent(new Event('input', { bubbles: true }));
      inputEl.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      inputEl.textContent = compressedText;
      inputEl.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true }));
      inputEl.dispatchEvent(new Event('change', { bubbles: true }));
    }

    await new Promise(resolve => setTimeout(resolve, 200));

    const sendBtn = findSendButton();
    if (sendBtn) sendBtn.click();
  }

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
})();