// Guard the interruption pause: an app switch, incoming call, hidden tab or another window
// freezes the run, Continue counts 3-2-1, and only then does the remaining time come back.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(root,'game.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'style.css'),'utf8');

assert.match(html,/id="pause-notice"[^>]*role="dialog"[^>]*aria-modal="true"/,
  'the pause panel should be a modal dialog');
assert.match(html,/id="pause-notice"[\s\S]*id="pause-resume"[^>]*>Continue</,
  'the pause panel should offer a Continue control');
assert.match(html,/id="pause-countdown"[^>]*aria-live="assertive"/,
  'the resume countdown should be announced');
assert.match(css,/\.pause-notice\{[^}]*position:absolute[^}]*inset:0[^}]*background:var\(--canvas\)/,
  'the pause panel should cover the game opaquely');
assert.match(css,/\.pause-notice \.pause-countdown\{[^}]*font:800/,
  'the resume countdown should be large and readable');
assert.match(source,/window\.addEventListener\('blur',\(\)=>\{ if\(playing\) pauseRun\('blur'\); \}\)/,
  'losing window focus should pause the run');
assert.match(source,/window\.addEventListener\('pagehide',\(\)=>pauseRun\('pagehide'\)\)/,
  'leaving the page should pause the run');
assert.match(source,/if\(document\.hidden\) pauseRun\('hidden'\); else updatePauseUI\(\);/,
  'returning to a visible tab should wait on the pause panel');
assert.match(source,/if\(e\.repeat \|\| pausedAt \|\| portraitOnly\(\)\)return;/,
  'game input should be inert while paused');
assert.match(source,/if\(playing && !pausedAt && phase==='aim'\)\{/,
  'a paused aim phase must not advance its deadline');
assert.match(source,/resumeCountdown=3;/,'Continue should start a three-step countdown');
assert.match(source,/resumeCountdownTimer=setTimeout\(tickResumeCountdown,800\)/,
  'the countdown should tick about once a second');
assert.match(source,/if\(phase==='aim'\) updateTimer\(Math\.max\(0,deadline-now\),activeMode==='timing'\?timingLimit:duration\);/,
  'resuming should repaint the timer from the remaining time');

const code=source.slice(source.indexOf('let pausedAt=0'),source.indexOf('function animate(now)'));
let now=1000;
const timers=[];
const events={};
const element=()=>({hidden:true,textContent:'',value:'',style:{},classList:{add(){},remove(){},toggle(){}},
  addEventListener(type,fn){this[type]=fn;},setAttribute(){},removeAttribute(){},focus(){},blur(){}});
const elements=new Proxy({},{get:(target,id)=>target[id]||=element()});
const context=vm.createContext({
  performance:{now:()=>now},
  setTimeout(fn,delay){timers.push({fn,delay,due:now+delay,cleared:false});return timers.length;},
  clearTimeout(id){if(timers[id-1])timers[id-1].cleared=true;},
  $:id=>elements[id],
  document:{hidden:false,activeElement:{blur(){}},addEventListener(type,fn){events['document:'+type]=fn;}},
  window:{addEventListener(type,fn){events['window:'+type]=fn;}},
  ResizeObserver:class{observe(){}},
  portraitOnly:()=>false,
  audioContext:null,
  playing:true,phase:'aim',activeMode:'arcade',timingStep:'insert',duration:1155,timingLimit:0,
  deadline:2155,timingStarted:900,transitionStarted:0,insertionStarted:0,insertionDuration:300,successDelay:60,
  autoTimer:null,timingRoundTimer:null,switchTimer:null,resultTimer:null,nextTimer:null,
  resultTimerDue:0,nextTimerDue:0,
  insert(){},expireTimingPhase(){},switchTarget(){},completeInsertion(){},runNextStep(){},
  updateTimer(remaining,total){context.lastTimer=[remaining,total];},
});
vm.runInContext(code,context);
const read=expression=>vm.runInContext(expression,context);
const tickResume=()=>timers[timers.length-1].fn();
// Three ticks of 800 ms take the run back into play at the requested time.
const finishCountdown=target=>{ now=target-1600; tickResume(); now=target-800; tickResume(); now=target; tickResume(); };

// An incoming call or app switch freezes the automatic insertion timer.
context.autoTimer=context.setTimeout(()=>{},1155);
const autoId=context.autoTimer;
context.pauseRun('blur');
assert.equal(read('pausedAt'),1000,'the run should record when it paused');
assert.equal(context.autoTimer,null,'the automatic insertion should be cancelled while paused');
assert.equal(timers[autoId-1].cleared,true);
assert.equal(elements['pause-notice'].hidden,false,'the pause panel should be visible');
assert.equal(read('interruptPause'),true);

// Continue counts down instead of resuming under the player's finger.
now=3500;
context.continueRun();
assert.equal(read('pausedAt'),1000,'the run should stay paused during the countdown');
assert.equal(read('resumeCountdown'),3);
assert.equal(elements['pause-countdown'].hidden,false,'the countdown should be visible');
assert.equal(elements['pause-countdown'].textContent,'3');
assert.equal(elements['pause-resume'].hidden,true,'Continue should step aside during the countdown');
assert.equal(elements['pause-title'].textContent,'Get ready');
assert.equal(read('pauseTimers').auto,1155,'the remaining time should be held while counting down');

// The countdown ticks 3-2-1 and only then plays again.
now=4300; tickResume();
assert.equal(read('resumeCountdown'),2);
assert.equal(elements['pause-countdown'].textContent,'2');
assert.equal(read('pausedAt'),1000);
now=5100; tickResume();
assert.equal(read('resumeCountdown'),1);
assert.equal(read('pausedAt'),1000);
now=5900; tickResume();
assert.equal(read('pausedAt'),0,'the countdown should be the only way back into play');
assert.equal(elements['pause-notice'].hidden,true);
assert.equal(elements['pause-resume'].hidden,false,'Continue should return for the next interruption');
assert.equal(elements['pause-title'].textContent,'Paused');
assert.equal(context.deadline,7055,'the deadline should move by the whole pause including the countdown');
assert.equal(context.lastTimer[0],1155,'the bar should restart with the time it had left');
assert.equal(typeof context.autoTimer,'number','the automatic insertion should be rescheduled');
assert.equal(timers[timers.length-1].delay,1155);

// Returning to a hidden tab is not enough: the player still taps Continue.
now=9000; context.document.hidden=true; events['document:visibilitychange']();
assert.equal(read('pausedAt'),9000,'a hidden page should pause the run');
now=12000; context.document.hidden=false; events['document:visibilitychange']();
assert.equal(read('pausedAt'),9000,'a visible page should stay paused until Continue');
assert.equal(elements['pause-notice'].hidden,false);
context.continueRun();
assert.equal(read('pausedAt'),9000,'the countdown runs on the pause panel');
finishCountdown(12000);
assert.equal(read('pausedAt'),0);
assert.equal(context.deadline,10055,'the second pause should also move the deadline');

// A pause inside the insertion phase keeps its own remaining time.
now=13000;
context.resultTimer=context.setTimeout(()=>{},300);
context.resultTimerDue=13150;
context.pauseRun('pagehide');
assert.equal(context.resultTimer,null,'the pending insertion result should be cancelled');
now=15000;
context.continueRun();
finishCountdown(15000);
assert.equal(timers[timers.length-1].delay,150,'the insertion result should keep its remaining time');
assert.equal(context.resultTimerDue,15150);
assert.equal(context.deadline,12055);

// The portrait gate is the player's own action, so it still resumes by itself.
now=16000;
context.pauseRun('landscape');
assert.equal(read('pausedAt'),16000);
now=17000;
context.portraitOnly=()=>false;
context.syncPortraitGate();
assert.equal(read('pausedAt'),0,'returning to portrait should resume without a tap');
assert.equal(elements['pause-notice'].hidden,true);
assert.equal(context.deadline,13055,'the portrait pause should also move the deadline');

// A second interruption during the countdown cancels it and keeps the panel up.
now=18000;
context.pauseRun('blur');
context.continueRun();
assert.equal(read('resumeCountdown'),3);
context.document.hidden=true; events['document:visibilitychange']();
assert.equal(read('resumeCountdown'),0,'a second interruption should cancel the countdown');
assert.equal(read('pausedAt'),18000,'the run should stay paused');
assert.equal(elements['pause-resume'].hidden,false,'Continue should come back');
assert.equal(elements['pause-countdown'].hidden,true);
context.document.hidden=false;

// A run that is already over is not paused.
now=18500; context.resumeRun();
context.playing=false; context.phase='over';
now=19000; context.pauseRun('hidden');
assert.equal(read('pausedAt'),0,'the pause should only hold a live run');

console.log('Interruption pause checks passed.');
