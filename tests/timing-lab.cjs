// Preserve this historical test path while validating the production two-phase Timing mode and score flows.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../game.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const css=fs.readFileSync(path.join(__dirname,'../style.css'),'utf8');

assert.match(html,/class="mode-buttons"[\s\S]*id="play-timing"[^>]*>Beat/);
assert.doesNotMatch(html,/Timing Lab|experimental|does not save scores/);
assert.doesNotMatch(html,/id="action-button"|id="lab-controls"|id="flip-button"|id="insert-button"|>INSERT\s*</,
  'Timing must not render a visible FLIP or INSERT button, hint, or second control');
assert.doesNotMatch(css,/lab-controls|lab-control-button/,'the removed Timing action-button styles should have no residual styles');
assert.match(html,/In Beat, flip before the bar empties, then tap again on GOOD or PERFECT/i,
  'the player guide must explain both phases and their touch/keyboard input');
assert.doesNotMatch(source,/action-button|lab-controls/,'the removed action button must have no remaining JavaScript references');
assert.match(css,/\.timing-mode \.progress-track/);
assert.doesNotMatch(css,/timing-countdown/,'Timing should not render a numeric visual countdown');
assert.match(css,/\.timing-window-perfect\{[^}]*var\(--timing-perfect\)/);
assert.match(html,/class="sr-only"><span id="timer-label"[\s\S]*?<span id="timer-text"/,
  'timer announcements should remain available to screen readers');
assert.doesNotMatch(html,/id="timing-countdown"/);

let scheduled=[],now=1000;
const classes={add(){},remove(){},toggle(){}};
const elements=new Proxy({}, {get:(target,id)=>target[id] ||= {
  hidden:false,disabled:false,textContent:'',value:'',innerHTML:'',style:{},classList:classes,attributes:{},
  setAttribute(name,value){this.attributes[name]=value;},removeAttribute(){},focus(){},append(){},appendChild(){},replaceChildren(){},
}});
const context=vm.createContext({
  Math:Object.assign(Object.create(Math),{random:()=>.5}),
  performance:{now:()=>now},
  setTimeout(fn,delay){scheduled.push({fn,delay,cleared:false});return scheduled.length;},
  clearTimeout(id){if(scheduled[id-1])scheduled[id-1].cleared=true;},
  $:id=>elements[id],
  updateUI(){},autoCorrect(){},updateTargetMove(){},showFeedback(correct){context.feedback.push(correct);},
  showScoreImpact(...args){context.hitEvents.push(args);}, showTauntForScore(){}, hideTaunt(){}, messagesEnabled:true, tauntStorageAvailable:true,
  saveScore(){context.savedScores++;},loadScores(){},clearScene(){},initScroll(){},rebuild(){},
  scoreSharing:{events:[],show(score,mode){this.events.push([score,mode]);},hide(){}},
  plugGroup:{position:{x:0,y:0},rotation:{z:0},userData:{}},
  gameShell:{classList:classes},document:{activeElement:{blur(){}},querySelector:()=>elements.chip},
  hitEvents:[],stageEvents:[],feedback:[],savedScores:0,
  activeMode:'timing',playing:true,phase:'aim',score:0,round:1,
  portFlip:false,plugFlip:false,layout:{sockets:[{}]},duration:1800,deadline:0,
  timingStep:'flip',timingLimit:0,timingStarted:0,timingTargetProgress:.5,timingPerfectWindow:125,timingGoodWindow:260,
  timingPerfectStreak:0,timingGrade:'good',timingAward:0,timingMultiplier:0,
  insertionDuration:200,insertionVisualDuration:180,insertionTurnDuration:99,successDelay:60,
  insertionCorrect:false,insertionStarted:0,plugStartZ:2.15,targetRoll:0,
  nextTimer:null,autoTimer:null,timingRoundTimer:null,switchTimer:null,targetMove:null,resultTimer:null,feedbackTimer:null,
  scoreToastTimer:null,impactTimer:null,playerName:'',
});
const timingHelpers=source.slice(source.indexOf('const evolveMilestones'),source.indexOf('function activeRowY()'));
vm.runInContext(timingHelpers,context);
context.soundsEnabled=false;
context.showScoreImpact=(...args)=>context.hitEvents.push(args);
context.playStageUp=index=>context.stageEvents.push(index);
context.activeMode='arcade'; context.playMilestoneCue(3,4);
assert.deepEqual(context.stageEvents,[0],'Evolve milestone should keep its distinct audio cue');
context.activeMode='horizontal'; context.playMilestoneCue(4,5);
assert.deepEqual(context.stageEvents,[0,0],'Rush milestone should keep its distinct audio cue');
context.activeMode='timing'; context.playMilestoneCue(7,8);
assert.deepEqual(context.stageEvents,[0,0,1],'Timing should retain progressive-layout milestone cues');
assert.doesNotMatch(html,/id="stage-callout"/,'milestone popup text must be removed');
assert.doesNotMatch(css,/stage-callout/,'milestone popup styling must be removed');
assert.doesNotMatch(source,/stageCalloutTimer|stage-callout|STAGE \$\{/,'milestones must not display or announce text');
const initial=vm.runInContext('timingWindows(0,1750)',context);
const harder=vm.runInContext('timingWindows(100,900)',context);
assert.equal(initial.perfect,125);
assert.equal(initial.good,260);
assert(harder.perfect<initial.perfect);
assert(harder.good<initial.good);
context.duration=1000; context.timingStarted=0; context.timingTargetProgress=.5;
context.timingPerfectWindow=125; context.timingGoodWindow=260;
assert.equal(vm.runInContext('timingCursorProgress(500)',context),.5);
assert.equal(vm.runInContext('timingCursorProgress(1500)',context),.5,'the marker should cross the target again on its return leg');
assert.equal(vm.runInContext('evaluateTiming(500)',context),'perfect');
assert.equal(vm.runInContext('evaluateTiming(626)',context),'good');
assert.equal(vm.runInContext('evaluateTiming(760)',context),'good');
assert.equal(vm.runInContext('evaluateTiming(761)',context),'miss');

const countdown=source.slice(source.indexOf('function updateTimer('),source.indexOf('function entranceStartZ('));
vm.runInContext(countdown,context);
const insertion=source.slice(source.indexOf('function flip()'),source.indexOf('function start('));
vm.runInContext(insertion,context);
context.setTargetRoll=()=>{};
context.activeMode='timing'; context.score=0; context.layout={sockets:[{}]};
context.portFlip=false; context.plugFlip=true;
scheduled=[]; context.startCountdown(10000);
assert.equal(context.phase,'aim');
assert.equal(context.timingStep,'flip');
assert.equal(context.timingLimit,1155,'the flip phase should use the normal Evolve countdown');
assert.equal(context.deadline,11155);
assert.equal(elements['progress-bar'].style.transform,'scaleX(1)');
context.updateTimer(context.timingLimit/2,context.timingLimit);
assert.equal(elements['progress-bar'].style.transform,'scaleX(0.5)','the FLIP phase should visibly drain its bar');
assert.equal(scheduled.filter(timer=>!timer.cleared).length,1,'a manual flip phase should have one timeout and no auto action');
assert.equal(scheduled.find(timer=>!timer.cleared).delay,1155);

context.handleStagePress(10100);
assert.equal(context.plugFlip,false,'the first press flips the connector into the correct orientation');
assert.equal(context.timingStep,'insert');
assert.equal(context.duration,1750);
assert(context.timingTargetProgress>0&&context.timingTargetProgress<1);
assert.equal(context.timingStarted,10100);
assert.equal(context.timingLimit,5250,'the initial insertion deadline should be three cursor traversals');
assert.equal(context.deadline,15350);
assert.equal(elements['progress-bar'].style.transform,'scaleX(1)');
context.updateTimer(context.timingLimit/2,context.timingLimit);
assert.equal(elements['progress-bar'].style.transform,'scaleX(0.5)','the INSERT deadline should independently drain its bar');
assert.equal(scheduled.filter(timer=>!timer.cleared).length,1,'a manual insertion phase should have one independent deadline');
assert.equal(scheduled.find(timer=>!timer.cleared).delay,5250);
assert.equal(elements['timing-perfect-zone'].hidden,false);

// A correctly timed stage tap scores normally; it is saved when the run ends.
context.activeMode='timing'; context.timingTargetProgress=.5;
context.handleStagePress(context.timingStarted+context.duration*.5);
assert.equal(context.phase,'insert');
scheduled.find(timer=>timer.delay===context.insertionDuration&&!timer.cleared).fn();
assert.equal(context.timingGrade,'perfect');
assert.equal(context.score,2);
assert.equal(context.savedScores,0);

context.playing=true; context.phase='aim'; context.activeMode='timing';
context.score=100; context.portFlip=false; context.plugFlip=true; scheduled=[]; context.startCountdown(30000);
assert.equal(context.timingLimit,700,'the flip deadline should retain the Evolve-style minimum');
context.timingAction(30100);
assert.equal(context.duration,900,'the meter should continue speeding up to its established floor');
assert(context.timingPerfectWindow<initial.perfect);
assert(context.timingGoodWindow<initial.good);

// Normal arcade stage taps remain a simple flip.
context.activeMode='arcade'; context.playing=true; context.phase='aim'; context.plugFlip=false;
context.handleStagePress();
assert.equal(context.plugFlip,true,'Evolve/Rush stage input should still flip the drive');
context.activeMode='timing';

// Both phase deadlines end the run; late input cannot beat a timer callback race.
function resetPhase(step,at=40000){
  scheduled=[]; context.playing=true; context.phase='aim'; context.activeMode='timing'; context.savedScores=0;
  context.score=0; context.timingStep=step; context.timingGrade='good'; context.feedback=[];
  context.startCountdown(at);
  if(step==='insert')context.timingAction(at+100);
}
resetPhase('flip');
const flipDeadline=scheduled.find(timer=>!timer.cleared&&timer.delay===1155);
flipDeadline.fn();
assert.equal(context.playing,false,'missing the flip deadline ends the run');
assert.equal(context.timingGrade,'flip-timeout');
assert.deepEqual(context.feedback,[false]);
assert.equal(context.savedScores,1,'a manual flip timeout should save a Timing score');

resetPhase('insert',50000);
const insertDeadline=scheduled.find(timer=>!timer.cleared&&timer.delay===5250);
insertDeadline.fn();
assert.equal(context.playing,false,'missing the separate insertion deadline ends the run');
assert.equal(context.timingGrade,'timeout');
assert.deepEqual(context.feedback,[false]);
assert.equal(context.savedScores,1,'a manual insert timeout should save a Timing score');

resetPhase('flip',60000);
context.timingAction(context.deadline);
assert.equal(context.playing,false,'an input at the exact deadline must lose even if the timer callback is late');
assert.equal(context.timingStep,'flip');
assert.equal(context.savedScores,1,'input at the deadline should save a Timing score');

function resetRun({score=0,streak=0,orientationCorrect=true}={}){
  scheduled=[]; context.playing=true; context.phase='aim'; context.activeMode='timing'; context.savedScores=0;
  context.timingStep='insert'; context.timingRoundTimer=null;
  context.score=score; context.timingPerfectStreak=streak; context.timingStarted=0; context.duration=2000; context.timingTargetProgress=.5;
  context.timingPerfectWindow=125; context.timingGoodWindow=260; context.timingGrade='good';
  context.portFlip=false; context.plugFlip=orientationCorrect?false:true; context.hitEvents=[]; context.stageEvents=[];
  context.timingAward=0; context.timingMultiplier=0; context.deadline=2000;
}
function commit(at){
  context.insert(at); assert.equal(context.phase,'insert');
  scheduled.find(timer=>timer.delay===context.insertionDuration&&!timer.cleared).fn();
}
resetRun(); commit(1000);
assert.equal(context.timingGrade,'perfect');
assert.equal(context.timingAward,2);
assert.equal(context.score,2);
assert.equal(context.timingPerfectStreak,1);
assert.deepEqual(context.hitEvents[0],[2,'perfect']);
assert.deepEqual(context.stageEvents,[],'the initial score should not trigger a progression milestone');

resetRun({score:8,streak:2}); commit(1000);
assert.equal(context.timingMultiplier,2);
assert.equal(context.timingAward,4);
assert.equal(context.score,12);

resetRun({score:20,streak:20}); commit(1000);
assert.equal(context.timingMultiplier,4);
assert.equal(context.timingAward,8,'perfect bonuses stop at four times the base perfect bonus');

resetRun({score:5,streak:4}); commit(1200);
assert.equal(context.timingGrade,'good');
assert.equal(context.timingPerfectStreak,0);
assert.equal(context.timingAward,1);
assert.equal(context.score,6);

resetRun({score:7}); commit(1400);
assert.equal(context.timingGrade,'miss');
assert.equal(context.score,7);
assert.equal(context.playing,false);
scheduled.at(-1).fn();
assert.equal(context.savedScores,1,'a manual Timing run should save its score');
assert.equal(elements['leaderboard'].hidden,false,'a manual Timing run should show the regular leaderboard');
assert.deepEqual(context.scoreSharing.events.at(-1),[7,'timing'],'a manual Timing run should show its score card');

resetRun({score:9,orientationCorrect:false}); commit(1000);
assert.equal(context.timingGrade,'perfect');
assert.equal(context.score,9,'a perfect timing press with the wrong USB orientation still fails');
assert.equal(context.playing,false);
assert.equal(context.savedScores,1,'a wrong-orientation Timing run should still save its final score');

console.log('Timing mode grade, progression, leaderboard, and sharing checks passed.');
