// Shield Extension Popup Script

// DOM elements - initialize empty first
let elements = {};

// Current tab and domain information
let currentTab = null;
let currentDomain = '';
let currentSafetyScore = 0;
let securityIssues = [];

// Initialize popup
function init() {
  console.log("Initializing popup");
  
  // Initialize DOM elements after the document is loaded
  initializeElements();
  
  // Get current tab information
  getCurrentTab().then(tab => {
    currentTab = tab;
    console.log("Current tab:", tab);
    
    if (!tab || !tab.url) {
      console.error("No valid tab or URL found");
      return;
    }
    
    currentDomain = extractDomain(tab.url);
    console.log("Current domain:", currentDomain);
    
    if (elements.siteDomain) {
      elements.siteDomain.textContent = currentDomain;
    } else {
      console.error("Site domain element not found");
    }
    
    // Calculate and display safety score
    requestSafetyScore(tab.url);
    
    // Load statistics
    loadStats();
    
    // Load settings and set toggle positions
    loadSettings();
    
    // Set up event listeners
    setupEventListeners();
    
    // Initialize chatbot UI if elements exist
    if (elements.chatbotToggle && elements.chatbotPanel) {
      setupChatbot();
    } else {
      console.warn("Chatbot elements not found", {
        toggle: elements.chatbotToggle,
        panel: elements.chatbotPanel
      });
    }
  }).catch(error => {
    console.error("Error initializing popup:", error);
    // Display error in UI if possible
    if (elements.safetyText) {
      elements.safetyText.textContent = "Error initializing";
      elements.safetyText.style.color = "#f44336";
    }
  });
}

// Initialize DOM elements
function initializeElements() {
  console.log("Initializing DOM elements");
  
  elements = {
    siteDomain: document.getElementById('site-domain'),
    safetyScore: document.getElementById('safety-score'),
    safetyScorePath: document.getElementById('safety-score-path'),
    safetyText: document.getElementById('safety-text'),
    adsBlocked: document.getElementById('ads-blocked'),
    trackersBlocked: document.getElementById('trackers-blocked'),
    httpsUpgrades: document.getElementById('https-upgrades'),
    fingerprintingAttempts: document.getElementById('fingerprinting-attempts'),
    openDashboard: document.getElementById('open-dashboard'),
    siteSettings: document.getElementById('site-settings'),
    clearData: document.getElementById('clear-data'),
    
    // Security action buttons
    configureProxy: document.getElementById('configure-proxy'),
    setupShieldVPN: document.getElementById('setup-shield-vpn'),
    checkVpn: document.getElementById('check-vpn'),
    blockSite: document.getElementById('block-site'),
    
    // Toggle switches
    adBlockingToggle: document.getElementById('adBlocking'),
    httpsUpgradeToggle: document.getElementById('httpsUpgrade'),
    antiFingerPrintingToggle: document.getElementById('antiFingerprinting'),
    javascriptControlToggle: document.getElementById('javascriptControl'),
    
    // Proxy mode elements
    proxyToggleContainer: document.getElementById('proxy-toggle-container'),
    proxyModeToggle: document.getElementById('proxyModeToggle'),
    proxySettings: document.getElementById('proxy-settings'),
    
    // Header action buttons
    privacySettingsBtn: document.getElementById('privacy-settings-btn'),
    
    // Chatbot elements
    chatbotToggle: document.getElementById('chatbot-toggle'),
    chatbotPanel: document.getElementById('chatbot-panel'),
    chatbotMessages: document.getElementById('chatbot-messages'),
    chatbotInput: document.getElementById('chatbot-input'),
    chatbotSend: document.getElementById('chatbot-send'),
    
    // New "Check VPN" button
    checkVpn: document.getElementById('check-vpn'),
    
    // Safety score details elements
    scoreDetailsPanel: document.getElementById('score-details-panel'),
    detailedScoreValue: document.getElementById('detailed-score-value'),
    detailedScoreLabel: document.getElementById('detailed-score-label'),
    scoreExplanation: document.getElementById('score-explanation'),
    scoreDetailsClose: document.getElementById('score-details-close'),
    
    // Score components
    httpsComponent: document.getElementById('https-component'),
    domainComponent: document.getElementById('domain-component'),
    tldComponent: document.getElementById('tld-component'),
    trackersComponent: document.getElementById('trackers-component'),
    phishingComponent: document.getElementById('phishing-component'),
  };
  
  // Log any missing critical elements
  const criticalElements = ['siteDomain', 'safetyScore', 'safetyScorePath'];
  for (const elementId of criticalElements) {
    if (!elements[elementId]) {
      console.error(`Critical element missing: ${elementId}`);
    }
  }
}

// Get the current active tab
async function getCurrentTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0];
}

// Extract domain from URL
function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch (e) {
    return url; // Fallback if URL is invalid
  }
}

// Request safety score from background script
function requestSafetyScore(url) {
  console.log("Requesting safety score for:", url);
  chrome.runtime.sendMessage({ 
    action: "calculateSafetyScore", 
    url: url 
  }, response => {
    console.log("Safety score response:", response);
    if (response && response.score !== undefined) {
      currentSafetyScore = response.score;
      updateSafetyDisplay(response.score);
      
      // Auto-show security advice for low safety sites
      if (currentSafetyScore < 60 && elements.chatbotPanel) {
        showChatbotPanel();
        getSecurityAdvice();
      }
    } else {
      console.error("No valid safety score received:", response);
      // Fallback to a default score
      currentSafetyScore = 50;
      updateSafetyDisplay(50);
    }
  });
}

// Update the safety score display
function updateSafetyDisplay(score) {
  console.log("Updating safety display with score:", score);
  
  try {
    // Validate score
    if (typeof score !== 'number' || isNaN(score)) {
      console.error("Invalid safety score:", score);
      score = 50; // Default to neutral score
    }
    
    // Ensure score is within range
    score = Math.max(0, Math.min(100, Math.round(score)));
    
    // Update score number
    if (elements.safetyScore) {
      elements.safetyScore.textContent = score;
    } else {
      console.error("Safety score element not found");
    }
    
    // Update circular progress indicator
    if (elements.safetyScorePath) {
      elements.safetyScorePath.setAttribute('stroke-dasharray', `${score}, 100`);
    } else {
      console.error("Safety score path element not found");
    }
    
    // Set colors and text based on score
    let color, text, ratingClass;
    
    // Determine rating based on score ranges
    if (score >= 90) {
      color = '#00c853'; // Bright green for excellent
      text = 'Excellent - Very Secure';
      ratingClass = 'excellent';
      securityIssues = [];
    } else if (score >= 80) {
      color = '#4caf50'; // Green for good
      text = 'Good - Safe to Browse';
      ratingClass = 'good';
      securityIssues = [];
    } else if (score >= 70) {
      color = '#8bc34a'; // Light green for mostly safe
      text = 'Mostly Safe';
      ratingClass = 'mostly-safe';
      securityIssues = ['Minor security concerns'];
    } else if (score >= 60) {
      color = '#ffc107'; // Yellow for caution
      text = 'Caution - Some Concerns';
      ratingClass = 'caution';
      securityIssues = ['Medium security risk detected'];
    } else if (score >= 40) {
      color = '#ff9800'; // Orange for warning
      text = 'Warning - Exercise Caution';
      ratingClass = 'warning';
      securityIssues = ['High security risk detected'];
    } else if (score >= 20) {
      color = '#f44336'; // Red for danger
      text = 'Danger - Not Recommended';
      ratingClass = 'danger';
      securityIssues = ['Very high security risk', 'Potential unsafe content'];
    } else {
      color = '#d50000'; // Dark red for severe
      text = 'Severe Risk - Avoid';
      ratingClass = 'severe';
      securityIssues = ['Critical security risk', 'Potentially harmful content'];
    }
    
    // Handle proxy toggle container visibility
    if (elements.proxyToggleContainer) {
      if (score >= 80) {
        // Hide proxy toggle for safe sites
        elements.proxyToggleContainer.style.display = 'none';
      } else if (score >= 60) {
        // Show proxy toggle for medium risk sites
        elements.proxyToggleContainer.style.display = 'block';
        elements.proxyToggleContainer.style.backgroundColor = '';
        elements.proxyToggleContainer.style.borderLeft = '';
      } else {
        // Show proxy toggle for high risk sites with urgent styling
        elements.proxyToggleContainer.style.display = 'block';
        elements.proxyToggleContainer.style.backgroundColor = '#ffdddd';
        elements.proxyToggleContainer.style.borderLeft = '4px solid ' + color;
      }
    }
    
    // Add recommendation for proxy use on risky sites
    if (score < 60 && elements.chatbotPanel) {
      const recommendationId = Date.now();
      const recommendationMsg = score < 40 ? 
        "Warning: This site poses significant security risks. I strongly recommend using Secure Proxy Mode or Shield VPN." : 
        "I recommend using Secure Proxy Mode for this site to enhance your privacy and security.";
      
      setTimeout(() => {
        addChatbotMessage(recommendationMsg, 'bot');
      }, 1500);
    }
    
    // Apply color to score circle
    if (elements.safetyScorePath) {
      elements.safetyScorePath.style.stroke = color;
    }
    
    if (elements.safetyText) {
      elements.safetyText.textContent = text;
      elements.safetyText.style.color = color;
    }
    
    // Add data-rating attribute for additional styling if needed
    if (elements.safetyScore.parentElement) {
      elements.safetyScore.parentElement.setAttribute('data-rating', ratingClass);
    }
    
    // Make safety score circle clickable to show details
    if (elements.safetyScore.parentElement) {
      elements.safetyScore.parentElement.style.cursor = 'pointer';
      elements.safetyScore.parentElement.addEventListener('click', showSafetyScoreDetails);
    }
    
    // Request detailed score components if available
    if (currentDomain) {
      fetchScoreComponents(currentDomain);
    }
    
    console.log("Safety display updated successfully with color:", color, "and text:", text);
    
  } catch (error) {
    console.error("Error updating safety display:", error);
  }
}

// Fetch score components for a domain
function fetchScoreComponents(domain) {
  chrome.runtime.sendMessage({ 
    action: "getLastScoreComponents", 
    domain: domain 
  }, response => {
    if (response && response.success && response.components) {
      // Store the components for displaying in the detailed panel
      window.scoreComponents = response.components;
      console.log("Safety score components:", response.components);
    }
  });
}

// Show detailed safety score panel
function showSafetyScoreDetails() {
  if (!elements.scoreDetailsPanel || !window.scoreComponents) return;
  
  const components = window.scoreComponents;
  
  // Update detailed score value and label
  elements.detailedScoreValue.textContent = components.score || currentSafetyScore;
  elements.detailedScoreLabel.textContent = getSafetyRatingText(components.score || currentSafetyScore);
  
  // Update score explanation
  if (components.knownSite) {
    elements.scoreExplanation.textContent = `${components.domain} is a known website with a pre-defined safety score based on reputation and security analysis.`;
  } else {
    elements.scoreExplanation.textContent = 'This safety score is calculated based on multiple factors including HTTPS encryption, domain reputation, tracker presence, and phishing signals.';
  }
  
  // Only show components visualization for calculated scores
  if (!components.knownSite && components.rawScores) {
    updateComponentBars(components.rawScores);
  }
  
  // Show the panel
  elements.scoreDetailsPanel.style.display = 'block';
  
  // Scroll to make sure it's visible
  elements.scoreDetailsPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Hide detailed safety score panel
function hideSafetyScoreDetails() {
  if (elements.scoreDetailsPanel) {
    elements.scoreDetailsPanel.style.display = 'none';
  }
}

// Update component visualization bars
function updateComponentBars(rawScores) {
  if (!rawScores) return;
  
  updateComponentBar('https', rawScores.https, 1);
  updateComponentBar('domain', rawScores.domain, 1.5);
  updateComponentBar('tld', rawScores.tld, 1);
  updateComponentBar('trackers', rawScores.trackers, 1);
  updateComponentBar('phishing', rawScores.phishing, 1);
}

// Update a single component bar
function updateComponentBar(name, value, maxValue) {
  const componentElement = elements[`${name}Component`];
  if (!componentElement) return;
  
  const barElement = componentElement.querySelector('.component-bar');
  const valueElement = componentElement.querySelector('.component-value');
  
  if (!barElement || !valueElement) return;
  
  // Normalize to percentage (0-100)
  const normalizedValue = ((value + maxValue) / (2 * maxValue)) * 100;
  
  // Update bar width
  barElement.style.width = `${normalizedValue}%`;
  
  // Update value text
  valueElement.textContent = value > 0 ? `+${value.toFixed(1)}` : value.toFixed(1);
  
  // Add class for styling
  valueElement.className = 'component-value';
  if (value > 0) {
    valueElement.classList.add('positive');
  } else if (value < 0) {
    valueElement.classList.add('negative');
  }
}

// Get rating text based on score
function getSafetyRatingText(score) {
  if (score >= 90) return 'Excellent';
  if (score >= 80) return 'Good';
  if (score >= 70) return 'Mostly Safe';
  if (score >= 60) return 'Caution';
  if (score >= 40) return 'Warning';
  if (score >= 20) return 'Danger';
  return 'Severe Risk';
}

// Load statistics from storage
function loadStats() {
  chrome.storage.local.get('settings', result => {
    if (result.settings && result.settings.blockedCount) {
      const stats = result.settings.blockedCount;
      
      // Update both sets of stat elements if they exist
      updateStatElement('ads-blocked', stats.ads || 0);
      updateStatElement('trackers-blocked', stats.trackers || 0);
      updateStatElement('https-upgrades', stats.httpsUpgrades || 0);
      updateStatElement('fingerprinting-attempts', stats.fingerprintingAttempts || 0);
    } else {
      console.error("No stats found in storage");
    }
  });
}

// Helper function to update stat elements safely
function updateStatElement(id, value) {
  // Find all elements with this id (there might be duplicates)
  const elements = document.querySelectorAll(`#${id}`);
  if (elements.length === 0) {
    console.error(`Stat element not found: ${id}`);
  } else {
    // Update all instances of this element
    elements.forEach(element => {
      element.textContent = value;
    });
  }
}

// Load settings from storage
function loadSettings() {
  chrome.runtime.sendMessage({ action: "getSettings" }, settings => {
    if (settings) {
      // Set global toggle switches
      elements.adBlockingToggle.checked = settings.adBlocking;
      elements.httpsUpgradeToggle.checked = settings.httpsUpgrade;
      elements.antiFingerPrintingToggle.checked = settings.antiFingerprinting;
      elements.javascriptControlToggle.checked = settings.javascriptControl;
      
      // Check for domain-specific settings
      if (settings.domainSettings && settings.domainSettings[currentDomain]) {
        const domainSettings = settings.domainSettings[currentDomain];
        
        // Override with domain-specific settings if available
        if (domainSettings.allowAds !== undefined) {
          elements.adBlockingToggle.checked = !domainSettings.allowAds;
        }
        
        if (domainSettings.allowTrackers !== undefined) {
          // Tracking is controlled by the same toggle as ads in our UI
          elements.adBlockingToggle.indeterminate = 
            elements.adBlockingToggle.checked !== !domainSettings.allowTrackers;
        }
        
        if (domainSettings.blockJavaScript !== undefined) {
          elements.javascriptControlToggle.checked = domainSettings.blockJavaScript;
        }
        
        // Set proxy mode toggle if available
        if (elements.proxyModeToggle && domainSettings.useProxy !== undefined) {
          elements.proxyModeToggle.checked = domainSettings.useProxy;
        }
      }
    }
  });
}

// Set up event listeners
function setupEventListeners() {
  // Toggle switches
  elements.adBlockingToggle.addEventListener('change', updateSettings);
  elements.httpsUpgradeToggle.addEventListener('change', updateSettings);
  elements.antiFingerPrintingToggle.addEventListener('change', updateSettings);
  elements.javascriptControlToggle.addEventListener('change', updateSettings);
  
  // Proxy mode toggle
  if (elements.proxyModeToggle) {
    elements.proxyModeToggle.addEventListener('change', toggleProxyMode);
  }
  
  // Proxy settings button
  if (elements.proxySettings) {
    elements.proxySettings.addEventListener('click', openProxySettings);
  }
  
  // Header action buttons
  if (elements.privacySettingsBtn) {
    elements.privacySettingsBtn.addEventListener('click', openProxySettings);
  }
  
  // Security action buttons
  if (elements.configureProxy) {
    elements.configureProxy.addEventListener('click', openProxySettings);
  }
  
  if (elements.setupShieldVPN) {
    elements.setupShieldVPN.addEventListener('click', setupShieldVPN);
  }
  
  if (elements.checkVpn) {
    elements.checkVpn.addEventListener('click', checkVpnConnection);
  }
  
  if (elements.blockSite) {
    elements.blockSite.addEventListener('click', blockCurrentSite);
  }
  
  // Buttons
  elements.openDashboard.addEventListener('click', openDashboard);
  elements.siteSettings.addEventListener('click', openSiteSettings);
  elements.clearData.addEventListener('click', clearSiteData);
  
  // Safety score details panel
  if (elements.scoreDetailsClose) {
    elements.scoreDetailsClose.addEventListener('click', hideSafetyScoreDetails);
  }
}

// Update settings when toggles are changed
function updateSettings() {
  const newSettings = {
    adBlocking: elements.adBlockingToggle.checked,
    httpsUpgrade: elements.httpsUpgradeToggle.checked,
    antiFingerprinting: elements.antiFingerPrintingToggle.checked,
    javascriptControl: elements.javascriptControlToggle.checked
  };
  
  // Special handling for the JavaScript toggle which is per-domain
  if (elements.javascriptControlToggle.checked) {
    // Create or update domain settings to block JavaScript
    newSettings.domainSettings = {
      [currentDomain]: {
        blockJavaScript: true
      }
    };
  } else {
    // Remove the JavaScript blocking for this domain
    newSettings.domainSettings = {
      [currentDomain]: {
        blockJavaScript: false
      }
    };
  }
  
  // Send updated settings to background script
  chrome.runtime.sendMessage({ 
    action: "updateSettings", 
    settings: newSettings 
  }, response => {
    if (response && response.success) {
      // If JavaScript setting was changed, reload the page
      if (currentTab && elements.javascriptControlToggle.dataset.previousState !== 
         elements.javascriptControlToggle.checked.toString()) {
        chrome.tabs.reload(currentTab.id);
      }
    }
  });
  
  // Store the current state for future comparison
  elements.javascriptControlToggle.dataset.previousState = 
    elements.javascriptControlToggle.checked.toString();
}

// Open dashboard page
function openDashboard() {
  chrome.tabs.create({ url: chrome.runtime.getURL('pages/dashboard.html') });
}

// Open site-specific settings page
function openSiteSettings() {
  chrome.tabs.create({ 
    url: chrome.runtime.getURL(`pages/site-settings.html?domain=${encodeURIComponent(currentDomain)}`) 
  });
}

// Clear site data (cookies, localStorage)
function clearSiteData() {
  if (currentTab && currentDomain) {
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
        const status = document.createElement('div');
        status.textContent = 'Site data cleared!';
        status.className = 'status-message success';
        document.body.appendChild(status);
        
        // Remove message after 2 seconds
        setTimeout(() => {
          status.remove();
        }, 2000);
      });
    }
  }
}

// Set up chatbot functionality
function setupChatbot() {
  // Wait a moment to ensure all elements are properly loaded
  setTimeout(() => {
    console.log("Setting up chatbot UI");
    
    // Toggle chatbot panel with button
    if (elements.chatbotToggle) {
      console.log("Adding event listener to chatbot toggle");
      elements.chatbotToggle.addEventListener('click', toggleChatbotPanel);
    } else {
      console.error("Chatbot toggle button not found");
    }
    
    // Close button for chatbot panel
    const closeButton = document.querySelector('.chatbot-close');
    if (closeButton) {
      console.log("Adding event listener to close button");
      closeButton.addEventListener('click', toggleChatbotPanel);
    } else {
      console.error("Chatbot close button not found");
    }
    
    // Handle send button and enter key press
    if (elements.chatbotSend && elements.chatbotInput) {
      console.log("Adding event listeners to send button and input");
      elements.chatbotSend.addEventListener('click', sendChatbotMessage);
      elements.chatbotInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
          sendChatbotMessage();
        }
      });
    } else {
      console.error("Chatbot send button or input not found", {
        send: elements.chatbotSend, 
        input: elements.chatbotInput
      });
    }
    
    // Show initial welcome message
    if (elements.chatbotMessages) {
      console.log("Adding welcome message");
      elements.chatbotMessages.innerHTML = ''; // Clear any existing messages
      addChatbotMessage("Hello! I'm your security assistant. I can help you stay safe online and answer questions about website security.", 'bot');
    } else {
      console.error("Chatbot messages container not found");
    }
  }, 100);
}

// Toggle chatbot panel visibility
function toggleChatbotPanel() {
  if (elements.chatbotPanel) {
    elements.chatbotPanel.classList.toggle('visible');
    if (elements.chatbotPanel.classList.contains('visible') && elements.chatbotMessages.children.length <= 1) {
      // If panel was just opened and only has welcome message, show security advice
      getSecurityAdvice();
    }
  }
}

// Show chatbot panel
function showChatbotPanel() {
  if (elements.chatbotPanel) {
    elements.chatbotPanel.classList.add('visible');
  }
}

// Send message to chatbot
function sendChatbotMessage() {
  if (!elements.chatbotInput.value.trim()) return;
  
  const userMessage = elements.chatbotInput.value.trim();
  addChatbotMessage(userMessage, 'user');
  elements.chatbotInput.value = '';
  
  // Add loading message
  const loadingId = addChatbotMessage('Thinking...', 'bot loading');
  
  // Use the ChatbotService for a reliable response
  if (window.ChatbotService) {
    window.ChatbotService.getChatbotResponse(userMessage, currentDomain, currentSafetyScore, securityIssues)
      .then(response => {
        // Remove loading message
        removeMessage(loadingId);
        
        // Add bot response
        addChatbotMessage(response, 'bot');
      })
      .catch(error => {
        console.error('Error getting chatbot response:', error);
        removeMessage(loadingId);
        addChatbotMessage("I'm having trouble connecting right now. Please try again later.", 'bot');
      });
  } else {
    // Fallback if service isn't available
    removeMessage(loadingId);
    addChatbotMessage("The chatbot service is currently unavailable. Please try again later.", 'bot');
  }
}

// Get security advice based on current site
function getSecurityAdvice() {
  // Add loading message
  const loadingId = addChatbotMessage('Analyzing site security...', 'bot loading');
  
  // Use the ChatbotService for a reliable response
  if (window.ChatbotService) {
    window.ChatbotService.getSecurityAdvice(currentDomain, currentSafetyScore, securityIssues)
      .then(advice => {
        // Remove loading message
        removeMessage(loadingId);
        
        // Add security advice
        addChatbotMessage(advice, 'bot');
      })
      .catch(error => {
        console.error('Error getting security advice:', error);
        removeMessage(loadingId);
        addChatbotMessage("I'm having trouble analyzing this site. Feel free to ask me specific security questions instead.", 'bot');
      });
  } else {
    // Fallback if service isn't available
    removeMessage(loadingId);
    addChatbotMessage("I'm analyzing this site's security. If you have any questions about staying safe online, feel free to ask!", 'bot');
  }
}

// Add message to chatbot panel
function addChatbotMessage(message, type) {
  const messageId = 'msg-' + Date.now();
  const messageEl = document.createElement('div');
  messageEl.className = `chat-message ${type}`;
  messageEl.id = messageId;
  messageEl.textContent = message;
  elements.chatbotMessages.appendChild(messageEl);
  
  // Scroll to bottom
  elements.chatbotMessages.scrollTop = elements.chatbotMessages.scrollHeight;
  
  return messageId;
}

// Remove a message by ID
function removeMessage(messageId) {
  const message = document.getElementById(messageId);
  if (message) {
    message.remove();
  }
}

// Handle proxy mode toggle
function toggleProxyMode() {
  if (!elements.proxyModeToggle) return;
  
  const enabled = elements.proxyModeToggle.checked;
  
  if (enabled) {
    // Get current preferred network type
    chrome.storage.local.get('settings', ({ settings }) => {
      const networkType = settings?.networkType || 'tor';
      
      // Show confirmation dialog with network type
      const networkName = getNetworkDisplayName(networkType);
      if (confirm(`Enable ${networkName} for ${currentDomain}? This will enhance your privacy and security for this site.`)) {
        // Save proxy settings for this domain
        saveProxySettings(currentDomain, true, networkType);
        
        // Show status message
        showStatusMessage(`${networkName} mode enabled for this site.`);
        
        // Handle specific network type
        handleNetworkActivation(networkType, currentTab.url);
      } else {
        // User canceled, reset toggle
        elements.proxyModeToggle.checked = false;
      }
    });
  } else {
    // Disable proxy mode
    saveProxySettings(currentDomain, false);
    showStatusMessage("Secure proxy mode disabled.");
  }
}

// Get network display name
function getNetworkDisplayName(networkType) {
  switch(networkType) {
    case 'tor': return 'Tor Browser';
    case 'socks': return 'SOCKS Proxy';
    case 'vpn': return 'VPN';
    default: return 'Secure Network';
  }
}

// Handle network activation based on type
function handleNetworkActivation(networkType, url) {
  if (networkType === 'tor') {
    // Launch Tor Browser with this URL if installed
    launchTorBrowser(url);
  } else if (networkType === 'vpn') {
    // Request VPN activation
    chrome.runtime.sendMessage({
      action: "activateVpn",
      url: url
    }, (response) => {
      console.log("VPN activation requested:", response);
    });
  } else if (networkType === 'socks') {
    // SOCKS proxy is handled automatically by background script
    console.log("SOCKS proxy requested for:", url);
    // Reload tab to apply proxy settings
    chrome.tabs.reload(currentTab.id);
  }
}

// Save proxy settings for a domain
function saveProxySettings(domain, enabled, proxyType = 'tor') {
  chrome.runtime.sendMessage({
    action: "updateProxySettings",
    domain: domain,
    useProxy: enabled,
    proxyType: proxyType
  });
}

// Open proxy settings page
function openProxySettings() {
  chrome.runtime.sendMessage({ action: "openProxySettings" });
  window.close(); // Close popup after opening settings
}

// Launch Tor Browser with the current URL
function launchTorBrowser(url) {
  chrome.runtime.sendMessage({
    action: "launchTorBrowser",
    url: url
  }, (response) => {
    if (response && response.success) {
      console.log("Tor Browser launched successfully");
      if (response.message) {
        showStatusMessage(response.message);
      }
    } else {
      console.error("Failed to launch Tor Browser", response?.error);
      
      // If configuration is needed, open settings
      if (response?.needsConfig) {
        if (confirm("Tor Browser path not set. Would you like to configure it now?")) {
          openProxySettings();
        }
      } else {
        // Show manual instructions
        showTorInstructions(url);
      }
    }
  });
}

// Show instructions for using Tor
function showTorInstructions(url) {
  const instructions = document.createElement('div');
  instructions.className = 'tor-instructions';
  instructions.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 5px 15px rgba(0,0,0,0.3);
    z-index: 10000;
    max-width: 400px;
    text-align: center;
  `;
  
  instructions.innerHTML = `
    <h3>Secure Browsing Instructions</h3>
    <p>To browse this site securely:</p>
    <ol style="text-align: left">
      <li>Copy this URL: <input type="text" value="${url}" style="width: 100%; margin: 5px 0" /></li>
      <li>Open Tor Browser</li>
      <li>Paste the URL and press Enter</li>
    </ol>
    <button id="close-instructions" style="padding: 8px 16px; background: #903a3a; color: white; border: none; border-radius: 4px; cursor: pointer;">Got it</button>
  `;
  
  document.body.appendChild(instructions);
  
  document.getElementById('close-instructions').addEventListener('click', () => {
    document.body.removeChild(instructions);
  });
}

// Show status message
function showStatusMessage(message, type = 'success') {
  const status = document.createElement('div');
  status.textContent = message;
  status.className = `status-message ${type}`;
  status.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 20px;
    padding: 8px 16px;
    background-color: ${type === 'success' ? '#28a745' : '#dc3545'};
    color: white;
    border-radius: 4px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    z-index: 1000;
  `;
  
  document.body.appendChild(status);
  
  // Remove message after 3 seconds
  setTimeout(() => {
    if (document.body.contains(status)) {
      document.body.removeChild(status);
    }
  }, 3000);
}

// Display popup notification
function showPopupNotification(message, duration = 3000) {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = 'popup-notification';
  notification.textContent = message;
  
  // Add to DOM
  document.body.appendChild(notification);
  
  // Remove after duration
  setTimeout(() => {
    notification.style.opacity = '0';
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 300);
  }, duration);
}

// Setup Shield VPN function
function setupShieldVPN() {
  chrome.runtime.sendMessage({
    action: "setupShieldVPN",
    url: currentTab ? currentTab.url : null
  }, response => {
    if (response && response.success) {
      // Show success message
      showPopupNotification("Shield VPN setup initiated. Follow the instructions in the notification.");
    } else if (response && response.needsConfig) {
      // Open the proxy settings page to the VPN tab to configure Shield VPN
      chrome.tabs.create({
        url: chrome.runtime.getURL("pages/proxy-settings.html#vpn")
      });
    } else {
      // Show error message
      showPopupNotification("Could not set up Shield VPN. Please check the settings.");
    }
  });
}

// Check VPN connection status
function checkVpnConnection() {
  // Show loading notification
  const loadingNotification = showPopupNotification("Checking VPN connection status...", 10000);
  
  chrome.runtime.sendMessage({
    action: "checkVpnConnection"
  }, response => {
    // Remove loading notification if it exists
    if (loadingNotification && document.body.contains(loadingNotification)) {
      document.body.removeChild(loadingNotification);
    }
    
    if (response && response.success) {
      // Create status element
      const statusElement = document.createElement('div');
      statusElement.className = 'vpn-status-popup';
      
      // Set style based on connection status
      const statusColor = response.connected ? '#4caf50' : '#f44336'; // Green if connected, red if not
      
      statusElement.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 10000;
        width: 300px;
        text-align: left;
        font-family: system-ui, -apple-system, sans-serif;
      `;
      
      // Get provider name
      const providerName = response.statusReport.providerName || 'VPN';
      
      // Create status content
      statusElement.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
          <h3 style="margin: 0; font-size: 16px;">VPN Connection Status</h3>
          <button id="close-vpn-status" style="background: none; border: none; font-size: 18px; cursor: pointer;">×</button>
        </div>
        <div style="margin-bottom: 15px;">
          <div style="display: flex; align-items: center; margin-bottom: 10px;">
            <div style="width: 12px; height: 12px; border-radius: 50%; background-color: ${statusColor}; margin-right: 8px;"></div>
            <span style="font-weight: bold; color: ${statusColor};">${response.connected ? 'Connected' : 'Not Connected'}</span>
          </div>
          <div style="color: #555; margin-bottom: 5px;">Provider: ${providerName}</div>
          <div style="color: #555; margin-bottom: 5px;">Current IP: ${response.statusReport.currentIp}</div>
        </div>
        <div style="display: flex; gap: 10px;">
          <button id="check-again-btn" style="flex: 1; padding: 8px; background: #f0f0f0; border: none; border-radius: 4px; cursor: pointer;">Check Again</button>
          <button id="vpn-settings-btn" style="flex: 1; padding: 8px; background: #903a3a; color: white; border: none; border-radius: 4px; cursor: pointer;">VPN Settings</button>
        </div>
        <div style="margin-top: 12px; font-size: 12px; color: #666;">
          <div style="display: flex; justify-content: space-between;">
            <span>DNS Leak Check:</span>
            <span>${response.statusReport.dnsLeakCheckPassed ? '✓ Passed' : '× Failed'}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>Response Time:</span>
            <span>${response.statusReport.responseTime}ms</span>
          </div>
        </div>
      `;
      
      // Add to DOM
      document.body.appendChild(statusElement);
      
      // Add event listeners
      document.getElementById('close-vpn-status').addEventListener('click', () => {
        document.body.removeChild(statusElement);
      });
      
      document.getElementById('check-again-btn').addEventListener('click', () => {
        document.body.removeChild(statusElement);
        checkVpnConnection();
      });
      
      document.getElementById('vpn-settings-btn').addEventListener('click', () => {
        document.body.removeChild(statusElement);
        openProxySettings();
      });
      
      // Auto close after 30 seconds
      setTimeout(() => {
        if (document.body.contains(statusElement)) {
          document.body.removeChild(statusElement);
        }
      }, 30000);
    } else {
      // Show error notification
      showPopupNotification(response?.error || "Could not check VPN status. Please try again.");
    }
  });
  
  return loadingNotification;
}

// Block current site function
function blockCurrentSite() {
  if (!currentDomain) {
    showPopupNotification("No domain detected to block");
    return;
  }
  
  // Add domain to blocked sites
  chrome.runtime.sendMessage({
    action: "updateSettings",
    settings: {
      domainSettings: {
        [currentDomain]: {
          blocked: true
        }
      }
    }
  }, response => {
    if (response && response.success) {
      showPopupNotification(`${currentDomain} has been blocked`);
    }
  });
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', init); 