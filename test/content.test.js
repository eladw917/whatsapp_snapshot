const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const coreSource = fs.readFileSync(path.join(__dirname, '../src/shared/core.js'), 'utf8');
const contentSource = fs.readFileSync(path.join(__dirname, '../src/content/content.js'), 'utf8');

function createPage(messages = '') {
  const dom = new JSDOM(`
    <div id="side"></div>
    <div id="main">
      <header><span title="Test Chat">Test Chat</span></header>
      <section>${messages}</section>
      <footer>
        <div contenteditable="true" role="textbox"></div>
        <button aria-label="Send">Send</button>
      </footer>
    </div>
  `, { runScripts: 'outside-only', url: 'https://web.whatsapp.com/' });

  let listener;
  dom.window.chrome = {
    runtime: {
      onMessage: {
        addListener(callback) {
          listener = callback;
        }
      }
    }
  };
  dom.window.eval(coreSource);
  dom.window.eval(contentSource);
  return { window: dom.window, content: dom.window.ReplyPalContent, listener: () => listener };
}

test('treats a missing conversation shell as loading rather than an error', () => {
  const { window, listener } = createPage();
  window.document.querySelector('#main').remove();

  let response;
  listener()({ action: 'getAllMessages' }, {}, value => {
    response = value;
  });
  assert.equal(response.success, true);
  assert.equal(response.loading, true);
  assert.equal(response.error, null);
});

test('loads a private conversation without the legacy main id', () => {
  const { window, listener } = createPage(`
    <div class="message-in">
      <div data-pre-plain-text="[09:05, 17.11.2025] Alex: ">
        <span class="selectable-text">Private chat message</span>
      </div>
    </div>
  `);
  const main = window.document.querySelector('#main');
  main.removeAttribute('id');
  main.querySelector('header').innerHTML = '<span data-testid="author">Alex</span>';

  let response;
  listener()({ action: 'getAllMessages' }, {}, value => {
    response = value;
  });
  assert.equal(response.loading, false);
  assert.equal(response.success, true);
  assert.equal(response.chatName, 'Alex');
});

test('extracts each outer message once and classifies direction', () => {
  const { content } = createPage(`
    <div class="message-in">
      <div class="copyable-text" data-pre-plain-text="[09:05, 17.11.2025] Alex: ">
        <span class="selectable-text">Hello</span>
      </div>
    </div>
    <div class="message-out">
      <div class="copyable-text" data-pre-plain-text="[09:06, 17.11.2025] You: ">
        <span class="selectable-text">Hi</span>
      </div>
    </div>
  `);

  const result = content.extractAllMessages();
  assert.equal(result.total, 2);
  assert.equal(result.receivedMessages.length, 1);
  assert.equal(result.sentMessages.length, 1);
  assert.equal(result.receivedMessages[0].text, 'Hello');
  assert.equal(result.sentMessages[0].senderName, 'You');
});

test('uses the semantic author element as the chat title', () => {
  const { window, listener } = createPage(`
    <div class="message-in">
      <div data-pre-plain-text="[09:05, 17.11.2025] Alex: ">
        <span class="selectable-text">Hello</span>
      </div>
    </div>
  `);
  window.document.querySelector('header').innerHTML = `
    <span title="Wrong fallback">Wrong fallback</span>
    <span data-testid="author" dir="auto">עומר אנטברג</span>
  `;

  let response;
  listener()({ action: 'getAllMessages' }, {}, value => {
    response = value;
  });
  assert.equal(response.chatName, 'עומר אנטברג');
});

test('uses semantic author outside a literal header element', () => {
  const { window, listener } = createPage(`
    <div class="message-in">
      <div data-pre-plain-text="[09:05, 17.11.2025] Alex: ">
        <span data-testid="author">Message author</span>
        <span class="selectable-text">Hello</span>
      </div>
    </div>
  `);
  window.document.querySelector('header').innerHTML = '<span title="Wrong fallback">Wrong fallback</span>';
  window.document.querySelector('header').insertAdjacentHTML(
    'afterend',
    '<div><span data-testid="author" dir="auto">עומר אנטברג</span></div>'
  );

  let response;
  listener()({ action: 'getAllMessages' }, {}, value => {
    response = value;
  });
  assert.equal(response.chatName, 'עומר אנטברג');
});

test('does not use a group participant author as the chat title', () => {
  const { window, listener } = createPage(`
    <div class="message-in" data-id="participant-message">
      <span data-testid="author">Participant Name</span>
      <div data-pre-plain-text="[09:05, 17.11.2025] Participant Name: ">
        <span class="selectable-text">Group message</span>
      </div>
    </div>
  `);
  window.document.querySelector('header').innerHTML = `
    <span data-testid="author">Group Name</span>
  `;

  let response;
  listener()({ action: 'getAllMessages' }, {}, value => {
    response = value;
  });
  assert.equal(response.chatName, 'Group Name');
  assert.equal(response.receivedMessages[0].senderName, 'Participant Name');
});

test('classifies current data-id message containers without direction classes', () => {
  const { content } = createPage(`
    <div data-id="false_123">
      <div data-pre-plain-text="[09:05, 17.11.2025] Alex: ">
        <span class="selectable-text">Incoming</span>
      </div>
    </div>
    <div data-id="true_124">
      <div data-pre-plain-text="[09:06, 17.11.2025] You: ">
        <span class="selectable-text">Outgoing</span>
      </div>
    </div>
  `);

  const result = content.extractAllMessages();
  assert.equal(result.receivedMessages[0].text, 'Incoming');
  assert.equal(result.sentMessages[0].text, 'Outgoing');
});

test('finds direction IDs below a generic message root', () => {
  const { content } = createPage(`
    <div class="generic-message-root">
      <div data-id="message_false_123">
        <div data-pre-plain-text="[09:05, 17.11.2025] Alex: ">
          <span dir="auto">Nested direction</span>
        </div>
      </div>
    </div>
  `);

  assert.equal(content.extractAllMessages().receivedMessages[0].text, 'Nested direction');
});

test('classifies message direction from layout alignment', () => {
  const { window, content } = createPage(`
    <div id="row" style="display:flex;justify-content:flex-end">
      <div data-id="opaque-id">
        <div data-pre-plain-text="[09:05, 17.11.2025] You: ">
          <span dir="auto">Layout direction</span>
        </div>
      </div>
    </div>
  `);

  window.document.querySelector('#main').getBoundingClientRect = () => ({ left: 0, width: 1000 });
  window.document.querySelector('#row').getBoundingClientRect = () => ({ left: 0, width: 1000 });
  assert.equal(content.extractAllMessages().sentMessages[0].text, 'Layout direction');
});

test('does not classify outgoing bubbles as incoming from inner flex-start content', () => {
  const { window, content } = createPage(`
    <div id="row" style="display:flex;justify-content:flex-end">
      <div id="bubble" data-id="opaque-id">
        <div style="display:flex;justify-content:flex-start">
          <div data-pre-plain-text="[09:05, 17.11.2025] You: ">
            <span dir="auto">Still outgoing</span>
          </div>
        </div>
      </div>
    </div>
  `);

  window.document.querySelector('#main').getBoundingClientRect = () => ({ left: 0, width: 1000 });
  window.document.querySelector('#row').getBoundingClientRect = () => ({ left: 0, width: 1000 });
  window.document.querySelector('#bubble').getBoundingClientRect = () => ({ left: 700, width: 250 });
  assert.equal(content.extractAllMessages().sentMessages[0].text, 'Still outgoing');
});

test('does not treat a full-width message root as incoming by position', () => {
  const { window, content } = createPage(`
    <div id="root" data-id="opaque-id">
      <div id="metadata" data-pre-plain-text="[09:05, 17.11.2025] You: ">
        <span dir="auto">Ambiguous</span>
      </div>
    </div>
  `);

  window.document.querySelector('#main').getBoundingClientRect = () => ({ left: 0, width: 1000 });
  window.document.querySelector('#root').getBoundingClientRect = () => ({ left: 0, width: 1000 });
  window.document.querySelector('#metadata').getBoundingClientRect = () => ({ left: 0, width: 1000 });
  const result = content.extractAllMessages();
  assert.equal(result.receivedMessages.length, 0);
  assert.match(result.error, /could not classify their direction/);
});

test('classifies a narrow right-side bubble as outgoing', () => {
  const { window, content } = createPage(`
    <div id="root" data-id="opaque-id">
      <div id="bubble">
        <div id="metadata" data-pre-plain-text="[09:05, 17.11.2025] You: ">
          <span dir="auto">Right side</span>
        </div>
      </div>
    </div>
  `);

  window.document.querySelector('#main').getBoundingClientRect = () => ({ left: 0, width: 1000 });
  window.document.querySelector('#root').getBoundingClientRect = () => ({ left: 0, width: 1000 });
  window.document.querySelector('#bubble').getBoundingClientRect = () => ({ left: 700, width: 250 });
  window.document.querySelector('#metadata').getBoundingClientRect = () => ({ left: 700, width: 250 });
  assert.equal(content.extractAllMessages().sentMessages[0].text, 'Right side');
});

test('classifies delivery-check messages as outgoing before layout fallback', () => {
  const { content } = createPage(`
    <div data-id="opaque-id">
      <div data-pre-plain-text="[09:05, 17.11.2025] You: ">
        <span dir="auto">Checked outgoing</span>
      </div>
      <span data-icon="msg-dblcheck"></span>
    </div>
  `);

  assert.equal(content.extractAllMessages().sentMessages[0].text, 'Checked outgoing');
});

test('uses absence of delivery checks as incoming when checked outgoing messages exist', () => {
  const { content } = createPage(`
    <div data-id="opaque-incoming">
      <div data-pre-plain-text="[09:05, 17.11.2025] Alex: ">
        <span dir="auto">No checks</span>
      </div>
      <span aria-label="Read message"></span>
    </div>
    <div data-id="opaque-outgoing">
      <div data-pre-plain-text="[09:06, 17.11.2025] You: ">
        <span dir="auto">Has checks</span>
      </div>
      <span data-icon="msg-dblcheck"></span>
    </div>
  `);

  const result = content.extractAllMessages();
  assert.equal(result.receivedMessages[0].text, 'No checks');
  assert.equal(result.sentMessages[0].text, 'Has checks');
});

test('scopes delivery checks to one message inside a shared conversation container', () => {
  const { content } = createPage(`
    <div data-id="shared-container">
      <div data-id="opaque-incoming">
        <div data-pre-plain-text="[09:05, 17.11.2025] Alex: ">
          <span dir="auto">Incoming under shared root</span>
        </div>
      </div>
      <div data-id="opaque-outgoing">
        <div data-pre-plain-text="[09:06, 17.11.2025] You: ">
          <span dir="auto">Outgoing under shared root</span>
        </div>
        <span data-icon="msg-dblcheck"></span>
      </div>
    </div>
  `);

  const result = content.extractAllMessages();
  assert.equal(result.total, 2);
  assert.equal(result.receivedMessages[0].text, 'Incoming under shared root');
  assert.equal(result.sentMessages[0].text, 'Outgoing under shared root');
});

test('extracts message text from semantic direction attributes', () => {
  const { content } = createPage(`
    <div data-id="false_123">
      <div data-pre-plain-text="[09:05, 17.11.2025] Alex: "></div>
      <span dir="auto">Semantic text</span>
    </div>
  `);

  assert.equal(content.extractAllMessages().receivedMessages[0].text, 'Semantic text');
});

test('reports a diagnostic error when message direction cannot be classified', () => {
  const { content } = createPage(`
    <div data-id="unknown-123">
      <div data-pre-plain-text="[09:05, 17.11.2025] Alex: ">
        <span class="selectable-text">Unknown direction</span>
      </div>
    </div>
  `);

  const result = content.extractAllMessages();
  assert.match(result.error, /could not classify their direction/);
});

test('keeps captionless images as messages', () => {
  const { content } = createPage(`
    <div class="message-in">
      <div data-pre-plain-text="[09:05, 17.11.2025] Alex: "></div>
      <div aria-label="Photo"></div>
    </div>
  `);

  const result = content.extractAllMessages();
  assert.equal(result.receivedMessages[0].messageType, 'image');
  assert.equal(result.receivedMessages[0].text, '[Image]');
});

test('latest-message action returns a consistent response', () => {
  const { listener } = createPage(`
    <div class="message-in">
      <div data-pre-plain-text="[09:05, 17.11.2025] Alex: ">
        <span class="selectable-text">Hello</span>
      </div>
    </div>
  `);

  let response;
  listener()({ action: 'getLatestMessage' }, {}, value => {
    response = value;
  });
  assert.equal(response.success, true);
  assert.equal(response.message, 'Hello');
  assert.equal(response.chatName, 'Test Chat');
});

test('reports send success only after the composer clears', async () => {
  const { window, content } = createPage();
  const composer = window.document.querySelector('[contenteditable]');
  window.document.querySelector('button').addEventListener('click', () => {
    setTimeout(() => {
      composer.textContent = '';
    }, 30);
  });

  const startedAt = Date.now();
  await content.sendReplyMessage('Hello');
  assert.ok(Date.now() - startedAt >= 25);
});

test('sendReply action responds asynchronously', async () => {
  const { window, listener } = createPage();
  const composer = window.document.querySelector('[contenteditable]');
  window.document.querySelector('button').addEventListener('click', () => {
    composer.textContent = '';
  });

  const response = await new Promise(resolve => {
    const keepChannelOpen = listener()({ action: 'sendReply', text: 'Hello' }, {}, resolve);
    assert.equal(keepChannelOpen, true);
  });
  assert.equal(response.success, true);
});

test('ping identifies the current content API version', () => {
  const { listener } = createPage();
  let response;
  listener()({ action: 'ping' }, {}, value => {
    response = value;
  });
  assert.equal(response.version, 11);
});
