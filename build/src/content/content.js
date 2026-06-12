(function() {
  if (window.whatsappReplyPalLoaded) return;
  window.whatsappReplyPalLoaded = true;

  const API_VERSION = 11;
  const OUTGOING_STATUS_SELECTOR = [
    '[data-icon="msg-check"]',
    '[data-icon="msg-dblcheck"]',
    '[data-icon="msg-time"]',
    '[data-icon="msg-error"]',
    '[data-icon="msg-alert"]'
  ].join(',');
  const core = globalThis.ReplyPalCore;
  const MESSAGE_DIRECTIONS = [
    '[class*="message-in"]',
    '[class*="message-out"]',
    '[class*="incoming"]',
    '[class*="outgoing"]'
  ].join(',');

  function getConversationRoot() {
    return document.querySelector('#main') || document;
  }

  function isWhatsAppWebLoaded() {
    return Boolean(
      document.querySelector('[data-testid="author"]') ||
      document.querySelector('[data-pre-plain-text]') ||
      findComposer()
    );
  }

  function extractChatName() {
    if (!isWhatsAppWebLoaded()) return { loading: true };

    const semanticAuthors = getConversationRoot().querySelectorAll('[data-testid="author"]');
    const firstMessageMetadata = getConversationRoot().querySelector('[data-pre-plain-text]');
    for (const semanticAuthor of semanticAuthors) {
      const authorMessageContainer = semanticAuthor.closest('[data-id]');
      const belongsToMessage = semanticAuthor.closest('[data-pre-plain-text]') ||
        authorMessageContainer?.querySelector('[data-pre-plain-text]');
      const appearsAfterMessagesStarted = firstMessageMetadata &&
        Boolean(firstMessageMetadata.compareDocumentPosition(semanticAuthor) & Node.DOCUMENT_POSITION_FOLLOWING);
      if (belongsToMessage || appearsAfterMessagesStarted) continue;

      const text = semanticAuthor.textContent?.trim();
      if (text) {
        return { chatName: core?.cleanDisplayName(text) || text };
      }
    }

    const candidates = getConversationRoot().querySelectorAll(
      'header span[title], header [title], header span:not([aria-hidden]):not([data-icon])'
    );
    const controlLabels = new Set(['search', 'menu', 'video call', 'voice call', 'back']);
    for (const candidate of candidates) {
      const text = candidate.getAttribute('title') || candidate.textContent || '';
      if (text.trim() && !text.includes('‏') && !controlLabels.has(text.trim().toLowerCase())) {
        return { chatName: core?.cleanDisplayName(text) || text.trim() };
      }
    }
    return { error: 'No chat selected. Please select a chat to view messages.' };
  }

  function getMessageElements() {
    const main = getConversationRoot();

    const unique = new Set();
    const elements = [];
    const add = element => {
      if (element && !unique.has(element)) {
        unique.add(element);
        elements.push(element);
      }
    };
    const findMessageRoot = metadata => {
      let current = metadata;
      let root = metadata;

      while (current?.parentElement && current.parentElement !== main) {
        const parent = current.parentElement;
        if (parent.querySelectorAll('[data-pre-plain-text]').length !== 1) break;

        root = parent;
        if (parent.hasAttribute('data-id')) return parent;

        const dataId = current.getAttribute?.('data-id') || '';
        const className = String(current.className || '');
        if (/(?:^|[_:])(true|false|from-me|from-them)(?:[_:]|$)/i.test(dataId) ||
            /message-in|message-out|incoming|outgoing|tail-in|tail-out/.test(className)) {
          root = current;
          break;
        }

        current = parent;
      }

      return root;
    };

    main.querySelectorAll('[data-pre-plain-text]').forEach(metadata => {
      add(findMessageRoot(metadata));
    });

    if (elements.length === 0) {
      main.querySelectorAll('[data-id]').forEach(add);
      main.querySelectorAll(MESSAGE_DIRECTIONS).forEach(element => {
        if (!element.parentElement?.closest(MESSAGE_DIRECTIONS)) add(element);
      });
    }

    return elements;
  }

  function getDirection(messageElement, useStatusAbsence = false) {
    const className = String(messageElement.className || '');
    const ancestorDataIds = [];
    let ancestor = messageElement.parentElement;
    while (ancestor && ancestor.id !== 'main') {
      const dataId = ancestor.getAttribute?.('data-id');
      if (dataId) ancestorDataIds.push(dataId);
      ancestor = ancestor.parentElement;
    }
    const dataIds = [
      messageElement.getAttribute('data-id') || '',
      ...Array.from(messageElement.querySelectorAll('[data-id]'), element => element.getAttribute('data-id') || ''),
      ...ancestorDataIds
    ].join(' ');
    const isSent = /message-out|outgoing|tail-out/.test(className) ||
      /(?:^|[_:])(true|from-me)(?:[_:]|$)/i.test(dataIds);
    const isReceived = /message-in|incoming|tail-in/.test(className) ||
      /(?:^|[_:])(false|from-them)(?:[_:]|$)/i.test(dataIds);
    if (isSent !== isReceived) return { isSent, isReceived };

    // Delivery/read status only exists on messages sent by the current user.
    const outgoingStatus = messageElement.querySelector(OUTGOING_STATUS_SELECTOR);
    if (outgoingStatus) return { isSent: true, isReceived: false };
    if (useStatusAbsence) return { isSent: false, isReceived: true };

    const main = getConversationRoot();
    const mainRect = main?.getBoundingClientRect();
    let current = messageElement;
    while (current && current !== main) {
      const style = window.getComputedStyle(current);
      if (style.marginLeft === 'auto') {
        return { isSent: true, isReceived: false };
      }
      if (style.marginRight === 'auto') {
        return { isSent: false, isReceived: true };
      }

      // Ignore alignment inside the bubble. Only a wide row container can indicate direction.
      const rect = current.getBoundingClientRect();
      const isRowContainer = mainRect?.width > 0 && rect.width >= mainRect.width * 0.75;
      if (isRowContainer && style.justifyContent === 'flex-end') {
        return { isSent: true, isReceived: false };
      }
      if (isRowContainer && style.justifyContent === 'flex-start') {
        return { isSent: false, isReceived: true };
      }
      current = current.parentElement;
    }

    // Use the narrowest visible ancestor around the message content as the bubble.
    // Message row/data-id containers can span the entire conversation and are not directional.
    const metadata = messageElement.matches('[data-pre-plain-text]')
      ? messageElement
      : messageElement.querySelector('[data-pre-plain-text]');
    let bubble = metadata || messageElement;
    current = bubble;
    while (current?.parentElement && current.parentElement !== main) {
      const parentRect = current.parentElement.getBoundingClientRect();
      if (mainRect?.width > 0 && parentRect.width >= mainRect.width * 0.75) break;
      bubble = current.parentElement;
      current = current.parentElement;
    }

    const bubbleRect = bubble.getBoundingClientRect();
    if (bubbleRect.width > 0 && mainRect?.width > 0 && bubbleRect.width < mainRect.width * 0.75) {
      const messageCenter = bubbleRect.left + bubbleRect.width / 2;
      const mainCenter = mainRect.left + mainRect.width / 2;
      const deadZone = mainRect.width * 0.05;
      if (messageCenter > mainCenter + deadZone) return { isSent: true, isReceived: false };
      if (messageCenter < mainCenter - deadZone) return { isSent: false, isReceived: true };
    }

    return { isSent: false, isReceived: false };
  }

  function detectMedia(messageElement) {
    if (messageElement.querySelector('audio, [data-icon*="audio"], [aria-label*="voice" i]')) {
      return { messageType: 'voice', placeholder: '[Voice message]' };
    }
    if (messageElement.querySelector('video')) {
      return { messageType: 'video', placeholder: '[Video]' };
    }
    if (messageElement.querySelector('[data-icon*="document"], [aria-label*="document" i], [aria-label*="file" i]')) {
      return { messageType: 'document', placeholder: '[Document]' };
    }
    if (messageElement.querySelector('[data-icon*="sticker"], [aria-label*="sticker" i]')) {
      return { messageType: 'sticker', placeholder: '[Sticker]' };
    }
    if (messageElement.querySelector('[data-icon*="gif"], [aria-label*="gif" i]')) {
      return { messageType: 'gif', placeholder: '[GIF]' };
    }
    if (messageElement.querySelector('img[src^="blob:"], img[draggable="true"], [aria-label*="image" i], [aria-label*="photo" i]')) {
      return { messageType: 'image', placeholder: '[Image]' };
    }
    return { messageType: 'text', placeholder: '' };
  }

  function extractText(messageElement) {
    const selectors = [
      '[data-pre-plain-text] [class*="selectable-text"]',
      '[data-pre-plain-text] span.copyable-text',
      'span[class*="selectable-text"]',
      '[data-testid="msg-text"]',
      '[data-testid="conversation-text"]',
      'span[dir="auto"]',
      'span[dir="ltr"]',
      'span[dir="rtl"]'
    ];
    for (const selector of selectors) {
      const element = messageElement.querySelector(selector);
      const text = element?.textContent?.trim();
      if (text) return text.replace(/\r\n?/g, '\n').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n');
    }
    return '';
  }

  function extractAllMessages() {
    try {
      if (!core) throw new Error('ReplyPal core helpers are unavailable');
      if (!isWhatsAppWebLoaded()) {
        return { sentMessages: [], receivedMessages: [], total: 0, loading: true };
      }

      const chatName = extractChatName().chatName || '';
      const sentMessages = [];
      const receivedMessages = [];
      const messageElements = getMessageElements();
      const hasConfirmedOutgoingStatus = messageElements.some(element =>
        element.querySelector(OUTGOING_STATUS_SELECTOR)
      );
      let unclassified = 0;

      messageElements.forEach((messageElement, index) => {
        const direction = getDirection(messageElement, hasConfirmedOutgoingStatus);
        if (direction.isSent === direction.isReceived) {
          unclassified++;
          return;
        }

        const metadataElement = messageElement.matches('[data-pre-plain-text]')
          ? messageElement
          : messageElement.querySelector('[data-pre-plain-text]');
        const metadata = core.parsePrePlainText(
          metadataElement?.getAttribute('data-pre-plain-text') || '',
          navigator.language
        );
        const media = detectMedia(messageElement);
        const text = extractText(messageElement) || media.placeholder;
        if (!text) return;

        const message = {
          index: index + 1,
          text,
          senderName: metadata?.senderName || (direction.isReceived ? chatName : ''),
          timestamp: metadata?.time || '',
          date: metadata?.date || '',
          time: metadata?.time || '',
          messageType: media.messageType,
          isSent: direction.isSent,
          isReceived: direction.isReceived
        };

        (direction.isSent ? sentMessages : receivedMessages).push(message);
      });

      if (messageElements.length > 0 && sentMessages.length === 0 && receivedMessages.length === 0) {
        throw new Error(`Found ${messageElements.length} message elements but could not classify their direction.`);
      }

      return {
        sentMessages,
        receivedMessages,
        total: messageElements.length,
        unclassified
      };
    } catch (error) {
      console.error('Error extracting messages:', error);
      return { sentMessages: [], receivedMessages: [], total: 0, error: error.message };
    }
  }

  function extractLatestMessage() {
    const result = extractAllMessages();
    if (result.error) return { error: result.error };
    const latest = result.receivedMessages[result.receivedMessages.length - 1];
    if (!latest) return { error: 'No received messages found in this chat.' };
    return { message: latest.text, senderName: latest.senderName };
  }

  function findComposer() {
    return document.querySelector(
      '#main [contenteditable="true"][data-lexical-editor="true"], ' +
      '#main footer [contenteditable="true"][role="textbox"], ' +
      '#main footer [contenteditable="true"], ' +
      '[contenteditable="true"][data-lexical-editor="true"], ' +
      'footer [contenteditable="true"][role="textbox"]'
    );
  }

  function findSendButton() {
    const icon = document.querySelector('#main footer [data-icon="send"], #main footer [data-icon*="send"]');
    return icon?.closest('button') || document.querySelector('#main footer button[aria-label*="send" i]');
  }

  function getDiagnostics() {
    const main = getConversationRoot();
    const messages = getMessageElements();
    return {
      loaded: isWhatsAppWebLoaded(),
      hasChatHeader: Boolean(main?.querySelector('header')),
      metadataElements: main?.querySelectorAll('[data-pre-plain-text]').length || 0,
      dataIdElements: main?.querySelectorAll('[data-id]').length || 0,
      legacyDirectionElements: main?.querySelectorAll(MESSAGE_DIRECTIONS).length || 0,
      messageElements: messages.length,
      messageSamples: messages.slice(0, 5).map(element => ({
        dataId: element.getAttribute('data-id') || '',
        className: String(element.className || '').slice(0, 200),
        direction: getDirection(element, messages.some(message => message.querySelector(OUTGOING_STATUS_SELECTOR))),
        rootRect: {
          left: Math.round(element.getBoundingClientRect().left),
          width: Math.round(element.getBoundingClientRect().width)
        },
        metadataRect: (() => {
          const metadata = element.matches('[data-pre-plain-text]')
            ? element
            : element.querySelector('[data-pre-plain-text]');
          return metadata ? {
            left: Math.round(metadata.getBoundingClientRect().left),
            width: Math.round(metadata.getBoundingClientRect().width)
          } : null;
        })(),
        hasOutgoingStatus: Boolean(element.querySelector(OUTGOING_STATUS_SELECTOR))
      })),
      hasComposer: Boolean(findComposer()),
      hasSendButton: Boolean(findSendButton())
    };
  }

  function waitFor(predicate, timeout = 2500, interval = 50) {
    return new Promise((resolve, reject) => {
      const startedAt = Date.now();
      const check = () => {
        if (predicate()) return resolve();
        if (Date.now() - startedAt >= timeout) return reject(new Error('Timed out waiting for WhatsApp to confirm the send'));
        setTimeout(check, interval);
      };
      check();
    });
  }

  async function sendReplyMessage(replyText) {
    if (!isWhatsAppWebLoaded()) throw new Error('WhatsApp Web not fully loaded');
    if (extractChatName().error) throw new Error('No chat selected. Please select a chat before sending a message.');
    if (!replyText?.trim()) throw new Error('Message text cannot be empty');

    const composer = findComposer();
    if (!composer) throw new Error('Message input box not found. The page structure may have changed.');

    const outgoingBefore = extractAllMessages().sentMessages.length;
    composer.focus();
    composer.textContent = replyText.trim();
    composer.dispatchEvent(new InputEvent('input', {
      bubbles: true,
      data: replyText.trim(),
      inputType: 'insertText'
    }));

    await waitFor(() => {
      const button = findSendButton();
      return button && !button.disabled && button.getAttribute('aria-disabled') !== 'true';
    });

    findSendButton().click();
    await waitFor(() => {
      const composerCleared = !findComposer()?.textContent?.trim();
      const outgoingIncreased = extractAllMessages().sentMessages.length > outgoingBefore;
      return composerCleared || outgoingIncreased;
    });
  }

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'ping') {
      sendResponse({ success: true, pong: true, version: API_VERSION, timestamp: Date.now() });
      return;
    }

    if (request.action === 'getAllMessages') {
      const result = extractAllMessages();
      const chat = extractChatName();
      sendResponse({
        success: !result.error && !chat.error,
        ...result,
        loading: Boolean(result.loading || chat.loading),
        chatName: chat.chatName || null,
        error: result.error || chat.error || null,
        diagnostics: getDiagnostics()
      });
      return;
    }

    if (request.action === 'getLatestMessage') {
      const result = extractLatestMessage();
      const chat = extractChatName();
      sendResponse({
        success: !result.error && !chat.error,
        ...result,
        chatName: chat.chatName || null,
        error: result.error || chat.error || null
      });
      return;
    }

    if (request.action === 'getDiagnostics') {
      sendResponse({ success: true, diagnostics: getDiagnostics() });
      return;
    }

    if (request.action === 'sendReply') {
      sendReplyMessage(request.text)
        .then(() => sendResponse({ success: true, error: null }))
        .catch(error => {
          console.error('Error sending reply message:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true;
    }
  });

  globalThis.ReplyPalContent = {
    extractAllMessages,
    extractLatestMessage,
    getDiagnostics,
    getMessageElements,
    sendReplyMessage
  };
})();
