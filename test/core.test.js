const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../src/shared/core.js');

test('normalizes supported date formats', () => {
  assert.equal(core.normalizeDateString('17.11.2025'), '17.11.2025');
  assert.equal(core.normalizeDateString('11/17/2025', 'en-US'), '17.11.2025');
  assert.equal(core.normalizeDateString('17/11/2025', 'en-GB'), '17.11.2025');
  assert.equal(core.normalizeDateString('2025-11-17'), '17.11.2025');
});

test('uses locale for ambiguous slash dates', () => {
  assert.equal(core.normalizeDateString('03/04/2025', 'en-US'), '04.03.2025');
  assert.equal(core.normalizeDateString('03/04/2025', 'en-GB'), '03.04.2025');
});

test('rejects invalid dates and times', () => {
  assert.equal(core.normalizeDateString('31/02/2025', 'en-GB'), '');
  assert.equal(core.parsePrePlainText('[25:00, 17/11/2025] Alex: ', 'en-GB'), null);
});

test('parses WhatsApp metadata and relative dates', () => {
  assert.deepEqual(
    core.parsePrePlainText('[09:05, 11/17/2025] Alex: ', 'en-US'),
    { date: '17.11.2025', time: '09:05', senderName: 'Alex' }
  );
  assert.equal(core.getRelativeDate('11.06.2026', new Date(2026, 5, 12)), 'Yesterday');
});

test('removes profile-details annotations from display names', () => {
  assert.equal(core.cleanDisplayName('אלעד (פרטי הפרופיל)'), 'אלעד');
  assert.equal(core.cleanDisplayName('אלעד (\u200fפרטי הפרופיל\u200e)'), 'אלעד');
  assert.equal(core.cleanDisplayName('אלעד ( פרטי   הפרופיל )'), 'אלעד');
  assert.equal(core.cleanDisplayName('אלעד פרטי הפרופיל'), 'אלעד');
  assert.equal(core.cleanDisplayName('אלעד [פרטי הפרופיל]'), 'אלעד');
  assert.equal(core.cleanDisplayName('Alex (Profile details)'), 'Alex');
  assert.equal(
    core.parsePrePlainText('[09:05, 17.11.2025] אלעד (פרטי הפרופיל): ', 'he-IL').senderName,
    'אלעד'
  );
});
