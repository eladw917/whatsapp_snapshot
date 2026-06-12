const core = globalThis.ReplyPalCore;
const CONTENT_API_VERSION = 11;
const COMMON_EMOJIS = [
  '😊', '👍', '❤️', '😂', '😍', '🤔', '👌', '🔥', '💯', '🙏',
  '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😇', '🙂', '🙃',
  '😉', '😌', '🥰', '😘', '😗', '😙', '😚', '😋'
];

let latestMessageElement;
let replyCounterElement;
let relativeDateElement;
let replyInput;
let sendButton;
let emojiPicker;
let emojiGrid;
let statusElement;
let refreshPromise = null;
let statusTimer = null;

function isRTLText(text) {
  if (!text) return false;
  const characters = Array.from(text);
  const rtlCount = characters.filter(character => /[\u0590-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(character)).length;
  return rtlCount / characters.length > 0.3;
}

function showStatus(message, type = 'info') {
  clearTimeout(statusTimer);
  statusElement.textContent = message;
  statusElement.className = `status ${type}`;
  if (type !== 'error') {
    statusTimer = setTimeout(clearStatus, 3000);
  }
}

function clearStatus() {
  clearTimeout(statusTimer);
  statusTimer = null;
  statusElement.textContent = '';
  statusElement.className = 'status';
}

async function getWhatsAppTab() {
  const activeTabs = await chrome.tabs.query({
    url: 'https://web.whatsapp.com/*',
    active: true,
    currentWindow: true
  });
  if (activeTabs.length > 0) return activeTabs[0];

  const tabs = await chrome.tabs.query({ url: 'https://web.whatsapp.com/*' });
  return tabs[0] || null;
}

async function ensureContentScript(tab) {
  try {
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'ping' });
    return response?.version === CONTENT_API_VERSION;
  } catch (error) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['src/shared/core.js', 'src/content/content.js']
      });
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'ping' });
      return response?.version === CONTENT_API_VERSION;
    } catch (injectionError) {
      console.error('Unable to connect to WhatsApp Web:', injectionError);
      return false;
    }
  }
}

function concatenateRecentMessages(receivedMessages, sentMessages) {
  if (receivedMessages.length === 0) return null;

  const latest = receivedMessages[receivedMessages.length - 1];
  const messages = [latest];

  for (let index = receivedMessages.length - 2; index >= 0; index--) {
    const candidate = receivedMessages[index];
    const earliest = messages[0];
    if ((candidate.senderName || '') !== (latest.senderName || '')) break;

    const timeDifference = core.getTimeDifferenceInMinutes(candidate, earliest);
    if (timeDifference === null ? earliest.index - candidate.index > 1 : timeDifference > 2) break;
    if (sentMessages.some(message => message.index > candidate.index && message.index < earliest.index)) break;

    messages.unshift(candidate);
  }

  return {
    ...latest,
    text: messages.map(message => message.text).filter(Boolean).join('\n'),
    concatenatedCount: messages.length
  };
}

function createElement(className, text) {
  const element = document.createElement('div');
  element.className = className;
  element.textContent = text;
  return element;
}

function renderMessage(message, chatName, sentMessages) {
  const cleanSenderName = core.cleanDisplayName(message.senderName || '');
  const cleanChatName = core.cleanDisplayName(chatName || '');
  const displayChatInfo = cleanSenderName || cleanChatName;
  const alignmentClass = isRTLText(message.text) ? 'rtl-text' : 'ltr-text';
  const bubble = createElement(`message-bubble ${alignmentClass}`, '');
  bubble.append(
    createElement('message-sender', displayChatInfo),
    createElement('message-content', message.text),
    createElement('message-timestamp', message.timestamp || '')
  );
  latestMessageElement.replaceChildren(bubble);
  latestMessageElement.classList.remove('loading');

  const sentAfter = sentMessages.filter(sent => sent.index > message.index).length;
  replyCounterElement.textContent = sentAfter > 0
    ? `You've replied ${sentAfter} time${sentAfter === 1 ? '' : 's'}`
    : '';
  replyCounterElement.style.display = sentAfter > 0 ? 'block' : 'none';

  const relativeDate = core.getRelativeDate(message.date);
  relativeDateElement.textContent = relativeDate;
  relativeDateElement.style.display = relativeDate ? 'block' : 'none';
}

function showUnavailable(message, canOpenWhatsApp) {
  latestMessageElement.textContent = message;
  latestMessageElement.classList.remove('loading');
  replyCounterElement.style.display = 'none';
  relativeDateElement.style.display = 'none';
  document.querySelector('.reply-section').style.display = 'none';
  document.querySelector('.open-whatsapp-section').style.display = canOpenWhatsApp ? 'block' : 'none';
}

async function requestAllMessages() {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const tab = await getWhatsAppTab();
      if (!tab) {
        showUnavailable('Open WhatsApp Web and select a conversation to use ReplyPal.', true);
        return;
      }
      if (!await ensureContentScript(tab)) {
        showUnavailable('Could not connect to WhatsApp Web. Refresh the WhatsApp tab and try again.', false);
        return;
      }

      const response = await chrome.tabs.sendMessage(tab.id, { action: 'getAllMessages' });
      if (response?.loading) {
        latestMessageElement.textContent = 'WhatsApp Web is loading...';
        latestMessageElement.classList.add('loading');
        replyCounterElement.style.display = 'none';
        relativeDateElement.style.display = 'none';
        document.querySelector('.reply-section').style.display = 'none';
        document.querySelector('.open-whatsapp-section').style.display = 'none';
        clearStatus();
        return;
      }
      if (!response?.success) {
        showUnavailable(response?.error || 'Unable to retrieve messages.', false);
        return;
      }

      // WhatsApp's current DOM exposes direction signals in reverse for this UI.
      // Invert the extracted groups at the display boundary.
      const receivedMessages = response.sentMessages || [];
      const sentMessages = response.receivedMessages || [];
      const latest = concatenateRecentMessages(receivedMessages, sentMessages);

      if (latest) {
        renderMessage(latest, response.chatName || 'Unknown Chat', sentMessages);
      } else {
        latestMessageElement.replaceChildren(createElement('message-content ltr-text', 'No received messages found'));
        latestMessageElement.classList.remove('loading');
        replyCounterElement.style.display = 'none';
        relativeDateElement.style.display = 'none';
      }

      document.querySelector('.reply-section').style.display = 'block';
      document.querySelector('.open-whatsapp-section').style.display = 'none';
      if (!statusElement.classList.contains('success')) clearStatus();
    } catch (error) {
      console.error('Error requesting messages:', error);
      showUnavailable('Unable to load messages.', false);
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

async function sendReply() {
  if (sendButton.disabled) return;

  const text = replyInput.value.trim();
  if (!text) {
    showStatus('Please enter a reply message.', 'error');
    return;
  }

  sendButton.disabled = true;
  try {
    const tab = await getWhatsAppTab();
    if (!tab || !await ensureContentScript(tab)) throw new Error('Unable to connect to WhatsApp Web.');

    const response = await chrome.tabs.sendMessage(tab.id, { action: 'sendReply', text });
    if (!response?.success) throw new Error(response?.error || 'Failed to send message.');

    replyInput.value = '';
    replyInput.dispatchEvent(new Event('input', { bubbles: true }));
    showStatus('Message sent successfully.', 'success');
    await requestAllMessages();
  } catch (error) {
    console.error('Error sending reply:', error);
    showStatus(error.message, 'error');
  } finally {
    sendButton.disabled = false;
  }
}

function renderEmojiPicker() {
  emojiGrid.replaceChildren(...COMMON_EMOJIS.map(emoji => {
    const button = document.createElement('button');
    button.className = 'emoji-item';
    button.type = 'button';
    button.textContent = emoji;
    button.setAttribute('aria-label', `Insert ${emoji}`);
    button.addEventListener('click', () => {
      replyInput.setRangeText(emoji, replyInput.selectionStart, replyInput.selectionEnd, 'end');
      replyInput.dispatchEvent(new Event('input', { bubbles: true }));
      replyInput.focus();
      emojiPicker.classList.remove('show');
    });
    return button;
  }));
}

document.addEventListener('DOMContentLoaded', () => {
  latestMessageElement = document.getElementById('latestMessage');
  replyCounterElement = document.getElementById('replyCounter');
  relativeDateElement = document.getElementById('relativeDate');
  replyInput = document.getElementById('replyInput');
  sendButton = document.getElementById('sendButton');
  emojiPicker = document.getElementById('emojiPicker');
  emojiGrid = document.querySelector('.emoji-grid');
  statusElement = document.getElementById('status');

  document.getElementById('openWhatsAppButton').addEventListener('click', async () => {
    await chrome.tabs.create({ url: 'https://web.whatsapp.com', active: true });
    window.close();
  });
  document.getElementById('emojiButton').addEventListener('click', () => emojiPicker.classList.toggle('show'));
  document.getElementById('closeEmojiPicker').addEventListener('click', () => emojiPicker.classList.remove('show'));
  sendButton.addEventListener('click', sendReply);
  replyInput.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendReply();
    }
  });
  replyInput.addEventListener('input', () => {
    replyInput.style.height = 'auto';
    replyInput.style.height = `${Math.min(replyInput.scrollHeight, 80)}px`;
    document.body.className = isRTLText(replyInput.value) ? 'rtl-text' : 'ltr-text';
  });

  renderEmojiPicker();
  requestAllMessages();
  setInterval(requestAllMessages, 5000);
});
