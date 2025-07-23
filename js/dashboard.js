// Shield Dashboard JavaScript

// DOM elements
const elements = {
  // Statistics elements
  totalAdsBlocked: document.getElementById('total-ads-blocked'),
  totalTrackersBlocked: document.getElementById('total-trackers-blocked'),
  totalHttpsUpgrades: document.getElementById('total-https-upgrades'),
  totalFingerprintingAttempts: document.getElementById('total-fingerprinting-attempts'),
  
  // Setting toggles
  adBlockingToggle: document.getElementById('adBlocking'),
  httpsUpgradeToggle: document.getElementById('httpsUpgrade'),
  antiFingerPrintingToggle: document.getElementById('antiFingerprinting'),
  javascriptControlToggle: document.getElementById('javascriptControl'),
  notificationsEnabledToggle: document.getElementById('notificationsEnabled'),
  smartNotificationsEnabledToggle: document.getElementById('smartNotificationsEnabled'),
  proxyEnabledToggle: document.getElementById('proxyEnabled'),
  
  // Proxy settings elements
  proxySettings: document.getElementById('proxy-settings'),
  proxyHost: document.getElementById('proxy-host'),
  proxyPort: document.getElementById('proxy-port'),
  proxyScheme: document.getElementById('proxy-scheme'),
  
  // Buttons
  saveSettings: document.getElementById('save-settings'),
  restoreDefaults: document.getElementById('restore-defaults'),
  resetStats: document.getElementById('reset-stats'),
  exportData: document.getElementById('export-data'),
  saveProxy: document.getElementById('save-proxy'),
  
  // Top sites
  topSitesList: document.getElementById('top-sites-list'),
  
  // Notification history
  notificationHistoryList: document.getElementById('notification-history-list')
};

// Current settings object
let currentSettings = {};

// Site safety data
let siteSafetyData = [];

// Notification history
let notificationHistory = [];

// Initialize dashboard
function init() {
  // Load user settings
  loadSettings();
  
  // Load statistics
  loadStats();
  
  // Load site safety data
  loadSiteSafetyData();
  
  // Load notification history
  loadNotificationHistory();
  
  // Set up event listeners
  setupEventListeners();
}

// Load settings from storage
function loadSettings() {
  chrome.runtime.sendMessage({ action: "getSettings" }, settings => {
    if (settings) {
      currentSettings = settings;
      
      // Update toggle states
      elements.adBlockingToggle.checked = settings.adBlocking;
      elements.httpsUpgradeToggle.checked = settings.httpsUpgrade;
      elements.antiFingerPrintingToggle.checked = settings.antiFingerprinting;
      elements.javascriptControlToggle.checked = settings.javascriptControl;
      elements.notificationsEnabledToggle.checked = settings.notificationsEnabled;
      elements.smartNotificationsEnabledToggle.checked = settings.smartNotificationsEnabled !== false; // Default to true
      elements.proxyEnabledToggle.checked = settings.proxyEnabled;
      
      // Toggle proxy settings visibility
      toggleProxySettingsVisibility(settings.proxyEnabled);
      
      // Set proxy form values if available
      if (settings.proxyConfig) {
        elements.proxyHost.value = settings.proxyConfig.host || '';
        elements.proxyPort.value = settings.proxyConfig.port || '';
        elements.proxyScheme.value = settings.proxyConfig.scheme || 'http';
      }
    }
  });
}

// Load statistics from storage
function loadStats() {
  chrome.runtime.sendMessage({ action: "getStats" }, stats => {
    if (stats) {
      // Update stats display
      elements.totalAdsBlocked.textContent = stats.ads || 0;
      elements.totalTrackersBlocked.textContent = stats.trackers || 0;
      elements.totalHttpsUpgrades.textContent = stats.httpsUpgrades || 0;
      elements.totalFingerprintingAttempts.textContent = stats.fingerprintingAttempts || 0;
    }
  });
}

// Load site safety data
function loadSiteSafetyData() {
  chrome.storage.local.get('siteSafetyData', result => {
    if (result.siteSafetyData) {
      siteSafetyData = result.siteSafetyData;
      renderTopSites();
    } else {
      // Initialize empty data if not found
      siteSafetyData = [];
    }
  });
}

// Load notification history data
function loadNotificationHistory() {
  chrome.storage.local.get('notificationHistory', result => {
    if (result.notificationHistory && Array.isArray(result.notificationHistory)) {
      notificationHistory = result.notificationHistory;
      renderNotificationHistory();
    } else {
      // Initialize empty data if not found
      notificationHistory = [];
    }
  });
}

// Render top sites by safety score
function renderTopSites() {
  // Clear current content
  elements.topSitesList.innerHTML = '';
  
  // Check if we have data
  if (siteSafetyData.length === 0) {
    const placeholder = document.createElement('div');
    placeholder.className = 'site-list-placeholder';
    placeholder.innerHTML = '<p>Visit more sites to see safety rankings</p>';
    elements.topSitesList.appendChild(placeholder);
    return;
  }
  
  // Sort by safety score (highest first)
  const sortedSites = [...siteSafetyData].sort((a, b) => b.score - a.score);
  
  // Take top 10 sites
  const topSites = sortedSites.slice(0, 10);
  
  // Create site items
  topSites.forEach(site => {
    const siteItem = document.createElement('div');
    siteItem.className = 'site-item';
    
    // Determine safety class based on score
    let safetyClass = 'safe';
    if (site.score < 60) {
      safetyClass = 'unsafe';
    } else if (site.score < 80) {
      safetyClass = 'caution';
    }
    
    siteItem.innerHTML = `
      <div class="site-name">${site.domain}</div>
      <div class="site-safety-score ${safetyClass}">${site.score}</div>
    `;
    
    elements.topSitesList.appendChild(siteItem);
  });
}

// Render notification history
function renderNotificationHistory() {
  // Clear current content
  elements.notificationHistoryList.innerHTML = '';
  
  // Check if we have data
  if (notificationHistory.length === 0) {
    const placeholder = document.createElement('div');
    placeholder.className = 'notification-list-placeholder';
    placeholder.innerHTML = '<p>No recent privacy alerts</p>';
    elements.notificationHistoryList.appendChild(placeholder);
    return;
  }
  
  // Sort by timestamp (newest first)
  const sortedNotifications = [...notificationHistory].sort((a, b) => b.timestamp - a.timestamp);
  
  // Create notification items
  sortedNotifications.forEach(notification => {
    const notificationItem = document.createElement('div');
    notificationItem.className = 'notification-item';
    
    // Add priority class based on issues
    const hasSafetyIssue = notification.issues.some(issue => issue.includes('Safety'));
    const hasLocationIssue = notification.issues.some(issue => issue.includes('Location'));
    
    if (hasSafetyIssue) {
      notificationItem.classList.add('high-priority');
    } else if (hasLocationIssue) {
      notificationItem.classList.add('medium-priority');
    }
    
    // Format timestamp
    const date = new Date(notification.timestamp);
    const timeString = date.toLocaleString();
    
    // Create notification content
    notificationItem.innerHTML = `
      <div class="notification-domain">${notification.domain}</div>
      <div class="notification-message">${notification.message}</div>
      <div class="notification-issues">
        ${notification.issues.map(issue => `<span class="notification-issue-tag">${issue}</span>`).join('')}
      </div>
      <div class="notification-timestamp">${timeString}</div>
    `;
    
    elements.notificationHistoryList.appendChild(notificationItem);
  });
}

// Set up event listeners
function setupEventListeners() {
  // Settings toggle events
  elements.proxyEnabledToggle.addEventListener('change', function() {
    toggleProxySettingsVisibility(this.checked);
  });
  
  // Button events
  elements.saveSettings.addEventListener('click', saveAllSettings);
  elements.restoreDefaults.addEventListener('click', restoreDefaultSettings);
  elements.resetStats.addEventListener('click', resetStatistics);
  elements.exportData.addEventListener('click', exportUserData);
  elements.saveProxy.addEventListener('click', saveProxySettings);
}

// Toggle proxy settings panel visibility
function toggleProxySettingsVisibility(visible) {
  elements.proxySettings.classList.toggle('hidden', !visible);
}

// Save all settings
function saveAllSettings() {
  const newSettings = {
    adBlocking: elements.adBlockingToggle.checked,
    httpsUpgrade: elements.httpsUpgradeToggle.checked,
    antiFingerprinting: elements.antiFingerPrintingToggle.checked,
    javascriptControl: elements.javascriptControlToggle.checked,
    notificationsEnabled: elements.notificationsEnabledToggle.checked,
    smartNotificationsEnabled: elements.smartNotificationsEnabledToggle.checked,
    proxyEnabled: elements.proxyEnabledToggle.checked
  };
  
  // Add proxy config if enabled
  if (newSettings.proxyEnabled) {
    newSettings.proxyConfig = {
      host: elements.proxyHost.value,
      port: parseInt(elements.proxyPort.value, 10),
      scheme: elements.proxyScheme.value
    };
  }
  
  // Save to storage
  chrome.runtime.sendMessage({ 
    action: "updateSettings", 
    settings: newSettings 
  }, response => {
    if (response && response.success) {
      showNotification('Settings saved successfully!');
    } else {
      showNotification('Error saving settings.', 'error');
    }
  });
}

// Save just the proxy settings
function saveProxySettings() {
  if (!elements.proxyHost.value || !elements.proxyPort.value) {
    showNotification('Please enter proxy host and port.', 'error');
    return;
  }
  
  const proxyConfig = {
    host: elements.proxyHost.value,
    port: parseInt(elements.proxyPort.value, 10),
    scheme: elements.proxyScheme.value
  };
  
  chrome.runtime.sendMessage({ 
    action: "updateSettings", 
    settings: {
      proxyEnabled: true,
      proxyConfig: proxyConfig
    }
  }, response => {
    if (response && response.success) {
      showNotification('Proxy settings saved!');
    } else {
      showNotification('Error saving proxy settings.', 'error');
    }
  });
}

// Restore default settings
function restoreDefaultSettings() {
  if (confirm('Are you sure you want to restore all settings to defaults?')) {
    chrome.runtime.sendMessage({ action: "restoreDefaults" }, response => {
      if (response && response.success) {
        // Reload settings
        loadSettings();
        showNotification('Default settings restored!');
      } else {
        showNotification('Error restoring defaults.', 'error');
      }
    });
  }
}

// Reset statistics counters
function resetStatistics() {
  if (confirm('Are you sure you want to reset all statistics?')) {
    chrome.runtime.sendMessage({ 
      action: "updateSettings", 
      settings: { 
        blockedCount: {
          ads: 0,
          trackers: 0,
          httpsUpgrades: 0,
          fingerprintingAttempts: 0
        }
      }
    }, response => {
      if (response && response.success) {
        // Update displayed stats
        elements.totalAdsBlocked.textContent = '0';
        elements.totalTrackersBlocked.textContent = '0';
        elements.totalHttpsUpgrades.textContent = '0';
        elements.totalFingerprintingAttempts.textContent = '0';
        
        showNotification('Statistics have been reset!');
      } else {
        showNotification('Error resetting statistics.', 'error');
      }
    });
  }
}

// Export user data
function exportUserData() {
  // Collect all data for export
  chrome.storage.local.get(null, allData => {
    // Create a download blob
    const dataStr = JSON.stringify(allData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    // Create download link
    const a = document.createElement('a');
    a.href = url;
    a.download = `shield_data_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    
    // Clean up
    URL.revokeObjectURL(url);
    
    showNotification('Data exported successfully!');
  });
}

// Show notification message
function showNotification(message, type = 'success') {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  
  // Add close button
  const closeButton = document.createElement('span');
  closeButton.className = 'notification-close';
  closeButton.innerHTML = '&times;';
  closeButton.onclick = function() {
    document.body.removeChild(notification);
  };
  
  notification.appendChild(closeButton);
  document.body.appendChild(notification);
  
  // Auto remove after 3 seconds
  setTimeout(() => {
    if (document.body.contains(notification)) {
      document.body.removeChild(notification);
    }
  }, 3000);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', init); 