// WhatsApp Web Message Extractor Content Script

// Selectors provided by user
const SELECTORS = {
  latestMessage: '#main > div.x1n2onr6.x1vjfegm.x1cqoux5.x14yy4lh > div > div > div.x10l6tqk.x13vifvy.x1o0tod.xupqr0c.x9f619.x78zum5.xdt5ytf.xh8yej3.x5yr21d.x6ikm8r.x1rife3k.xjbqb8w.x1ewm37j > div.x3psx0u.x12xbjc7.x1c1uobl.xrmvbpv.xh8yej3.xquzyny.xvc5jky.x11t971q > div:nth-child(12) > div > div > div > div > div > div._amk4.false._amkd._amk5.false > div._amk6._amlo.false.false > div:nth-child(2) > div > div.copyable-text > div > span._ao3e.selectable-text.copyable-text > span',
  chatName: '#main > header > div.x78zum5.xdt5ytf.x1iyjqo2.xl56j7k.xeuugli.xtnn1bt.x9v5kkp.xmw7ebm.xrdum7p > div > div > div > div > span',
  inputBox: '#main > footer > div.x1n2onr6.xhtitgo.x9f619.x78zum5.x1q0g3np.xuk3077.xjbqb8w.x1wiwyrm.xquzyny.xvc5jky.x11t971q.xnpuxes.copyable-area > div > span > div > div._ak1r > div > div.x1n2onr6.xh8yej3.xjdcl3y.lexical-rich-text-input > div[contenteditable="true"]',
  sendButton: '#main > footer > div.x1n2onr6.xhtitgo.x9f619.x78zum5.x1q0g3np.xuk3077.xjbqb8w.x1wiwyrm.xquzyny.xvc5jky.x11t971q.xnpuxes.copyable-area > div > span > div > div._ak1r > div > div.x9f619.x78zum5.x6s0dn4.xl56j7k.xpvyfi4.x2lah0s.x1c4vz4f.x1fns5xo.x1ba4aug.x1c9tyrk.xeusxvb.x1pahc9y.x1ertn4p.x1pse0pq.xpcyujq.xfn3atn.x1ypdohk.x1m2oepg > div > span > button > div > div > div:nth-child(1)'
};

// Function to check if WhatsApp Web is properly loaded
function isWhatsAppWebLoaded() {
  // Check for main WhatsApp Web elements
  const mainElement = document.querySelector('#main');
  const sideElement = document.querySelector('#side');

  return !!(mainElement && sideElement);
}

// Function to check if a chat is currently selected
function isChatSelected() {
  // Try multiple selectors for different chat types (individual vs group)
  const selectors = [
    // Individual chat selector
    '#main > header > div.x78zum5.xdt5ytf.x1iyjqo2.xl56j7k.xeuugli.xtnn1bt.x9v5kkp.xmw7ebm.xrdum7p > div > div > div > div > span',
    // Group chat selector
    '#main > header > div.x78zum5.xdt5ytf.x1iyjqo2.xl56j7k.xeuugli.xtnn1bt.x9v5kkp.xmw7ebm.xrdum7p > div.x78zum5.x1cy8zhl.x1y332i5.xggjnk3.x1yc453h span',
    // Generic fallback - any span in the header with text
    '#main > header span:not([aria-hidden]):not([data-icon]):not([class*="icon"])'
  ];

  for (let i = 0; i < selectors.length; i++) {
    const selector = selectors[i];
    const elements = document.querySelectorAll(selector);

    for (const element of elements) {
      const text = element.textContent || element.innerText || '';
      if (text.trim() && text.length > 0 && !text.includes('‏')) { // Avoid participant lists that start with special characters
        return true;
      }
    }
  }

  return false;
}

// Function to extract all messages categorized by sent/received
function extractAllMessages() {
  const sentMessages = [];
  const receivedMessages = [];

  try {
    // Get chat partner name for individual chats
    const chatNameResult = extractChatName();
    const chatPartnerName = chatNameResult.chatName || '';

    // Look for message elements
    const messageElements = document.querySelectorAll('[class*="message"], [class*="tail"]');

    let lastSenderName = ''; // Keep track of the last sender name found

    for (let i = 0; i < messageElements.length; i++) {
      const messageEl = messageElements[i];

      // Check if it's sent or received based on classes
      let isSent = messageEl.className.includes('message-out') ||
                   messageEl.className.includes('outgoing') ||
                   messageEl.className.includes('tail-out');

      let isReceived = messageEl.className.includes('message-in') ||
                       messageEl.className.includes('incoming') ||
                       messageEl.className.includes('tail-in');

      // If classes are ambiguous, check children for clues
      if (!isSent && !isReceived) {
        const childOut = messageEl.querySelector('[class*="message-out"], [class*="outgoing"], [class*="tail-out"]');
        const childIn = messageEl.querySelector('[class*="message-in"], [class*="incoming"], [class*="tail-in"]');
        if (childOut) isSent = true;
        if (childIn) isReceived = true;
      }

      // Extract content, sender name, timestamp, and message type from this message element
      let textElement = null;
      let text = '';
      let senderName = '';
      let timestamp = '';
      let date = ''; // Full date (DD.MM.YYYY) extracted from data-pre-plain-text
      let time = ''; // Time (HH:MM) extracted from data-pre-plain-text
      let messageType = 'text'; // Default type
      let possibleTextElements = []; // For fallback text extraction

      // Extract date, time, and sender from data-pre-plain-text attribute (most reliable source)
      const copyableTextEl = messageEl.querySelector('div.copyable-text[data-pre-plain-text]');
      if (copyableTextEl) {
        const prePlainText = copyableTextEl.getAttribute('data-pre-plain-text');
        if (prePlainText) {
          // Parse format: [HH:MM, DD.MM.YYYY] SenderName:
          // Example: [21:31, 17.11.2025] רוני הרשקורן:
          const dateTimeMatch = prePlainText.match(/\[(\d{1,2}):(\d{2}),\s*(\d{1,2})\.(\d{1,2})\.(\d{4})\]\s*(.+?):\s*/);
          if (dateTimeMatch) {
            // Extract time (HH:MM)
            time = `${dateTimeMatch[1]}:${dateTimeMatch[2]}`;
            // Extract full date (DD.MM.YYYY)
            date = `${dateTimeMatch[3]}.${dateTimeMatch[4]}.${dateTimeMatch[5]}`;
            // Extract sender name (everything after date until colon)
            const extractedSender = dateTimeMatch[6].trim();
            if (extractedSender) {
              senderName = extractedSender;
            }
            // Set timestamp to the time for consistency
            timestamp = time;
          }
        }
      }

      // If sender wasn't extracted from data-pre-plain-text, try DOM extraction as fallback
      if (!senderName) {
        const senderSelectors = [
          'div._ahxj._ahxz.x78zum5.xijeqtt span',  // Original working selector
          'div._ahxj._ahxz span',                   // Simplified version
          'div[class*="_ahxj"] span',               // Flexible class matching
          '[class*="sender"] span',                 // Alternative sender classes
          '[class*="author"] span',                 // Alternative author classes
          'span[class*="_ahxt"]',                   // Direct span with _ahxt class
          'span._ahxt'                              // Exact _ahxt class
        ];

        let senderFound = false;
        for (const selector of senderSelectors) {
          const elements = messageEl.querySelectorAll(selector);

          for (const element of elements) {
            const text = element.textContent.trim();
            if (text && text.length > 0 && text !== chatPartnerName) { // Avoid matching group name
              senderName = text;
              lastSenderName = senderName;
              senderFound = true;
              break;
            }
          }
          if (senderFound) break;
        }

        if (!senderFound) {
          // If no sender name found in DOM
          if (isReceived) {
            // For received messages, use last known sender name (group chat) or chat partner (individual chat)
            if (lastSenderName && lastSenderName !== chatPartnerName) {
              senderName = lastSenderName; // Group chat - use last known sender
            } else if (chatPartnerName) {
              senderName = chatPartnerName; // Individual chat - use chat partner
            }
          }
        }
      } else {
        // Update lastSenderName if we got it from data-pre-plain-text
        lastSenderName = senderName;
      }

      // Extract message content
      const akbuDiv = messageEl.querySelector('div[class*="_akbu"]');
      if (akbuDiv) {
        // Try to get the parent container that holds all text (including multi-line)
        const textContainer = akbuDiv.querySelector('span[class*="_ao3e"]');
        if (textContainer) {
          textElement = textContainer;
          // Get text from the container (includes all nested spans/lines)
          text = textContainer.textContent.trim();
        }
      }

      // If timestamp wasn't extracted from data-pre-plain-text, try DOM extraction as fallback
      if (!timestamp) {
        const timeSelectors = [
          'span.x1c4vz4f.x2lah0s',     // Common timestamp class
          'span.x1rg5ohu.x16dsc37',   // Alternative timestamp class
          'span.x1c4vz4f.x2lah0s',    // Duplicate for completeness
          '.x1c4vz4f.x2lah0s',        // Fallback without span
          '.x1rg5ohu.x16dsc37'        // Another fallback
        ];

        for (const selector of timeSelectors) {
          const timeElement = messageEl.querySelector(selector);
          if (timeElement) {
            timestamp = timeElement.textContent.trim();
            break;
          }
        }
      }

      // Detect message type
      const sentImageEl = messageEl.querySelector('div.x9f619.xlkrthq.xyqdw3p.x1im30kd.xg8j3zb.x1djpfga.x1n2onr6.x1vjfegm');
      const receivedImageEl = messageEl.querySelector('div.x9f619.xyqdw3p.x1im30kd.xg8j3zb.x1djpfga.x1n2onr6.x1vjfegm.xf58f5l.copyable-text');

      // Also check for received images with different class structure
      const altReceivedImageEl = messageEl.querySelector('div.x9f619.xyqdw3p.x1im30kd.xg8j3zb.x1djpfga.x1n2onr6.x1vjfegm');

      // Check for voice messages
      const voiceEl = messageEl.querySelector('div.x78zum5.x6s0dn4.xzt5al7.x1nbhmlj');
      if (voiceEl) {
        messageType = 'voice';
        // Try to get voice message duration
        const durationEl = messageEl.querySelector('div.x10l6tqk.x1fesggd.xu96u03.x1ncwhqj.x152skdk.xljy9j3');
        if (durationEl) {
          const duration = durationEl.textContent.trim();
          text = `[Voice message - ${duration}]`;
        } else {
          text = '[Voice message]';
        }
      } else if (messageEl.querySelector('div.x78zum5.x6s0dn4.xzt5al7.x1nbhmlj')) {
        messageType = 'voice';
        // Try to get voice message duration
        const durationEl = messageEl.querySelector('div.x10l6tqk.x1fesggd.xu96u03.x1ncwhqj.x152skdk.xljy9j3');
        if (durationEl) {
          const duration = durationEl.textContent.trim();
          text = `[Voice message - ${duration}]`;
        } else {
          text = '[Voice message]';
        }
      } else if (messageEl.querySelector('video')) {
        messageType = 'video';
        text = '[Video]';
      } else if (messageEl.querySelector('[class*="document"], [class*="file"]')) {
        messageType = 'document';
        // Try to get document name
        const docElement = messageEl.querySelector('[class*="document"] span, [class*="file"] span');
        if (docElement) {
          text = docElement.textContent.trim();
        } else {
          text = '[Document]';
        }
      } else if (messageEl.querySelector('[class*="sticker"]')) {
        messageType = 'sticker';
        text = '[Sticker]';
      } else if (messageEl.querySelector('[class*="gif"]')) {
        messageType = 'gif';
        text = '[GIF]';
      } else {
        messageType = 'text';
      }

      // Fallback: if no text found, try other methods
      if (!text) {
        possibleTextElements = messageEl.querySelectorAll('span[class*="selectable-text"], span[class*="copyable-text"], span._ao3e');
        for (const el of possibleTextElements) {
          // Get text from the parent container (includes all nested spans/lines)
          const elText = el.textContent.trim();
          if (elText && elText.length > 0) {
            textElement = el;
            text = elText;
            break;
          }
        }
      }

      // Method 2: Handle nested span structure (original approach)
      if (!text) {
        possibleTextElements = messageEl.querySelectorAll('span[class*="selectable-text"], span[class*="copyable-text"], span._ao3e');

        for (const el of possibleTextElements) {
          // Get text from the parent container (includes all nested spans/lines)
          const elText = el.textContent.trim();

          if (elText && elText.length > 0) {
            // Skip elements that look like sender names (short, no spaces, or contain colons)
            if (elText.includes(':') && elText.length < 30) {
              // This might be "Name: message" - extract just the message part
              const colonIndex = elText.indexOf(':');
              if (colonIndex !== -1) {
                const messagePart = elText.substring(colonIndex + 1).trim();
                if (messagePart.length > 0 && messagePart.length < elText.length) {
                  textElement = el;
                  text = messagePart;
                  break;
                }
              }
            } else if (elText.length > 2 && !elText.includes(':') && elText.split(' ').length > 1) {
              // This looks like actual message content (multiple words, no colon)
              textElement = el;
              text = elText;
              break;
            } else if (elText.length > 5 && !/^[A-Za-z\s]+$/.test(elText)) {
              // Contains non-letter characters, likely message content
              textElement = el;
              text = elText;
              break;
            } else if (elText.length > 0) {
              // Fallback: use any text content
              textElement = el;
              text = elText;
              break;
            }
          }
        }
      }

      // If we didn't find good text with the above, use the first available
      if (!textElement && !text) {
        possibleTextElements = messageEl.querySelectorAll('span[class*="selectable-text"], span[class*="copyable-text"], span._ao3e');
        if (possibleTextElements.length > 0) {
          textElement = possibleTextElements[0];
          text = textElement.textContent.trim();
        }
      }

      // Clean the text
      if (text) {
        // Normalize line breaks (convert \r\n to \n)
        text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        
        // Remove timestamps
        text = text.replace(/\d{1,2}:\d{2}/g, '');
        
        // Remove artifacts
        text = text.replace(/msg-[a-z]+/g, '');
        
        // Remove "Name:" prefix
        text = text.replace(/^[^\s]*\s*:/, '');
        
        // Clean up multiple spaces/tabs (but preserve newlines)
        // Replace sequences of spaces/tabs (but not newlines) with single space
        text = text.replace(/[ \t]+/g, ' ');
        
        // Clean up multiple consecutive newlines (keep max 2)
        text = text.replace(/\n{3,}/g, '\n\n');
        
        // Trim whitespace but preserve internal newlines
        text = text.trim();
      }

      if (text && text.length > 2) {
          const messageData = {
            index: i + 1,
            text: text,
            senderName: senderName,
            timestamp: timestamp,
            date: date,
            time: time,
            messageType: messageType,
            isSent: isSent,
            isReceived: isReceived,
            classes: messageEl.className
          };

          if (isSent && !isReceived) {
            sentMessages.push(messageData);
          } else if (isReceived && !isSent) {
            receivedMessages.push(messageData);
          } else {
            // Ambiguous - check class name for clues
            if (messageEl.className.includes('out')) {
              sentMessages.push(messageData);
            } else if (messageEl.className.includes('in')) {
              receivedMessages.push(messageData);
            }
          }
        }
      }


    return {
      sentMessages: sentMessages,
      receivedMessages: receivedMessages,
      total: messageElements.length
    };

  } catch (error) {
    console.error('Error extracting messages:', error);
    return {
      sentMessages: [],
      receivedMessages: [],
      error: error.message
    };
  }
}

// Function to extract the latest message (now uses the categorized messages)
function extractLatestMessage() {
  try {
    // Check if WhatsApp Web is loaded
    if (!isWhatsAppWebLoaded()) {
      return { error: 'WhatsApp Web not fully loaded. Please wait for it to load completely.' };
    }

    // Check if a chat is selected
    if (!isChatSelected()) {
      return { error: 'No chat selected. Please select a chat to view messages.' };
    }

    // Get all messages
    const allMessages = extractAllMessages();

    // Return the latest received message
    if (allMessages.receivedMessages.length > 0) {
      const latestReceived = allMessages.receivedMessages[allMessages.receivedMessages.length - 1];

      const result = {
        message: latestReceived.text,
        senderName: latestReceived.senderName || '',
        repliesSentAfter: repliesSentAfter
      };

      return result;
    }
    const allElements = document.querySelectorAll('[class*="message"], [class*="tail"]');
    if (allElements.length > 0) {
      const lastElement = allElements[allElements.length - 1];

      // Try different text extraction methods
      let text = '';

      // Method 1: Check for _akbu div structure (group messages)
      const akbuDiv = lastElement.querySelector('div[class*="_akbu"]');
      if (akbuDiv) {
        // Extract sender name from within this message element
        let senderName = '';
        const senderElement = lastElement.querySelector('div._ahxj._ahxz.x78zum5.xijeqtt span');
        if (senderElement && senderElement.textContent.trim()) {
          senderName = senderElement.textContent.trim();
        }

        const nestedTextSpan = akbuDiv.querySelector('span[class*="_ao3e"] span');
        if (nestedTextSpan) {
          text = nestedTextSpan.textContent.trim();
          // If sender name found, format as "Name: message"
          if (senderName) {
            text = `${senderName}: ${text}`;
          }
        }
      }

      // Method 2: Check for nested spans (individual messages)
      if (!text) {
        const nestedSpans = lastElement.querySelectorAll('span[class*="selectable-text"] span, span[class*="copyable-text"] span, span._ao3e span');
        if (nestedSpans.length > 0) {
          text = nestedSpans[nestedSpans.length - 1].textContent.trim();
        }
      }

      // Method 3: Direct span approach
      if (!text) {
        const textElement = lastElement.querySelector('span[class*="selectable-text"], span[class*="copyable-text"], span._ao3e');
        if (textElement) {
          text = textElement.textContent.trim();
        }
      }

      // Clean and return
      if (text) {
        text = text.replace(/\d{1,2}:\d{2}/g, '').replace(/msg-[a-z]+/g, '').replace(/\s+/g, ' ').trim();
        return { message: text, senderName: '', repliesSentAfter: repliesSentAfter };
      }
    }

    return { error: 'No messages found in this chat.' };
  } catch (error) {
    console.error('Error extracting latest message:', error);
    return { error: 'Failed to extract message. The page structure may have changed.' };
  }
}

function extractChatName() {
  try {
    // Check if WhatsApp Web is loaded
    if (!isWhatsAppWebLoaded()) {
      return { error: 'WhatsApp Web not loaded' };
    }

    // Try multiple selectors for different chat types (individual vs group)
    const selectors = [
      // Individual chat selector
      '#main > header > div.x78zum5.xdt5ytf.x1iyjqo2.xl56j7k.xeuugli.xtnn1bt.x9v5kkp.xmw7ebm.xrdum7p > div > div > div > div > span',
      // Group chat selector
      '#main > header > div.x78zum5.xdt5ytf.x1iyjqo2.xl56j7k.xeuugli.xtnn1bt.x9v5kkp.xmw7ebm.xrdum7p > div.x78zum5.x1cy8zhl.x1y332i5.xggjnk3.x1yc453h span',
      // Generic fallback - any span in the header with text
      '#main > header span:not([aria-hidden]):not([data-icon]):not([class*="icon"])'
    ];

    for (let i = 0; i < selectors.length; i++) {
      const selector = selectors[i];
      const elements = document.querySelectorAll(selector);

      for (const element of elements) {
        const text = element.textContent || element.innerText || '';
        if (text.trim() && text.length > 0 && !text.includes('‏')) { // Avoid participant lists that start with special characters
          return { chatName: text.trim() };
        }
      }
    }

    return { error: 'Chat name not found' };
  } catch (error) {
    console.error('Error extracting chat name:', error);
    return { error: 'Failed to extract chat name' };
  }
}

// Function to send a reply message
function sendReplyMessage(replyText) {
  try {
    // Check if WhatsApp Web is loaded
    if (!isWhatsAppWebLoaded()) {
      throw new Error('WhatsApp Web not fully loaded');
    }

    // Check if a chat is selected
    if (!isChatSelected()) {
      throw new Error('No chat selected. Please select a chat before sending a message.');
    }

    // Validate input
    if (!replyText || !replyText.trim()) {
      throw new Error('Message text cannot be empty');
    }

    // Find the input box
    const inputBox = document.querySelector(SELECTORS.inputBox);
    if (!inputBox) {
      throw new Error('Message input box not found. The page structure may have changed.');
    }

    // Clear any existing content and focus
    inputBox.innerHTML = '';
    inputBox.focus();

    // For WhatsApp's Lexical rich text editor, we need to handle it differently
    // First, try the modern approach with InputEvent
    try {
      const inputEvent = new InputEvent('input', {
        bubbles: true,
        cancelable: true,
        data: replyText.trim(),
        inputType: 'insertText'
      });

      inputBox.textContent = replyText.trim();
      inputBox.dispatchEvent(inputEvent);

      // Also dispatch a change event to ensure WhatsApp detects the change
      const changeEvent = new Event('change', { bubbles: true });
      inputBox.dispatchEvent(changeEvent);

    } catch (error) {
      // Fallback: Use the old execCommand method
      const selection = window.getSelection();
      const range = document.createRange();

      // Clear existing content
      inputBox.innerHTML = '';

      // Create a text node and insert it
      const textNode = document.createTextNode(replyText.trim());
      inputBox.appendChild(textNode);

      // Set cursor at the end
      range.selectNodeContents(inputBox);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);

      // Dispatch input event
      const inputEvent = new Event('input', { bubbles: true });
      inputBox.dispatchEvent(inputEvent);
    }

    // Small delay to ensure text is inserted
    setTimeout(() => {
      // Find and click the send button
      const sendButton = document.querySelector(SELECTORS.sendButton);
      if (!sendButton) {
        throw new Error('Send button not found. The page structure may have changed.');
      }

      // Check if send button is enabled (has content to send)
      if (sendButton.disabled || sendButton.getAttribute('aria-disabled') === 'true') {
        throw new Error('Send button is disabled. Message may not have been inserted properly.');
      }

      // Click the send button
      sendButton.click();
    }, 100);

    return true;
  } catch (error) {
    console.error('Error sending reply message:', error);
    return { error: error.message };
  }
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'ping') {
    sendResponse({ pong: true, timestamp: Date.now() });
    return;
  }

  if (request.action === 'getLatestMessage') {
    const messageResult = extractLatestMessage();
    const chatNameResult = extractChatName();

    const response = {
      success: !messageResult.error && !chatNameResult.error,
      message: messageResult.message || null,
      chatName: chatNameResult.chatName || null,
      error: messageResult.error || chatNameResult.error || null
    };

    sendResponse(response);
  }

  if (request.action === 'getAllMessages') {
    const result = extractAllMessages();
    const chatNameResult = extractChatName();

    const response = {
      success: true,
      sentMessages: result.sentMessages,
      receivedMessages: result.receivedMessages,
      chatName: chatNameResult.chatName || null,
      total: result.total
    };

    sendResponse(response);
  } else if (request.action === 'sendReply') {
    const result = sendReplyMessage(request.text);

    let response;
    if (typeof result === 'boolean') {
      response = {
        success: result,
        error: result ? null : 'Failed to send message'
      };
    } else {
      response = {
        success: false,
        error: result.error
      };
    }

    sendResponse(response);
  }
});

// Function to check if we're on WhatsApp Web
function isWhatsAppWeb() {
  return window.location.hostname === 'web.whatsapp.com';
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}

function initialize() {
  if (!isWhatsAppWeb()) {
    return;
  }

  // Content script loaded successfully
}
