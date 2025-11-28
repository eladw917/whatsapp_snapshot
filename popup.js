// WhatsApp Web Message Extractor Popup Script

// DOM elements - will be initialized when DOM is ready
let latestMessageElement;
let replyCounterElement;
let relativeDateElement;
let replyInput;
let sendButton;
let statusElement;
let unreadIndicatorElement;

// Language detection patterns for RTL vs LTR languages
const RTL_LANGUAGES = [
  // Arabic script languages
  /[\u0600-\u06FF]/, // Arabic
  /[\u0750-\u077F]/, // Arabic Supplement
  /[\u08A0-\u08FF]/, // Arabic Extended-A
  /[\uFB50-\uFDFF]/, // Arabic Presentation Forms-A
  /[\uFE70-\uFEFF]/, // Arabic Presentation Forms-B
  // Hebrew
  /[\u0590-\u05FF]/, // Hebrew
  // Syriac
  /[\u0700-\u074F]/, // Syriac
  // Thaana (Maldives)
  /[\u0780-\u07BF]/, // Thaana
  // Samaritan
  /[\u0800-\u083F]/, // Samaritan
  // Mandaic
  /[\u0840-\u085F]/, // Mandaic
];

// Function to detect if text contains primarily RTL characters
function isRTLText(text) {
  if (!text || typeof text !== 'string') return false;

  // Count RTL characters
  let rtlCount = 0;
  let totalCount = 0;

  for (let char of text) {
    const codePoint = char.codePointAt(0);
    totalCount++;

    // Check if character falls in RTL Unicode ranges
    for (let pattern of RTL_LANGUAGES) {
      if (pattern.test(char)) {
        rtlCount++;
        break;
      }
    }
  }

  // If more than 30% of characters are RTL, consider it RTL text
  return totalCount > 0 && (rtlCount / totalCount) > 0.3;
}

// Function to get text alignment class based on content language
function getTextAlignmentClass(text) {
  return isRTLText(text) ? 'rtl-text' : 'ltr-text';
}

// Function to show status messages
function showStatus(message, type = 'info') {
  if (!statusElement) return; // Status element removed, silently ignore
  statusElement.textContent = message;
  statusElement.className = `status ${type}`;

  // Clear status after 3 seconds for non-error messages
  if (type !== 'error') {
    setTimeout(() => {
      if (statusElement) {
        statusElement.textContent = '';
        statusElement.className = 'status';
      }
    }, 3000);
  }
}

// Function to parse date and time strings into a Date object
function parseMessageDateTime(dateString, timeString) {
  if (!dateString || !timeString) {
    return null;
  }

  // Parse date string in format DD.MM.YYYY
  const dateParts = dateString.split('.');
  if (dateParts.length !== 3) {
    return null;
  }

  // Parse time string in format HH:MM
  const timeParts = timeString.split(':');
  if (timeParts.length !== 2) {
    return null;
  }

  const day = parseInt(dateParts[0], 10);
  const monthIndex = parseInt(dateParts[1], 10) - 1; // Month is 0-indexed in JS Date
  const year = parseInt(dateParts[2], 10);
  const hours = parseInt(timeParts[0], 10);
  const minutes = parseInt(timeParts[1], 10);

  return new Date(year, monthIndex, day, hours, minutes);
}

// Function to calculate time difference in minutes between two messages
function getTimeDifferenceInMinutes(message1, message2) {
  const date1 = parseMessageDateTime(message1.date, message1.time);
  const date2 = parseMessageDateTime(message2.date, message2.time);

  if (!date1 || !date2) {
    return null;
  }

  // Calculate difference in milliseconds, then convert to minutes
  const diffMs = Math.abs(date2 - date1);
  return diffMs / (1000 * 60);
}

// Function to calculate relative date string
function getRelativeDate(dateString) {
  if (!dateString || !dateString.trim()) {
    return '';
  }

  // Parse date string in format DD.MM.YYYY
  const dateParts = dateString.split('.');
  if (dateParts.length !== 3) {
    return '';
  }

  const day = parseInt(dateParts[0], 10);
  const monthIndex = parseInt(dateParts[1], 10) - 1; // Month is 0-indexed in JS Date
  const year = parseInt(dateParts[2], 10);

  const messageDate = new Date(year, monthIndex, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  messageDate.setHours(0, 0, 0, 0);

  const diffTime = today - messageDate;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays > 1 && diffDays <= 7) {
    // Return day name for past week
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return dayNames[messageDate.getDay()];
  } else {
    // Return formatted date
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${day} ${monthNames[monthIndex]} ${year}`;
  }
}

// Function to get the active WhatsApp Web tab
async function getWhatsAppTab() {
  const tabs = await chrome.tabs.query({
    url: 'https://web.whatsapp.com/*',
    active: true
  });

  if (tabs.length > 0) {
    return tabs[0];
  }

  // If no active WhatsApp tab, check for any WhatsApp tab
  const allWhatsAppTabs = await chrome.tabs.query({
    url: 'https://web.whatsapp.com/*'
  });

  if (allWhatsAppTabs.length > 0) {
    return allWhatsAppTabs[0];
  }

  return null;
}

// Function to check if content script is available on a tab
async function testContentScriptConnection(tabId) {
  try {
    const response = await chrome.tabs.sendMessage(tabId, { action: 'ping' });
    return true;
  } catch (error) {
    return false;
  }
}

// Function to manually inject content script if needed
async function ensureContentScript(tab) {
  try {
    // First try to ping
    const isConnected = await testContentScriptConnection(tab.id);
    if (isConnected) {
      return true;
    }

    // Try to inject the content script manually
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });

    // Wait a bit for the script to initialize
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test again
    const isNowConnected = await testContentScriptConnection(tab.id);
    if (isNowConnected) {
      return true;
    } else {
      return false;
    }

  } catch (error) {
    console.error('Error ensuring content script:', error);
    return false;
  }
}

// Function to concatenate consecutive received messages from the same sender
// that are within 2 minutes of each other with no sent messages between them
function concatenateRecentMessages(receivedMessages, sentMessages) {
  if (receivedMessages.length === 0) {
    return null;
  }

  // Start with the latest message
  const latestMessage = receivedMessages[receivedMessages.length - 1];
  const concatenatedMessages = [latestMessage];
  const senderName = latestMessage.senderName || '';

  // Iterate backwards through received messages
  for (let i = receivedMessages.length - 2; i >= 0; i--) {
    const currentMessage = receivedMessages[i];
    const previousMessage = concatenatedMessages[0]; // The earliest message in our concatenated group

    // Check if messages are from the same sender
    const currentSender = currentMessage.senderName || '';
    if (currentSender !== senderName) {
      break; // Different sender, stop concatenating
    }

    // Check if current message is within 2 minutes of the previous message
    const timeDiff = getTimeDifferenceInMinutes(currentMessage, previousMessage);
    if (timeDiff === null) {
      // If time difference can't be calculated, check if messages are consecutive (index difference of 1)
      // This handles cases where date/time extraction failed
      const indexDiff = previousMessage.index - currentMessage.index;
      if (indexDiff > 1) {
        break; // Not consecutive, stop concatenating
      }
      // If consecutive (index diff is 1), continue concatenating
    } else if (timeDiff > 2) {
      break; // More than 2 minutes apart, stop concatenating
    }

    // Check if there are any sent messages between currentMessage and previousMessage
    const currentIndex = currentMessage.index;
    const previousIndex = previousMessage.index;
    const hasSentMessagesBetween = sentMessages.some(
      sentMsg => sentMsg.index > currentIndex && sentMsg.index < previousIndex
    );

    if (hasSentMessagesBetween) {
      break; // There are sent messages between, stop concatenating
    }

    // All conditions met, add to concatenated group (at the beginning)
    concatenatedMessages.unshift(currentMessage);
  }

  // Concatenate message texts with line breaks
  const concatenatedText = concatenatedMessages
    .map(msg => {
      // Handle different message types
      if (msg.messageType === 'image') {
        return '[Image]';
      } else if (msg.messageType === 'voice') {
        return msg.text || '[Voice message]';
      } else {
        return msg.text || '';
      }
    })
    .filter(text => text.trim().length > 0) // Filter out empty messages
    .join('\n');

  // Return the concatenated message with metadata from the latest message
  return {
    text: concatenatedText,
    senderName: latestMessage.senderName,
    timestamp: latestMessage.timestamp,
    date: latestMessage.date,
    time: latestMessage.time,
    messageType: latestMessage.messageType,
    index: latestMessage.index,
    concatenatedCount: concatenatedMessages.length
  };
}

// Function to update unread indicator
async function updateUnreadIndicator() {
  try {
    // First try to get from storage (set by background worker)
    const result = await chrome.storage.local.get(['unreadCount']);
    let unreadCount = result.unreadCount || 0;

    // Also try to get directly from content script for real-time updates
    try {
      const tab = await getWhatsAppTab();
      if (tab) {
        const scriptAvailable = await ensureContentScript(tab);
        if (scriptAvailable) {
          const response = await chrome.tabs.sendMessage(tab.id, {
            action: 'getUnreadCount'
          });
          if (response && typeof response.count === 'number') {
            unreadCount = response.count;
            // Update storage with latest count
            await chrome.storage.local.set({ unreadCount: unreadCount });
          }
        }
      }
    } catch (error) {
      // If direct check fails, use stored value
    }

    // Update indicator
    if (unreadIndicatorElement) {
      if (unreadCount > 0) {
        const displayText = unreadCount > 99 ? '99+' : String(unreadCount);
        unreadIndicatorElement.textContent = `${displayText} unread`;
        unreadIndicatorElement.style.display = 'block';
      } else {
        unreadIndicatorElement.textContent = '';
        unreadIndicatorElement.style.display = 'none';
      }
    }
  } catch (error) {
    console.error('Error updating unread indicator:', error);
    if (unreadIndicatorElement) {
      unreadIndicatorElement.style.display = 'none';
    }
  }
}

// Function to request all messages from content script
async function requestAllMessages() {
  try {
    const tab = await getWhatsAppTab();

    if (!tab) {
      showStatus('WhatsApp Web not found. Please open WhatsApp Web in a tab.', 'error');
      if (latestMessageElement) latestMessageElement.textContent = 'Please open WhatsApp Web';
      if (replyCounterElement) {
        replyCounterElement.textContent = '';
        replyCounterElement.style.display = 'none';
      }
      if (relativeDateElement) relativeDateElement.style.display = 'none';
      // Update unread indicator
      await updateUnreadIndicator();
      return;
    }

    // Ensure content script is available
    const scriptAvailable = await ensureContentScript(tab);
    if (!scriptAvailable) {
      showStatus('Failed to connect to WhatsApp Web. Content script could not be injected.', 'error');
      if (latestMessageElement) latestMessageElement.textContent = 'Could not inject content script';
      if (replyCounterElement) {
        replyCounterElement.textContent = '';
        replyCounterElement.style.display = 'none';
      }
      if (relativeDateElement) relativeDateElement.style.display = 'none';
      // Update unread indicator
      await updateUnreadIndicator();
      return;
    }

    // Update unread indicator
    await updateUnreadIndicator();

    // Send message to content script
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: 'getAllMessages'
    });

    if (response && response.success) {
      // Display only the latest received message (potentially concatenated)
      const receivedMessages = response.receivedMessages || [];
      const sentMessages = response.sentMessages || [];

      if (receivedMessages.length > 0) {
        // Concatenate recent messages
        const concatenatedMessage = concatenateRecentMessages(receivedMessages, sentMessages);
        const latestReceived = concatenatedMessage || receivedMessages[receivedMessages.length - 1];
        const latestReceivedIndex = latestReceived.index;

        // Set chat info: for private chats use chat name, for groups use "sender (chat name)"
        const chatName = response.chatName || 'Unknown Chat';
        const messageSender = latestReceived.senderName;

        // If message has a sender name and it's different from chat name, it's a group chat
        const isGroupChat = messageSender && messageSender.trim() && messageSender !== chatName;
        const displayChatInfo = isGroupChat ? `${messageSender} (${chatName})` : chatName;


        // Count sent messages that come after this received message
        const sentAfterReceived = sentMessages.filter(msg => msg.index > latestReceivedIndex).length;

        // Get message content - use concatenated text if available
        const messageContent = latestReceived.text || '';
        const messageTimestamp = latestReceived.timestamp || '';

        // Calculate and display relative date
        const messageDate = latestReceived.date || '';
        const relativeDateStr = getRelativeDate(messageDate);
        if (relativeDateElement) {
          if (relativeDateStr) {
            relativeDateElement.textContent = relativeDateStr;
            relativeDateElement.style.display = 'block';
          } else {
            relativeDateElement.style.display = 'none';
          }
        }

        // Escape HTML and convert line breaks to <br> tags
        const escapedContent = messageContent
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;')
          .replace(/\n/g, '<br>');

        // Determine text alignment based on message content language
        const alignmentClass = getTextAlignmentClass(messageContent);

        latestMessageElement.innerHTML = `
          <div class="message-bubble ${alignmentClass}">
            <div class="message-sender">${displayChatInfo}</div>
            <div class="message-content">${escapedContent}</div>
            <div class="message-timestamp">${messageTimestamp}</div>
          </div>
        `;

        // Set reply counter separately
        if (sentAfterReceived > 0) {
          replyCounterElement.textContent = `You've replied ${sentAfterReceived} time${sentAfterReceived === 1 ? '' : 's'}`;
          replyCounterElement.style.display = 'block';
        } else {
          replyCounterElement.textContent = '';
          replyCounterElement.style.display = 'none';
        }
      } else {
        // For "no messages" message, default to LTR since it's in English
        latestMessageElement.innerHTML = `
          <div class="message-bubble ltr-text">
            <div class="message-content" style="text-align: center; color: var(--medium-gray);">
              No received messages found
            </div>
          </div>
        `;
        replyCounterElement.textContent = '';
        replyCounterElement.style.display = 'none';
        relativeDateElement.style.display = 'none';
      }

      if (statusElement) {
        statusElement.textContent = '';
        statusElement.className = 'status';
      }
      
      // Update unread indicator after successful message fetch
      await updateUnreadIndicator();
    } else {
      const errorMessage = response ? (response.error || 'Failed to retrieve messages') : 'No response from content script';
      showStatus(errorMessage, 'error');
      latestMessageElement.textContent = errorMessage;
      replyCounterElement.textContent = '';
      replyCounterElement.style.display = 'none';
      if (relativeDateElement) relativeDateElement.style.display = 'none';
      // Still try to update unread indicator
      await updateUnreadIndicator();
    }

  } catch (error) {
    console.error('Error requesting messages:', error);
    showStatus(`Communication error: ${error.message}`, 'error');
    latestMessageElement.textContent = 'Unable to load messages';
    replyCounterElement.textContent = '';
    replyCounterElement.style.display = 'none';
    relativeDateElement.style.display = 'none';
    // Still try to update unread indicator
    await updateUnreadIndicator();
  }
}

// Function to request latest message from content script (fallback)
async function requestLatestMessage() {
  try {
    const tab = await getWhatsAppTab();

    if (!tab) {
      showStatus('WhatsApp Web not found. Please open WhatsApp Web in a tab.', 'error');
      latestMessageElement.textContent = 'Please open WhatsApp Web';
      replyCounterElement.textContent = '';
      replyCounterElement.style.display = 'none';
      return;
    }

    // Ensure content script is available
    const scriptAvailable = await ensureContentScript(tab);
    if (!scriptAvailable) {
      showStatus('Failed to connect to WhatsApp Web. Content script could not be injected.', 'error');
      latestMessageElement.textContent = 'Could not inject content script';
      replyCounterElement.textContent = '';
      replyCounterElement.style.display = 'none';
      return;
    }

    // Send message to content script
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: 'getLatestMessage'
    });

    if (response && response.success) {
      // Display message with sender name if it's a group message
      let displayText = response.message || 'No messages found';

      if (response.senderName && response.senderName.trim()) {
        displayText = `${response.senderName}: ${displayText}`;
      }
      latestMessageElement.textContent = displayText;
      replyCounterElement.textContent = '';
      replyCounterElement.style.display = 'none';

      if (statusElement) {
        statusElement.textContent = ''; // Clear any previous error messages
        statusElement.className = 'status';
      }
    } else {
      const errorMessage = response ? (response.error || 'Failed to retrieve message') : 'No response from content script';
      showStatus(errorMessage, 'error');
      latestMessageElement.textContent = errorMessage;
      replyCounterElement.textContent = '';
      replyCounterElement.style.display = 'none';
    }

  } catch (error) {
    console.error('Error requesting latest message:', error);
    showStatus(`Communication error: ${error.message}`, 'error');
    latestMessageElement.textContent = 'Unable to load messages';
    replyCounterElement.textContent = '';
    replyCounterElement.style.display = 'none';
  }
}

// Function to send reply message
async function sendReply() {
  if (!replyInput) {
    showStatus('Reply input not available', 'error');
    return;
  }
  const replyText = replyInput.value.trim();

  if (!replyText) {
    showStatus('Please enter a reply message', 'error');
    return;
  }

  try {
    const tab = await getWhatsAppTab();

    if (!tab) {
      showStatus('WhatsApp Web not found. Please open WhatsApp Web in a tab.', 'error');
      return;
    }

    // Ensure content script is available
    const scriptAvailable = await ensureContentScript(tab);
    if (!scriptAvailable) {
      showStatus('Failed to connect to WhatsApp Web. Content script could not be injected.', 'error');
      return;
    }

    // Send reply to content script
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: 'sendReply',
      text: replyText
    });

    if (response.success) {
      showStatus('Message sent successfully!', 'success');
      replyInput.value = ''; // Clear input
      // Refresh all messages after a delay to allow DOM to update
      setTimeout(() => {
        requestAllMessages();
      }, 1500);
    } else {
      const errorMessage = response.error || 'Failed to send message';
      showStatus(errorMessage, 'error');
    }

  } catch (error) {
    console.error('Error sending reply:', error);
    showStatus('Error sending message', 'error');
  }
}

// Event listeners are now set up inside DOMContentLoaded

// Debug function to test basic functionality
async function runDiagnostics() {
  try {
    // Check if we can access chrome APIs
    // Check for WhatsApp tabs
    const tabs = await chrome.tabs.query({ url: 'https://web.whatsapp.com/*' });

    // Check active tab
    const activeTab = await chrome.tabs.query({ active: true, currentWindow: true });

    return true;
  } catch (error) {
    console.error('Diagnostics failed:', error);
    return false;
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Initialize DOM elements
  latestMessageElement = document.getElementById('latestMessage');
  replyCounterElement = document.getElementById('replyCounter');
  relativeDateElement = document.getElementById('relativeDate');
  replyInput = document.getElementById('replyInput');
  sendButton = document.getElementById('sendButton');
  statusElement = document.getElementById('status'); // May be null if element removed
  unreadIndicatorElement = document.getElementById('unreadIndicator');

  // Set up event listeners after DOM elements are initialized
  if (sendButton) {
    sendButton.addEventListener('click', sendReply);
  }

  // Handle Enter key in textarea to send message (WhatsApp-style behavior)
  if (replyInput) {
    replyInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        if (event.shiftKey) {
          // Shift+Enter: Allow new line (default behavior)
          // Let the textarea handle the newline insertion naturally
          return;
        } else {
          // Enter: Send message
          event.preventDefault();
          sendReply();
        }
      }
    });

    // Auto-resize textarea based on content
    replyInput.addEventListener('input', () => {
      // Reset height to auto to get the correct scrollHeight
      replyInput.style.height = 'auto';
      // Set height to scrollHeight to fit content
      const newHeight = Math.min(replyInput.scrollHeight, 80); // Max height from CSS
      replyInput.style.height = newHeight + 'px';
    });
  }

  // Update unread indicator immediately when popup opens
  updateUnreadIndicator();

  // Run diagnostics first
  runDiagnostics().then(() => {
    // Load all messages when popup opens
    requestAllMessages();
  });

  // Auto-refresh every 5 seconds
  setInterval(() => {
    requestAllMessages();
    updateUnreadIndicator();
  }, 5000);

  // Listen for storage changes (when background worker updates unread count)
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes.unreadCount) {
      updateUnreadIndicator();
    }
  });
});
