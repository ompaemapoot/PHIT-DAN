// Guard against a night-theme toggle or saved preference returning.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../game.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const css=fs.readFileSync(path.join(__dirname,'../style.css'),'utf8');

assert.match(html,/meta name="theme-color" content="#eef2f7"/,
  'the browser chrome should use the fixed light palette');
assert.doesNotMatch(html,/theme-toggle|phit-dan-theme|data-theme=/,
  'the page should not expose a theme toggle or restore a saved preference');
assert.doesNotMatch(source,/themeStorageKey|applyTheme|theme-toggle|dataset\.theme|phit-dan-theme/,
  'the game should not contain theme preference or toggle code');
assert.doesNotMatch(css,/\[data-theme=["']night["']\]|color-scheme\s*:\s*dark|#0d1520|#182535/i,
  'the stylesheet should not contain the night palette');
assert.match(css,/^:root\{[^}]*--canvas:#eef2f7/i,
  'the fixed Slate + Cobalt light palette should remain the root palette');
assert.match(html,/<details class="settings-menu" id="settings-menu">\s*<summary>Settings<\/summary>[\s\S]*<button class="sound-toggle" id="sound-toggle"[\s\S]*<\/details>/,
  'the sound control should remain in the keyboard-operable home-screen Settings disclosure');
assert.doesNotMatch(html,/class="sound-toggle"[^>]*hidden/,'the Settings sound control should be available on the start screen');
console.log('Fixed light theme and theme-removal checks passed.');
