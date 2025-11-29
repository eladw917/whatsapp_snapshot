# WhatsApp ReplyPal - Component Reference

## Popup Components

### 1. **Header Section**
- **Element ID**: `header` (CSS class)
- **Purpose**: Displays the extension title and unread message indicator
- **Components**:
  - **Title**: `<h1>WhatsApp ReplyPal</h1>` - Extension name
  - **Unread Indicator**: `<div id="unreadIndicator">` - Shows unread message count (e.g., "3 unread")

### 2. **Main Container**
- **Element ID**: `container` (CSS class)
- **Purpose**: Main content area with WhatsApp-style background
- **Background**: Uses `icons/background.png` as repeating background image
- **Layout**: Flexbox column layout with padding and border

### 3. **Message Section**
- **Element ID**: `message-section` (CSS class)
- **Purpose**: Displays the latest received message(s) from WhatsApp Web
- **Components**:
  - **Relative Date**: `<div id="relativeDate">` - Shows when the message was sent (Today, Yesterday, etc.)
  - **Message Display**: `<div id="latestMessage">` - Container for the message bubble
  - **Reply Counter**: `<div id="replyCounter">` - Shows how many times you've replied to this conversation

### 4. **Message Bubble**
- **Element ID**: `message-bubble` (CSS class)
- **Purpose**: Styled container for individual messages with WhatsApp-like appearance
- **Components**:
  - **Message Sender**: `<div class="message-sender">` - Shows sender name and chat name
  - **Message Content**: `<div class="message-content">` - The actual message text
  - **Message Timestamp**: `<div class="message-timestamp">` - Time when message was sent

### 5. **Reply Section**
- **Element ID**: `reply-section` (CSS class)
- **Purpose**: Input area for typing and sending replies
- **Components**:
  - **Reply Input Container**: `<div class="reply-input-container">` - Wrapper with styling
    - **Emoji Button**: `<button id="emojiButton" class="emoji-button">` - Emoji keyboard toggle button on the left
    - **Reply Input**: `<textarea id="replyInput">` - Multi-line text input for message composition with auto-language detection
    - **Send Button**: `<button id="sendButton">` - Circular send button with WhatsApp-style icon on the right

### 6. **Emoji Picker**
- **Element ID**: `emojiPicker` (CSS class)
- **Purpose**: Compact floating popup for selecting emojis to insert into messages
- **Positioning**: Positioned above the emoji button, aligned with left edge of popup
- **Dimensions**: 240px width × 80px height
- **Components**:
  - **Close Button**: `<button id="closeEmojiPicker">` - Small × button in top-right corner
  - **Emoji Grid**: `<div class="emoji-grid">` - Compact grid layout with 5 emojis per row (2px gap), shows common emojis

### 6. **Status Display** (Optional)
- **Element ID**: `status` (CSS class)
- **Purpose**: Shows success/error/info messages
- **Types**: error, success, info - each with different styling

## Layout Structure

```
Popup Window (350px width, 200-400px height)
├── Header
│   ├── Title: "WhatsApp ReplyPal"
│   └── Unread Indicator (top-right, when applicable)
├── Container (with WhatsApp background)
│   ├── Message Section
│   │   ├── Relative Date (Today/Yesterday/etc.)
│   │   ├── Message Bubble
│   │   │   ├── Sender Name
│   │   │   ├── Message Content
│   │   │   └── Timestamp
│   │   └── Reply Counter (when applicable)
│   └── Reply Section
│       └── Reply Input Container
│           ├── Textarea Input
│           └── Send Button
```

## Key Features

- **RTL/LTR Support**: Automatically detects and aligns text based on language (Arabic/Hebrew vs others) in both message display and reply input
- **Emoji Picker**: Built-in emoji keyboard with 9 categories (Recent, Smileys, People, Nature, Food, Activity, Travel, Objects, Symbols)
- **Message Concatenation**: Combines consecutive messages from same sender within 2 minutes
- **Auto-resize**: Textarea grows with content up to max height
- **Keyboard Shortcuts**: Enter to send, Shift+Enter for new line
- **Real-time Updates**: Auto-refreshes every 5 seconds
- **Unread Count**: Shows total unread messages across all chats

## Styling Notes

- Uses WhatsApp green color scheme (`#25d366`)
- Glassmorphism effects with backdrop blur
- Responsive design with minimum width constraints
- Custom scrollbars for message areas
- Loading animations and status indicators

