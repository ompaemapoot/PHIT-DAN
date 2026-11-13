// Guard the teaching diagram and accessible essentials of the start menu.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '../style.css'), 'utf8');
const source = fs.readFileSync(path.join(__dirname, '../game.js'), 'utf8');
assert.match(html, /class="guide-cases" aria-hidden="true"/,
  'the decorative visual examples should not duplicate the written instructions');
assert.match(html.replace(/<[^>]*>/g, ''), /USB marks and gold contacts.*both visible or both hidden/i,
  'the visible marking rule must remain available as text');
for (const state of ['flip', 'ready']) {
  assert.match(html, new RegExp(`src="\\./assets/guide-${state}\\.png"`),
    `the ${state} example should use a gameplay image`);
  assert(fs.existsSync(path.join(__dirname, `../assets/guide-${state}.png`)),
    `the ${state} gameplay image must be present`);
}
assert.doesNotMatch(html, /guide-spot/,
  'the gameplay examples should not have distracting rectangular overlays');
assert.doesNotMatch(css, /\.guide-spot/,
  'unused rectangular overlay styles should be removed');
assert.match(html, /class="guide-case guide-flip"[\s\S]*?class="guide-led"[\s\S]*?class="guide-case guide-ready"[\s\S]*?class="guide-led"/,
  'both gameplay examples should show the drive indicator');
assert.match(css, /\.guide-flip \.guide-led\{[^}]*background:#d96560/i,
  'FLIP uses the game failure LED color');
assert.match(css, /\.guide-ready \.guide-led\{[^}]*background:#51d69a/i,
  'READY uses the game success LED color');
assert.match(html.replace(/<[^>]*>/g, ''), /lights show the result/i,
  'the examples must not suggest that gameplay LEDs predict the result');
assert.match(html, /class="usb-icon" viewBox="7 2 18 28"/,
  'the title icon should use a closely cropped viewBox');
assert.match(css, /\.usb-icon\{[^}]*height:\.85em/,
  'the title icon should scale with the heading');
assert.match(html, /class="guide-case guide-flip"/,
  'the guide should show an orientation that needs flipping');
assert.match(html, /class="guide-case guide-ready"/,
  'the guide should show the correct orientation');
assert.match(html, /<\/b>\s*FLIP</, 'the incorrect example should have a text label');
assert.match(html, /<\/b>\s*READY</, 'the correct example should have a text label');

assert.match(html.replace(/<[^>]*>/g, ''), /Tap, click or press Space to flip/i,
  'the controls must remain available as text');
assert.match(html, /<span class="guide-control">Tap, click or press Space to flip<\/span>\. Hub and Rail insert for you\./,
  'highlight the shared control without emphasizing the following mode guidance');
assert.match(css, /\.guide-control\{[^}]*color:var\(--accent-dark\)/,
  'the control instruction uses the theme accent');
assert.doesNotMatch(css, /\.guide-control\{[^}]*font-weight/,
  'the control highlight must not change font weight');
assert.match(html, /id="play-arcade"/);
assert.match(html, /id="play-horizontal"/);
assert.match(css, /^:root\{[^}]*--accent\s*:\s*#3157a4/i,
  'Slate + Cobalt should be the default interface palette');
assert.doesNotMatch(html, /data-theme-option|theme-picker|themes\.js/,
  'the temporary theme selector should be removed');
assert.match(html, /<meta name="theme-color" content="#eef2f7">/,
  'the browser chrome should retain the fixed light palette color');
assert.doesNotMatch(html, /theme-toggle|phit-dan-theme|data-theme=/,
  'the page should not expose or restore a theme preference');
assert.doesNotMatch(source, /themeStorageKey|applyTheme|theme-toggle|dataset\.theme|phit-dan-theme/,
  'game startup should not initialize or toggle themes');
assert.doesNotMatch(css, /\[data-theme=["']night["']\]|color-scheme\s*:\s*dark/i,
  'the stylesheet should have only the fixed light color scheme');
assert.match(css, /\.player-field input::placeholder\{[^}]*color:var\(--muted\);opacity:1\}/,
  'placeholder text should remain clearly visible in the fixed light palette');
console.log('Visual identity and orientation guidance checks passed.');
