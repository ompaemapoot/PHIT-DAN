// Guard the portrait-only gate that covers landscape touch devices.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(root,'game.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'style.css'),'utf8');

assert.match(html,/id="rotate-notice"[\s\S]*Rotate to portrait/,
  'the landscape gate should explain itself');
assert.match(css,/\.rotate-notice\{[^}]*position:absolute[^}]*inset:0[^}]*background:var\(--canvas\)/,
  'the gate should cover the game opaquely');
assert.match(source,/\$\('rotate-notice'\)\.hidden=!required/,
  'the gate should be driven by the portrait check');
assert.match(source,/if\(required\) pauseRun\('landscape'\);/,
  'a landscape touch device should freeze the run instead of losing it');
assert.match(source,/if\(e\.repeat \|\| pausedAt \|\| portraitOnly\(\)\)return;/,
  'the keyboard should stay inert while the gate covers the game');
assert.match(source,/new ResizeObserver\(syncPortraitGate\)\.observe\(document\.documentElement\)/,
  'orientation changes should sync from the real layout size');

const code=source.slice(source.indexOf('const portraitGate='),source.indexOf('let pausedAt='));
const landscape={matches:true}, coarse={matches:false};
const context=vm.createContext({
  matchMedia:query=>query.includes('coarse')?coarse:landscape,
  window:{innerWidth:844,innerHeight:390},
  navigator:{maxTouchPoints:0}
});
vm.runInContext(code,context);
assert.equal(typeof context.portraitOnly,'function');

context.window.innerWidth=390; context.window.innerHeight=844; coarse.matches=true; context.navigator.maxTouchPoints=5;
assert.equal(context.portraitOnly(),false,'a portrait phone should play normally');
context.window.innerWidth=844; context.window.innerHeight=390;
assert.equal(context.portraitOnly(),true,'a landscape phone should show the gate');
context.window.innerWidth=1024; context.window.innerHeight=768;
assert.equal(context.portraitOnly(),true,'a landscape tablet should show the gate');
coarse.matches=false; context.navigator.maxTouchPoints=0;
assert.equal(context.portraitOnly(),false,'a desktop landscape window should keep playing');
context.navigator.maxTouchPoints=10;
assert.equal(context.portraitOnly(),false,'a touch laptop window should keep playing');
context.window.innerWidth=844; context.window.innerHeight=390;
assert.equal(context.portraitOnly(),true,'a short touch screen should gate even if the pointer media says fine');

console.log('Portrait gate checks passed.');
