// Verify accessible countdown feedback, palette contrast, and state boundaries.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const css = fs.readFileSync(path.join(__dirname, '../style.css'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const source = fs.readFileSync(path.join(__dirname, '../game.js'), 'utf8');
assert.match(css, /--track\s*:\s*#dbe4ef/i, 'every mode should share the pale slate timer track');
assert.match(css, /--timer\s*:\s*#2b3f5c/i, 'every mode should share the ink navy rail');
assert.match(css, /--timer-warning:#a9711f/i, 'every mode should warm to the same brass warning');
assert.match(css, /--timer-critical:#ad4a55/i, 'every mode should share the muted red critical fill');
assert.match(css, /\.score-chip strong\{[^}]*color\s*:\s*var\(--ink\)/, 'score remains the theme ink color');
assert.match(css, /#progress-bar\{[^}]*transform-origin:left center/, 'remaining time should drain from one end of the bar');
assert.doesNotMatch(css, /timing-countdown|timing-mode #progress-bar\{[^}]*scaleX\(1\)!important/,
  'Timing should not show digits or freeze its progress fill');
assert.doesNotMatch(html, /id="timing-countdown"/, 'the visible numeric countdown should be removed');
assert.match(html, /class="sr-only"><span id="timer-label"[\s\S]*?<span id="timer-text"/,
  'the timer text should remain available to assistive technology');
const start = source.indexOf('function updateTimer('), end = source.indexOf('function startCountdown(',start);
assert(start>=0 && end>start, 'timer function must exist');
const states={}, bar={style:{},classList:{toggle(name,on){states[name]=on}}}, text={textContent:''};
const countdown={textContent:''};
const context=vm.createContext({duration:1000,$:id=>id==='progress-bar'?bar:id==='timer-text'?text:countdown});
vm.runInContext(source.slice(start,end),context);
for(const [remaining,warning,critical] of [[1000,false,false],[501,false,false],[500,true,false],[251,true,false],[250,false,true],[0,false,true]]){
  context.updateTimer(remaining);
  assert.equal(states.warning,warning,`warning at ${remaining}`);
  assert.equal(states.critical,critical,`critical at ${remaining}`);
  assert.equal(bar.style.transform,`scaleX(${remaining/1000})`);
  assert.equal(text.textContent,`${(remaining/1000).toFixed(1)} seconds`,'screen-reader timer text should keep updating');
}

function luminance(hex){
  const channels=[1,3,5].map(index=>parseInt(hex.slice(index,index+2),16)/255);
  const linear=channels.map(value=>value<=.04045?value/12.92:((value+.055)/1.055)**2.4);
  return linear[0]*.2126+linear[1]*.7152+linear[2]*.0722;
}
function contrast(a,b){
  const values=[luminance(a),luminance(b)].sort((first,second)=>second-first);
  return (values[0]+.05)/(values[1]+.05);
}
function variables(block){
  return Object.fromEntries([...block.matchAll(/(--[\w-]+)\s*:\s*(#[0-9a-f]{6})/ig)].map(match=>[match[1],match[2]]));
}
const lightTokens=variables(css.match(/^:root\{([^}]+)\}/m)[1]+';'+css.match(/^:root\{[^}]+\}\n:root\{([^}]+)\}/m)[1]);
const track=lightTokens['--track'];
for(const cue of ['--timer','--timer-warning','--timer-critical','--timing-good']){
  assert(contrast(lightTokens[cue],track)>=3,`${cue} should contrast at least 3:1 against its track`);
}
// The PERFECT core is always drawn inside the GOOD band, so its backdrop is the band, not the track.
assert(contrast(lightTokens['--timing-perfect'],lightTokens['--timing-good'])>=3,
  'the PERFECT core should read at least 3:1 against the GOOD band it sits in');
// The needle body is light and reads over the dark rail; its ink edge separates it from the pale track.
assert(contrast(lightTokens['--timing-cursor'],lightTokens['--timer'])>=3,
  'the cursor body should read at least 3:1 over the meter rail');
assert(contrast(lightTokens['--timing-cursor-edge'],track)>=3,
  'the cursor edge should read at least 3:1 against the pale track');
assert.equal(lightTokens['--track'],'#dbe4ef','the shared timer track should stay a pale slate');
assert.equal(lightTokens['--timer'],'#2b3f5c','the shared rail should be ink navy in every mode');
assert.equal(lightTokens['--timer-warning'],'#a9711f','the shared warning fill should be brass');
assert.equal(lightTokens['--timer-critical'],'#ad4a55','the shared critical fill should be muted red');
assert.doesNotMatch(css,/--timing-(track|progress[-\w]*)\s*:/,
  'Beat should not keep a second set of rail colours that could drift away from Hub and Rail');
assert.equal(lightTokens['--timing-good'],'#46618c','the light GOOD band should use a deep steel blue');
assert.equal(lightTokens['--timing-perfect'],'#f0b64a','the light PERFECT core should use a bright brass');
assert.match(css,/\.progress-clip\{[^}]*border-radius:99px[^}]*overflow:clip/,
  'the fill should be clipped by the pill radius instead of scaling rounded ends of its own');
assert.doesNotMatch(css,/#progress-bar\{[^}]*border-radius/,
  'the fill itself should carry no radius, which transform scaleX would squash into square corners');
assert.match(html,/class="progress-clip">\s*<div id="progress-bar">/,
  'the fill should sit inside the clipping wrapper so it cannot paint over the track edge');
assert.equal(lightTokens['--timing-cursor'],'#f8fafc','the light Timing needle should be a pale marker');
assert.equal(lightTokens['--timing-cursor-edge'],'#25364f','the light Timing needle should be edged in ink');
const colorDistance=(first,second)=>Math.hypot(...[1,3,5].map(index=>parseInt(first.slice(index,index+2),16)-parseInt(second.slice(index,index+2),16)));
assert(colorDistance(lightTokens['--timing-good'],lightTokens['--timing-perfect'])>=180,
  'the light GOOD and PERFECT bands should not collapse into adjacent shades');
assert.match(css,/\.timing-mode \.progress-track\{overflow:visible\}/,
  'Beat should only let its marker overflow the rail, not restyle it');
assert.doesNotMatch(css,/\.timing-mode #progress-bar/,
  'Beat should reuse the shared rail colours instead of overriding them per mode');
assert.match(css,/\.timing-window-perfect\{border-inline:2px solid var\(--surface\);background:var\(--timing-perfect\)/,
  'the narrow PERFECT band should also have a contrasting outline');
assert.equal(lightTokens['--timer-warning'],'#a9711f','Hub and Rail should warm to the same brass as Beat');
assert.equal(lightTokens['--timer-critical'],'#ad4a55','Hub, Rail and Beat should share the muted red');
assert.match(css,/\.timing-cursor\{[^}]*width:6px[^}]*border:1px solid var\(--timing-cursor-edge\)/,
  'the Timing marker should read as an ink-edged needle rather than a stray speck');
assert(contrast(lightTokens['--ink'],lightTokens['--canvas'])>=4.5,'light body text should have WCAG AA contrast');
assert(contrast(lightTokens['--muted'],lightTokens['--surface'])>=4.5,'light placeholder/secondary text should have WCAG AA contrast on surfaces');
assert(contrast(lightTokens['--accent-dark'],lightTokens['--surface'])>=4.5,'light Settings control text should have WCAG AA contrast');
console.log('Timer palette and countdown boundary checks passed.');
