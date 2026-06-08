(function() {
  'use strict';

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'inject' && request.text) {
      injectText(request.text).then(() => sendResponse({ status: 'ok' }));
      return true;   // keep message channel open for async response
    }
  });

  async function injectText(compressedText) {
    // 1. Locate the message input
    let inputEl = null;

    // ChatGPT's standard textarea (often used)
    inputEl = document.querySelector('textarea#prompt-textarea');
    if (!inputEl) {
      // contenteditable divs (Claude & newer ChatGPT)
      const editableDivs = document.querySelectorAll('[contenteditable="true"]');
      for (const div of editableDivs) {
        if (div.offsetParent !== null && (div.getAttribute('data-placeholder') || div.getAttribute('aria-label') || div.getAttribute('placeholder'))) {
          inputEl = div;
          break;
        }
      }
      if (!inputEl && editableDivs.length > 0) {
        inputEl = editableDivs[0];   // last resort
      }
    }

    if (!inputEl) {
      console.error('Could not find message input element.');
      return;
    }

    // 2. Insert the compressed text
    if (inputEl.tagName === 'TEXTAREA' || inputEl.tagName === 'INPUT') {
      inputEl.value = compressedText;
      inputEl.dispatchEvent(new Event('input', { bubbles: true }));
      inputEl.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      // contenteditable
      inputEl.textContent = compressedText;
      inputEl.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true }));
      inputEl.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // 3. Wait for frameworks to react, then auto‑click send
    await new Promise(resolve => setTimeout(resolve, 150));

    const sendBtn = findSendButton();
    if (sendBtn) {
      sendBtn.click();
    }
  }

  function findSendButton() {
    // ChatGPT’s send button
    let btn = document.querySelector('[data-testid="send-button"]');
    if (btn) return btn;

    // Claude’s send button (often aria-label="Send Message")
    btn = document.querySelector('button[aria-label*="Send" i]');
    if (btn) return btn;

    // Generic form submit button
    const forms = document.querySelectorAll('form');
    for (const form of forms) {
      btn = form.querySelector('button[type="submit"]');
      if (btn) return btn;
    }

    // Fallback: any button with "send" in its text/label
    const allButtons = document.querySelectorAll('button');
    for (const b of allButtons) {
      const label = (b.getAttribute('aria-label') || '').toLowerCase();
      const text = (b.textContent || '').toLowerCase();
      if (label.includes('send') || text.includes('send')) return b;
    }
    return null;
  }
})();