// WhatsApp Web Message Extractor Background Service Worker

// Configuration
const CHECK_INTERVAL_MINUTES = 0.5; // Check every 30 seconds
const ALARM_NAME = 'checkUnreadMessages';

// Function to get all WhatsApp Web tabs
async function getWhatsAppTabs() {
  try {
    const tabs = await chrome.tabs.query({
      url: 'https://web.whatsapp.com/*'
    });
    return tabs;
  } catch (error) {
    console.error('Error querying WhatsApp tabs:', error);
    return [];
  }
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

// Function to inject content script if needed
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
    return isNowConnected;

  } catch (error) {
    console.error('Error ensuring content script:', error);
    return false;
  }
}

// Function to extract unread count from a tab
async function getUnreadCountFromTab(tab) {
  try {
    // Ensure content script is available
    const scriptAvailable = await ensureContentScript(tab);
    if (!scriptAvailable) {
      return null;
    }

    // Send message to content script to get unread count
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: 'getUnreadCount'
    });

    if (response && typeof response.count === 'number') {
      return response.count;
    }

    return null;
  } catch (error) {
    // Tab might be closed or not accessible
    return null;
  }
}

// Function to check unread messages across all WhatsApp tabs
async function checkUnreadMessages() {
  try {
    const tabs = await getWhatsAppTabs();
    
    if (tabs.length === 0) {
      // No WhatsApp tabs open, clear badge
      await chrome.action.setBadgeText({ text: '' });
      await chrome.storage.local.set({ unreadCount: 0 });
      return;
    }

    // Check unread count from all tabs
    // For now, we'll check the active tab or first tab
    // In the future, we could aggregate counts from all tabs
    let totalUnreadCount = 0;

    for (const tab of tabs) {
      // Only check visible/active tabs to avoid unnecessary work
      if (tab.active || tab.highlighted) {
        const count = await getUnreadCountFromTab(tab);
        if (count !== null && count > 0) {
          totalUnreadCount = Math.max(totalUnreadCount, count);
        }
      }
    }

    // If no active tab had unread messages, check the first tab
    if (totalUnreadCount === 0 && tabs.length > 0) {
      const count = await getUnreadCountFromTab(tabs[0]);
      if (count !== null && count > 0) {
        totalUnreadCount = count;
      }
    }

    // Update badge
    if (totalUnreadCount > 0) {
      // Show count, but limit to 99+ for display
      const badgeText = totalUnreadCount > 99 ? '99+' : String(totalUnreadCount);
      await chrome.action.setBadgeText({ text: badgeText });
      await chrome.action.setBadgeBackgroundColor({ color: '#25d366' }); // WhatsApp green
    } else {
      await chrome.action.setBadgeText({ text: '' });
    }

    // Store unread count for popup access
    await chrome.storage.local.set({ unreadCount: totalUnreadCount });

  } catch (error) {
    console.error('Error checking unread messages:', error);
  }
}

// Set up alarm for periodic checking
chrome.alarms.create(ALARM_NAME, {
  periodInMinutes: CHECK_INTERVAL_MINUTES
});

// Listen for alarm events
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    checkUnreadMessages();
  }
});

// Check immediately when service worker starts
checkUnreadMessages();

// Also check when a tab is updated (user navigates or refreshes WhatsApp)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes('web.whatsapp.com')) {
    // Small delay to ensure WhatsApp is fully loaded
    setTimeout(() => {
      checkUnreadMessages();
    }, 2000);
  }
});

// Check when a tab becomes active
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab.url && tab.url.includes('web.whatsapp.com')) {
      setTimeout(() => {
        checkUnreadMessages();
      }, 1000);
    }
  } catch (error) {
    // Tab might be closed or not accessible
  }
});

