// WhatsApp Web Message Extractor Popup Script

// DOM elements
const chatNameElement = document.getElementById('chatName');
const latestMessageElement = document.getElementById('latestMessage');
const replyInput = document.getElementById('replyInput');
const sendButton = document.getElementById('sendButton');
const statusElement = document.getElementById('status');

// Function to show status messages
function showStatus(message, type = 'info') {
  statusElement.textContent = message;
  statusElement.className = `status ${type}`;

  // Clear status after 3 seconds for non-error messages
  if (type !== 'error') {
    setTimeout(() => {
      statusElement.textContent = '';
      statusElement.className = 'status';
    }, 3000);
  }
}

// Function to get the active WhatsApp Web tab
async function getWhatsAppTab() {
  console.log('Searching for WhatsApp tabs...');

  const tabs = await chrome.tabs.query({
    url: 'https://web.whatsapp.com/*',
    active: true
  });

  console.log('Active WhatsApp tabs:', tabs.length);

  if (tabs.length > 0) {
    console.log('Using active tab:', tabs[0].id, tabs[0].url);
    return tabs[0];
  }

  // If no active WhatsApp tab, check for any WhatsApp tab
  const allWhatsAppTabs = await chrome.tabs.query({
    url: 'https://web.whatsapp.com/*'
  });

  console.log('All WhatsApp tabs:', allWhatsAppTabs.length);

  if (allWhatsAppTabs.length > 0) {
    console.log('Using first WhatsApp tab:', allWhatsAppTabs[0].id, allWhatsAppTabs[0].url);
    return allWhatsAppTabs[0];
  }

  console.log('No WhatsApp tabs found');
  return null;
}

// Function to check if content script is available on a tab
async function testContentScriptConnection(tabId) {
  try {
    console.log('Testing content script connection on tab:', tabId);
    const response = await chrome.tabs.sendMessage(tabId, { action: 'ping' });
    console.log('Content script responded to ping:', response);
    return true;
  } catch (error) {
    console.log('Content script ping failed:', error.message);
    return false;
  }
}

// Function to manually inject content script if needed
async function ensureContentScript(tab) {
  try {
    console.log('Checking if content script is available...');

    // First try to ping
    const isConnected = await testContentScriptConnection(tab.id);
    if (isConnected) {
      console.log('Content script is already running');
      return true;
    }

    console.log('Content script not responding, trying to inject manually...');

    // Try to inject the content script manually
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });

    console.log('Content script injected manually');

    // Wait a bit for the script to initialize
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test again
    const isNowConnected = await testContentScriptConnection(tab.id);
    if (isNowConnected) {
      console.log('Manual injection successful');
      return true;
    } else {
      console.log('Manual injection failed');
      return false;
    }

  } catch (error) {
    console.error('Error ensuring content script:', error);
    return false;
  }
}

// Function to request all messages from content script
async function requestAllMessages() {
  try {
    console.log('Requesting all messages...');

    const tab = await getWhatsAppTab();
    console.log('Found WhatsApp tab:', tab);

    if (!tab) {
      showStatus('WhatsApp Web not found. Please open WhatsApp Web in a tab.', 'error');
      chatNameElement.textContent = 'No WhatsApp Web tab found';
      latestMessageElement.textContent = 'Please open WhatsApp Web';
      return;
    }

    // Ensure content script is available
    const scriptAvailable = await ensureContentScript(tab);
    if (!scriptAvailable) {
      showStatus('Failed to connect to WhatsApp Web. Content script could not be injected.', 'error');
      chatNameElement.textContent = 'Connection Failed';
      latestMessageElement.textContent = 'Could not inject content script';
      return;
    }

    console.log('Sending getAllMessages to tab:', tab.id);

    // Send message to content script
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: 'getAllMessages'
    });

    console.log('Received all messages response:', response);

    if (response && response.success) {
      // Display only the latest received message
      const receivedMessages = response.receivedMessages || [];
      const sentMessages = response.sentMessages || [];

      if (receivedMessages.length > 0) {
        const latestReceived = receivedMessages[receivedMessages.length - 1];
        const latestReceivedIndex = latestReceived.index;

        // Set chat info: for private chats use chat name, for groups use "sender (chat name)"
        const chatName = response.chatName || 'Unknown Chat';
        const messageSender = latestReceived.senderName;

        // If message has a sender name and it's different from chat name, it's a group chat
        const isGroupChat = messageSender && messageSender.trim() && messageSender !== chatName;
        const displayChatInfo = isGroupChat ? `${messageSender} (${chatName})` : chatName;

        chatNameElement.textContent = displayChatInfo;

        // Count sent messages that come after this received message
        const sentAfterReceived = sentMessages.filter(msg => msg.index > latestReceivedIndex).length;

        latestMessageElement.innerHTML = `
          <div style="padding: 12px; background-color: #f8f9fa; border-radius: 8px; line-height: 1.4;">
            ${latestReceived.text}
          </div>
          ${sentAfterReceived > 0 ? `<div style="margin-top: 8px; font-size: 12px; color: #666; text-align: center;">↩️ ${sentAfterReceived} message${sentAfterReceived === 1 ? '' : 's'} sent in reply</div>` : ''}
        `;
      } else {
        chatNameElement.textContent = response.chatName || 'Unknown Chat';
        latestMessageElement.innerHTML = `
          <div style="padding: 10px; background-color: #f8f9fa; border-radius: 8px; text-align: center; color: #666;">
            No received messages found
          </div>
        `;
      }

      statusElement.textContent = '';
      statusElement.className = 'status';
    } else {
      const errorMessage = response ? (response.error || 'Failed to retrieve messages') : 'No response from content script';
      showStatus(errorMessage, 'error');
      chatNameElement.textContent = 'Error';
      latestMessageElement.textContent = errorMessage;
    }

  } catch (error) {
    console.error('Error requesting messages:', error);
    showStatus(`Communication error: ${error.message}`, 'error');
    chatNameElement.textContent = 'Error';
    latestMessageElement.textContent = 'Unable to load messages';
  }
}

// Function to request latest message from content script (fallback)
async function requestLatestMessage() {
  try {
    console.log('Requesting latest message...');

    const tab = await getWhatsAppTab();
    console.log('Found WhatsApp tab:', tab);

    if (!tab) {
      showStatus('WhatsApp Web not found. Please open WhatsApp Web in a tab.', 'error');
      chatNameElement.textContent = 'No WhatsApp Web tab found';
      latestMessageElement.textContent = 'Please open WhatsApp Web';
      return;
    }

    // Ensure content script is available
    const scriptAvailable = await ensureContentScript(tab);
    if (!scriptAvailable) {
      showStatus('Failed to connect to WhatsApp Web. Content script could not be injected.', 'error');
      chatNameElement.textContent = 'Connection Failed';
      latestMessageElement.textContent = 'Could not inject content script';
      return;
    }

    console.log('Sending message to tab:', tab.id);

    // Send message to content script
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: 'getLatestMessage'
    });

    console.log('Received response:', response);
    console.log('Response message:', response.message);
    console.log('Response senderName:', response.senderName);

    if (response && response.success) {
      chatNameElement.textContent = response.chatName || 'Unknown Chat';

      // Display message with sender name if it's a group message
      let displayText = response.message || 'No messages found';
      console.log('Initial displayText:', displayText);

      if (response.senderName && response.senderName.trim()) {
        displayText = `${response.senderName}: ${displayText}`;
        console.log('Updated displayText with sender:', displayText);
      } else {
        console.log('No sender name found, using message only');
      }
      latestMessageElement.textContent = displayText;
      console.log('Final element text set to:', latestMessageElement.textContent);

      statusElement.textContent = ''; // Clear any previous error messages
      statusElement.className = 'status';
    } else {
      const errorMessage = response ? (response.error || 'Failed to retrieve message') : 'No response from content script';
      showStatus(errorMessage, 'error');
      chatNameElement.textContent = 'Error';
      latestMessageElement.textContent = errorMessage;
    }

  } catch (error) {
    console.error('Error requesting latest message:', error);
    console.error('Error details:', error.message, error.stack);
    showStatus(`Communication error: ${error.message}`, 'error');
    chatNameElement.textContent = 'Error';
    latestMessageElement.textContent = 'Unable to load messages';
  }
}

// Function to send reply message
async function sendReply() {
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
      // Refresh the latest message after a short delay
      setTimeout(() => {
        requestLatestMessage();
      }, 1000);
    } else {
      const errorMessage = response.error || 'Failed to send message';
      showStatus(errorMessage, 'error');
    }

  } catch (error) {
    console.error('Error sending reply:', error);
    showStatus('Error sending message', 'error');
  }
}

// Event listeners
sendButton.addEventListener('click', sendReply);

// Handle Enter key in textarea to send message
replyInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    sendReply();
  }
});

// Debug function to test basic functionality
async function runDiagnostics() {
  console.log('=== Extension Diagnostics ===');

  try {
    // Check if we can access chrome APIs
    console.log('Chrome API access: OK');

    // Check for WhatsApp tabs
    const tabs = await chrome.tabs.query({ url: 'https://web.whatsapp.com/*' });
    console.log('WhatsApp tabs found:', tabs.length);

    tabs.forEach(tab => {
      console.log('Tab:', tab.id, tab.url, tab.active ? '(active)' : '');
    });

    // Check active tab
    const activeTab = await chrome.tabs.query({ active: true, currentWindow: true });
    console.log('Active tab:', activeTab[0]?.url);

    return true;
  } catch (error) {
    console.error('Diagnostics failed:', error);
    return false;
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('Popup DOM loaded');

  // Run diagnostics first
  runDiagnostics().then(() => {
    console.log('Starting message request...');
    // Load all messages when popup opens
    requestAllMessages();
  });

  // Auto-refresh every 5 seconds
  setInterval(requestAllMessages, 5000);
});
