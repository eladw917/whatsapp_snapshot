# Changelog - WhatsApp ReplyPal

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - [Current Date] - Initial Release

### Added
- **Real-time Message Extraction**: Automatically extracts latest messages from active WhatsApp Web chats
- **Direct Reply Functionality**: Send replies directly from extension popup without switching tabs
- **Group Chat Support**: Full support for both individual and group conversations
- **Multi-format Message Support**: Handles text, images, voice messages, documents, stickers, and GIFs
- **Reply Counter**: Tracks and displays number of replies sent in each conversation
- **Auto-refresh**: Messages update every 5 seconds when popup is open
- **RTL/LTR Language Support**: Automatic detection and proper display of Arabic, Hebrew, and other RTL languages
- **Built-in Emoji Picker**: Comprehensive emoji keyboard with 9 categories (Recent, Smileys, People, Nature, Food, Activity, Travel, Objects, Symbols)
- **Keyboard Shortcuts**: Enter to send messages, Shift+Enter for new lines
- **WhatsApp-like Interface**: Authentic green theme with glassmorphism effects and responsive design
- **Privacy-Focused**: Local processing only, no external data transmission

### Technical Features
- **Manifest V3 Compatible**: Built for modern Chrome extension standards
- **Minimal Permissions**: Only required permissions for core functionality
- **Local Storage**: Extension settings stored locally in browser
- **Secure APIs**: Uses Chrome's secure extension messaging system
- **Performance Optimized**: Lightweight with minimal browser impact

### Security & Privacy
- No personal data collection or storage
- No analytics or tracking
- Local message processing only
- Minimal host permissions (WhatsApp Web only)
- No external server communications

---

## Development Notes

### Version Numbering
We use [Semantic Versioning](https://semver.org/):
- **MAJOR** version for incompatible API changes
- **MINOR** version for backwards-compatible functionality additions
- **PATCH** version for backwards-compatible bug fixes

### Release Process
1. Update version in `manifest.json`
2. Update version in `package.json`
3. Update this changelog
4. Run build script: `npm run build`
5. Create release archive: `npm run zip`
6. Submit to Chrome Web Store

---

**Legend:**
- `Added` for new features
- `Changed` for changes in existing functionality
- `Deprecated` for soon-to-be removed features
- `Removed` for now removed features
- `Fixed` for any bug fixes
- `Security` in case of vulnerabilities
