document.addEventListener('DOMContentLoaded', async () => {
  // DOM Elements - Tabs
  const tabNetworks = document.getElementById('tab-networks');
  const tabSettings = document.getElementById('tab-settings');
  const tabRouting = document.getElementById('tab-routing');
  const networksContent = document.getElementById('networks-content');
  const settingsContent = document.getElementById('settings-content');
  const routingContent = document.getElementById('routing-content');
  
  // DOM Elements - Network Options
  const optionDirect = document.getElementById('option-direct');
  const optionTor = document.getElementById('option-tor');
  const optionSocks = document.getElementById('option-socks');
  const optionVpn = document.getElementById('option-vpn');
  const networkOptions = [optionDirect, optionTor, optionSocks, optionVpn];
  
  // DOM Elements - Tor Settings
  const torPathInput = document.getElementById('tor-path');
  const browseTorButton = document.getElementById('browse-tor');
  const autoLaunchTor = document.getElementById('auto-launch-tor');
  const torStatus = document.getElementById('tor-status');
  
  // DOM Elements - SOCKS Settings
  const socksHost = document.getElementById('socks-host');
  const socksPort = document.getElementById('socks-port');
  const socksVersion = document.getElementById('socks-version');
  const socksCredentials = document.getElementById('socks-credentials');
  const socksAuthSection = document.getElementById('socks-auth');
  const socksUsername = document.getElementById('socks-username');
  const socksPassword = document.getElementById('socks-password');
  const socksStatus = document.getElementById('socks-status');
  
  // DOM Elements - VPN Settings
  const vpnService = document.getElementById('vpn-service');
  const vpnConfigSection = document.getElementById('vpn-config-section');
  const vpnAppPath = document.getElementById('vpn-app-path');
  const browseVpnButton = document.getElementById('browse-vpn');
  const vpnProtocol = document.getElementById('vpn-protocol');
  const vpnKillswitch = document.getElementById('vpn-killswitch');
  const vpnStatus = document.getElementById('vpn-status');
  
  // DOM Elements - General Settings
  const recommendTor = document.getElementById('recommend-tor');
  const autoSecureHighRisk = document.getElementById('auto-secure-high-risk');
  const rememberChoices = document.getElementById('remember-choices');
  const dnsOverHttps = document.getElementById('dns-over-https');
  const dnsProvider = document.getElementById('dns-provider');
  const customDnsSection = document.getElementById('custom-dns');
  const customDnsAddress = document.getElementById('custom-dns-address');
  
  // DOM Elements - Site Rules
  const siteRulesContainer = document.getElementById('site-rules-container');
  const newSiteRule = document.getElementById('new-site-rule');
  const newSiteNetwork = document.getElementById('new-site-network');
  const addSiteRuleButton = document.getElementById('add-site-rule');
  
  // DOM Elements - Buttons
  const saveButton = document.getElementById('save');
  const cancelButton = document.getElementById('cancel');

  // Current settings object
  let currentSettings = {
    networkType: 'direct', // direct, tor, socks, vpn
    torPath: '',
    autoLaunchTor: true,
    recommendPrivacy: true,
    autoSecureHighRisk: true,
    rememberChoices: true,
    
    // SOCKS settings
    socksEnabled: false,
    socksHost: '127.0.0.1',
    socksPort: '9050',
    socksVersion: '5',
    socksAuth: false,
    socksUsername: '',
    socksPassword: '',
    
    // VPN settings
    vpnEnabled: false,
    vpnProvider: '',
    vpnAppPath: '',
    vpnProtocol: 'auto',
    vpnKillSwitch: true,
    
    // DNS settings
    dnsOverHttps: false,
    dnsProvider: 'default',
    customDns: '',
    
    // Site-specific rules
    siteRules: {}
  };

  // Initialize UI
  await initUI();
  
  // Tab navigation event listeners
  tabNetworks.addEventListener('click', () => switchTab('networks'));
  tabSettings.addEventListener('click', () => switchTab('settings'));
  tabRouting.addEventListener('click', () => switchTab('routing'));
  
  // Network option event listeners
  networkOptions.forEach(option => {
    option.addEventListener('click', () => selectNetworkOption(option));
  });
  
  // Event Listeners - Tor
  browseTorButton.addEventListener('click', browseTorPath);
  autoLaunchTor.addEventListener('change', updateTorSettings);
  
  // Event Listeners - SOCKS
  socksHost.addEventListener('change', updateSocksSettings);
  socksPort.addEventListener('change', updateSocksSettings);
  socksVersion.addEventListener('change', updateSocksSettings);
  socksCredentials.addEventListener('change', toggleSocksAuth);
  socksUsername.addEventListener('change', updateSocksSettings);
  socksPassword.addEventListener('change', updateSocksSettings);
  
  // Event Listeners - VPN
  vpnService.addEventListener('change', handleVpnServiceChange);
  browseVpnButton.addEventListener('click', browseVpnPath);
  vpnProtocol.addEventListener('change', updateVpnSettings);
  vpnKillswitch.addEventListener('change', updateVpnSettings);
  
  // Event Listeners - General Settings
  recommendTor.addEventListener('change', updateGeneralSettings);
  autoSecureHighRisk.addEventListener('change', updateGeneralSettings);
  rememberChoices.addEventListener('change', updateGeneralSettings);
  dnsOverHttps.addEventListener('change', updateGeneralSettings);
  dnsProvider.addEventListener('change', handleDnsProviderChange);
  customDnsAddress.addEventListener('change', updateGeneralSettings);
  
  // Event Listeners - Site Rules
  addSiteRuleButton.addEventListener('click', addSiteRule);
  
  // Event Listeners - Buttons
  saveButton.addEventListener('click', saveSettings);
  cancelButton.addEventListener('click', () => {
    window.close();
  });

  // Functions - Initialization
  async function initUI() {
    try {
      // Load saved settings
      await loadSettings();
      
      // Set initial tab
      switchTab('networks');
      
      // Set network option based on current settings
      selectNetworkOption(document.getElementById(`option-${currentSettings.networkType}`), false);
      
      // Set network status indicators
      updateNetworkStatus();
      
      // Initialize site rules
      renderSiteRules();
      
      console.log('UI initialized with settings:', currentSettings);
    } catch (error) {
      console.error('Error initializing UI:', error);
      showNotification('Error loading settings', 'error');
    }
  }
  
  async function loadSettings() {
    try {
      const result = await new Promise(resolve => {
        chrome.storage.local.get('settings', resolve);
      });
      
      const settings = result.settings || {};
      
      // Network type
      currentSettings.networkType = settings.networkType || 'direct';
      
      // Tor settings
      currentSettings.torPath = settings.torPath || '';
      currentSettings.autoLaunchTor = settings.autoLaunchTor !== undefined ? settings.autoLaunchTor : true;
      
      // SOCKS settings
      currentSettings.socksEnabled = settings.socksProxyEnabled || false;
      if (settings.socksProxyConfig) {
        currentSettings.socksHost = settings.socksProxyConfig.host || '127.0.0.1';
        currentSettings.socksPort = settings.socksProxyConfig.port || '9050';
        currentSettings.socksVersion = settings.socksProxyConfig.version || '5';
        currentSettings.socksAuth = settings.socksProxyConfig.auth || false;
        currentSettings.socksUsername = settings.socksProxyConfig.username || '';
        currentSettings.socksPassword = settings.socksProxyConfig.password || '';
      }
      
      // VPN settings
      currentSettings.vpnEnabled = settings.vpnEnabled || false;
      currentSettings.vpnProvider = settings.vpnProvider || '';
      currentSettings.vpnAppPath = settings.vpnAppPath || '';
      currentSettings.vpnProtocol = settings.vpnProtocol || 'auto';
      currentSettings.vpnKillSwitch = settings.vpnKillSwitch !== undefined ? settings.vpnKillSwitch : true;
      
      // General settings
      currentSettings.recommendPrivacy = settings.recommendTor !== undefined ? settings.recommendTor : true;
      currentSettings.autoSecureHighRisk = settings.autoSecureHighRisk !== undefined ? settings.autoSecureHighRisk : true;
      currentSettings.rememberChoices = settings.rememberChoices !== undefined ? settings.rememberChoices : true;
      currentSettings.dnsOverHttps = settings.dnsOverHttps || false;
      currentSettings.dnsProvider = settings.dnsProvider || 'default';
      currentSettings.customDns = settings.customDns || '';
      
      // Site rules
      currentSettings.siteRules = settings.domainSettings || {};
      
      // Set form values
      torPathInput.value = currentSettings.torPath;
      autoLaunchTor.checked = currentSettings.autoLaunchTor;
      
      socksHost.value = currentSettings.socksHost;
      socksPort.value = currentSettings.socksPort;
      socksVersion.value = currentSettings.socksVersion;
      socksCredentials.checked = currentSettings.socksAuth;
      socksUsername.value = currentSettings.socksUsername;
      socksPassword.value = currentSettings.socksPassword;
      toggleSocksAuth();
      
      vpnService.value = currentSettings.vpnProvider;
      vpnAppPath.value = currentSettings.vpnAppPath;
      vpnProtocol.value = currentSettings.vpnProtocol;
      vpnKillswitch.checked = currentSettings.vpnKillSwitch;
      handleVpnServiceChange();
      
      recommendTor.checked = currentSettings.recommendPrivacy;
      autoSecureHighRisk.checked = currentSettings.autoSecureHighRisk;
      rememberChoices.checked = currentSettings.rememberChoices;
      dnsOverHttps.checked = currentSettings.dnsOverHttps;
      dnsProvider.value = currentSettings.dnsProvider;
      customDnsAddress.value = currentSettings.customDns;
      handleDnsProviderChange();
      
      console.log('Settings loaded:', currentSettings);
    } catch (error) {
      console.error('Error loading settings:', error);
      showNotification('Error loading settings', 'error');
    }
  }

  // Functions - Tab Navigation
  function switchTab(tabName) {
    // Remove active class from all tabs
    tabNetworks.classList.remove('active');
    tabSettings.classList.remove('active');
    tabRouting.classList.remove('active');
    
    // Hide all tab contents
    networksContent.classList.remove('active');
    settingsContent.classList.remove('active');
    routingContent.classList.remove('active');
    
    // Set active tab
    if (tabName === 'networks') {
      tabNetworks.classList.add('active');
      networksContent.classList.add('active');
    } else if (tabName === 'settings') {
      tabSettings.classList.add('active');
      settingsContent.classList.add('active');
    } else if (tabName === 'routing') {
      tabRouting.classList.add('active');
      routingContent.classList.add('active');
    }
  }

  // Functions - Network Options
  function selectNetworkOption(option, updateSettings = true) {
    // Remove selected class from all options
    networkOptions.forEach(opt => {
      opt.classList.remove('selected');
    });
    
    // Add selected class to the clicked option
    option.classList.add('selected');
    
    // Update settings if needed
    if (updateSettings) {
      const networkType = option.id.replace('option-', '');
      currentSettings.networkType = networkType;
      
      // Update network-specific settings
      if (networkType === 'socks') {
        currentSettings.socksEnabled = true;
      } else if (networkType === 'vpn') {
        currentSettings.vpnEnabled = true;
      }
      
      console.log('Network option selected:', networkType);
    }
  }
  
  function updateNetworkStatus() {
    // Update Tor status
    if (currentSettings.torPath) {
      torStatus.className = 'status-indicator';
      if (currentSettings.networkType === 'tor') {
        torStatus.classList.add('active');
        updateNetworkStatusMessage('tor', 'Tor Browser is configured and active');
      } else {
        torStatus.classList.add('warning');
        updateNetworkStatusMessage('tor', 'Tor Browser is configured but not active');
      }
    } else {
      torStatus.className = 'status-indicator';
      torStatus.classList.add('inactive');
      updateNetworkStatusMessage('tor', 'Tor Browser path not set');
    }
    
    // Update SOCKS status
    if (currentSettings.socksEnabled) {
      socksStatus.className = 'status-indicator';
      if (currentSettings.networkType === 'socks') {
        socksStatus.classList.add('active');
        updateNetworkStatusMessage('socks', `SOCKS${currentSettings.socksVersion} proxy active at ${currentSettings.socksHost}:${currentSettings.socksPort}`);
      } else {
        socksStatus.classList.add('warning');
        updateNetworkStatusMessage('socks', 'SOCKS proxy configured but not active');
      }
    } else {
      socksStatus.className = 'status-indicator';
      socksStatus.classList.add('inactive');
      updateNetworkStatusMessage('socks', 'SOCKS proxy not configured');
    }
    
    // Update VPN status
    if (currentSettings.vpnEnabled && currentSettings.vpnProvider) {
      vpnStatus.className = 'status-indicator';
      if (currentSettings.networkType === 'vpn') {
        vpnStatus.classList.add('active');
        updateNetworkStatusMessage('vpn', `${getVpnProviderDisplayName(currentSettings.vpnProvider)} is configured and active`);
      } else {
        vpnStatus.classList.add('warning');
        updateNetworkStatusMessage('vpn', `${getVpnProviderDisplayName(currentSettings.vpnProvider)} is configured but not active`);
      }
    } else if (currentSettings.vpnProvider) {
      vpnStatus.className = 'status-indicator';
      vpnStatus.classList.add('warning');
      updateNetworkStatusMessage('vpn', 'VPN not configured');
    } else {
      vpnStatus.className = 'status-indicator';
      vpnStatus.classList.add('inactive');
      updateNetworkStatusMessage('vpn', 'VPN not configured');
    }
  }
  
  function updateNetworkStatusMessage(networkType, message) {
    // Find or create status message element
    const networkOption = document.getElementById(`option-${networkType}`);
    if (!networkOption) return;
    
    let statusMessage = networkOption.querySelector('.network-status-message');
    if (!statusMessage) {
      statusMessage = document.createElement('div');
      statusMessage.className = 'network-status-message';
      
      // Insert after the paragraph
      const paragraph = networkOption.querySelector('p');
      if (paragraph) {
        paragraph.parentNode.insertBefore(statusMessage, paragraph.nextSibling);
      } else {
        networkOption.appendChild(statusMessage);
      }
    }
    
    // Add icon based on network type
    let iconSvg = '';
    if (networkType === 'tor') {
      iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px; flex-shrink: 0;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>';
    } else if (networkType === 'socks') {
      iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px; flex-shrink: 0;"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect><rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></svg>';
    } else if (networkType === 'vpn') {
      iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px; flex-shrink: 0;"><path d="M12 12m-10 0a10 10 0 1 0 20 0a10 10 0 1 0 -20 0"></path><path d="M12 2l0 20"></path><path d="M12 12l8.5 -8.5"></path><path d="M12 12l-8.5 8.5"></path></svg>';
    }
    
    // Set icon and message
    statusMessage.innerHTML = iconSvg + message;
    
    // Add animation effect for status change
    statusMessage.style.animation = 'none';
    // Force reflow
    statusMessage.offsetHeight;
    statusMessage.style.animation = 'fadeIn 0.3s ease-in-out';
  }
  
  function getVpnProviderDisplayName(provider) {
    switch(provider) {
      case 'nord': return 'NordVPN';
      case 'express': return 'ExpressVPN';
      case 'proton': return 'ProtonVPN';
      case 'surfshark': return 'Surfshark';
      case 'shield': return 'Shield VPN';
      case 'custom': return 'Custom VPN';
      default: return provider || 'VPN';
    }
  }

  // Functions - Tor Settings
  async function browseTorPath() {
    try {
      // We can't directly access the file system from a Chrome extension
      // So we'll need to ask the user to manually enter the path
      
      // If the Tor browser is installed in a typical location, suggest that
      let suggestedPath = '';
      
      // Detect operating system
      const platform = navigator.platform.toLowerCase();
      
      if (platform.includes('mac')) {
        suggestedPath = '/Applications/Tor Browser.app/Contents/MacOS/firefox';
      } else if (platform.includes('win')) {
        suggestedPath = 'C:\\Program Files\\Tor Browser\\Browser\\firefox.exe';
      } else if (platform.includes('linux')) {
        suggestedPath = '/home/user/tor-browser/Browser/firefox';
      }
      
      const path = prompt('Enter the path to your Tor Browser executable:', suggestedPath);
      
      if (path) {
        torPathInput.value = path;
        currentSettings.torPath = path;
        
        // Validate path (as much as we can without direct file system access)
        if (!path.includes('tor') && !path.includes('Tor')) {
          showNotification('Warning: This path may not be a valid Tor Browser path', 'warning');
        } else {
          showNotification('Tor Browser path updated', 'success');
        }
        
        // Update network status
        updateNetworkStatus();
      }
    } catch (error) {
      console.error('Error browsing for Tor path:', error);
      showNotification('Error selecting Tor Browser path', 'error');
    }
  }
  
  function updateTorSettings() {
    currentSettings.autoLaunchTor = autoLaunchTor.checked;
  }

  // Functions - SOCKS Settings
  function updateSocksSettings() {
    currentSettings.socksHost = socksHost.value;
    currentSettings.socksPort = socksPort.value;
    currentSettings.socksVersion = socksVersion.value;
    currentSettings.socksUsername = socksUsername.value;
    currentSettings.socksPassword = socksPassword.value;
    
    // Update network status
    updateNetworkStatus();
  }
  
  function toggleSocksAuth() {
    currentSettings.socksAuth = socksCredentials.checked;
    socksAuthSection.style.display = socksCredentials.checked ? 'block' : 'none';
  }

  // Functions - VPN Settings
  function handleVpnServiceChange() {
    currentSettings.vpnProvider = vpnService.value;
    currentSettings.vpnEnabled = !!vpnService.value;
    vpnConfigSection.style.display = vpnService.value ? 'block' : 'none';
    
    // Auto-suggest VPN path based on provider and platform
    if (vpnService.value && !vpnAppPath.value) {
      suggestVpnPath(vpnService.value);
    }
    
    // Show provider-specific information
    if (vpnService.value === 'shield') {
      showShieldVpnInfo();
    } else {
      // Remove any existing info box for other providers
      const existingInfo = document.querySelector('#vpn-info-box');
      if (existingInfo) {
        existingInfo.remove();
      }
    }
    
    // Update network status display
    updateNetworkStatus();
  }
  
  // Display information about Shield VPN
  function showShieldVpnInfo() {
    const infoBox = document.createElement('div');
    infoBox.className = 'info-box';
    infoBox.innerHTML = `
      <h4>Shield VPN (Self-hosted)</h4>
      <p>Shield VPN is a self-hosted solution that gives you complete control over your VPN connection.</p>
      <ul>
        <li>Full control over your data</li>
        <li>No third-party dependencies</li>
        <li>Choose your server location</li>
        <li>Customizable security settings</li>
        <li>No subscription fees (server costs only)</li>
      </ul>
      <p>Setting up Shield VPN requires some technical knowledge.</p>
      <a href="shield-vpn-guide.html" target="_blank" class="link">View Setup Guide</a>
    `;
    
    // Remove any existing info box
    const existingInfo = document.querySelector('#vpn-info-box');
    if (existingInfo) {
      existingInfo.remove();
    }
    
    // Add ID for easy removal later
    infoBox.id = 'vpn-info-box';
    
    // Add the info box after the config section
    vpnConfigSection.parentNode.insertBefore(infoBox, vpnConfigSection.nextSibling);
    
    // Show notification
    showNotification('Shield VPN puts you in control of your privacy', 'info');
  }
  
  // Suggest VPN application path based on provider and platform
  function suggestVpnPath(provider) {
    const platform = navigator.platform.toLowerCase();
    let path = '';
    
    if (platform.includes('mac')) {
      // macOS paths
      switch(provider) {
        case 'nord':
          path = '/Applications/NordVPN.app/Contents/MacOS/NordVPN';
          break;
        case 'express':
          path = '/Applications/ExpressVPN.app/Contents/MacOS/ExpressVPN';
          break;
        case 'surfshark':
          path = '/Applications/Surfshark.app/Contents/MacOS/Surfshark';
          break;
        case 'shield':
          path = '/Applications/WireGuard.app/Contents/MacOS/WireGuard';
          break;
      }
    } else if (platform.includes('win')) {
      // Windows paths
      switch(provider) {
        case 'nord':
          path = 'C:\\Program Files\\NordVPN\\nordvpn.exe';
          break;
        case 'express':
          path = 'C:\\Program Files (x86)\\ExpressVPN\\expressvpn.exe';
          break;
        case 'surfshark':
          path = 'C:\\Program Files\\Surfshark\\Surfshark.exe';
          break;
        case 'shield':
          path = 'C:\\Program Files\\WireGuard\\wireguard.exe';
          break;
      }
    } else if (platform.includes('linux')) {
      // Linux paths
      switch(provider) {
        case 'nord':
          path = '/usr/bin/nordvpn';
          break;
        case 'express':
          path = '/usr/bin/expressvpn';
          break;
        case 'surfshark':
          path = '/usr/bin/surfshark-vpn';
          break;
        case 'shield':
          path = '/usr/bin/wireguard';
          break;
      }
    }
    
    if (path) {
      vpnAppPath.value = path;
      currentSettings.vpnAppPath = path;
    }
  }
  
  function updateVpnSettings() {
    currentSettings.vpnProtocol = vpnProtocol.value;
    currentSettings.vpnKillSwitch = vpnKillswitch.checked;
  }

  // Functions - General Settings
  function updateGeneralSettings() {
    currentSettings.recommendPrivacy = recommendTor.checked;
    currentSettings.autoSecureHighRisk = autoSecureHighRisk.checked;
    currentSettings.rememberChoices = rememberChoices.checked;
    currentSettings.dnsOverHttps = dnsOverHttps.checked;
    currentSettings.customDns = customDnsAddress.value;
  }
  
  function handleDnsProviderChange() {
    currentSettings.dnsProvider = dnsProvider.value;
    
    if (dnsProvider.value === 'custom') {
      customDnsSection.style.display = 'block';
    } else {
      customDnsSection.style.display = 'none';
    }
  }

  // Functions - Site Rules
  function renderSiteRules() {
    // Clear container
    siteRulesContainer.innerHTML = '';
    
    const sites = Object.keys(currentSettings.siteRules);
    
    if (sites.length === 0) {
      siteRulesContainer.innerHTML = `
        <div class="info-box">
          <p>No custom site rules yet. When you enable proxy or VPN for specific sites, they will appear here.</p>
        </div>
      `;
      return;
    }
    
    // Create table
    const table = document.createElement('table');
    table.className = 'site-rules-table';
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.marginBottom = '15px';
    
    // Add header
    const thead = document.createElement('thead');
    thead.innerHTML = `
      <tr>
        <th style="text-align: left; padding: 8px; border-bottom: 1px solid #ddd;">Site</th>
        <th style="text-align: left; padding: 8px; border-bottom: 1px solid #ddd;">Network</th>
        <th style="text-align: right; padding: 8px; border-bottom: 1px solid #ddd;">Actions</th>
      </tr>
    `;
    table.appendChild(thead);
    
    // Add rows
    const tbody = document.createElement('tbody');
    
    sites.forEach(site => {
      const rule = currentSettings.siteRules[site];
      let networkType = 'direct';
      
      if (rule.useProxy && rule.proxyType === 'socks') {
        networkType = 'socks';
      } else if (rule.useProxy && rule.proxyType === 'vpn') {
        networkType = 'vpn';
      } else if (rule.useProxy) {
        networkType = 'tor';
      }
      
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${site}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${getNetworkDisplayName(networkType)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">
          <button class="delete-rule" data-site="${site}" style="background: none; border: none; color: #903a3a; cursor: pointer;">
            &times;
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
    
    table.appendChild(tbody);
    siteRulesContainer.appendChild(table);
    
    // Add event listeners to delete buttons
    document.querySelectorAll('.delete-rule').forEach(button => {
      button.addEventListener('click', () => {
        const site = button.getAttribute('data-site');
        deleteSiteRule(site);
      });
    });
  }
  
  function getNetworkDisplayName(networkType) {
    switch(networkType) {
      case 'tor': return 'Tor Browser';
      case 'socks': return 'SOCKS Proxy';
      case 'vpn': return 'VPN';
      default: return 'Direct Connection';
    }
  }
  
  function addSiteRule() {
    const site = newSiteRule.value.trim();
    const network = newSiteNetwork.value;
    
    if (!site) {
      showNotification('Please enter a site domain', 'error');
      return;
    }
    
    // Make sure site is a valid domain
    if (!isValidDomain(site)) {
      showNotification('Please enter a valid domain (e.g., example.com)', 'error');
      return;
    }
    
    // Add rule
    if (!currentSettings.siteRules[site]) {
      currentSettings.siteRules[site] = {};
    }
    
    // Set proxy settings based on network type
    if (network === 'direct') {
      currentSettings.siteRules[site] = {
        useProxy: false
      };
    } else {
      currentSettings.siteRules[site] = {
        useProxy: true,
        proxyType: network
      };
    }
    
    // Clear input
    newSiteRule.value = '';
    
    // Re-render rules
    renderSiteRules();
    
    showNotification(`Rule added for ${site}`, 'success');
  }
  
  function deleteSiteRule(site) {
    if (confirm(`Are you sure you want to delete the rule for ${site}?`)) {
      delete currentSettings.siteRules[site];
      renderSiteRules();
      showNotification(`Rule deleted for ${site}`, 'success');
    }
  }
  
  function isValidDomain(domain) {
    // Simple domain validation
    const regex = /^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
    return regex.test(domain);
  }

  // Functions - Save Settings
  async function saveSettings() {
    try {
      // Prepare settings object for storage
      const settingsToSave = {
        // Network settings
        networkType: currentSettings.networkType,
        
        // Tor settings
        torPath: currentSettings.torPath,
        autoLaunchTor: currentSettings.autoLaunchTor,
        recommendTor: currentSettings.recommendPrivacy,
        
        // SOCKS proxy settings
        socksProxyEnabled: currentSettings.networkType === 'socks',
        socksProxyConfig: {
          host: currentSettings.socksHost,
          port: parseInt(currentSettings.socksPort) || 9050,
          version: parseInt(currentSettings.socksVersion) || 5,
          auth: currentSettings.socksAuth,
          username: currentSettings.socksUsername,
          password: currentSettings.socksPassword
        },
        
        // VPN settings
        vpnEnabled: currentSettings.networkType === 'vpn',
        vpnProvider: currentSettings.vpnProvider,
        vpnAppPath: currentSettings.vpnAppPath,
        vpnProtocol: currentSettings.vpnProtocol,
        vpnKillSwitch: currentSettings.vpnKillSwitch,
        
        // General settings
        autoSecureHighRisk: currentSettings.autoSecureHighRisk,
        rememberChoices: currentSettings.rememberChoices,
        dnsOverHttps: currentSettings.dnsOverHttps,
        dnsProvider: currentSettings.dnsProvider,
        customDns: currentSettings.customDns,
        
        // Site rules
        domainSettings: currentSettings.siteRules
      };
      
      // Get current settings to merge with
      const currentStoredSettings = await new Promise(resolve => {
        chrome.storage.local.get('settings', result => {
          resolve(result.settings || {});
        });
      });
      
      // Merge with current settings
      const mergedSettings = { ...currentStoredSettings, ...settingsToSave };
      
      // Save to storage
      await new Promise(resolve => {
        chrome.storage.local.set({ settings: mergedSettings }, resolve);
      });
      
      // Notify background script that settings have changed
      chrome.runtime.sendMessage({
        action: 'proxySettingsUpdated',
        settings: settingsToSave
      });
      
      console.log('Settings saved:', settingsToSave);
      showNotification('Settings saved successfully', 'success');
      
      // Close the settings page after saving
      setTimeout(() => {
        window.close();
      }, 1500);
    } catch (error) {
      console.error('Error saving settings:', error);
      showNotification('Error saving settings', 'error');
    }
  }

  // Functions - Notification
  function showNotification(message, type = 'info') {
    // Create notification element if it doesn't exist
    let notification = document.querySelector('.notification');
    if (!notification) {
      notification = document.createElement('div');
      notification.className = 'notification';
      document.body.appendChild(notification);
    }

    // Set message and type
    notification.textContent = message;
    notification.className = `notification notification-${type}`;

    // Show notification with animation
    notification.style.display = 'block';
    notification.style.opacity = '0';
    notification.style.transform = 'translateY(-20px)';
    
    // Force reflow to ensure animation plays
    notification.offsetHeight;
    
    // Animate in
    notification.style.opacity = '1';
    notification.style.transform = 'translateY(0)';

    // Hide after 3 seconds
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'translateY(-20px)';
      setTimeout(() => {
        notification.style.display = 'none';
      }, 300);
    }, 3000);
  }

  // Add some CSS for notifications
  const style = document.createElement('style');
  style.textContent = `
    .notification {
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 4px;
      color: white;
      font-weight: 500;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      transition: opacity 0.3s ease;
      z-index: 1000;
    }
    .notification-success {
      background-color: #4caf50;
    }
    .notification-error {
      background-color: #f44336;
    }
    .notification-warning {
      background-color: #ff9800;
    }
    .notification-info {
      background-color: #2196f3;
    }
    .site-rules-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 15px;
    }
    .site-rules-table th,
    .site-rules-table td {
      padding: 8px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    .site-rules-table th {
      font-weight: 500;
    }
  `;
  document.head.appendChild(style);
}); 