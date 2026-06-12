const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('popup does not render WhatsApp data with innerHTML', () => {
  const source = fs.readFileSync(path.join(__dirname, '../src/popup/popup.js'), 'utf8');
  assert.doesNotMatch(source, /\.innerHTML\s*=/);
  assert.match(source, /\.textContent\s*=/);
});

test('popup does not wrap chat names in generated brackets', () => {
  const source = fs.readFileSync(path.join(__dirname, '../src/popup/popup.js'), 'utf8');
  assert.doesNotMatch(source, /\$\{cleanSenderName\} \(\$\{cleanChatName\}\)/);
});
