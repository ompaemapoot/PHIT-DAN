// Model-only refinements must preserve the unlit USB shell and readable LEDs.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../game.js'), 'utf8');
const start = source.indexOf('const mats = {');
const end = source.indexOf('\n};', start);
assert(start >= 0 && end > start, 'material definitions must exist');
class Material { constructor(options) { Object.assign(this, options); } }
const mats = vm.runInNewContext(`${source.slice(start, end + 3)}\nmats`, {
  THREE: { MeshStandardMaterial: Material, MeshBasicMaterial: Material }
});
assert.equal(mats.ledGreen.color, 0x51d69a, 'success LED uses the approved green');
assert.equal(mats.ledRed.color, 0xd96560, 'failure LED uses the approved red');
for (const name of ['glowGreen', 'glowRed']) {
  assert(mats[name].opacity > 0 && mats[name].opacity < .24, `${name} glow is softer`);
  assert.equal(mats[name].depthWrite, false);
}
for (const name of ['grip', 'endCap'])
  assert.equal(mats[name].flatShading, true, `${name} corners use faceted shading without changing topology`);
// Exercise the real shader hook, including the clone path used for clipped hub pieces.
const shaderCode = source.slice(source.indexOf('mats.hub.onBeforeCompile ='), source.indexOf('\nfunction box(', source.indexOf('mats.hub.onBeforeCompile =')));
const clippedCode = source.slice(source.indexOf('function clippedMaterial('), source.indexOf('\nfunction makeHorizontalPreview(', source.indexOf('function clippedMaterial(')));
const shaderContext = vm.createContext({ mats: { hub: {} }, hubWidth: 3, scrollTop: .9, scrollClip: {}, scrollMaterials: new Map() });
vm.runInContext(`${shaderCode}\n${clippedCode}`, shaderContext);
shaderContext.mats.hub.clone = () => ({});
const clipped = shaderContext.clippedMaterial(shaderContext.mats.hub);
assert.equal(clipped.onBeforeCompile, shaderContext.mats.hub.onBeforeCompile, 'clipped hub retains its shader');
assert.equal(clipped.clippingPlanes[0], shaderContext.scrollClip, 'clipping stays enabled');
const shader = { vertexShader: '#include <common>\n#include <begin_vertex>', fragmentShader: '#include <common>\n#include <color_fragment>' };
clipped.onBeforeCompile(shader);
assert.match(shader.vertexShader, /vHubNormal\s*=\s*normalize\(mat3\(modelMatrix\)\s*\*\s*normal\)/, 'orient shading in world space');
assert.match(shader.fragmentShader, /abs\(vHubNormal\.x\)/, 'outer sides respond to the surface normal');
assert.match(shader.fragmentShader, /smoothstep\(1\.49[0-9],\s*1\.500,\s*abs\(vHubPosition\.x\)\)/, 'side shading is confined to the outer edge, not socket walls');
assert.match(shader.fragmentShader, /max\(vHubNormal\.y,\s*0\.0\)/, 'only upward-facing surfaces get the top highlight');
assert.match(shader.fragmentShader, /step\(1\.02[0-9],\s*vHubPosition\.y\)/, 'top shading is confined to the top cap, not socket walls');
console.log('Model refinement checks passed.');
