# Shield Privacy Extension

A comprehensive Chrome extension for enhancing your online privacy and security with ad blocking, HTTPS upgrading, anti-fingerprinting techniques, and more.

## Features

### Core Privacy Protections
- **Ad and Tracker Blocking**: Automatically blocks known ad and tracking scripts from loading.
- **HTTPS Upgrading**: Redirects HTTP requests to HTTPS where supported.
- **Anti-Fingerprinting Techniques**: Prevents websites from uniquely identifying your browser through various techniques.
- **JavaScript Control**: Disable JavaScript on a per-site basis for enhanced security.

### Security Features
- **Safety Score**: Analyzes websites and provides a safety score based on multiple security factors.
- **Security Indicators**: Notifies you about potential security risks on websites.
- **Mixed Content Detection**: Identifies insecure content on secure pages.
- **Proxy Integration**: Optional proxy configuration for enhanced privacy.

### User Interface
- **Privacy Dashboard**: Comprehensive statistics about blocked trackers, ads, and more.
- **Site-Specific Settings**: Configure privacy protections on a per-site basis.
- **Customizable Controls**: Toggle specific protections on or off as needed.

## Installation

### From Chrome Web Store (Recommended - When Available)
1. Visit the Chrome Web Store
2. Search for "Shield Privacy Extension"
3. Click "Add to Chrome"

### Manual Installation (Developer Mode)
1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top-right corner
4. Click "Load unpacked" and select the Shield extension folder
5. The extension should now be installed and active

## Usage

### Basic Usage
- Click the Shield icon in the browser toolbar to see the current site's safety score and toggle protections.
- Use the dashboard for detailed statistics and configuration options.
- Configure site-specific settings for websites where you need custom protection levels.

### Dashboard
Access the full dashboard by clicking "Open Dashboard" in the popup menu. The dashboard provides:
- Protection statistics
- Global settings configuration
- Safety score details
- Top sites by safety ranking

### Site Settings
Configure site-specific settings by:
1. Clicking the Shield icon in the toolbar
2. Selecting "Site Settings"
3. Adjust the toggles for this specific site

## Project Structure

```
shield/
├── css/                   # Stylesheets
│   ├── popup.css          # Styles for the popup UI
│   ├── dashboard.css      # Styles for the dashboard
│   └── site-settings.css  # Styles for site-specific settings
├── icons/                 # Extension icons and UI icons
├── js/                    # JavaScript files
│   ├── background.js      # Service worker for background tasks
│   ├── content.js         # Content script injected in web pages
│   ├── popup.js           # Script for the popup UI
│   ├── dashboard.js       # Script for the dashboard
│   └── site-settings.js   # Script for site-specific settings
├── lib/                   # Libraries
│   └── anti-fingerprint.js # Anti-fingerprinting protections
├── pages/                 # HTML pages
│   ├── popup.html         # Popup UI
│   ├── dashboard.html     # Dashboard page
│   └── site-settings.html # Site-specific settings page
└── manifest.json          # Extension manifest
```

## Technical Details

### Security Scoring
The Safety Score is calculated based on multiple factors:
- HTTPS usage (secure connection)
- Presence of tracking scripts
- Phishing indicators
- Domain reputation
- Mixed content detection

### Anti-Fingerprinting Methods
The extension employs multiple techniques to prevent browser fingerprinting:
- Canvas fingerprinting protection
- WebGL fingerprinting protection
- User agent normalization
- Audio fingerprinting protection
- Font fingerprinting protection
- Screen resolution spoofing

### Privacy Considerations
- All data is stored locally on your device
- No data is sent to external servers
- Export functionality allows you to save/backup your data

## Development

### Prerequisites
- Chrome or Chromium-based browser
- Basic knowledge of HTML, CSS, JavaScript
- Understanding of Chrome extension architecture

### Building from Source
1. Clone the repository
2. Make your desired changes
3. Load the extension in developer mode for testing
4. Package the extension when ready for distribution

## License
[MIT License](LICENSE)

## Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

## Credits
- Icons: Based on [Feather Icons](https://feathericons.com/)
- UI Framework: Custom CSS based on modern design principles 