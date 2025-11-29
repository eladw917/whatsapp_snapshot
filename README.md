# WhatsApp ReplyPal

A Chrome extension that extracts the latest messages from WhatsApp Web chats and allows you to reply directly from the extension popup.

## Features

- **Real-time Message Extraction**: Automatically extracts the latest received message from active WhatsApp Web chats
- **Direct Reply**: Send replies directly from the extension popup without switching tabs
- **Group Chat Support**: Handles both individual and group conversations
- **Message Types**: Supports text, images, voice messages, documents, stickers, and GIFs
- **Reply Counter**: Shows how many messages you've sent in response to the current conversation
- **Real-time Updates**: Messages are checked when you open the popup

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

#### Using Build Scripts
1. Install dependencies (if any):
   ```bash
   npm install
   ```

2. Build the extension:
   ```bash
   npm run build
   ```

3. Create a ZIP file for Chrome Web Store submission:
   ```bash
   npm run zip
   ```

4. The `whatsapp-replypal-v1.0.0.zip` file will be created in the project root

#### Manual Build
1. Copy all files from `src/` to a new directory
2. Update `manifest.json` paths if needed
3. Zip the directory (excluding development files like .git, node_modules, etc.)
4. Submit to Chrome Web Store

## Usage

1. Open WhatsApp Web in a Chrome tab
2. Click the WhatsApp ReplyPal extension icon in the toolbar
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
- Checks for new messages when popup opens

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

## Project Structure

```
whatsapp_snapshot/
├── src/                  # Source code
│   ├── content/          # Content scripts for WhatsApp Web
│   │   └── content.js
│   ├── popup/            # Extension popup
│   │   ├── popup.html
│   │   ├── popup.js
│   │   └── styles.css
│   └── icons/            # Extension icons and assets
├── docs/                 # Documentation
│   ├── api/              # API documentation
│   ├── assets/           # Documentation assets
│   ├── changelog.md      # Version changelog
│   ├── component_reference.md # Component documentation
│   ├── privacy-policy.md # Privacy policy
│   └── store-listing.md  # Chrome Web Store listing content
├── build/                # Build output (generated)
├── scripts/              # Build and development scripts
│   └── build.js
├── manifest.json         # Extension manifest
├── package.json          # Node.js package configuration
├── .gitignore            # Git ignore rules
└── README.md             # This file
```

## Development

### Setup
1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the extension:
   ```bash
   npm run build
   ```
4. Load the `build/` directory as an unpacked extension in Chrome

### Available Scripts
- `npm run build` - Build the extension to the `build/` directory
- `npm run clean` - Remove the build directory
- `npm run zip` - Create a ZIP file for Chrome Web Store submission

### Code Quality
- No console.log statements in production code (only console.error for error handling)
- Comprehensive error handling
- Clean, maintainable code structure
- ESLint configuration (if added later)

### Browser Compatibility
- Chrome 88+ (Manifest V3 support required)
- Chromium-based browsers (Edge, Brave, Opera, etc.)

### Project Structure Details
- `src/` - All source code organized by component type
- `docs/` - Documentation, privacy policy, and store listing materials
- `build/` - Generated build output (gitignored)
- `scripts/` - Build and automation scripts

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
