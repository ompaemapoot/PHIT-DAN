// Guard the removed test-mode menu, game-over explanation and English-only interface.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
assert.doesNotMatch(html, /id="auto-option"|id="auto-test"|Test options|Auto play/, 'the test mode and its menu must be removed');
assert.match(html, /class="failure-reason"[^>]*>The USB was facing the wrong way\./, 'game over explains an incorrect orientation');
assert.match(html, /<html lang="en">/);
assert.doesNotMatch(html, /data-i18n|id="lang-(?:th|en)"|src="\.\/i18n\.js/);
for (const [id, name] of [['play-arcade', 'Hub'], ['play-horizontal', 'Rail'], ['play-timing', 'Beat'], ['scores-arcade', 'Hub'], ['scores-horizontal', 'Rail'], ['scores-timing', 'Beat']]) {
  assert.match(html, new RegExp(`<button\\b[^>]*id="${id}"[^>]*>\\s*${name}\\b`), `${id} displays ${name}`);
}
assert.match(html,/class="mode-buttons"[\s\S]*id="play-timing"[\s\S]*<\/div>/,
  'Timing should be a primary mode rather than an experimental test option');
assert.doesNotMatch(html,/Timing Lab|experiment-note|timing-lab-launch/,
  'the test-only Timing Lab launcher should be removed');
console.log('Menu disclosure, failure explanation and English-only interface checks passed.');
