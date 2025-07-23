/**
 * Shield Anti-Fingerprinting Library
 * This library contains advanced anti-fingerprinting measures
 * that are registered as a separate content script.
 */

// More extensive anti-fingerprinting measures
(function() {
  // Store original methods
  const original = {
    // Date and time methods
    dateNow: Date.now,
    dateGetTime: Date.prototype.getTime,
    
    // Audio context methods
    audioContextCreateOscillator: (AudioContext && AudioContext.prototype.createOscillator) || null,
    audioContextCreateAnalyser: (AudioContext && AudioContext.prototype.createAnalyser) || null,
    
    // WebGL methods
    webGLGetParameter: (WebGLRenderingContext && WebGLRenderingContext.prototype.getParameter) || null,
    
    // Performance methods
    performanceNow: (performance && performance.now) || null,
    
    // Screen properties
    screen: {
      width: screen.width,
      height: screen.height,
      availWidth: screen.availWidth,
      availHeight: screen.availHeight,
      colorDepth: screen.colorDepth,
      pixelDepth: screen.pixelDepth
    },
    
    // Navigator properties
    navigator: {
      userAgent: navigator.userAgent,
      language: navigator.language,
      languages: navigator.languages,
      platform: navigator.platform,
      hardwareConcurrency: navigator.hardwareConcurrency,
      deviceMemory: navigator.deviceMemory,
      maxTouchPoints: navigator.maxTouchPoints,
      vendor: navigator.vendor
    }
  };

  // Randomize with seed based on domain to maintain consistency within each site
  // This prevents sites from detecting the randomization
  function getRandomizer() {
    const domain = window.location.hostname;
    let seed = 0;
    
    // Create a simple hash of the domain
    for (let i = 0; i < domain.length; i++) {
      seed += domain.charCodeAt(i);
    }
    
    // Simple seeded random function
    return function() {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
  }
  
  const random = getRandomizer();
  
  // Add small time offset to prevent time-based fingerprinting
  const timeOffset = Math.floor(random() * 1000);
  
  // Override Date methods
  Date.now = function() {
    return original.dateNow() + timeOffset;
  };
  
  Date.prototype.getTime = function() {
    return original.dateGetTime.apply(this) + timeOffset;
  };

  // Override performance.now()
  if (original.performanceNow) {
    performance.now = function() {
      return original.performanceNow.call(performance) + timeOffset;
    };
  }
  
  // Modify screen properties slightly for consistent fingerprinting resistance
  const screenPropertiesOffset = Math.floor(random() * 5);
  
  try {
    // Modify screen dimensions slightly
    Object.defineProperties(Screen.prototype, {
      width: { get: function() { return original.screen.width - screenPropertiesOffset; } },
      height: { get: function() { return original.screen.height - screenPropertiesOffset; } },
      availWidth: { get: function() { return original.screen.availWidth - screenPropertiesOffset; } },
      availHeight: { get: function() { return original.screen.availHeight - screenPropertiesOffset; } }
    });
  } catch (e) {
    console.error("Shield: Failed to modify screen properties", e);
  }
  
  // Override WebGL fingerprinting methods
  if (original.webGLGetParameter) {
    WebGLRenderingContext.prototype.getParameter = function(parameter) {
      // Call the original method
      const result = original.webGLGetParameter.apply(this, arguments);
      
      // Add noise to specific parameters that are commonly used for fingerprinting
      // UNMASKED_VENDOR_WEBGL and UNMASKED_RENDERER_WEBGL are commonly used for fingerprinting
      if (parameter === 37445 || parameter === 37446) { // UNMASKED_VENDOR_WEBGL or UNMASKED_RENDERER_WEBGL
        return "Shield Protected";
      }
      
      return result;
    };
  }
  
  // Override AudioContext methods to prevent audio fingerprinting
  if (AudioContext && original.audioContextCreateAnalyser) {
    AudioContext.prototype.createAnalyser = function() {
      const analyser = original.audioContextCreateAnalyser.apply(this, arguments);
      
      // Override getFloatFrequencyData to add subtle noise
      const originalGetFloatFrequencyData = analyser.getFloatFrequencyData;
      analyser.getFloatFrequencyData = function(array) {
        originalGetFloatFrequencyData.call(this, array);
        
        // Add slight noise to frequency data
        for (let i = 0; i < array.length; i++) {
          array[i] += (random() * 2 - 1) * 0.1;
        }
      };
      
      return analyser;
    };
  }
  
  // Block Font Fingerprinting
  if (document.fonts && document.fonts.check) {
    // Store original function
    const originalCheck = document.fonts.check;
    
    // Override with function that returns true for a percentage of calls
    document.fonts.check = function(font) {
      // Check if we should spoof the response
      if (random() < 0.2) { // 20% of checks will be spoofed
        return !originalCheck.apply(this, arguments);
      }
      return originalCheck.apply(this, arguments);
    };
  }
  
  // Override navigator language properties to reduce fingerprinting surface
  try {
    Object.defineProperties(Navigator.prototype, {
      userAgent: {
        get: function() {
          // Keep the user agent to avoid breaking sites, but we could modify it here
          return original.navigator.userAgent;
        }
      },
      
      // Use consistent language settings
      language: {
        get: function() {
          return "en-US";
        }
      },
      
      // Force common hardware concurrency
      hardwareConcurrency: {
        get: function() {
          const commonValues = [2, 4, 8];
          const index = Math.floor(random() * commonValues.length);
          return commonValues[index];
        }
      },
      
      // If available, mask deviceMemory
      deviceMemory: {
        get: function() {
          if (original.navigator.deviceMemory) {
            const commonValues = [2, 4, 8];
            const index = Math.floor(random() * commonValues.length);
            return commonValues[index];
          }
          return undefined;
        }
      },
      
      // Mask max touch points
      maxTouchPoints: {
        get: function() {
          return 0; // Desktop value
        }
      }
    });
  } catch (e) {
    console.error("Shield: Failed to override navigator properties", e);
  }
  
  // Block battery status API if available
  if (navigator.getBattery) {
    navigator.getBattery = function() {
      // Return a promise with fake battery data
      return Promise.resolve({
        charging: true,
        chargingTime: Infinity,
        dischargingTime: Infinity,
        level: 1.0,
        addEventListener: function() {},
        removeEventListener: function() {}
      });
    };
  }
  
  // Protect against WebRTC IP leaks
  function protectWebRTC() {
    // Override RTCPeerConnection if available
    if (window.RTCPeerConnection) {
      const originalRTCPeerConnection = window.RTCPeerConnection;
      
      window.RTCPeerConnection = function() {
        // Create a normal RTCPeerConnection
        const pc = new originalRTCPeerConnection(...arguments);
        
        // Override createOffer to modify SDP to remove IP addresses
        const originalCreateOffer = pc.createOffer;
        pc.createOffer = function() {
          const promise = originalCreateOffer.apply(this, arguments);
          
          return promise.then(function(offer) {
            // Modify the SDP to remove private IP addresses
            if (offer && offer.sdp) {
              // Replace IP addresses with a placeholder (this is a simplistic approach)
              offer.sdp = offer.sdp.replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '0.0.0.0');
            }
            return offer;
          });
        };
        
        return pc;
      };
    }
  }
  
  // Apply WebRTC protection
  protectWebRTC();
  
  // Protect against Beacon API tracking
  if (Navigator.prototype.sendBeacon) {
    const originalSendBeacon = Navigator.prototype.sendBeacon;
    
    Navigator.prototype.sendBeacon = function(url, data) {
      // Check if this is a known tracking endpoint
      const trackingDomains = [
        'google-analytics.com',
        'analytics',
        'tracking',
        'collect',
        'telemetry',
        'stats'
      ];
      
      // Block if it matches tracking patterns
      if (trackingDomains.some(domain => url.includes(domain))) {
        console.log("Shield: Blocked tracking beacon to", url);
        return true; // Pretend it succeeded
      }
      
      // Allow other beacons
      return originalSendBeacon.apply(this, arguments);
    };
  }
  
  // Notify that anti-fingerprinting measures are active
  console.log("Shield: Advanced anti-fingerprinting protection activated");
})(); 