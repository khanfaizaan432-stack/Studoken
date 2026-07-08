(() => {
  'use strict';

  const INPUT_SELECTORS = [
    'textarea#prompt-textarea',
    'textarea[data-testid="prompt-textarea"]',
    'textarea[placeholder]',
    '[contenteditable="true"][data-placeholder]',
    '[contenteditable="true"][aria-label]',
    '[contenteditable="true"]'
  ];

  function isVisible(element) {
    if (!element) return false;
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
  }

  function findInput() {
    for (const selector of INPUT_SELECTORS) {
      const candidates = Array.from(document.querySelectorAll(selector));
      const visible = candidates.find(isVisible);
      if (visible) return visible;
    }
    return null;
  }

  function setNativeValue(element, value) {
    const prototype = element.tagName === 'TEXTAREA'
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;
    const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
    if (descriptor && descriptor.set) descriptor.set.call(element, value);
    else element.value = value;
  }

  function injectText(text) {
    const input = findInput();
    if (!input) throw new Error('No prompt input found on this page.');

    input.focus();

    if (input.matches('textarea,input')) {
      setNativeValue(input, text);
      input.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true, inputType: 'insertText', data: text }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      input.textContent = '';
      input.appendChild(document.createTextNode(text));
      input.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true, inputType: 'insertText', data: text }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }

    return input;
  }

  function findSendButton() {
    const selectors = [
      '[data-testid="send-button"]',
      'button[aria-label*="Send" i]',
      'button[type="submit"]'
    ];

    for (const selector of selectors) {
      const button = Array.from(document.querySelectorAll(selector)).find(btn => isVisible(btn) && !btn.disabled);
      if (button) return button;
    }

    return Array.from(document.querySelectorAll('button')).find(button => {
      if (!isVisible(button) || button.disabled) return false;
      const label = `${button.getAttribute('aria-label') || ''} ${button.textContent || ''}`.toLowerCase();
      return /\bsend\b|submit/.test(label);
    }) || null;
  }

  chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (!request || request.action !== 'SCC_INJECT_TEXT') return false;

    try {
      injectText(String(request.text || ''));

      if (request.autoSubmit) {
        window.setTimeout(() => {
          const button = findSendButton();
          if (button) button.click();
        }, 120);
      }

      sendResponse({ status: 'ok' });
    } catch (error) {
      console.error('[SCC] inject failed:', error);
      sendResponse({ status: 'error', message: error.message || String(error) });
    }

    return true;
  });
})();
