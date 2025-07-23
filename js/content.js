// Shield Extension Content Script
// This script runs in the context of web pages

// Store original prototype methods to prevent detection of our modifications
const originalFunctions = {
  getContext: HTMLCanvasElement.prototype.getContext,
  toDataURL: HTMLCanvasElement.prototype.toDataURL,
  toBlob: HTMLCanvasElement.prototype.toBlob,
  getImageData: CanvasRenderingContext2D.prototype.getImageData
};

// Track whether anti-fingerprinting is enabled
let antiFingerPrintingEnabled = true;

// Initialize and load settings
function init() {
  // Request settings from background script
  chrome.runtime.sendMessage({ action: "getSettings" }, (settings) => {
    if (settings) {
      antiFingerPrintingEnabled = settings.antiFingerprinting;
      
      // Apply anti-fingerprinting if enabled
      if (antiFingerPrintingEnabled) {
        applyAntiFingerprinting();
      }
      
      // Request safety score calculation
      requestSafetyScore();
      
      // Always show a notification immediately on page load
      if (settings.notificationsEnabled !== false) {
        // Show an immediate generic notification
        createPopupNotification("Shield is actively protecting you on this site. Analyzing security...");
        
        // Try to get a more specific security notification after a delay
        setTimeout(() => {
          showSecurityNotification();
        }, 2500);
      }
    }
  });
  
  // Listen for changes to settings
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.settings && 
        changes.settings.newValue.antiFingerprinting !== antiFingerPrintingEnabled) {
      antiFingerPrintingEnabled = changes.settings.newValue.antiFingerprinting;
      
      if (antiFingerPrintingEnabled) {
        applyAntiFingerprinting();
      } else {
        // Restore original functions
        restoreOriginalFunctions();
      }
    }
  });
}

// Apply anti-fingerprinting measures
function applyAntiFingerprinting() {
  // Only apply if enabled
  if (!antiFingerPrintingEnabled) return;
  
  // Override Canvas methods to prevent fingerprinting
  HTMLCanvasElement.prototype.getContext = function() {
    const context = originalFunctions.getContext.apply(this, arguments);
    if (context && (arguments[0] === '2d' || arguments[0] === 'webgl' || arguments[0] === 'experimental-webgl')) {
      // Count fingerprinting attempt
      chrome.runtime.sendMessage({ 
        action: "updateSettings", 
        settings: { 
          blockedCount: { 
            fingerprintingAttempts: 1  // Will be added to existing count
          } 
        }
      });
      
      // Add small noise to canvas-based fingerprinting
      if (context.fillText) {
        const originalFillText = context.fillText;
        context.fillText = function() {
          originalFillText.apply(this, arguments);
          // Add subtle noise to the canvas
          const imageData = context.getImageData(0, 0, this.canvas.width, this.canvas.height);
          addNoise(imageData.data);
          context.putImageData(imageData, 0, 0);
        };
      }
    }
    return context;
  };
  
  // Override toDataURL to add noise to the result
  HTMLCanvasElement.prototype.toDataURL = function() {
    // Add subtle modifications to canvas before generating data URL
    const context = this.getContext('2d');
    if (context) {
      const imageData = context.getImageData(0, 0, this.width, this.height);
      addNoise(imageData.data);
      context.putImageData(imageData, 0, 0);
    }
    return originalFunctions.toDataURL.apply(this, arguments);
  };
  
  // Override navigator properties to reduce fingerprinting
  spoofNavigatorProperties();
  
  // Block known fingerprinting scripts
  blockFingerPrintingScripts();
  
  // Add a small amount of random noise to mouse movement
  addMouseNoise();
}

// Add subtle noise to canvas data to defeat fingerprinting
function addNoise(data) {
  // Only modify 1 in every 100 pixels for minimal visual impact
  for (let i = 0; i < data.length; i += 4) {
    if (Math.random() < 0.01) {
      // Add small random noise to RGBA values
      data[i] = Math.min(255, Math.max(0, data[i] + (Math.random() * 2 - 1)));
      data[i+1] = Math.min(255, Math.max(0, data[i+1] + (Math.random() * 2 - 1)));
      data[i+2] = Math.min(255, Math.max(0, data[i+2] + (Math.random() * 2 - 1)));
      // Don't modify alpha value to maintain image integrity
    }
  }
}

// Spoof navigator properties to reduce uniqueness
function spoofNavigatorProperties() {
  // Store original properties
  const originalUserAgent = navigator.userAgent;
  const originalPlatform = navigator.platform;
  const originalHardwareConcurrency = navigator.hardwareConcurrency;
  const originalLanguages = navigator.languages;
  
  // Common values to make fingerprinting less accurate
  const spoofedHardwareConcurrency = 4; // Common value
  const spoofedLanguages = ["en-US", "en"]; // Common language setting
  
  // Override navigator properties using Object.defineProperty
  try {
    Object.defineProperty(Navigator.prototype, 'hardwareConcurrency', {
      get: function() { return spoofedHardwareConcurrency; }
    });
    
    Object.defineProperty(Navigator.prototype, 'languages', {
      get: function() { return spoofedLanguages; }
    });
    
    // Modify navigator.plugins to reduce uniqueness
    const originalPlugins = navigator.plugins;
    Object.defineProperty(Navigator.prototype, 'plugins', {
      get: function() {
        // Return a limited set of common plugins to reduce uniqueness
        return Array.from(originalPlugins).slice(0, Math.min(2, originalPlugins.length));
      }
    });
  } catch (e) {
    console.error("Shield: Failed to modify navigator properties", e);
  }
}

// Block known fingerprinting scripts by removing them from the DOM
function blockFingerPrintingScripts() {
  // List of known fingerprinting script signatures
  const fingerprintingScripts = [
    'fingerprintjs',
    'fingerprint2.js',
    'fingerprint.js',
    'clientjs',
    'analytics'
  ];
  
  // Create a mutation observer to detect and remove matching scripts
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.addedNodes) {
        mutation.addedNodes.forEach((node) => {
          if (node.tagName === 'SCRIPT') {
            const src = node.src || '';
            if (fingerprintingScripts.some(script => src.toLowerCase().includes(script))) {
              // Found a fingerprinting script, remove it
              node.parentNode.removeChild(node);
              
              // Increment counter for fingerprinting attempts
              chrome.runtime.sendMessage({ 
                action: "updateSettings", 
                settings: { 
                  blockedCount: { 
                    fingerprintingAttempts: 1 
                  } 
                }
              });
            }
          }
        });
      }
    });
  });
  
  // Start observing document for script additions
  observer.observe(document, { childList: true, subtree: true });
}

// Add subtle noise to mouse movements to defeat behavioral tracking
function addMouseNoise() {
  // Create a random noise factor between 0.5 and 2 pixels
  const noiseAmount = 0.5 + Math.random() * 1.5;
  
  // Intercept mouse movement events
  document.addEventListener('mousemove', function(event) {
    // Only modify 1 in 10 movements to maintain usability
    if (Math.random() < 0.1) {
      // Create a slightly noisy version of the event
      const noisyEvent = new MouseEvent('mousemove', {
        clientX: event.clientX + (Math.random() * noiseAmount * 2 - noiseAmount),
        clientY: event.clientY + (Math.random() * noiseAmount * 2 - noiseAmount),
        screenX: event.screenX + (Math.random() * noiseAmount * 2 - noiseAmount),
        screenY: event.screenY + (Math.random() * noiseAmount * 2 - noiseAmount),
        bubbles: true,
        cancelable: true
      });
      
      // Stop propagation of the original event
      event.stopPropagation();
      event.preventDefault();
      
      // Dispatch the noisy event
      event.target.dispatchEvent(noisyEvent);
    }
  }, true);
}

// Restore original browser functions
function restoreOriginalFunctions() {
  HTMLCanvasElement.prototype.getContext = originalFunctions.getContext;
  HTMLCanvasElement.prototype.toDataURL = originalFunctions.toDataURL;
  HTMLCanvasElement.prototype.toBlob = originalFunctions.toBlob;
  CanvasRenderingContext2D.prototype.getImageData = originalFunctions.getImageData;
}

// Request safety score calculation from background script
function requestSafetyScore() {
  chrome.runtime.sendMessage({ 
    action: "calculateSafetyScore", 
    url: window.location.href 
  }, response => {
    if (response && response.score !== undefined) {
      // Store the safety score for later use
      currentSafetyScore = response.score;
      
      // If the score is below threshold, show warning banner
      if (currentSafetyScore < 60) {
        createSecurityBanner(currentSafetyScore);
      }
    }
  });
}

// Create a banner for low safety sites
function createSecurityBanner(score) {
  const banner = document.createElement('div');
  banner.id = 'shield-security-banner';
  banner.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    background-color: ${score < 40 ? '#dc3545' : '#ffc107'};
    color: ${score < 40 ? 'white' : 'black'};
    padding: 8px 16px;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 14px;
    z-index: 2147483647;
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
  `;
  
  const message = document.createElement('div');
  message.textContent = score < 40 
    ? 'Warning: This site may be unsafe! Shield is actively protecting you.'
    : 'Caution: This site has some security concerns. Shield is monitoring for threats.';
  
  const closeButton = document.createElement('button');
  closeButton.textContent = '×';
  closeButton.style.cssText = `
    background: none;
    border: none;
    font-size: 20px;
    cursor: pointer;
    color: inherit;
    margin-left: 10px;
  `;
  closeButton.onclick = () => {
    document.body.removeChild(banner);
  };
  
  banner.appendChild(message);
  banner.appendChild(closeButton);
  
  // Add to body when it's available
  if (document.body) {
    document.body.appendChild(banner);
  } else {
    window.addEventListener('DOMContentLoaded', () => {
      document.body.appendChild(banner);
    });
  }
}

// Global variable to store current safety score
let currentSafetyScore = 50;

// Show personalized security notification
function showSecurityNotification() {
  try {
    // Check if notifications are enabled in settings
    chrome.runtime.sendMessage({ action: "getSettings" }, (settings) => {
      if (settings && settings.notificationsEnabled) {
        // Only proceed if we have a safety score
        if (currentSafetyScore > 0) {
          // Direct API call instead of going through background script
          const API_KEY = '6j1Xb3gBSqDSS9AbkpIPioLIOf5YTbB8E66ss9YwXBai6fmZrbT3kmlPQX2Bb2NT';
          const API_URL = 'https://api-lr.agent.ai/v1/action/invoke_llm';
          
          // Create prompt based on the site's safety
          const securityLevel = currentSafetyScore >= 80 ? 'high' : (currentSafetyScore >= 60 ? 'medium' : 'low');
          const issues = getSecurityIssues();
          
          let prompt = `You are Shield, a security assistant for web browsing. 
  The user is visiting ${window.location.hostname} which has a safety score of ${currentSafetyScore}/100 (${securityLevel} security level).`;
          
          if (issues.length > 0) {
            prompt += `\n\nThe following security issues were detected:
  ${issues.map(issue => `- ${issue}`).join('\n')}`;
          }
          
          prompt += `\n\nBased on this information, provide a concise (max 3 sentences) security assessment and practical advice to help the user stay safe. Focus on clear, actionable tips rather than technical details. Format your response in a friendly, helpful tone.`;
          
          fetch(API_URL, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              instructions: prompt,
              llm_engine: 'gpt4o'
            })
          })
          .then(response => {
            if (!response.ok) {
              throw new Error(`API error: ${response.status}`);
            }
            return response.json();
          })
          .then(data => {
            if (data && data.result) {
              createPopupNotification(data.result);
            }
          })
          .catch(error => {
            console.error('Error getting security advice:', error);
            // If API fails, show a generic message
            if (currentSafetyScore < 60) {
              createPopupNotification("This site presents some security concerns. Be cautious about sharing sensitive information and consider checking the site's legitimacy before proceeding.");
            }
          });
        } else {
          // If no safety score, wait and try again
          setTimeout(() => {
            showSecurityNotification();
          }, 1500);
        }
      }
    });
  } catch (error) {
    console.error('Error in security notification:', error);
  }
}

// Get current security issues based on page analysis
function getSecurityIssues() {
  const issues = [];
  
  // Check for HTTP instead of HTTPS
  if (window.location.protocol !== 'https:') {
    issues.push('Insecure connection (HTTP)');
  }
  
  // Check for mixed content
  if (window.location.protocol === 'https:' && document.querySelectorAll('img[src^="http:"], script[src^="http:"], link[href^="http:"]').length > 0) {
    issues.push('Mixed content detected');
  }
  
  // Add safety score-based issues
  if (currentSafetyScore < 40) {
    issues.push('Potentially unsafe website');
  } else if (currentSafetyScore < 60) {
    issues.push('Medium security risk');
  }
  
  return issues;
}

// Create popup notification with security advice
function createPopupNotification(message) {
  // Check if notification already exists
  if (document.getElementById('shield-security-notification')) {
    return;
  }
  
  const notification = document.createElement('div');
  notification.id = 'shield-security-notification';
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    width: 300px;
    background-color: white;
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 12px 16px;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 14px;
    z-index: 2147483647;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    line-height: 1.4;
    animation: shield-slide-in 0.3s ease-out;
  `;
  
  // Add animation CSS
  const style = document.createElement('style');
  style.textContent = `
    @keyframes shield-slide-in {
      from { transform: translateY(-20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    @keyframes shield-fade-out {
      from { opacity: 1; }
      to { opacity: 0; }
    }
  `;
  document.head.appendChild(style);
  
  // Header
  const header = document.createElement('div');
  header.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
    border-bottom: 1px solid #eee;
    padding-bottom: 8px;
  `;
  
  // Logo and title
  const logo = document.createElement('div');
  logo.style.cssText = `
    font-weight: bold;
    display: flex;
    align-items: center;
  `;
  
  // Shield logo (inline SVG would be better, but using text for simplicity)
  logo.innerHTML = `
    <span style="font-size: 16px; margin-right: 5px;">🛡️</span>
    <span>Shield Security</span>
  `;
  
  // Close button
  const closeButton = document.createElement('button');
  closeButton.textContent = '×';
  closeButton.style.cssText = `
    background: none;
    border: none;
    font-size: 20px;
    cursor: pointer;
    color: #555;
  `;
  closeButton.onclick = () => {
    notification.style.animation = 'shield-fade-out 0.3s forwards';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  };
  
  header.appendChild(logo);
  header.appendChild(closeButton);
  
  // Message content
  const content = document.createElement('div');
  content.textContent = message;
  content.style.color = '#333';
  
  // Assemble notification
  notification.appendChild(header);
  notification.appendChild(content);
  
  // Function to add to body when it's ready
  const addToBody = () => {
    if (document.body) {
      document.body.appendChild(notification);
      
      // Auto-remove after 15 seconds
      setTimeout(() => {
        if (document.body.contains(notification)) {
          notification.style.animation = 'shield-fade-out 0.3s forwards';
          setTimeout(() => {
            if (notification.parentNode) {
              notification.parentNode.removeChild(notification);
            }
          }, 300);
        }
      }, 15000);
    } else {
      // If body is not available yet, try again in 100ms
      setTimeout(addToBody, 100);
    }
  };
  
  addToBody();
}

// Analyze page for insecure content (mixed content)
function checkForMixedContent() {
  // Check if page is HTTPS
  if (window.location.protocol === 'https:') {
    // Look for HTTP resources
    const insecureElements = [];
    
    // Check images
    document.querySelectorAll('img').forEach(img => {
      if (img.src && img.src.startsWith('http:')) {
        insecureElements.push(img);
      }
    });
    
    // Check scripts
    document.querySelectorAll('script').forEach(script => {
      if (script.src && script.src.startsWith('http:')) {
        insecureElements.push(script);
      }
    });
    
    // Check stylesheets
    document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
      if (link.href && link.href.startsWith('http:')) {
        insecureElements.push(link);
      }
    });
    
    // Check iframes
    document.querySelectorAll('iframe').forEach(iframe => {
      if (iframe.src && iframe.src.startsWith('http:')) {
        insecureElements.push(iframe);
      }
    });
    
    // Report findings to background script if any mixed content found
    if (insecureElements.length > 0) {
      chrome.runtime.sendMessage({ 
        action: "mixedContentDetected", 
        count: insecureElements.length,
        url: window.location.href
      });
      
      // Add visual indicator for mixed content
      addSecurityIndicator('warning', 'Mixed content detected on this page');
    }
  }
}

// Add visual security indicator to the page
function addSecurityIndicator(type, message) {
  // Create a small floating indicator
  const indicator = document.createElement('div');
  indicator.style.position = 'fixed';
  indicator.style.top = '10px';
  indicator.style.right = '10px';
  indicator.style.padding = '5px 10px';
  indicator.style.borderRadius = '3px';
  indicator.style.fontSize = '12px';
  indicator.style.fontFamily = 'Arial, sans-serif';
  indicator.style.zIndex = '999999';
  indicator.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
  
  // Style based on type
  if (type === 'warning') {
    indicator.style.backgroundColor = '#ffc107';
    indicator.style.color = '#000';
  } else if (type === 'danger') {
    indicator.style.backgroundColor = '#dc3545';
    indicator.style.color = '#fff';
  } else {
    indicator.style.backgroundColor = '#28a745';
    indicator.style.color = '#fff';
  }
  
  indicator.textContent = message;
  
  // Add close button
  const closeBtn = document.createElement('span');
  closeBtn.textContent = '×';
  closeBtn.style.marginLeft = '10px';
  closeBtn.style.cursor = 'pointer';
  closeBtn.style.fontWeight = 'bold';
  closeBtn.onclick = function() {
    document.body.removeChild(indicator);
  };
  
  indicator.appendChild(closeBtn);
  
  // Wait for body to be available
  if (document.body) {
    document.body.appendChild(indicator);
  } else {
    window.addEventListener('DOMContentLoaded', () => {
      document.body.appendChild(indicator);
    });
  }
}

// Check if JavaScript control is enabled for this site
function checkJavaScriptControl() {
  const domain = window.location.hostname;
  
  chrome.runtime.sendMessage({ 
    action: "getSettings"
  }, (settings) => {
    if (settings && settings.domainSettings && 
        settings.domainSettings[domain] && 
        settings.domainSettings[domain].blockJavaScript) {
      
      // Disable JavaScript execution for this page
      disableJavaScript();
    }
  });
}

// Crude approach to disable further JavaScript execution
function disableJavaScript() {
  // Replace the createElement method to prevent creation of script elements
  document.createElement = (function() {
    const originalCreateElement = document.createElement;
    
    return function(tagName) {
      if (tagName.toLowerCase() === 'script') {
        // Create a harmless div instead of a script
        return originalCreateElement.call(document, 'div');
      }
      return originalCreateElement.call(document, tagName);
    };
  })();
  
  // Remove existing scripts
  const scripts = document.querySelectorAll('script:not([data-shield-extension])');
  scripts.forEach(script => {
    script.remove();
  });
  
  // Add indicator
  addSecurityIndicator('warning', 'JavaScript has been disabled on this site by Shield');
}

// Run script when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    init();
    checkForMixedContent();
    checkJavaScriptControl();
  });
} else {
  init();
  checkForMixedContent();
  checkJavaScriptControl();
} 