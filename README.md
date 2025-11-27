# WhatsApp Web Message Extractor

A Chrome extension that extracts the latest messages from WhatsApp Web chats and allows you to reply directly from the extension popup.

## Features

- **Real-time Message Extraction**: Automatically extracts the latest received message from active WhatsApp Web chats
- **Direct Reply**: Send replies directly from the extension popup without switching tabs
- **Group Chat Support**: Handles both individual and group conversations
- **Message Types**: Supports text, images, voice messages, documents, stickers, and GIFs
- **Reply Counter**: Shows how many messages you've sent in response to the current conversation
- **Auto-refresh**: Updates messages every 5 seconds when the popup is open

## Installation

### For Development

1. Clone this repository:
   ```bash
   git clone <repository-url>
   cd whatsapp_snapshot
   ```

2. Open Chrome and navigate to `chrome://extensions/`

3. Enable "Developer mode" in the top right corner

4. Click "Load unpacked" and select the `whatsapp_snapshot` folder

5. The extension should now appear in your extensions list

### For Production

1. Zip the entire extension folder (excluding unnecessary files like .git, node_modules, etc.)
2. The extension can be loaded as described above, or published to the Chrome Web Store

## Usage

1. Open WhatsApp Web in a Chrome tab
2. Click the WhatsApp Message Extractor extension icon in the toolbar
3. The popup will show the latest received message from your active chat
4. Type your reply in the text box and click "Send Reply"

## How It Works

### Content Script (`content.js`)
- Runs on WhatsApp Web pages
- Extracts message content using DOM selectors
- Handles different message types (text, images, voice, etc.)
- Provides functions for sending replies

### Popup Script (`popup.js`)
- Manages the extension popup interface
- Communicates with content scripts via Chrome messaging API
- Handles message extraction and reply sending
- Auto-refreshes messages every 5 seconds

### Architecture
```
Extension Popup ↔ Content Script ↔ WhatsApp Web DOM
      ↓              ↓
   popup.js   ↔  content.js  ↔  WhatsApp Web
```

## Permissions

The extension requires the following minimal permissions:

- `activeTab`: Allows the extension to interact with the currently active tab
- `scripting`: Enables dynamic injection of content scripts
- `tabs`: Provides access to tab information and messaging
- `host_permissions`: Limited to `https://web.whatsapp.com/*` for WhatsApp Web access

## File Structure

```
whatsapp_snapshot/
├── manifest.json          # Extension manifest
├── popup.html            # Extension popup HTML
├── popup.js              # Popup functionality
├── content.js            # WhatsApp Web content script
├── styles.css            # Extension styling
├── icons/                # Extension icons
│   ├── icon16.svg
│   ├── icon32.svg
│   ├── icon48.svg
│   └── icon128.svg
├── .gitignore           # Git ignore rules
└── README.md            # This file
```

## Development

### Code Quality
- No console.log statements in production code (only console.error for error handling)
- Comprehensive error handling
- Clean, maintainable code structure

### Browser Compatibility
- Chrome 88+ (Manifest V3 support required)
- Chromium-based browsers

## Privacy & Security

- Only accesses WhatsApp Web pages
- No data is stored or transmitted externally
- All message extraction happens locally in the browser
- Minimal permissions required for functionality

## Troubleshooting

### Extension Not Working
1. Ensure WhatsApp Web is fully loaded
2. Check that you're in an active chat
3. Try refreshing the WhatsApp Web tab
4. Check browser console for any errors

### Content Script Injection Issues
- The extension automatically injects content scripts when needed
- If manual injection fails, try refreshing the WhatsApp Web tab

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source. Please check the license file for details.

## Changelog

### v1.0.0
- Initial release
- Basic message extraction and reply functionality
- Support for multiple message types
- Real-time updates
