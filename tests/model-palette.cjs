// Exercise the game's material definitions without requiring WebGL or a CDN.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../game.js'), 'utf8');
const start = source.indexOf('const mats = {');
const end = source.indexOf('\n};', start);
assert(start !== -1 && end !== -1, 'model material definitions must exist');
class StandardMaterial { constructor(options) { Object.assign(this, options); } }
class BasicMaterial { constructor(options) { Object.assign(this, options); } }
const mats = vm.runInNewContext(`${source.slice(start, end + 3)}\nmats`, {
  THREE: { MeshStandardMaterial: StandardMaterial, MeshBasicMaterial: BasicMaterial }
});
for (const [name, color] of Object.entries({
  hub: 0xaabbcd, grip: 0x25364f, endCap: 0x425875, silver: 0x7b8ea4,
  metal: 0xb3c2c5, metalSide: 0x82989f, blue: 0x008fe3
})) assert.equal(mats[name].color, color, `${name} should have its intended model color`);
for (const name of ['metal', 'metalSide'])
  assert(mats[name] instanceof BasicMaterial, `${name} must remain unlit`);
assert.notEqual(mats.ledGreen.color, mats.ledRed.color, 'success and failure LEDs must remain distinct');
console.log('Model palette and unlit shell checks passed.');
