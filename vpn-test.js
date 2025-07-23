// VPN Test Script for Shield Extension

// Load the chrome.storage API mock
const chrome = {
  storage: {
    local: {
      get: (keys, callback) => {
        console.log('Getting storage keys:', keys);
        // Mock VPN settings
        const settings = {
          vpnEnabled: true,
          vpnProvider: 'shield', // Using Shield VPN as the provider
          vpnAppPath: '/Applications/WireGuard.app/Contents/MacOS/WireGuard'
        };
        callback({ settings });
      },
      set: (data, callback) => {
        console.log('Setting storage data:', JSON.stringify(data, null, 2));
        if (callback) callback();
      }
    }
  },
  runtime: {
    lastError: null
  }
};

// Mock the fetch API for IP check
let fetchCounter = 0;
global.fetch = async (url) => {
  console.log('Fetching URL:', url);
  
  if (url.includes('api.ipify.org')) {
    // Toggle between two IPs to simulate VPN connection
    fetchCounter++;
    // For demonstration purposes:
    // - First call returns "real" IP (without VPN)
    // - Second call returns "VPN" IP (with VPN) 
    const mockIP = fetchCounter === 1 ? '192.168.1.1' : '45.123.45.67';
    
    return {
      ok: true,
      json: async () => ({ ip: mockIP })
    };
  } else if (url.includes('dnsleaktest.com')) {
    // Simulate a slow DNS response which indicates that requests are going through VPN
    await new Promise(resolve => setTimeout(resolve, 150));
    return {
      ok: true
    };
  }
  
  throw new Error(`Unexpected URL: ${url}`);
};

// Define getVpnProviderName function from the extension
function getVpnProviderName(provider) {
  switch (provider) {
    case 'nord': return 'NordVPN';
    case 'express': return 'ExpressVPN';
    case 'proton': return 'ProtonVPN';
    case 'surfshark': return 'Surfshark';
    case 'shield': return 'Shield VPN';
    case 'custom': return 'Custom VPN';
    default: return provider || 'VPN';
  }
}

// Define performance.now for timing measurements
let timeCounter = 0;
global.performance = {
  now: () => {
    // Return different times to create realistic timing measurements
    timeCounter += 100;
    return timeCounter;
  }
};

// Implement the checkVpnConnection function from background.js
async function checkVpnConnection() {
  try {
    console.log('Starting VPN connection check...');
    
    // Get current settings
    const settings = await new Promise(resolve => {
      chrome.storage.local.get('settings', (result) => resolve(result.settings));
    });
    
    console.log('VPN Settings:', settings);
    
    // Check if VPN is configured
    if (!settings.vpnEnabled || !settings.vpnProvider) {
      console.log('VPN not configured');
      return { 
        success: false, 
        error: "VPN not configured",
        needsConfig: true,
        status: 'not_configured'
      };
    }
    
    // Store initial IP for comparison
    let initialIpData = null;
    
    console.log('Step 1: Getting initial IP information...');
    try {
      // Store the start time to calculate response time
      const startTime = performance.now();
      
      // Make a request to get the current IP information
      const response = await fetch('https://api.ipify.org?format=json');
      
      // Calculate response time in milliseconds
      const responseTime = Math.round(performance.now() - startTime);
      
      // Parse the IP data
      const data = await response.json();
      initialIpData = {
        ip: data.ip,
        responseTime: responseTime
      };
      
      console.log('Initial IP information:', initialIpData);
    } catch (error) {
      console.error('Error getting initial IP:', error);
      return {
        success: false,
        error: 'Could not check VPN status: Network error',
        status: 'error'
      };
    }
    
    // Step 2: Check for DNS leaks (basic check)
    console.log('Step 2: Checking for DNS leaks...');
    let dnsLeakCheck = true;
    try {
      // Make a simple DNS request to check if we're leaking DNS
      const dnsCheckStart = performance.now();
      await fetch('https://www.dnsleaktest.com', { mode: 'no-cors' });
      const dnsCheckTime = Math.round(performance.now() - dnsCheckStart);
      
      // If DNS resolution is too fast, it might be using local DNS servers instead of VPN's
      if (dnsCheckTime < 50) { // This threshold is approximate
        dnsLeakCheck = false;
        console.log('Possible DNS leak detected - resolution too fast');
      } else {
        console.log(`DNS leak check passed - resolution time: ${dnsCheckTime}ms`);
      }
    } catch (error) {
      console.warn('DNS leak test failed:', error);
      dnsLeakCheck = false;
    }
    
    // Step 3: Get VPN IP information
    console.log('Step 3: Getting VPN IP information...');
    let vpnIpData = null;
    try {
      // Add a random parameter to avoid caching
      const vpnIpResponse = await fetch(`https://api.ipify.org?format=json&r=${Math.random()}`);
      const vpnData = await vpnIpResponse.json();
      vpnIpData = {
        ip: vpnData.ip
      };
      
      console.log('VPN IP information:', vpnIpData);
    } catch (error) {
      console.error('Error getting VPN IP:', error);
      return {
        success: false,
        error: 'Could not verify VPN connection status',
        status: 'error'
      };
    }
    
    // Step 4: Compare initial and VPN IPs to determine if VPN is active
    const isConnected = initialIpData.ip !== vpnIpData.ip;
    console.log(`VPN connection status: ${isConnected ? 'CONNECTED' : 'NOT CONNECTED'}`);
    
    // Create comprehensive status report
    const statusReport = {
      isConnected: isConnected,
      initialIp: initialIpData.ip,
      currentIp: vpnIpData.ip,
      ipChanged: isConnected,
      provider: settings.vpnProvider,
      providerName: getVpnProviderName(settings.vpnProvider),
      dnsLeakCheckPassed: dnsLeakCheck,
      responseTime: initialIpData.responseTime,
      timestamp: new Date().toISOString(),
      status: isConnected ? 'connected' : 'disconnected'
    };
    
    console.log('VPN Status Report:', statusReport);
    
    // Save the status report to storage for later reference
    await new Promise(resolve => {
      chrome.storage.local.set({ 
        vpnConnectionStatus: statusReport 
      }, resolve);
    });
    
    return {
      success: true,
      connected: isConnected,
      statusReport: statusReport,
      status: statusReport.status
    };
  } catch (error) {
    console.error('Error checking VPN connection:', error);
    return {
      success: false,
      error: `Could not check VPN connection: ${error.message}`,
      status: 'error'
    };
  }
}

// Run the test
(async () => {
  console.log('=== SHIELD VPN CONNECTION TEST ===');
  const result = await checkVpnConnection();
  console.log('');
  console.log('=== TEST RESULTS ===');
  console.log(JSON.stringify(result, null, 2));
  console.log('');
  if (result.success && result.connected) {
    console.log('✅ VPN IS CONNECTED AND WORKING PROPERLY');
    console.log(`Your IP address changed from ${result.statusReport.initialIp} to ${result.statusReport.currentIp}`);
    console.log(`Provider: ${result.statusReport.providerName}`);
    console.log(`DNS Leak Protection: ${result.statusReport.dnsLeakCheckPassed ? 'Active' : 'Not Active'}`);
  } else if (result.success && !result.connected) {
    console.log('❌ VPN IS NOT CONNECTED');
    console.log('Your real IP is exposed:', result.statusReport.currentIp);
  } else {
    console.log('❌ VPN CHECK FAILED:', result.error);
  }
})(); 