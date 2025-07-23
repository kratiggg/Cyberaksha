// Shield VPN Comprehensive Test Script
// This script performs various tests to check if a VPN is properly configured and working

// Mock Chrome API
const chrome = {
  storage: {
    local: {
      get: (keys, callback) => {
        console.log('Getting storage keys:', keys);
        // Mock VPN settings
        const settings = {
          vpnEnabled: true,
          vpnProvider: 'shield',
          vpnAppPath: '/Applications/WireGuard.app/Contents/MacOS/WireGuard',
          vpnProtocol: 'wireguard',
          vpnKillSwitch: true
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

// Test results
const testResults = {
  ipChangeTest: null,
  dnsLeakTest: null,
  webRtcLeakTest: null,
  connectionSpeedTest: null,
  killSwitchTest: null,
  overall: null
};

// Create mock fetch for IP and DNS tests
let fetchCounter = 0;
global.fetch = async (url) => {
  console.log('Fetching URL:', url);
  
  // Different responses for different URLs
  if (url.includes('api.ipify.org')) {
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
  } else if (url.includes('speedtest')) {
    // Simulate speed test response
    await new Promise(resolve => setTimeout(resolve, 800));
    return {
      ok: true,
      json: async () => ({
        download: 85.4,  // Mbps
        upload: 42.1,    // Mbps
        ping: 78         // ms
      })
    };
  }
  
  throw new Error(`Unexpected URL: ${url}`);
};

// Mock for performance timing
let timeCounter = 0;
global.performance = {
  now: () => {
    timeCounter += 100;
    return timeCounter;
  }
};

// Mock WebRTC functionality to test for leaks
const mockWebRTC = {
  getLocalIPs: async () => {
    console.log('Testing for WebRTC leaks...');
    
    // Mock result: no leaks
    return {
      publicIP: '45.123.45.67',  // Same as VPN IP
      localIPs: ['192.168.0.100', '10.0.0.1'],
      isLeaking: false
    };
  }
};

// Get VPN provider display name
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

// Perform a comprehensive VPN check
async function checkVPN() {
  console.log('\n=== SHIELD VPN COMPREHENSIVE TEST ===\n');
  
  try {
    // Get VPN settings
    const settings = await new Promise(resolve => {
      chrome.storage.local.get('settings', (result) => resolve(result.settings));
    });
    
    console.log('VPN Configuration:');
    console.log(`- Provider: ${getVpnProviderName(settings.vpnProvider)}`);
    console.log(`- Protocol: ${settings.vpnProtocol}`);
    console.log(`- Kill Switch: ${settings.vpnKillSwitch ? 'Enabled' : 'Disabled'}`);
    console.log(`- Client Path: ${settings.vpnAppPath}`);
    console.log('');
    
    // Check if VPN is not configured
    if (!settings.vpnEnabled || !settings.vpnProvider) {
      console.log('❌ VPN NOT CONFIGURED');
      return { 
        success: false, 
        error: "VPN not configured",
        status: 'not_configured'
      };
    }
    
    // Test 1: IP Change Test
    console.log('🔍 TEST 1: IP Address Change');
    const realIP = await getIPAddress('initial');
    const vpnIP = await getIPAddress('vpn');
    const ipChanged = realIP !== vpnIP;
    
    console.log(`- Real IP:  ${realIP}`);
    console.log(`- VPN IP:   ${vpnIP}`);
    console.log(`- Changed:  ${ipChanged ? 'Yes ✅' : 'No ❌'}`);
    console.log('');
    
    testResults.ipChangeTest = {
      passed: ipChanged,
      realIP,
      vpnIP
    };
    
    // Test 2: DNS Leak Test
    console.log('🔍 TEST 2: DNS Leak Check');
    const dnsTestResult = await testDNSLeak();
    console.log(`- DNS Leak: ${dnsTestResult.isLeaking ? 'Yes ❌' : 'No ✅'}`);
    console.log(`- Response Time: ${dnsTestResult.responseTime}ms`);
    console.log('');
    
    testResults.dnsLeakTest = dnsTestResult;
    
    // Test 3: WebRTC Leak Test
    console.log('🔍 TEST 3: WebRTC Leak Check');
    const webRtcResult = await mockWebRTC.getLocalIPs();
    console.log(`- WebRTC Public IP: ${webRtcResult.publicIP}`);
    console.log(`- WebRTC Leak: ${webRtcResult.isLeaking ? 'Yes ❌' : 'No ✅'}`);
    console.log('');
    
    testResults.webRtcLeakTest = webRtcResult;
    
    // Test 4: Connection Speed Test
    console.log('🔍 TEST 4: Connection Speed');
    const speedTest = await testConnectionSpeed();
    console.log(`- Download Speed: ${speedTest.download} Mbps`);
    console.log(`- Upload Speed: ${speedTest.upload} Mbps`);
    console.log(`- Ping: ${speedTest.ping} ms`);
    console.log('');
    
    testResults.connectionSpeedTest = speedTest;
    
    // Test 5: Kill Switch Test (simulated)
    console.log('🔍 TEST 5: Kill Switch');
    const killSwitchEnabled = settings.vpnKillSwitch;
    console.log(`- Kill Switch: ${killSwitchEnabled ? 'Enabled ✅' : 'Disabled ⚠️'}`);
    console.log(`- Note: Kill switch functionality can only be fully tested during a VPN disconnection event`);
    console.log('');
    
    testResults.killSwitchTest = {
      enabled: killSwitchEnabled,
      note: "Kill switch functionality was not actively tested"
    };
    
    // Calculate overall results
    const criticalTestsPassed = testResults.ipChangeTest.passed && !testResults.dnsLeakTest.isLeaking && !testResults.webRtcLeakTest.isLeaking;
    testResults.overall = {
      passed: criticalTestsPassed,
      score: calculateSecurityScore(testResults)
    };
    
    return {
      success: true,
      connected: ipChanged,
      testResults: testResults,
      status: ipChanged ? 'connected' : 'disconnected'
    };
  } catch (error) {
    console.error('Error checking VPN:', error);
    return {
      success: false,
      error: `Test failed: ${error.message}`,
      status: 'error'
    };
  }
}

// Helper function to get IP address
async function getIPAddress(type = 'initial') {
  try {
    const response = await fetch(`https://api.ipify.org?format=json${type === 'vpn' ? '&r=' + Math.random() : ''}`);
    const data = await response.json();
    return data.ip;
  } catch (error) {
    console.error(`Error getting ${type} IP:`, error);
    return 'Unknown';
  }
}

// Test for DNS leaks
async function testDNSLeak() {
  try {
    const startTime = performance.now();
    await fetch('https://www.dnsleaktest.com', { mode: 'no-cors' });
    const responseTime = Math.round(performance.now() - startTime);
    
    // If DNS resolution is too fast, it might be using local DNS servers instead of VPN's
    const isLeaking = responseTime < 50;
    
    return {
      isLeaking,
      responseTime
    };
  } catch (error) {
    console.error('DNS leak test failed:', error);
    return {
      isLeaking: true,
      error: error.message
    };
  }
}

// Test connection speed
async function testConnectionSpeed() {
  try {
    console.log('Running connection speed test...');
    const response = await fetch('https://speedtest-api.example.com');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Speed test failed:', error);
    return {
      download: 0,
      upload: 0,
      ping: 999,
      error: error.message
    };
  }
}

// Calculate security score based on test results
function calculateSecurityScore(results) {
  let score = 0;
  const maxScore = 100;
  
  // IP change is critical
  if (results.ipChangeTest.passed) {
    score += 40;
  }
  
  // DNS leak protection is important
  if (!results.dnsLeakTest.isLeaking) {
    score += 25;
  }
  
  // WebRTC leak protection is important
  if (!results.webRtcLeakTest.isLeaking) {
    score += 25;
  }
  
  // Kill switch is good to have
  if (results.killSwitchTest.enabled) {
    score += 10;
  }
  
  return score;
}

// Display comprehensive test results
function displayTestResults(result) {
  const tests = result.testResults;
  
  console.log('\n=== SHIELD VPN TEST RESULTS ===\n');
  
  if (result.success) {
    if (tests.overall.passed) {
      console.log(`✅ VPN IS PROPERLY CONFIGURED AND WORKING\n`);
      console.log(`Security Score: ${tests.overall.score}/100\n`);
    } else {
      console.log(`⚠️ VPN IS WORKING BUT HAS SECURITY ISSUES\n`);
      console.log(`Security Score: ${tests.overall.score}/100\n`);
    }
    
    // Display issues if any
    const issues = [];
    
    if (!tests.ipChangeTest.passed) {
      issues.push('❌ Your IP address is not being masked by the VPN');
    }
    
    if (tests.dnsLeakTest.isLeaking) {
      issues.push('❌ DNS leak detected - your DNS requests may be visible to your ISP');
    }
    
    if (tests.webRtcLeakTest.isLeaking) {
      issues.push('❌ WebRTC leak detected - your real IP may be exposed in browser applications');
    }
    
    if (!tests.killSwitchTest.enabled) {
      issues.push('⚠️ Kill switch is not enabled - traffic may leak if VPN disconnects');
    }
    
    if (issues.length > 0) {
      console.log('Issues Found:');
      issues.forEach(issue => console.log(issue));
      console.log('');
    }
    
    console.log('Connection Details:');
    console.log(`- Provider: ${getVpnProviderName(tests.ipChangeTest.provider || 'shield')}`);
    console.log(`- Real IP: ${tests.ipChangeTest.realIP} (hidden by VPN)`);
    console.log(`- VPN IP: ${tests.ipChangeTest.vpnIP} (your current public IP)`);
    console.log(`- Download Speed: ${tests.connectionSpeedTest.download} Mbps`);
    console.log(`- Upload Speed: ${tests.connectionSpeedTest.upload} Mbps`);
    console.log(`- Ping: ${tests.connectionSpeedTest.ping} ms`);
  } else {
    console.log(`❌ VPN TEST FAILED: ${result.error}`);
  }
}

// Run all tests
(async () => {
  const result = await checkVPN();
  displayTestResults(result);
})(); 