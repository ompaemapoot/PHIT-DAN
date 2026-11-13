// Guard restrained score feedback, the clearer success cue, and phase-specific Timing controls.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'style.css'),'utf8');
const source=fs.readFileSync(path.join(root,'game.js'),'utf8');

assert.doesNotMatch(html,/id="action-button"|id="lab-controls"|id="flip-button"|id="insert-button"|timing-hint|>INSERT\s*</,
  'Timing should not render a visible action button or a circled in-play hint');
assert.doesNotMatch(css,/lab-controls|lab-control-button/,'unused Timing action-button styles should be removed');
assert.match(html,/<details class="settings-menu" id="settings-menu">[\s\S]*<button class="sound-toggle" id="sound-toggle"[\s\S]*<\/details>/,
  'the sound control should remain in the home-screen Settings menu');
assert.doesNotMatch(html,/theme-toggle|phit-dan-theme/,'Settings should not offer theme selection');
const gameOver=source.slice(source.indexOf('function endRun('),source.indexOf('function expireTimingPhase('));
const returnToMenu=source.slice(source.indexOf("$('change-player').addEventListener('click'"),source.indexOf("$('stage').addEventListener('pointerdown'"));
assert.match(gameOver,/\$\('settings-menu'\)\.hidden=true/,'Settings should be hidden when the shared overlay displays Game Over');
assert.match(source,/\$\('settings-menu'\)\.hidden=true; \$\('settings-menu'\)\.open=false/,'Settings should be closed and hidden while a game is running');
assert.match(returnToMenu,/\$\('settings-menu'\)\.hidden=false/,'Settings should return when leaving Game Over for the main menu');
assert.match(css,/\.settings-menu>summary:focus-visible/,'the native Settings disclosure should have a visible keyboard focus style');
assert.match(css,/\.settings-menu>summary\{[^}]*min-height:64px/,'the Settings disclosure should match the mode buttons and meet the minimum touch target height');
assert.match(css,/\.sound-toggle\{[^}]*width:100%[^}]*min-height:64px/,'the Settings sound control should remain a full-width touch target matching the menu rows');
assert.match(css,/\.sound-toggle\{[^}]*border:1px solid var\(--button-bg\)[^}]*background:var\(--button-bg\)[^}]*color:var\(--button-text\)/,'the Settings controls should use the same cobalt row as the rest of the menu');
assert.match(css,/\.sound-toggle\[aria-pressed="false"\]\{[^}]*background:var\(--surface\)[^}]*color:var\(--muted\)/,'a switched-off control should read as the quieter surface row');
assert.match(css,/\.score-toast\{[^}]*position:absolute[^}]*top:calc\(100% \+ 4px\)/);
assert.doesNotMatch(css,/\.score-toast\{[^}]*position:fixed/,'score feedback must not overlay the central play area');
assert.match(css,/\.score-chip\.scored strong\{animation:score-hit \.24s ease-out\}/);
assert.match(css,/@keyframes score-hit[^]*?scale\(1\.08\)/);
assert.match(css,/\.score-toast\.graded\{max-width:min\(82vw,240px\)\}/);
assert.match(source,/toast\.textContent=activeMode==='timing'&&grade==='perfect'\?`PERFECT ×\$\{timingMultiplier\}  \+\$\{points\}`:`\$\{activeMode==='timing'\?'GOOD':'CORRECT'\}  \+\$\{points\}`/,
  'normal modes should identify a correct result; Timing should retain its timing grade');
assert.match(source,/toast\.classList\.add\('graded'\); toast\.hidden=false/,
  'normal modes and Timing should both show compact score feedback');

assert.match(source,/if\(timingStep==='flip'\)[^]*flip\(\); startTimingInsertPhase\(now\);[^]*else insert\(now\)/,
  'the phase action should flip first, then accept a timed insertion');
assert.match(source,/function handleStagePress\(now=performance\.now\(\)\)\{\s*if\(activeMode==='timing'\)\{timingAction\(now\);return;\}\s*flip\(\);/,
  'stage taps should handle both Timing phases and preserve Evolve/Rush behavior');
assert.doesNotMatch(source,/action-button|lab-controls/,'the removed Timing Lab action button must have no remaining JavaScript references');
assert.match(source,/\$\('stage'\)\.addEventListener\('pointerdown',[^]*handleStagePress\(\)/,
  'the play-area pointer handler should route through the phase-aware action');
assert.match(source,/\(e\.code==='Space'\|\|e\.key===' '\) && playing && !buttonTarget/,
  'Space must remain the single keyboard action in Timing');
assert.match(source,/if\(activeMode==='timing'\)timingAction\(\);else flip\(\)/,
  'Space must remain the keyboard action according to the current phase');
assert.doesNotMatch(source,/e\.code==='Enter'.*activeMode==='timing'/,
  'Timing must not require a second keyboard key');

const audio=source.slice(source.indexOf('function playArcadeTone('),source.indexOf('function showScoreImpact('));
assert.doesNotMatch(audio,/square|112\+level|64\+level/,'the new hit cue must avoid square waves and bass-heavy pitches');
assert.match(audio,/function playArcadeClick\(\)/,'successful insertions should include a mechanical-style transient');
assert.match(audio,/createBiquadFilter\(\)/,'the transient should be spectrally shaped');
assert.match(audio,/const root=700\+level\*24/,'the confirmation should start in a clear mid-high range');
assert.match(audio,/playArcadeTone\(root,root\*1\.12,\.105,\.018,'sine',\.018\)/);
assert.match(audio,/playArcadeTone\(confirmation,confirmation,\.075,\.105,'sine'/);

const vm=require('node:vm');
const scheduledFrequencies=[];
function audioParam(kind){
  return {
    setValueAtTime(value,time){if(kind==='frequency')scheduledFrequencies.push(value);},
    exponentialRampToValueAtTime(value,time){if(kind==='frequency')scheduledFrequencies.push(value);}
  };
}
function audioNode(kind){
  return {kind,type:'',frequency:audioParam('frequency'),Q:audioParam('Q'),gain:audioParam('gain'),connect(){},start(){},stop(){}};
}
const audioContextMock={
  currentTime:1,sampleRate:44100,destination:{},
  createOscillator(){return audioNode('oscillator');},
  createGain(){return audioNode('gain');},
  createBuffer(channels,length){return {getChannelData(){return new Float32Array(length);}};},
  createBufferSource(){return audioNode('buffer-source');},
  createBiquadFilter(){return audioNode('filter');}
};
const audioContext=vm.createContext({soundsEnabled:true,audioContext:audioContextMock,clickNoiseBuffer:null,clickNoiseContext:null,score:0,Math});
vm.runInContext(audio,audioContext);
audioContext.playArcadeHit('good');
assert(scheduledFrequencies.length>0);
assert(scheduledFrequencies.every(frequency=>frequency>=600&&frequency<=2000),
  'the click filter and confirmation pitches should stay in the clear mid-high range');

const classes={values:new Set(),add(...names){names.forEach(name=>this.values.add(name));},remove(...names){names.forEach(name=>this.values.delete(name));}};
const toast={hidden:true,textContent:'',classList:classes,offsetWidth:0};
const feedbackSource=source.slice(source.indexOf('function showScoreImpact('),source.indexOf('function playMilestoneCue('));
const grades=[];
const feedbackContext=vm.createContext({
  activeMode:'arcade',timingMultiplier:0,scoreToastTimer:null,$:id=>toast,
  clearTimeout(){},setTimeout(){return 1;},playArcadeHit:grade=>grades.push(grade)
});
vm.runInContext(feedbackSource,feedbackContext);
for(const mode of ['arcade','horizontal']){
  feedbackContext.activeMode=mode;
  feedbackContext.activeMode=mode;
  feedbackContext.showScoreImpact(1,'good');
  assert.equal(toast.hidden,false,`${mode} should show score feedback`);
  assert.equal(toast.textContent,'CORRECT  +1',`${mode} should identify the correct orientation and awarded point`);
}
feedbackContext.activeMode='timing'; feedbackContext.timingMultiplier=0;
feedbackContext.showScoreImpact(1,'good');
assert.equal(toast.textContent,'GOOD  +1','Timing should keep GOOD for an in-window timing result');
feedbackContext.timingMultiplier=2;
feedbackContext.showScoreImpact(4,'perfect');
assert.equal(toast.hidden,false,'Timing should display a grade');
assert.equal(toast.textContent,'PERFECT ×2  +4');
assert.deepEqual(grades,['good','good','good','perfect']);

console.log('Restrained score feedback, success sound, and Timing control checks passed.');
