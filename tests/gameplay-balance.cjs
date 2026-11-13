// Exercise the actual round and input logic without requiring WebGL or a browser.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../game.js'), 'utf8');
const gameplay = source.slice(source.indexOf('function makeLayout()'), source.indexOf("$('start-btn').addEventListener"));
let seed = 123456789;
const math = Object.create(Math);
math.random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32);
const classes = { add() {}, remove() {}, toggle() {} };
const elements = new Proxy({}, { get: (target, id) => target[id] ||= {
  value: 'Test player', classList: classes, style: {}, setAttribute() {}, removeAttribute() {},
  focus() {}, textContent: '', hidden: false
} });
const timers = [];
const shareEvents=[];
let now = 0;
const context = vm.createContext({
  Math: math, performance: { now: () => now },
  setTimeout: (fn, delay) => (timers.push({fn, delay, cleared:false}), timers.length), clearTimeout(id) { if(timers[id-1]) timers[id-1].cleared=true; },
  $: id => elements[id], document: { querySelector: () => elements.chip, activeElement: { blur() {} } },
  localStorage: { setItem() {} }, loadScores() {}, clearScene() { context.nextHorizontal=null; }, initScroll() {}, rebuild() {}, updateUI() {},
  disposeObject() {}, makeHorizontalPreview(flip) { return {row:{position:{}},flip}; },
  updateScroll() {}, updateTimer() {}, showFeedback() {}, saveScore() {}, scoreSharing:{show(score,mode){shareEvents.push([score,mode]);},hide(){shareEvents.push('hide');}},
  startCountdown() { context.phase='aim'; }, startTimingFlipPhase() { context.phase='aim'; }, setArcadeSoundButton() {}, wakeArcadeAudio() {}, showScoreImpact() {}, showTauntForScore() {}, hideTaunt() {}, playMilestoneCue() {}, evaluateTiming(){return 'perfect';}, hubWidth: 3, hubHeight: 3.4,
  scrollRows: [], roundRig: {}, plugGroup: { position:{x:0,y:0}, rotation: {z: 0}, userData: {} },
  playing: true, score: 0, round: 0, portFlip: false, plugFlip: false, vertical: false,
  layout: null, previousVertical: false, previousNeedsFlip: null, sameFlipRun: 0,
  phase: 'idle', duration: 1800, transitionDuration: 900, entranceDuration: 450, insertionDuration:300, insertionVisualDuration:280, insertionTurnDuration:160, successDelay:180,
  targetRoll: 0, insertionCorrect: false, insertionStarted: 0,
  nextTimer: null, autoTimer: null, timingRoundTimer:null, switchTimer: null, targetMove: null, deadline:0, resultTimer: null, feedbackTimer: null, scoreToastTimer:null, impactTimer:null, playerName: '',
  messagesEnabled:true, tauntStorageAvailable:true, resumeCountdown:0, resumeCountdownTimer:null, timingStarted:0, timingTargetProgress:0, timingPerfectWindow:125, timingGoodWindow:260, timingPerfectStreak:0, timingGrade:'good', timingAward:0, timingMultiplier:0, activeMode:'arcade', nextHorizontal:null
});
vm.runInContext(source.slice(source.indexOf('function endRun('), source.indexOf('function expireTimingPhase(')), context);
vm.runInContext(gameplay, context);

// Guaranteed introductions, timing, target alignment, and monotonic speed.
let lastDuration = Infinity, lastTransition = Infinity, lastEntrance = Infinity;
const arcadeTimings=[];
for (let score = 0; score <= 100; score++) {
  context.score = score;
  context.newRound();
  const {layout} = context;
  assert.equal(layout.sockets[layout.target].flip, context.portFlip);
  assert.equal(layout.sockets[layout.target].vertical, context.vertical);
  if (score < 4) assert.equal(context.vertical, false);
  if (score === 4) assert.equal(context.vertical, true);
  for (const [threshold, kind] of [[8,'pair'], [16,'triple'], [24,'grid'], [32,'mixed']]) {
    if (score === threshold) assert.equal(layout.kind, kind);
  }
  if (layout.kind === 'mixed') assert.equal(new Set(layout.sockets.map(s => s.vertical)).size, 2);
  assert(layout.sockets.every(s => s.axis===0 || s.axis===Math.PI/2));
  assert(context.duration <= lastDuration && context.duration >= 700);
  assert.equal(context.duration,Math.max(700,1155-score*12));
  assert(context.transitionDuration <= lastTransition && context.transitionDuration >= 140);
  assert(context.entranceDuration <= lastEntrance && context.entranceDuration >= 80);
  assert.equal(context.transitionDuration,Math.max(147,560-score*7));
  assert.equal(context.entranceDuration,Math.max(84,280-score*3));
  assert.equal(context.insertionDuration,Math.max(116,260-score*2));
  assert.equal(context.successDelay,Math.max(42,110-score));
  arcadeTimings.push([context.duration,context.transitionDuration,context.entranceDuration,context.insertionDuration,context.insertionVisualDuration,context.insertionTurnDuration,context.successDelay]);
  [lastDuration,lastTransition,lastEntrance] = [context.duration,context.transitionDuration,context.entranceDuration];
}
assert.equal(context.duration,700);
for(const [score,expected] of [[0,1155],[10,1035],[20,915],[24,867],[30,795],[38,700]]) assert.equal(arcadeTimings[score][0],expected);
for(const [score,scroll,entrance,insertion,pause] of [[0,560,280,260,110],[9,497,253,242,101],[10,490,250,240,100],[30,350,190,200,80]]){
  const [,aScroll,aEntrance,aInsertion,,,aPause]=arcadeTimings[score];
  assert.deepEqual([aScroll,aEntrance,aInsertion,aPause],[scroll,entrance,insertion,pause]);
}

// Horizontal rounds fill one socket at a time and retain the preview's face.
context.activeMode='horizontal';
let lastHorizontalTotal=Infinity;
for(let score=0;score<=100;score++){
  const expectedFlip=context.nextHorizontal?.flip;
  context.score=score; context.newRound();
  const {layout}=context;
  assert.equal(layout.kind,'horizontal'); assert.equal(layout.cols,1); assert.equal(layout.rows,1);
  assert(layout.sockets.every(s=>s.axis===0 && !s.vertical && s.x===0));
  assert.equal(layout.sockets[layout.target].flip,context.portFlip);
  if(expectedFlip!==undefined) assert.equal(context.portFlip,expectedFlip);
  assert.equal(context.duration,Math.max(350,1100-score*25));
  assert.equal(context.transitionDuration,Math.max(140,380-score*6));
  assert.equal(context.entranceDuration,Math.max(80,190-score*3));
  assert.equal(context.insertionDuration,Math.max(110,200-score*2));
  assert.equal(context.insertionVisualDuration,context.insertionDuration-20);
  assert.equal(context.insertionTurnDuration,context.insertionVisualDuration*.55);
  assert.equal(context.successDelay,Math.max(40,80-score));
  const [aDuration,aTransition,aEntrance,aInsertion,aVisual,aTurn,aDelay]=arcadeTimings[score];
  assert.equal(aDuration,Math.max(700,1155-score*12));
  assert.equal(aTransition,Math.max(147,560-score*7));
  assert.equal(aEntrance,Math.max(84,280-score*3));
  assert.equal(aInsertion,Math.max(116,260-score*2));
  assert.equal(aVisual,aInsertion-20);
  assert.equal(aTurn,aVisual*.55);
  assert.equal(aDelay,Math.max(42,110-score));
  const total=context.duration+context.transitionDuration+context.entranceDuration+context.insertionDuration+context.successDelay;
  assert(total<=lastHorizontalTotal);
  if(score>0 && score<=30) assert(total<lastHorizontalTotal);
  lastHorizontalTotal=total;
}
context.activeMode='arcade';
context.nextHorizontal=null;

// Check both long sequences and extreme random values: no answer repeats 3 times.
const seededRandom = math.random;
for (const random of [seededRandom, () => 0, () => 0.999999]) {
  math.random = random;
  context.previousNeedsFlip = null; context.sameFlipRun = 0; context.score = 0;
  let previous = null, streak = 0, flips = 0;
  for (let i = 0; i < 10000; i++) {
    context.newRound();
    const needsFlip = context.plugFlip !== context.portFlip;
    flips += Number(needsFlip);
    streak = needsFlip === previous ? streak + 1 : 1;
    assert(streak <= 2);
    previous = needsFlip;
  }
  assert(flips >= 3333 && flips <= 6667);
  if (random === seededRandom) assert(flips > 4700 && flips < 5300);
}

// Actual flip and insertion logic, including a correct and a wrong outcome.
context.playing = true; context.phase = 'aim'; context.score = 0;
context.portFlip = false; context.plugFlip = true; context.vertical = false;
context.plugGroup.rotation.z = 0; context.flip();
assert.equal(context.plugFlip, false);
context.insert(); assert.equal(context.insertionCorrect, true);
timers.at(-1).fn(); assert.equal(context.score, 1);
context.phase = 'aim'; context.portFlip = false; context.plugFlip = true;
context.insert(); assert.equal(context.insertionCorrect, false);
timers.at(-1).fn(); assert.equal(context.score, 1); assert.equal(context.playing, false);

// Real countdown scheduling, target changes, movement, late timer guards, and insertion.
vm.runInContext(source.slice(source.indexOf('function startCountdown('),source.indexOf('function entranceStartZ(')),context);
context.activeMode='horizontal'; context.playing=true; context.score=100; context.newRound();
math.random=()=>0; context.duration=600; context.startCountdown(1000);
assert.equal(context.switchTimer,null); assert.equal(context.duration,600);
context.plugFlip=context.portFlip; context.insert();
assert.equal(timers[context.resultTimer-1].delay,110);
timers[context.resultTimer-1].fn();
assert.equal(timers[context.nextTimer-1].delay,40);
context.activeMode='arcade';
context.nextHorizontal=null;
math.random=()=>0;
context.playing=true; context.score=48; now=1000; context.newRound();
assert.equal(context.duration,1200);
assert.equal(timers[context.switchTimer-1].delay,240);
const oldTarget=context.layout.target, originalDeadline=context.deadline;
const flipBefore=context.plugFlip;
now=1240; timers[context.switchTimer-1].fn();
assert.notEqual(context.layout.target,oldTarget);
assert.equal(context.deadline,originalDeadline);
assert.equal(context.deadline-now,960);
assert.equal(context.plugFlip,flipBefore);
assert.equal(context.portFlip,context.layout.sockets[context.layout.target].flip);
assert.equal(context.targetMove.started,now);
context.updateTargetMove(now+50);
assert(context.targetMove);
context.updateTargetMove(now+100);
assert.equal(context.targetMove,null);
assert.equal(context.plugGroup.position.x,context.layout.sockets[context.layout.target].x);
assert.equal(context.plugGroup.position.y,context.layout.sockets[context.layout.target].y);
if(context.plugFlip!==context.portFlip) context.flip();
context.insert();
assert.equal(context.insertionCorrect,true);
timers.at(-1).fn(); assert.equal(context.score,49);

// A late switch is skipped below 800 ms; exactly 800 ms still leaves 700 ms after motion.
context.playing=true; context.phase='aim'; context.deadline=2000; now=1201;
const beforeLate=context.layout.target; context.switchTarget();
assert.equal(context.layout.target,beforeLate);
now=1200; context.switchTarget(); assert.notEqual(context.layout.target,beforeLate);
assert.equal(context.deadline-now-100,700);
const afterBoundary=context.layout.target;
now=1600; context.phase='insert'; context.switchTarget();
assert.equal(context.layout.target,afterBoundary);
context.phase='aim'; context.targetMove={x:99,y:99,started:now};
context.plugGroup.position.x=99; context.plugGroup.position.y=99;
context.insert();
assert.equal(context.plugGroup.position.x,context.layout.sockets[afterBoundary].x);
assert.equal(context.plugGroup.position.y,context.layout.sockets[afterBoundary].y);

// Every destination in a mixed grid is reachable and uses its own axis and face.
context.playing=true; context.score=40; context.newRound();
for(let from=0;from<4;from++) for(let to=0;to<4;to++) if(from!==to){
  context.layout.target=from; context.plugFlip=false; context.phase='aim';
  context.plugGroup.rotation.z=0; context.deadline=5000; now=1000;
  const choice=to<from ? to : to-1;
  math.random=()=>(choice+.1)/3;
  context.switchTarget();
  assert.equal(context.layout.target,to);
  assert.equal(context.portFlip,context.layout.sockets[to].flip);
  assert(Math.abs(context.targetRoll-context.layout.sockets[to].axis)<1e-10);
  context.flip();
  assert.equal(context.plugFlip,true);
  assert(Math.abs(Math.cos(context.targetRoll-context.layout.sockets[to].axis)+1)<1e-10);
  context.updateTargetMove(now+100);
}

// Switching is unavailable before the threshold and remains probabilistic afterward.
math.random=()=>0; context.score=47; context.phase='idle'; context.duration=600; context.startCountdown(1000);
assert.equal(context.switchTimer,null);
assert.equal(context.duration,600);
math.random=()=>.999999; context.score=48; context.duration=600; context.startCountdown(1000);
assert.equal(context.switchTimer,null);
assert.equal(context.duration,600);
math.random=()=>0; context.duration=600; context.startCountdown(1000);
const pendingSwitch=context.switchTimer;
assert(pendingSwitch);
assert.equal(context.duration,1100);
context.insert();
assert(timers[pendingSwitch-1].cleared);

// Restart clears the streak before creating the first round.
context.previousNeedsFlip = true; context.sameFlipRun = 2;
context.start();
assert.equal(context.score, 0); assert.equal(context.round, 1);
assert.equal(context.sameFlipRun, 1); assert.equal(context.playing, true);

// All official modes require a name for manual play, and mode state does not leak.
context.playing=false; elements['player-name'].value=''; context.start('horizontal');
assert.equal(context.playing,false); assert.equal(elements['player-name-error'].hidden,false);
assert.equal(context.activeMode,'arcade');
context.start('timing');
assert.equal(context.playing,false); assert.equal(context.activeMode,'arcade');
elements['player-name'].value='Manual'; context.start();
assert.equal(context.playing,true);
context.start('horizontal');
assert.equal(context.activeMode,'horizontal'); assert.equal(context.layout.kind,'horizontal');
context.phase='aim'; context.portFlip=false; context.plugFlip=true; context.flip(); context.insert();
assert.equal(context.insertionCorrect,true); timers[context.resultTimer-1].fn(); assert.equal(context.score,1);
context.phase='aim'; context.portFlip=false; context.plugFlip=true; context.insert();
assert.equal(context.insertionCorrect,false); timers[context.resultTimer-1].fn(); assert.equal(context.playing,false);
timers[context.nextTimer-1].fn();
assert.equal(elements['mode-field'].hidden,true); assert.equal(elements['start-btn'].hidden,false);
assert.deepEqual(shareEvents.at(-1),[1,'horizontal']);
context.start(); assert.equal(context.activeMode,'horizontal'); assert.equal(context.score,0);
assert.equal(shareEvents.at(-1),'hide');
context.start('timing');
assert.equal(context.activeMode,'timing');
assert.equal(elements['timing-indicator'].hidden,false);
assert.equal(elements['timer-label'].textContent,'Flip before');
console.log('Gameplay balance checks passed.');
