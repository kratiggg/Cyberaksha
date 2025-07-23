// Shield Site Settings JavaScript

// DOM elements
const elements = {
  siteDomain: document.getElementById('site-domain'),
  safetyScore: document.getElementById('safety-score'),
  safetyScorePath: document.getElementById('safety-score-path'),
  
  // Setting toggles
  allowAdsToggle: document.getElementById('allowAds'),
  allowTrackersToggle: document.getElementById('allowTrackers'),
  blockJavaScriptToggle: document.getElementById('blockJavaScript'),
  
  // Site info elements
  httpsStatus: document.getElementById('https-status'),
  trackersCount: document.getElementById('trackers-count'),
  mixedContent: document.getElementById('mixed-content'),
  cookiesCount: document.getElementById('cookies-count'),
  
  // Site history
  siteHistory: document.getElementById('site-history'),
  
  // Buttons
  saveSiteSettings: document.getElementById('save-site-settings'),
  clearSiteData: document.getElementById('clear-site-data'),
  resetSiteSettings: document.getElementById('reset-site-settings'),
  backToDashboard: document.getElementById('back-to-dashboard')
};

// Current settings and domain
let currentSettings = {};
let currentDomain = '';
let siteData = {};

// Initialize page
function init() {
  // Extract domain from URL query params
  currentDomain = new URLSearchParams(window.location.search).get('domain') || '';
  
  if (!currentDomain) {
    showError('No domain specified');
    return;
  }
  
  elements.siteDomain.textContent = currentDomain;
  
  // Load settings and site data
  loadSettings();
  loadSiteData();
  
  // Set up event listeners
  setupEventListeners();
}

// Load settings from storage
function loadSettings() {
  chrome.runtime.sendMessage({ action: "getSettings" }, settings => {
    if (settings) {
      currentSettings = settings;
      
      // Check for domain-specific settings and set toggle states
      const domainSettings = settings.domainSettings && settings.domainSettings[currentDomain];
      
      if (domainSettings) {
        // Set toggle states based on domain settings
        elements.allowAdsToggle.checked = domainSettings.allowAds || false;
        elements.allowTrackersToggle.checked = domainSettings.allowTrackers || false;
        elements.blockJavaScriptToggle.checked = domainSettings.blockJavaScript || false;
      } else {
        // Default states (follow global settings)
        elements.allowAdsToggle.checked = false;
        elements.allowTrackersToggle.checked = false;
        elements.blockJavaScriptToggle.checked = false;
      }
    }
  });
}

// Load site-specific data
function loadSiteData() {
  // Request safety score and site data
  chrome.runtime.sendMessage({ 
    action: "calculateSafetyScore", 
    url: `https://${currentDomain}` 
  }, response => {
    if (response && response.score !== undefined) {
      updateSafetyDisplay(response.score);
    }
  });
  
  // Load site data from storage
  chrome.storage.local.get('siteSafetyData', result => {
    if (result.siteSafetyData) {
      const siteEntry = result.siteSafetyData.find(site => site.domain === currentDomain);
      
      if (siteEntry) {
        siteData = siteEntry;
        
        // Update site information display
        updateSiteInfo(siteEntry);
        
        // Load site history
        loadSiteHistory();
      }
    }
  });
  
  // Get cookie information for this domain
  chrome.cookies.getAll({ domain: currentDomain }, cookies => {
    elements.cookiesCount.textContent = cookies.length;
  });
}

// Update the site information display
function updateSiteInfo(siteInfo) {
  // Update HTTPS status
  if (siteInfo.https) {
    elements.httpsStatus.textContent = 'Secure (HTTPS)';
    elements.httpsStatus.classList.add('secure');
  } else {
    elements.httpsStatus.textContent = 'Insecure (HTTP)';
    elements.httpsStatus.classList.add('insecure');
  }
  
  // Update trackers count
  elements.trackersCount.textContent = siteInfo.trackersDetected || '0';
  
  // Update mixed content status
  if (siteInfo.mixedContent) {
    elements.mixedContent.textContent = 'Detected';
    elements.mixedContent.classList.add('insecure');
  } else {
    elements.mixedContent.textContent = 'None';
    elements.mixedContent.classList.add('secure');
  }
}

// Load site protection history
function loadSiteHistory() {
  chrome.storage.local.get('siteHistory', result => {
    // Clear current content
    elements.siteHistory.innerHTML = '';
    
    if (result.siteHistory && result.siteHistory[currentDomain]) {
      const history = result.siteHistory[currentDomain];
      
      // Sort history by timestamp (newest first)
      history.sort((a, b) => b.timestamp - a.timestamp);
      
      // Take most recent 10 entries
      const recentHistory = history.slice(0, 10);
      
      if (recentHistory.length > 0) {
        recentHistory.forEach(entry => {
          const historyItem = document.createElement('div');
          historyItem.className = 'history-item';
          
          const date = new Date(entry.timestamp);
          const formattedDate = date.toLocaleString();
          
          historyItem.innerHTML = `
            <div class="history-time">${formattedDate}</div>
            <div class="history-action ${entry.type}">${entry.action}</div>
          `;
          
          elements.siteHistory.appendChild(historyItem);
        });
      } else {
        // No history found
        showNoHistoryMessage();
      }
    } else {
      // No history found
      showNoHistoryMessage();
    }
  });
}

// Show "no history" message
function showNoHistoryMessage() {
  const placeholder = document.createElement('div');
  placeholder.className = 'history-item placeholder';
  placeholder.innerHTML = '<p>No protection history for this site yet</p>';
  elements.siteHistory.appendChild(placeholder);
}

// Update the safety score display
function updateSafetyDisplay(score) {
  // Update score number
  elements.safetyScore.textContent = score;
  
  // Update circular progress indicator
  elements.safetyScorePath.setAttribute('stroke-dasharray', `${score}, 100`);
  
  // Set colors based on score
  let color;
  
  if (score >= 80) {
    color = '#28a745'; // Green for good
  } else if (score >= 60) {
    color = '#ffc107'; // Yellow for caution
  } else {
    color = '#dc3545'; // Red for danger
  }
  
  // Apply color to score circle
  elements.safetyScorePath.style.stroke = color;
}

// Set up event listeners
function setupEventListeners() {
  // Button events
  elements.saveSiteSettings.addEventListener('click', saveSiteSettings);
  elements.clearSiteData.addEventListener('click', clearSiteData);
  elements.resetSiteSettings.addEventListener('click', resetSiteSettings);
  elements.backToDashboard.addEventListener('click', goToDashboard);
}

// Save site-specific settings
function saveSiteSettings() {
  // Create domain settings object
  const domainSettings = {
    allowAds: elements.allowAdsToggle.checked,
    allowTrackers: elements.allowTrackersToggle.checked,
    blockJavaScript: elements.blockJavaScriptToggle.checked
  };
  
  // Update settings in storage
  chrome.runtime.sendMessage({ 
    action: "updateSettings", 
    settings: { 
      domainSettings: {
        [currentDomain]: domainSettings
      }
    }
  }, response => {
    if (response && response.success) {
      showNotification('Site settings saved successfully!');
      
      // Add to site history
      addToSiteHistory('Settings updated', 'settings');
    } else {
      showNotification('Error saving settings.', 'error');
    }
  });
}

// Clear site data (cookies, storage, etc.)
function clearSiteData() {
  if (confirm(`Clear all browsing data for ${currentDomain}?`)) {
    chrome.browsingData.remove({
      origins: [`https://${currentDomain}`, `http://${currentDomain}`]
    }, {
      cache: true,
      cookies: true,
      localStorage: true,
      sessionStorage: true
    }, () => {
      // Show success message
      showNotification('Site data cleared!');
      
      // Add to site history
      addToSiteHistory('Site data cleared', 'clear');
      
      // Update cookies count
      elements.cookiesCount.textContent = '0';
    });
  }
}

// Reset site settings to follow global settings
function resetSiteSettings() {
  if (confirm('Reset site settings to follow global settings?')) {
    // Get current settings
    chrome.runtime.sendMessage({ action: "getSettings" }, settings => {
      if (settings && settings.domainSettings) {
        // Create a copy of the settings
        const newSettings = {...settings};
        
        // Remove domain-specific settings if they exist
        if (newSettings.domainSettings[currentDomain]) {
          delete newSettings.domainSettings[currentDomain];
          
          // Save updated settings
          chrome.runtime.sendMessage({ 
            action: "updateSettings", 
            settings: { domainSettings: newSettings.domainSettings }
          }, response => {
            if (response && response.success) {
              // Reset UI toggles
              elements.allowAdsToggle.checked = false;
              elements.allowTrackersToggle.checked = false;
              elements.blockJavaScriptToggle.checked = false;
              
              showNotification('Site settings reset to defaults');
              
              // Add to site history
              addToSiteHistory('Settings reset to defaults', 'reset');
            } else {
              showNotification('Error resetting settings', 'error');
            }
          });
        } else {
          // No settings to reset
          showNotification('No custom settings found for this site');
        }
      }
    });
  }
}

// Add entry to site history
function addToSiteHistory(action, type) {
  const historyEntry = {
    timestamp: Date.now(),
    action: action,
    type: type
  };
  
  chrome.storage.local.get('siteHistory', result => {
    const siteHistory = result.siteHistory || {};
    siteHistory[currentDomain] = siteHistory[currentDomain] || [];
    
    // Add new entry
    siteHistory[currentDomain].push(historyEntry);
    
    // Save updated history
    chrome.storage.local.set({ siteHistory: siteHistory }, () => {
      // Reload history display
      loadSiteHistory();
    });
  });
}

// Go to dashboard
function goToDashboard() {
  window.location.href = chrome.runtime.getURL('pages/dashboard.html');
}

// Show error message
function showError(message) {
  const errorElement = document.createElement('div');
  errorElement.className = 'error-message';
  errorElement.textContent = message;
  
  // Replace content with error
  document.body.innerHTML = '';
  document.body.appendChild(errorElement);
  
  // Add back button
  const backButton = document.createElement('button');
  backButton.className = 'btn primary';
  backButton.textContent = 'Back to Dashboard';
  backButton.onclick = goToDashboard;
  
  document.body.appendChild(backButton);
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