import * as THREE from './vendor/three.module.min.js';

const $ = (id) => document.getElementById(id);

const leaderboardKey='phit-dan-leaderboard-v3', horizontalLeaderboardKey='phit-dan-leaderboard-horizontal-v1', timingLeaderboardKey='phit-dan-leaderboard-timing-v1', leaderboardLimit=10, playerNameKey='phit-dan-player-name';
const leaderboardStorageKey=mode=>mode==='horizontal'?horizontalLeaderboardKey:mode==='timing'?timingLeaderboardKey:leaderboardKey;
const modeLabel=mode=>mode==='horizontal'?'Rail':mode==='timing'?'Beat':'Hub';
const gameVersion='1.0.0';
let scoreRecords=[], leaderboardStorageAvailable=true, latestRun=null, playerName='', activeMode='arcade';
const recordsByMode={};
function loadScores(mode){
  if(recordsByMode[mode]) { scoreRecords=recordsByMode[mode]; return; }
  scoreRecords=recordsByMode[mode]=[];
  try {
  let stored=localStorage.getItem(leaderboardStorageKey(mode)), version=3;
  if(mode==='arcade' && stored===null){ stored=localStorage.getItem('phit-dan-leaderboard-v2'); version=2; }
  if(mode==='arcade' && stored===null){ stored=localStorage.getItem('phit-dan-leaderboard-v1'); version=1; }
  const saved=JSON.parse(stored || '[]');
  if(Array.isArray(saved)) for(const entry of saved){
    const [value,name,count]=version===1 ? [entry,'Unknown',1] : !Array.isArray(entry) ? [] : version===2 ? [entry[0],'Unknown',entry[1]] : entry;
    if(Number.isSafeInteger(value) && value>=0 && typeof name==='string' && name.trim() && Number.isSafeInteger(count) && count>0) scoreRecords.push([value,name.trim().slice(0,24),count]);
  }
  } catch(error) { leaderboardStorageAvailable=false; }
}
loadScores('arcade');
try { $('player-name').value=(localStorage.getItem(playerNameKey) || '').slice(0,24); } catch(error) { leaderboardStorageAvailable=false; }
function rankBadge(rank){
  const badge=document.createElement('span'); badge.classList.add('rank');
  if(rank<=3){
    badge.classList.add('royal');
    badge.setAttribute('role','img'); badge.setAttribute('aria-label',`Rank ${rank}`);
    // A crown with three jewels and a band: the top three places read as a royal crest.
    badge.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path class="crown" d="M3.6 19.6V8.6l4.6 3.8L12 4.6l3.8 7.8 4.6-3.8v11z"/><path class="crown-band" d="M3.6 15.8h16.8"/><circle class="crown-jewel" cx="3.6" cy="7.1" r="1.3"/><circle class="crown-jewel" cx="20.4" cy="7.1" r="1.3"/><circle class="crown-jewel" cx="12" cy="3.2" r="1.4"/></svg>';
  } else badge.textContent=`#${rank}`;
  return badge;
}
function renderLeaderboard(){
  const mode=modeLabel(activeMode);
  $('leaderboard-mode').textContent=`${mode} — top 10 scores on this device`;
  const list=$('leaderboard-list'); list.replaceChildren();
  let rank=0;
  for(const [value,name,count] of [...scoreRecords].sort((a,b)=>b[0]-a[0])){
    for(let i=0;i<count && rank<leaderboardLimit;i++){
      rank++;
      const item=document.createElement('li');
      if(rank<=3) item.classList.add('top-rank',`top-${rank}`);
      item.appendChild(rankBadge(rank));
      const label=document.createElement('span'); label.classList.add('player-entry'); label.textContent=name;
      if(latestRun && rank===latestRun.rank){
        item.classList.add('latest');
        const marker=document.createElement('small'); marker.textContent='Your run'; label.appendChild(marker);
      }
      item.appendChild(label);
      const points=document.createElement('strong'); points.textContent=String(value); item.appendChild(points); list.appendChild(item);
    }
    if(rank===leaderboardLimit) break;
  }
  while(rank<leaderboardLimit){
    rank++;
    const item=document.createElement('li'); item.classList.add('empty-slot');
    item.appendChild(rankBadge(rank));
    const points=document.createElement('strong'); points.textContent='—'; points.setAttribute('aria-label','No score');
    item.appendChild(points); list.appendChild(item);
  }
  const current=$('leaderboard-current'); current.replaceChildren();
  current.hidden=!latestRun || latestRun.rank<=leaderboardLimit;
  if(!current.hidden){
    const label=document.createElement('span'); label.textContent=`#${latestRun.rank}  ${latestRun.name} (Your run)`;
    const points=document.createElement('strong'); points.textContent=String(latestRun.score); current.append(label,points);
  }
  $('leaderboard-empty').hidden=scoreRecords.length>0;
  $('leaderboard-error').hidden=leaderboardStorageAvailable;
}
function saveScore(value){
  let rank=1;
  for(const [points,,count] of scoreRecords) if(points>=value) rank+=count;
  latestRun={score:value,rank,name:playerName};
  scoreRecords.push([value,playerName,1]);
  try { localStorage.setItem(leaderboardStorageKey(activeMode),JSON.stringify(scoreRecords)); leaderboardStorageAvailable=true; }
  catch(error) { leaderboardStorageAvailable=false; }
  renderLeaderboard();
}
$('leaderboard-toggle').addEventListener('click',()=>{
  setMenuSectionsHidden(true);
  selectLeaderboardMode(activeMode);
  $('leaderboard-modes').hidden=false; $('leaderboard').hidden=false; $('leaderboard-back').hidden=false; $('start-overlay').scrollTop=0; $('leaderboard-title').focus();
});
$('leaderboard-back').addEventListener('click',()=>{
  $('leaderboard').hidden=true; $('leaderboard-modes').hidden=true; $('leaderboard-back').hidden=true;
  setMenuSectionsHidden(false);
  $('start-overlay').scrollTop=0; $('leaderboard-toggle').focus();
});
function selectLeaderboardMode(mode){
  activeMode=mode; latestRun=null; loadScores(mode);
  $('scores-arcade').setAttribute('aria-pressed',String(mode==='arcade'));
  $('scores-horizontal').setAttribute('aria-pressed',String(mode==='horizontal'));
  $('scores-timing').setAttribute('aria-pressed',String(mode==='timing'));
  renderLeaderboard();
}
$('scores-arcade').addEventListener('click',()=>selectLeaderboardMode('arcade'));
$('scores-horizontal').addEventListener('click',()=>selectLeaderboardMode('horizontal'));
$('scores-timing').addEventListener('click',()=>selectLeaderboardMode('timing'));
renderLeaderboard();

// Player messages: short taunts left by a finished run and shown to the next player
// whose score reaches the same number in the same mode. One plain message at a time in
// the empty column left of the hub, and Settings can switch them off.
const tauntsKey='phit-dan-taunts-v1', messagesEnabledKey='phit-dan-messages-enabled', tauntLimit=300, tauntChars=60;
const tauntModes=['arcade','horizontal','timing'];
let playerTaunts=[], messagesEnabled=true, tauntStorageAvailable=true, tauntTimer=null, tauntLane=[];
function loadMessagesSetting(){
  try { messagesEnabled=localStorage.getItem(messagesEnabledKey)!=='off'; }
  catch(error) { messagesEnabled=true; }
}
function loadTaunts(){
  playerTaunts=[];
  try {
    const saved=JSON.parse(localStorage.getItem(tauntsKey) || '[]');
    if(!Array.isArray(saved)) return;
    for(const entry of saved){
      if(!entry || typeof entry!=='object') continue;
      const text=typeof entry.text==='string' ? entry.text.trim().slice(0,tauntChars) : '';
      const score=entry.score, mode=entry.mode;
      if(!text || !Number.isSafeInteger(score) || score<1 || !tauntModes.includes(mode)) continue;
      playerTaunts.push({score,text,mode,author:typeof entry.author==='string'?entry.author.trim().slice(0,24):''});
    }
    if(playerTaunts.length>tauntLimit) playerTaunts=playerTaunts.slice(-tauntLimit);
  } catch(error) { tauntStorageAvailable=false; }
}
function saveTaunts(){
  try { localStorage.setItem(tauntsKey,JSON.stringify(playerTaunts.slice(-tauntLimit))); tauntStorageAvailable=true; }
  catch(error) { tauntStorageAvailable=false; }
}
function saveTaunt(value,text,author='',mode=activeMode){
  const clean=String(text||'').replace(/\s+/g,' ').trim().slice(0,tauntChars);
  if(!clean || !Number.isSafeInteger(value) || value<1 || !tauntModes.includes(mode)) return null;
  const existing=playerTaunts.find(entry=>entry.score===value && entry.mode===mode && entry.text===clean);
  if(existing) return existing;
  const record={score:value,text:clean,mode,author:String(author||'').trim().slice(0,24)};
  playerTaunts.push(record);
  if(playerTaunts.length>tauntLimit) playerTaunts=playerTaunts.slice(-tauntLimit);
  saveTaunts();
  return record;
}
function setMessagesButton(){
  const button=$('taunt-toggle'); if(!button) return;
  button.textContent=messagesEnabled?'Player messages on':'Player messages off';
  button.setAttribute('aria-pressed',String(messagesEnabled));
}
function setMessagesEnabled(enabled){
  messagesEnabled=!!enabled;
  try { localStorage.setItem(messagesEnabledKey,messagesEnabled?'on':'off'); }
  catch(error) { /* The choice still applies for this page. */ }
  setMessagesButton();
  if(!messagesEnabled){ hideTaunt(); $('taunt-panel').hidden=true; }
}
function tauntsForScore(previousScore,nextScore,mode,limit=1){
  if(!messagesEnabled || nextScore<=previousScore) return [];
  const matches=playerTaunts.filter(entry=>entry.mode===mode && entry.score>previousScore && entry.score<=nextScore);
  if(matches.length<=limit) return matches;
  // Pick a different message each time the same score comes around.
  return [matches[Math.floor(Math.random()*matches.length)]];
}
function tauntForScore(previousScore,nextScore,mode){
  return tauntsForScore(previousScore,nextScore,mode)[0] || null;
}
function hideTaunt(){
  clearTimeout(tauntTimer); tauntTimer=null;
  tauntLane=[];
  const lane=$('hud-taunt'); if(!lane) return;
  lane.replaceChildren(); lane.hidden=true;
}
function renderTauntLane(){
  const lane=$('hud-taunt');
  const items=tauntLane.map(record=>{
    const item=document.createElement('div'); item.className='hud-taunt-item';
    const text=document.createElement('span'); text.className='hud-taunt-text'; text.textContent=record.text;
    const meta=document.createElement('div'); meta.className='hud-taunt-meta';
    const author=document.createElement('span'); author.className='hud-taunt-author';
    author.textContent=record.author || 'Anonymous';
    const score=document.createElement('span'); score.className='hud-taunt-score';
    score.textContent=`${record.score} pts`;
    meta.append(author,score);
    item.append(text,meta); return item;
  });
  if(lane){ lane.replaceChildren(...items); lane.hidden=!items.length; }
}
function showTauntForScore(previousScore,nextScore){
  if(!messagesEnabled || !playing) return;
  const record=tauntForScore(previousScore,nextScore,activeMode);
  if(!record) return;
  tauntLane=[record];
  renderTauntLane();
  clearTimeout(tauntTimer); tauntTimer=setTimeout(hideTaunt,7000);
}
// Player messages end.
loadMessagesSetting(); loadTaunts(); setMessagesButton();
let menuModesOpen=false;
function showModeChoices(open){
  menuModesOpen=open;
  $('mode-field').hidden=!open;
  $('play-btn').hidden=open;
  $('leaderboard-toggle').hidden=open;
  $('settings-menu').hidden=open;
  $('info-menu').hidden=open;
  $('player-field').hidden=open;
}
const menuSections=['overlay-title','settings-menu','info-menu','how-to-play','mode-field','player-field','play-btn','leaderboard-toggle'];
function setMenuSectionsHidden(hidden){
  for(const id of menuSections) $(id).hidden=hidden;
  if(!hidden) showModeChoices(menuModesOpen);
}
function requirePlayerName(){
  const input=$('player-name'), name=input.value.trim();
  $('player-name-error').hidden=!!name;
  if(name){ input.removeAttribute('aria-invalid'); return true; }
  input.setAttribute('aria-invalid','true'); input.focus({preventScroll:true});
  return false;
}
$('play-btn').addEventListener('click',()=>{
  if(!requirePlayerName()) return;
  showModeChoices(true); $('start-overlay').scrollTop=0; $('play-arcade').focus({preventScroll:true});
});
$('mode-back').addEventListener('click',()=>{ showModeChoices(false); $('play-btn').focus({preventScroll:true}); });
$('settings-back').addEventListener('click',()=>{
  $('settings-menu').open=false;
  setMenuSectionsHidden(false);
  $('settings-menu').querySelector?.('summary')?.focus({preventScroll:true});
});
$('settings-menu').addEventListener('toggle',()=>{
  const settings=$('settings-menu');
  if(settings.hidden) return;
  if(settings.open){
    for(const id of ['overlay-title','how-to-play','player-field','play-btn','mode-field','leaderboard-toggle','info-menu']) $(id).hidden=true;
    $('sound-toggle').focus({preventScroll:true});
  } else setMenuSectionsHidden(false);
});
// Leave a URL empty to keep its Info row inactive until it is available.
const infoLinksUrl='';
const infoGithubUrl='';
const infoFeedbackUrl='';
function setupInfoMenu(){
  const version=$('game-version');
  if(version) version.textContent='v'+gameVersion;
  const links=$('info-linktree');
  if(links && infoLinksUrl){
    links.href=infoLinksUrl;
    links.textContent='Open my links';
    links.target='_blank'; links.rel='noopener noreferrer';
    links.removeAttribute('aria-disabled');
    links.classList?.remove('info-action-pending');
  }
  const github=$('info-github');
  if(github && infoGithubUrl){
    github.href=infoGithubUrl;
    github.textContent='Open GitHub repository';
    github.target='_blank'; github.rel='noopener noreferrer';
    github.removeAttribute('aria-disabled');
    github.classList?.remove('info-action-pending');
  }
  const feedback=$('info-feedback');
  if(!feedback || !infoFeedbackUrl) return;
  feedback.href=infoFeedbackUrl;
  feedback.textContent='Open feedback form';
  feedback.target='_blank'; feedback.rel='noopener noreferrer';
  feedback.removeAttribute('aria-disabled');
  feedback.classList?.remove('info-action-pending');
}
$('info-menu').addEventListener('toggle',()=>{
  const info=$('info-menu');
  if(info.hidden) return;
  if(info.open){
    for(const id of ['overlay-title','how-to-play','player-field','play-btn','mode-field','leaderboard-toggle','settings-menu']) $(id).hidden=true;
    $('info-back').focus({preventScroll:true});
  } else setMenuSectionsHidden(false);
});
$('info-back').addEventListener('click',()=>{
  $('info-menu').open=false;
  setMenuSectionsHidden(false);
  $('info-menu').querySelector?.('summary')?.focus({preventScroll:true});
});
setupInfoMenu();
// Settings can clear everything this browser holds: the player name, the three
// leaderboards, the saved messages and the switches. Nothing is stored elsewhere.
function clearLocalData(){
  try {
    const keys=[];
    for(let index=0; index<localStorage.length; index++){
      const key=localStorage.key(index);
      if(key && key.indexOf('phit-dan-')===0) keys.push(key);
    }
    for(const key of keys) localStorage.removeItem(key);
  } catch(error) { /* A blocked store still resets the session on reload. */ }
  location.reload();
}
$('reset-data').addEventListener('click',()=>{
  if(!window.confirm('Clear your name, scores, messages and settings from this browser?')) return;
  clearLocalData();
});
let playing = false, score = 0, round = 0, portFlip = false, plugFlip = false, vertical = false, layout = null, previousVertical = false, phase = 'idle', deadline = 0, duration = 1800, insertionStarted = 0, transitionStarted = 0, plugStartZ = 2.15, insertionCorrect = false, targetRoll = 0, plugGroup, nextTimer, autoTimer, timingRoundTimer, resultTimer, feedbackTimer, resultTimerDue = 0, nextTimerDue = 0;
let previousNeedsFlip=null, sameFlipRun=0, pendingFailureReason='';
let switchTimer=null, targetMove=null;
let timingStep='flip', timingLimit=0, timingStarted=0, timingTargetProgress=0, timingPerfectWindow=125, timingGoodWindow=260, timingPerfectStreak=0, timingGrade='good', timingAward=0, timingMultiplier=0;
let scoreToastTimer=null, audioContext=null, clickNoiseBuffer=null, clickNoiseContext=null, soundsEnabled=true;
const reducedMotionQuery=window.matchMedia('(prefers-reduced-motion: reduce)');
const scoreSharing=initScoreSharing();
const hubWidth=3.0, hubHeight=3.4, horizontalPitch=1.0;
let transitionDuration=900, entranceDuration=450, insertionDuration=300, insertionVisualDuration=280, insertionTurnDuration=160, successDelay=180;
const scrollTop=.9, scrollActive=scrollTop-hubHeight/2;
const scrollClip=new THREE.Plane(new THREE.Vector3(0,-1,0),scrollTop);
let roundRig=null, scrollRig=null, scrollRows=[], scrollFill=null, scrollMaterials=new Map(), rendererWidth=0, rendererHeight=0, scrollSpacing=hubHeight, nextHorizontal=null;
const evolveMilestones=[
  {score:4,label:'VERTICAL PORTS'}, {score:8,label:'DOUBLE PORTS'}, {score:16,label:'TRIPLE PORTS'},
  {score:24,label:'GRID LOCK'}, {score:32,label:'MIXED PORTS'}, {score:48,label:'TARGET SHIFT'}, {score:72,label:'OVERDRIVE'}
];
const rushMilestones=[5,10,15,20,25,30].map((score,index)=>({score,label:index===5?'MAX RUSH':`RUSH SPEED ${index+2}`}));
function timingWindows(points,roundDuration){
  const perfect=Math.max(60,125-points*.8), good=Math.max(150,260-points*1.4);
  return {perfect:Math.min(perfect,roundDuration*.12),good:Math.min(Math.max(good,perfect+45),roundDuration*.23)};
}
function timingCursorProgress(now){
  if(!duration)return 0;
  const leg=Math.max(0,(now-timingStarted)/duration)%2;
  return leg<=1?leg:2-leg;
}
function evaluateTiming(now){
  const error=Math.abs(timingCursorProgress(now)-timingTargetProgress)*duration;
  if(error<=timingPerfectWindow)return 'perfect';
  if(error<=timingGoodWindow)return 'good';
  return 'miss';
}
function setArcadeSoundButton(){
  const button=$('sound-toggle');
  button.textContent=soundsEnabled?'Sound on':'Sound off';
  button.setAttribute('aria-pressed',String(soundsEnabled));
  button.setAttribute('aria-label',soundsEnabled?'Mute arcade sounds':'Enable arcade sounds');
}
function wakeArcadeAudio(){
  if(!soundsEnabled)return;
  try {
    const Audio=window.AudioContext||window.webkitAudioContext;
    if(!Audio)return;
    if(!audioContext)audioContext=new Audio();
    if(audioContext.state==='suspended')audioContext.resume().catch(()=>{});
  } catch(error) { audioContext=null; }
}
function playArcadeTone(frequency,endFrequency,duration,delay=0,type='triangle',volume=.035){
  if(!soundsEnabled||!audioContext)return;
  try {
    const start=audioContext.currentTime+delay, oscillator=audioContext.createOscillator(), gain=audioContext.createGain();
    oscillator.type=type; oscillator.frequency.setValueAtTime(frequency,start);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1,endFrequency),start+duration);
    gain.gain.setValueAtTime(.0001,start); gain.gain.exponentialRampToValueAtTime(volume,start+.008); gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
    oscillator.connect(gain); gain.connect(audioContext.destination); oscillator.start(start); oscillator.stop(start+duration+.01);
  } catch(error) { /* Audio is optional and should never interrupt a run. */ }
}
function playArcadeClick(){
  if(!soundsEnabled||!audioContext)return;
  try {
    if(clickNoiseContext!==audioContext){
      const sampleRate=audioContext.sampleRate||44100, length=Math.ceil(sampleRate*.022);
      clickNoiseBuffer=audioContext.createBuffer(1,length,sampleRate);
      const samples=clickNoiseBuffer.getChannelData(0);
      for(let i=0;i<length;i++) samples[i]=(Math.random()*2-1)*Math.exp(-i/(sampleRate*.005));
      clickNoiseContext=audioContext;
    }
    const start=audioContext.currentTime, source=audioContext.createBufferSource(), filter=audioContext.createBiquadFilter(), gain=audioContext.createGain();
    source.buffer=clickNoiseBuffer; filter.type='bandpass'; filter.frequency.setValueAtTime(1450,start); filter.Q.setValueAtTime(.7,start);
    gain.gain.setValueAtTime(.0001,start); gain.gain.exponentialRampToValueAtTime(.016,start+.001); gain.gain.exponentialRampToValueAtTime(.0001,start+.022);
    source.connect(filter); filter.connect(gain); gain.connect(audioContext.destination); source.start(start); source.stop(start+.024);
  } catch(error) { /* Audio is optional and should never interrupt a run. */ }
}
function playArcadeHit(grade='good'){
  if(!soundsEnabled||!audioContext)return;
  const level=Math.min(7,Math.floor(score/8));
  const root=700+level*24, confirmation=root*(grade==='perfect'?1.5:1.25);
  playArcadeClick();
  playArcadeTone(root,root*1.12,.105,.018,'sine',.018);
  playArcadeTone(confirmation,confirmation,.075,.105,'sine',grade==='perfect'?.016:.013);
}
function playStageUp(index){
  if(!soundsEnabled||!audioContext)return;
  const root=196+Math.min(index,7)*16, notes=[root,root*1.25,root*1.5,root*1.75];
  const count=Math.min(3+Math.floor(index/3),4);
  notes.slice(0,count).forEach((note,i)=>playArcadeTone(note,note,.12,i*.085,'triangle',.022));
}
function showScoreImpact(points,grade='good'){
  const toast=$('score-toast');
  toast.textContent=activeMode==='timing'&&grade==='perfect'?`PERFECT ×${timingMultiplier}  +${points}`:`${activeMode==='timing'?'GOOD':'CORRECT'}  +${points}`;
  toast.classList.add('graded'); toast.hidden=false; toast.classList.remove('pop'); void toast.offsetWidth; toast.classList.add('pop');
  clearTimeout(scoreToastTimer); scoreToastTimer=setTimeout(()=>{toast.classList.remove('pop');toast.hidden=true;},620);
  playArcadeHit(grade);
}
function playMilestoneCue(previousScore,nextScore){
  const milestones=activeMode==='horizontal'?rushMilestones:evolveMilestones;
  const crossed=milestones.filter(item=>item.score>previousScore&&item.score<=nextScore), reached=crossed[crossed.length-1];
  if(!reached)return;
  playStageUp(milestones.indexOf(reached));
}
function positionTimingWindow(){
  const good=$('timing-good-zone'),perfect=$('timing-perfect-zone'),fraction=timingTargetProgress;
  for(const [element,windowMs] of [[good,timingGoodWindow],[perfect,timingPerfectWindow]]){
    const half=windowMs/duration*100, left=Math.max(0,fraction*100-half), right=Math.min(100,fraction*100+half);
    element.style.left=`${left}%`; element.style.width=`${right-left}%`; element.hidden=false;
  }
  $('timing-cursor').hidden=false;
}
function updateTimingMeter(now){
  if(activeMode!=='timing'||!duration)return;
  const fraction=timingCursorProgress(now);
  $('timing-cursor').style.left=`${fraction*100}%`;
}
function activeRowY(){ return activeMode==='horizontal' ? scrollTop-1.5*horizontalPitch : scrollActive; }
const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-5.5, 5.5, 3.2, -3.2, 0.1, 100);
camera.position.set(7, 5.2, 11); camera.lookAt(0, .65, -.4);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.localClippingEnabled = true;
$('scene').appendChild(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xffffff, 0x74808d, 2));
const light = new THREE.DirectionalLight(0xffffff, 2.5); light.position.set(-3, 8, 7); scene.add(light);
const fill = new THREE.DirectionalLight(0xb8d6ff, 1.2); fill.position.set(6, 2, -5); scene.add(fill);
const mats = {
  black: new THREE.MeshStandardMaterial({ color: 0x101a25, roughness: .85 }),
  cavity: new THREE.MeshStandardMaterial({ color: 0x27333f, roughness: .7 }),
  silver: new THREE.MeshStandardMaterial({ color: 0x7b8ea4, roughness: .48, metalness: .55 }),
  metal: new THREE.MeshBasicMaterial({ color: 0xb3c2c5 }),
  metalSide: new THREE.MeshBasicMaterial({ color: 0x82989f }),
  blue: new THREE.MeshStandardMaterial({ color: 0x008fe3, roughness: .42 }),
  gold: new THREE.MeshStandardMaterial({ color: 0xe0bc69, metalness: .6, roughness: .4 }),
  grip: new THREE.MeshStandardMaterial({ color: 0x25364f, roughness: .65, flatShading: true }),
  hub: new THREE.MeshStandardMaterial({ color: 0xaabbcd, roughness: .65, metalness: .2 }),
  endCap: new THREE.MeshStandardMaterial({ color: 0x425875, roughness: .7, flatShading: true }),
  ledOff: new THREE.MeshBasicMaterial({ color: 0x263e49 }),
  ledGreen: new THREE.MeshBasicMaterial({ color: 0x51d69a }),
  ledRed: new THREE.MeshBasicMaterial({ color: 0xd96560 }),
  glowGreen: new THREE.MeshBasicMaterial({ color: 0x51d69a, transparent: true, opacity: .16, depthWrite: false }),
  glowRed: new THREE.MeshBasicMaterial({ color: 0xd96560, transparent: true, opacity: .16, depthWrite: false })
};

// Printed satin shading and fine inlaid lines are part of the material, not raised geometry.
mats.hub.onBeforeCompile = (shader) => {
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\nvarying vec3 vHubPosition;\nvarying vec3 vHubNormal;')
    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvHubPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvHubNormal = normalize(mat3(modelMatrix) * normal);');
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', '#include <common>\nvarying vec3 vHubPosition;\nvarying vec3 vHubNormal;')
    .replace('#include <color_fragment>', `#include <color_fragment>
      float edge = abs(vHubPosition.x) / ${(hubWidth/2).toFixed(1)};
      float satin = smoothstep(0.58, 0.98, edge);
      float inlay = smoothstep(0.75, 0.76, edge) * (1.0 - smoothstep(0.77, 0.78, edge));
      float glint = smoothstep(0.87, 0.88, edge) * (1.0 - smoothstep(0.89, 0.90, edge));
      float outsideSide = abs(vHubNormal.x) * smoothstep(${(hubWidth/2-.01).toFixed(3)}, ${(hubWidth/2).toFixed(3)}, abs(vHubPosition.x));
      float topCap = max(vHubNormal.y, 0.0) * step(${(scrollTop+.129).toFixed(3)}, vHubPosition.y);
      diffuseColor.rgb *= (1.0 - 0.14 * satin - 0.10 * inlay + 0.05 * glint) * (1.0 - 0.10 * outsideSide + 0.08 * topCap);
    `);
};
function box(w, h, d, mat, x=0, y=0, z=0, parent=scene) { const mesh = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), mat); mesh.position.set(x,y,z); parent.add(mesh); return mesh; }
// Rounded, extruded geometry gives the plug real depth instead of a flat icon.
function rounded(w,h,d,r,mat,parent,x=0,y=0,z=0) {
  const s=new THREE.Shape(); const a=-w/2,b=-h/2;
  s.moveTo(a+r,b); s.lineTo(a+w-r,b); s.quadraticCurveTo(a+w,b,a+w,b+r); s.lineTo(a+w,b+h-r); s.quadraticCurveTo(a+w,b+h,a+w-r,b+h); s.lineTo(a+r,b+h); s.quadraticCurveTo(a,b+h,a,b+h-r); s.lineTo(a,b+r); s.quadraticCurveTo(a,b,a+r,b);
  const geometry=new THREE.ExtrudeGeometry(s,{depth:d,bevelEnabled:true,bevelThickness:.025,bevelSize:.025,bevelSegments:2,curveSegments:4}); geometry.translate(0,0,-d/2);
  const mesh=new THREE.Mesh(geometry,mat); mesh.position.set(x,y,z); parent.add(mesh); return mesh;
}
// Four separate pieces leave a genuine opening rather than painting a rectangle on a solid face.
function cutFront(w,h,depth,mat,parent,holeW=1.22,holeH=.40) {
  const side=(w-holeW)/2, rim=(h-holeH)/2;
  box(side,h,depth,mat,-(holeW+side)/2,0,-depth/2,parent); box(side,h,depth,mat,(holeW+side)/2,0,-depth/2,parent);
  box(holeW,rim,depth,mat,0,(holeH+rim)/2,-depth/2,parent); box(holeW,rim,depth,mat,0,-(holeH+rim)/2,-depth/2,parent);
}
function makePort(parent) {
  const group = new THREE.Group(); parent.add(group);
  box(1.19,.37,.02,mats.black,0,0,-.39,group);
  box(1.18,.035,.37,mats.cavity,0,.19,-.20,group); box(1.18,.035,.37,mats.cavity,0,-.19,-.20,group);
  box(.035,.37,.37,mats.cavity,-.59,0,-.20,group); box(.035,.37,.37,mats.cavity,.59,0,-.20,group);
  box(1.02,.105,.28,mats.blue,0,-.105,-.20,group);
  for(let i=0;i<4;i++) box(.12,.012,.20,mats.gold,-.36+i*.24,-.048,-.18,group);
  return group;
}
function makePlug() {
  const group = new THREE.Group(); scene.add(group);
  // USB-A metal shell: four walls, an open end, blue insert and contact marks.
  box(1.08,.035,.78,mats.metal,0,.16,.39,group); box(1.08,.035,.78,mats.metal,0,-.16,.39,group);
  // Fixed shades retain the shell's shape without reacting to scene lights.
  box(.035,.30,.78,mats.metalSide,-.525,0,.39,group); box(.035,.30,.78,mats.metalSide,.525,0,.39,group);
  box(.96,.10,.69,mats.blue,0,-.095,.40,group);
  for(let i=0;i<4;i++) box(.11,.012,.46,mats.gold,-.34+i*.225,-.037,.30,group);
  // Retention holes indicate the opposite side from the insert.
  for(const x of [-.30,.30]) box(.16,.008,.19,mats.cavity,x,.181,.36,group);
  rounded(1.27,.58,1.72,.13,mats.grip,group,0,0,1.67);
  rounded(.94,.43,.12,.09,mats.endCap,group,0,0,2.59);
  for(let i=0;i<3;i++) box(.78,.035,.035,mats.cavity,0,.305,1.80+i*.11,group);
  // The end cap faces the camera even when the drive rolls or the port is vertical.
  const glow=new THREE.Mesh(new THREE.PlaneGeometry(.23,.14),mats.glowGreen);
  glow.position.set(0,0,2.681); glow.visible=false; group.add(glow);
  const led=new THREE.Mesh(new THREE.PlaneGeometry(.15,.08),mats.ledOff);
  led.position.set(0,0,2.684); group.add(led);
  group.userData.led=led; group.userData.glow=glow;
  return group;
}
function disposeObject(obj) {
  if(!obj)return;
  obj.removeFromParent();
  obj.traverse(child=>{ if(child.geometry) child.geometry.dispose(); });
}
function clearScene() {
  if(scrollRig) disposeObject(scrollRig);
  if(plugGroup && plugGroup.parent===scene) disposeObject(plugGroup);
  scrollMaterials.forEach(material=>material.dispose()); scrollMaterials=new Map();
  scrollRig=null; scrollRows=[]; scrollFill=null; roundRig=null; plugGroup=null; nextHorizontal=null;
}
function initScroll() {
  scrollRig=new THREE.Group(); scene.add(scrollRig);
  const length=1000, backDepth=.46, backFront=-.41;
  box(hubWidth,length,backDepth,mats.silver,0,scrollTop-length/2,backFront-backDepth/2,scrollRig);
  scrollFill=box(hubWidth,1,.4,mats.hub,0,0,-.2,scrollRig);
  // Continue the front and backing materials across the aligned top cap.
  box(hubWidth,.13,-backFront,mats.hub,0,scrollTop+.065,backFront/2,scrollRig);
  box(hubWidth,.13,backDepth,mats.silver,0,scrollTop+.065,backFront-backDepth/2,scrollRig);
}
function clippedMaterial(material) {
  if(!scrollMaterials.has(material)) {
    const copy=material.clone(); copy.onBeforeCompile=material.onBeforeCompile;
    copy.clippingPlanes=[scrollClip]; scrollMaterials.set(material,copy);
  }
  return scrollMaterials.get(material);
}
function makeHorizontalPreview(flip){
  const row=new THREE.Group(); scrollRig.add(row);
  cutFront(hubWidth,horizontalPitch,.4,mats.hub,row);
  const port=makePort(row); port.rotation.z=flip ? Math.PI : 0;
  row.traverse(child=>{ if(child.isMesh) child.material=clippedMaterial(child.material); });
  return {row,flip};
}
function rebuild() {
  roundRig=new THREE.Group(); scrollRig.add(roundRig);
  plugGroup = makePlug();
  roundRig.add(plugGroup);
  const housing = new THREE.Group(); roundRig.add(housing);
  const rowHeight=activeMode==='horizontal' ? horizontalPitch : hubHeight;
  const cellWidth=hubWidth/layout.cols, cellHeight=rowHeight/layout.rows;
  for(const socket of layout.sockets) {
    const cell=new THREE.Group(); housing.add(cell);
    cell.position.set(socket.x,socket.y,0);
    cutFront(cellWidth,cellHeight,.4,mats.hub,cell,socket.vertical ? .40 : 1.22,socket.vertical ? 1.22 : .40);
    const port=makePort(cell); port.rotation.z=socket.axis+(socket.flip ? Math.PI : 0);
  }
  targetRoll=layout.sockets[layout.target].axis+(plugFlip ? Math.PI : 0);
  const target=layout.sockets[layout.target];
  plugGroup.position.set(target.x,target.y,plugStartZ); plugGroup.rotation.z=targetRoll;
  roundRig.userData.drive=plugGroup;
  // A flush panel fills the extra spacing between rows without changing the ports or drives.
  roundRig.userData.spacer=box(hubWidth,1,.4,mats.hub,0,0,-.2,roundRig);
  roundRig.userData.spacer.visible=false;
  // Only the scrolling hub needs the top cut: clipping the drive cuts its corners
  // when an upper socket's drive turns. New drives stay hidden during the scroll.
  housing.traverse(child=>{ if(child.isMesh) child.material=clippedMaterial(child.material); });
  roundRig.userData.spacer.material=clippedMaterial(roundRig.userData.spacer.material);
  resize();
}
function resize() {
  const w=$('scene').clientWidth, h=$('scene').clientHeight; if(!w||!h)return;
  // Follow a resolution change when the window moves between monitors or a phone rotates.
  const ratio=Math.min(window.devicePixelRatio||1,2);
  if(ratio!==renderer.getPixelRatio()) renderer.setPixelRatio(ratio);
  if(w!==rendererWidth || h!==rendererHeight){ renderer.setSize(w,h,false); rendererWidth=w; rendererHeight=h; }
  const aspect=w/h;
  scene.updateMatrixWorld(true); camera.updateMatrixWorld();
  // Keep the original camera frame fixed so lowering the hub actually moves it down on screen.
  const frameTop=2.1;
  const bounds=new THREE.Box3(new THREE.Vector3(-hubWidth/2,frameTop-hubHeight,-.62),new THREE.Vector3(hubWidth/2,frameTop,4.8));
  if(bounds.isEmpty()){ camera.left=-5.6; camera.right=5.6; camera.top=3.9; camera.bottom=-3.9; }
  else {
    let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
    for(const x of [bounds.min.x,bounds.max.x]) for(const y of [bounds.min.y,bounds.max.y]) for(const z of [bounds.min.z,bounds.max.z]){
      const p=new THREE.Vector3(x,y,z).applyMatrix4(camera.matrixWorldInverse); minX=Math.min(minX,p.x); maxX=Math.max(maxX,p.x); minY=Math.min(minY,p.y); maxY=Math.max(maxY,p.y);
    }
    const hubX=new THREE.Vector3(0,0,-.2).applyMatrix4(camera.matrixWorldInverse).x;
    const widthNeeded=Math.max((maxX-hubX+.65)/.9,(hubX-minX+.65)/1.1);
    // A closer orthographic view makes the active drive easier to read without resizing the models.
    const half=Math.max(3.5,(maxY-minY)/2+.9,widthNeeded/aspect)/1.3;
    // Keep paired drives inside narrow screens and lift gameplay into view on wide screens.
    const cx=hubX-.27*half*aspect, cy=maxY+.6-half-1.4*Math.max(0,Math.min(1,(aspect-.85)/.3));
    camera.left=cx-half*aspect; camera.right=cx+half*aspect; camera.top=cy+half; camera.bottom=cy-half;
  }
  camera.updateProjectionMatrix();
  // Place the second-previous row fully below the actual viewport before the new drive appears.
  let rowTop=-Infinity;
  for(const x of [-hubWidth/2,hubWidth/2]) for(const y of [scrollActive-hubHeight/2,scrollActive+hubHeight/2]) for(const z of [-.62,2.5]) {
    rowTop=Math.max(rowTop,new THREE.Vector3(x,y,z).applyMatrix4(camera.matrixWorldInverse).y);
  }
  const yScale=Math.abs(new THREE.Vector3(0,1,0).transformDirection(camera.matrixWorldInverse).y);
  scrollSpacing=activeMode==='horizontal' ? horizontalPitch : Math.max(hubHeight,(rowTop-camera.bottom+.3)/(2*Math.max(.2,yScale)));
  for(const row of new Set([...scrollRows,roundRig].filter(Boolean))){
    const gap=scrollSpacing-(activeMode==='horizontal' ? horizontalPitch : hubHeight), spacer=row.userData.spacer;
    if(spacer){ spacer.visible=gap>0; spacer.scale.y=gap; spacer.position.y=-(hubHeight+gap)/2; }
  }
  if(scrollRows.length){
    const t=phase==='scroll' && transitionDuration ? Math.min(1,Math.max(0,(performance.now()-transitionStarted)/transitionDuration)) : 0;
    updateScroll(phase==='scroll' ? scrollSpacing*t*t*(3-2*t) : 0);
  }
}
new ResizeObserver(resize).observe($('scene')); resize();
function updateUI(){ $('score').textContent=String(score).padStart(2,'0'); }
function showFeedback(correct){
  const chip=document.querySelector('.score-chip');
  clearTimeout(feedbackTimer);
  chip.classList.remove('scored');
  void chip.offsetWidth;
  if(correct) chip.classList.add('scored');
  else $('game-shell').classList.add('result-failure');
  plugGroup.userData.led.material=correct ? mats.ledGreen : mats.ledRed;
  plugGroup.userData.glow.material=correct ? mats.glowGreen : mats.glowRed;
  plugGroup.userData.glow.visible=true;
  plugGroup.userData.feedback={correct,started:performance.now(),baseX:plugGroup.position.x};
  updateDriveFeedback(plugGroup,performance.now());
  $('result').textContent=activeMode==='timing' ? (correct ? `${timingGrade.toUpperCase()} insertion` : timingGrade==='miss' ? 'Missed the timing window' : timingGrade==='flip-timeout' ? 'Too late to flip' : timingGrade==='timeout' ? 'Time ran out' : 'Wrong USB orientation') : correct ? 'Correct' : 'Incorrect';
  feedbackTimer=setTimeout(()=>chip.classList.remove('scored'),700);
}
function updateDriveFeedback(drive,now){
  const feedback=drive.userData.feedback; if(!feedback)return;
  const elapsed=now-feedback.started, reduced=reducedMotionQuery.matches;
  if(!feedback.correct && !reduced && elapsed<450) drive.position.x=feedback.baseX+Math.sin(elapsed*.075)*.045*(1-elapsed/450);
  else drive.position.x=feedback.baseX;
  if(elapsed>=450) delete drive.userData.feedback;
}
function updateTimer(remaining,total=duration){
  const fraction=Math.max(0,Math.min(1,remaining/total));
  const bar=$('progress-bar'); bar.style.transform=`scaleX(${fraction})`;
  bar.classList.toggle('warning',fraction<=.5 && fraction>.25); bar.classList.toggle('critical',fraction<=.25);
  const value=(remaining/1000).toFixed(1), text=$('timer-text'), label=`${value} seconds`;
  // The text changes ten times a second, not sixty, so avoid a DOM write every frame.
  if(text.textContent!==label) text.textContent=label;
}
function startTimingFlipPhase(now=performance.now()){
  timingStep='flip'; timingLimit=Math.max(700,1155-score*12); deadline=now+timingLimit;
  $('timer').setAttribute('aria-label','Time remaining to flip'); $('timer-label').textContent='Flip before';
  $('timing-good-zone').hidden=true; $('timing-perfect-zone').hidden=true; $('timing-cursor').hidden=true;
  updateTimer(timingLimit,timingLimit);
  clearTimeout(timingRoundTimer); timingRoundTimer=setTimeout(()=>expireTimingPhase('flip'),timingLimit);
  clearTimeout(autoTimer); autoTimer=null;
}
function startTimingInsertPhase(now=performance.now()){
  if(!playing||activeMode!=='timing'||phase!=='aim')return;
  clearTimeout(timingRoundTimer); timingRoundTimer=null; clearTimeout(autoTimer); autoTimer=null;
  timingStep='insert'; duration=Math.max(900,1750-score*15); timingStarted=now;
  const windows=timingWindows(score,duration); timingPerfectWindow=windows.perfect; timingGoodWindow=windows.good;
  const edge=Math.min(.18,timingGoodWindow/duration+.025), targetProgress=edge+Math.random()*(1-2*edge);
  timingTargetProgress=targetProgress; timingLimit=duration*3; deadline=now+timingLimit;
  $('timer').setAttribute('aria-label','Time remaining to insert'); $('timer-label').textContent='Insert before';
  updateTimer(timingLimit,timingLimit); positionTimingWindow();
  timingRoundTimer=setTimeout(()=>expireTimingPhase('insert'),timingLimit);
  clearTimeout(autoTimer); autoTimer=null;
}
function endRun(failureReason){
  playing=false; phase='over'; clearTimeout(timingRoundTimer); timingRoundTimer=null;
  saveScore(score);
  pendingFailureReason=failureReason;
  nextTimerDue=performance.now()+850;
  nextTimer=setTimeout(runNextStep,850);
}
function runNextStep(){ if(playing) beginNextRound(); else showGameOver(); }
function showGameOver(){
  $('pause-notice').hidden=true;
  $('final-score').textContent=score; $('game-over-title').textContent='Game over';
  $('failure-reason').textContent=pendingFailureReason; $('start-btn').textContent='Play again';
  $('taunt-panel').hidden=!(messagesEnabled && score>=1); $('taunt-score').textContent=String(score);
  $('taunt-input').value=''; $('taunt-input').removeAttribute('aria-invalid'); $('taunt-compose').hidden=false;
  $('result-actions').hidden=false;
  $('taunt-status').textContent=tauntStorageAvailable?'':'Messages cannot be saved in this browser.';
  scoreSharing.show(score,activeMode);
  $('settings-menu').open=false; $('settings-menu').hidden=true;
  $('info-menu').open=false; $('info-menu').hidden=true;
  menuModesOpen=false; $('play-btn').hidden=true;
  $('overlay-title').hidden=true; $('overlay-description').hidden=false; $('how-to-play').hidden=true; $('mode-field').hidden=true; $('player-field').hidden=true; $('start-btn').hidden=false; $('leaderboard-toggle').hidden=true; $('leaderboard-modes').hidden=true; $('change-player').hidden=false; $('leaderboard').hidden=false; $('game-shell').classList.add('menu-open'); $('start-overlay').classList.remove('hidden'); updateUI();
}
function expireTimingPhase(step){
  timingRoundTimer=null;
  if(!playing||phase!=='aim'||activeMode!=='timing'||timingStep!==step)return;
  clearTimeout(autoTimer); autoTimer=null; timingPerfectStreak=0;
  timingGrade=step==='flip'?'flip-timeout':'timeout'; showFeedback(false); updateUI();
  endRun(step==='flip'?'Too late to flip. Run it back.':'Time ran out. Run it back.');
}
function timingAction(now=performance.now()){
  if(!playing||activeMode!=='timing'||phase!=='aim')return;
  if(now>=deadline){expireTimingPhase(timingStep);return;}
  if(timingStep==='flip'){
    clearTimeout(timingRoundTimer); timingRoundTimer=null; clearTimeout(autoTimer); autoTimer=null;
    flip(); startTimingInsertPhase(now);
  } else insert(now);
}
function handleStagePress(now=performance.now()){
  if(activeMode==='timing'){timingAction(now);return;}
  flip();
}
function startCountdown(now=performance.now()){
  phase='aim'; $('game-shell').classList.remove('transitioning');
  if(activeMode==='timing'){startTimingFlipPhase(now);return;}
  const willSwitch=activeMode!=='horizontal' && score>=48 && layout.sockets.length>1 && Math.random()<(score>=72 ? .6 : .35);
  // Keep the original reaction window for switch rounds without slowing ordinary rounds.
  if(willSwitch) duration=Math.max(1100,duration+500);
  deadline=now+duration; updateTimer(duration);
  clearTimeout(switchTimer); switchTimer=null;
  if(willSwitch) switchTimer=setTimeout(switchTarget,duration*.2);
  autoTimer=setTimeout(insert,duration);
}
function entranceStartZ(){
  camera.updateMatrixWorld();
  const c=Math.cos(targetRoll),s=Math.sin(targetRoll); let right=-Infinity;
  for(const x of [-.7,.7]) for(const y of [-.35,.35]) for(const z of [0,2.75]) {
    const point=new THREE.Vector3(plugGroup.position.x+c*x-s*y,activeRowY()+plugGroup.position.y+s*x+c*y,plugStartZ+z).applyMatrix4(camera.matrixWorldInverse);
    right=Math.max(right,point.x);
  }
  const viewZ=new THREE.Vector3(0,0,1).transformDirection(camera.matrixWorldInverse).x;
  return plugStartZ+Math.max(5,(right-camera.left+.3)/Math.max(.01,-viewZ));
}
function updateScroll(shift=0){
  const activeY=activeRowY(), rowHeight=activeMode==='horizontal' ? horizontalPitch : hubHeight;
  scrollRows.forEach((row,i)=>{ row.position.y=activeY-i*scrollSpacing-shift; });
  if(phase==='scroll') roundRig.position.y=activeY+scrollSpacing-shift;
  if(nextHorizontal) nextHorizontal.row.position.y=activeY+scrollSpacing*(phase==='scroll' ? 2 : 1)-(phase==='scroll' ? shift : 0);
  const fillTop=scrollRows[scrollRows.length-1].position.y+rowHeight/2-scrollSpacing, fillBottom=-1000;
  scrollFill.scale.y=fillTop-fillBottom; scrollFill.position.y=(fillTop+fillBottom)/2;
}
function retireRows(){
  camera.updateMatrixWorld(); scrollRig.updateMatrixWorld(true);
  while(scrollRows.length>1){
    const row=scrollRows[scrollRows.length-1], bounds=new THREE.Box3().setFromObject(row); let top=-Infinity;
    for(const x of [bounds.min.x,bounds.max.x]) for(const y of [bounds.min.y,bounds.max.y]) for(const z of [bounds.min.z,bounds.max.z]) top=Math.max(top,new THREE.Vector3(x,y,z).project(camera).y);
    if(top>=-1.05) break;
    scrollRows.pop(); disposeObject(row);
  }
}
function makeLayout(){
  if(activeMode==='horizontal'){
    return {kind:'horizontal',cols:1,rows:1,target:0,sockets:[{x:0,y:0,axis:0,vertical:false,flip:portFlip}]};
  }
  // First show each new family deterministically, then mix simpler and harder layouts.
  let kind='single';
  const roll=Math.random();
  if(score===32) kind='mixed';
  else if(score===24) kind='grid';
  else if(score===16) kind='triple';
  else if(score>=32) kind=roll<.35 ? 'mixed' : roll<.65 ? 'grid' : roll<.9 ? 'triple' : 'pair';
  else if(score>=24) kind=roll<.45 ? 'grid' : roll<.8 ? 'triple' : 'pair';
  else if(score>=16) kind=roll<.65 ? 'triple' : roll<.9 ? 'pair' : 'single';
  else if(score>=8 && (score===8 || roll<(score<12 ? .4 : .65))) kind='pair';
  const cols=kind==='mixed' ? 2 : kind==='grid' || (vertical && kind==='triple') ? 3 : vertical && kind==='pair' ? 2 : 1;
  const rows=kind==='mixed' || kind==='grid' ? 2 : !vertical && kind==='triple' ? 3 : !vertical && kind==='pair' ? 2 : 1;
  const target=Math.floor(Math.random()*cols*rows), sockets=[];
  // Mixed cells fit either socket orientation; force both orientations to occur.
  const mixedFirst=Math.random()<.5;
  for(let i=0;i<cols*rows;i++){
    const axis=(kind==='mixed' ? (i%2===0 ? mixedFirst : !mixedFirst) : kind==='grid' ? true : vertical) ? Math.PI/2 : 0;
    const socketVertical=axis===Math.PI/2;
    const flip=i===target ? portFlip : score<12 || Math.random()>=(score<20 ? .7 : .85) ? portFlip : !portFlip;
    sockets.push({x:(i%cols-(cols-1)/2)*hubWidth/cols,y:((rows-1)/2-Math.floor(i/cols))*hubHeight/rows,axis,vertical:socketVertical,flip});
  }
  vertical=sockets[target].vertical;
  return {kind,cols,rows,target,sockets};
}
function newRound(withEntrance=false,now=performance.now()){
  if(!playing)return; clearTimeout(switchTimer); switchTimer=null; targetMove=null; round++;
  // Switching axes becomes more frequent as the player advances.
  portFlip=activeMode==='horizontal' && nextHorizontal ? nextHorizontal.flip : Math.random()<.5;
  let needsFlip=activeMode==='timing' || Math.random()<.5;
  // Avoid long runs of either answer while keeping the port face independent.
  if(activeMode!=='timing' && sameFlipRun>=2) needsFlip=!previousNeedsFlip;
  sameFlipRun=needsFlip===previousNeedsFlip ? sameFlipRun+1 : 1;
  previousNeedsFlip=needsFlip; plugFlip=needsFlip ? !portFlip : portFlip;
  vertical=activeMode!=='horizontal' && score>=4 && (score===4 || (score<8 ? Math.random()<.35 : Math.random()<(score<16 ? .55 : .75) ? !previousVertical : previousVertical));
  layout=makeLayout(); previousVertical=vertical; portFlip=layout.sockets[layout.target].flip;
  // Arcade gives players more time to read its increasingly complex layouts.
  const arcade=activeMode!=='horizontal';
  duration=arcade ? Math.max(700,1155-score*12) : Math.max(350,1100-score*25);
  transitionDuration=arcade ? Math.max(147,560-score*7) : Math.max(140,380-score*6);
  entranceDuration=arcade ? Math.max(84,280-score*3) : Math.max(80,190-score*3);
  insertionDuration=arcade ? Math.max(116,260-score*2) : Math.max(110,200-score*2);
  insertionVisualDuration=insertionDuration-20;
  insertionTurnDuration=insertionVisualDuration*.55;
  successDelay=arcade ? Math.max(42,110-score) : Math.max(40,80-score);
  if(nextHorizontal){ disposeObject(nextHorizontal.row); nextHorizontal=null; }
  rebuild();
  if(activeMode==='horizontal') nextHorizontal=makeHorizontalPreview(Math.random()<.5);
  updateUI();
  if(withEntrance){ phase='scroll'; transitionStarted=now; plugGroup.visible=false; updateScroll(); updateTimer(0); }
  else { scrollRows.unshift(roundRig); updateScroll(); startCountdown(); }
}
function setTargetRoll(){
  const desired=layout.sockets[layout.target].axis+(plugFlip ? Math.PI : 0);
  targetRoll=desired+Math.round((plugGroup.rotation.z-desired)/(2*Math.PI))*2*Math.PI;
}
function switchTarget(){
  switchTimer=null;
  const now=performance.now();
  // Leave at least 700 ms after the 100 ms motion, even if the timer fires late.
  if(!playing || phase!=='aim' || deadline-now<800 || layout.sockets.length<2) return;
  const next=Math.floor(Math.random()*(layout.sockets.length-1));
  layout.target=next>=layout.target ? next+1 : next;
  const socket=layout.sockets[layout.target];
  targetMove={x:plugGroup.position.x,y:plugGroup.position.y,started:now};
  portFlip=socket.flip; vertical=socket.vertical; previousVertical=vertical; setTargetRoll();
}
function updateTargetMove(now,finish=false){
  if(!targetMove)return;
  const t=finish ? 1 : Math.min(1,Math.max(0,(now-targetMove.started)/100));
  const ease=t*t*(3-2*t), socket=layout.sockets[layout.target];
  plugGroup.position.x=t===1 ? socket.x : targetMove.x+(socket.x-targetMove.x)*ease;
  plugGroup.position.y=t===1 ? socket.y : targetMove.y+(socket.y-targetMove.y)*ease;
  if(t===1) targetMove=null;
}
function flip(){
  if(!playing||phase!=='aim')return;
  plugFlip=!plugFlip;
  // Pick the equivalent orientation nearest the visible angle, not a queue of turns.
  setTargetRoll();
}
function insert(now=performance.now()){
  if(!playing||phase!=='aim'||(activeMode==='timing'&&timingStep!=='insert'))return;
  if(activeMode==='timing'&&now>=deadline){expireTimingPhase('insert');return;}
  clearTimeout(autoTimer); autoTimer=null; clearTimeout(timingRoundTimer); timingRoundTimer=null; clearTimeout(switchTimer); switchTimer=null; updateTargetMove(now,true); phase='insert'; updateTimer(0);
  plugGroup.userData.insertionStartRoll=plugGroup.rotation.z; insertionStarted=now;
  timingGrade=activeMode==='timing'?evaluateTiming(now):'good'; timingAward=0; timingMultiplier=0;
  insertionCorrect=plugFlip===portFlip && (activeMode!=='timing' || timingGrade!=='miss');
   updateUI();
  // Complete the physical approach before showing feedback and updating the score.
  resultTimerDue=now+insertionDuration;
  resultTimer=setTimeout(completeInsertion,insertionDuration);
}
function completeInsertion(){
  resultTimer=null;
  const previousScore=score;
  if(insertionCorrect){
    if(activeMode==='timing'){
      if(timingGrade==='perfect'){
        timingPerfectStreak++; timingMultiplier=Math.min(4,1+Math.floor(timingPerfectStreak/3)); timingAward=2*timingMultiplier;
      } else { timingPerfectStreak=0; timingAward=1; }
      score+=timingAward;
    } else { score++; timingAward=1; }
  } else if(activeMode==='timing') timingPerfectStreak=0;
  showFeedback(insertionCorrect); updateUI();
  if(insertionCorrect){ showScoreImpact(timingAward,activeMode==='timing'?timingGrade:'good'); showTauntForScore(previousScore,score); playMilestoneCue(previousScore,score); }
  if(!insertionCorrect){
    endRun(activeMode==='timing'?(timingGrade==='miss'?'Missed the timing window. Run it back.':'Wrong USB orientation. Run it back.'):'The USB was facing the wrong way.');
  } else { nextTimerDue=performance.now()+successDelay; nextTimer=setTimeout(runNextStep,successDelay); }
}
function beginNextRound(){ if(playing){ $('game-shell').classList.add('transitioning'); newRound(true); } }
function start(mode=activeMode){
  const name=$('player-name').value.trim();
  if(!name){ $('player-name-error').hidden=false; $('player-name').setAttribute('aria-invalid','true'); $('player-name').focus(); return; }
  scoreSharing.hide(); activeMode=mode; loadScores(activeMode);
   $('timing-indicator').hidden=activeMode!=='timing';
   $('settings-menu').hidden=true; $('settings-menu').open=false; $('info-menu').hidden=true; $('info-menu').open=false;
  $('timer').setAttribute('role','timer'); $('timer').setAttribute('aria-label',activeMode==='timing'?'Time remaining to flip':'Time remaining'); $('timer-label').textContent=activeMode==='timing'?'Flip before':'Inserting in'; $('timer-text').textContent='Get ready';
   $('timing-good-zone').hidden=true; $('timing-perfect-zone').hidden=true; $('timing-cursor').hidden=true;
   setArcadeSoundButton(); wakeArcadeAudio();
  playerName=name; $('player-name').value=name; try { localStorage.setItem(playerNameKey,name); } catch(error) { /* Score storage reports its own failures. */ }
  $('player-name-error').hidden=true; $('player-name').removeAttribute('aria-invalid');
  clearTimeout(nextTimer); clearTimeout(autoTimer); clearTimeout(timingRoundTimer); clearTimeout(switchTimer); clearTimeout(resultTimer); clearTimeout(feedbackTimer); clearTimeout(scoreToastTimer); timingRoundTimer=null; switchTimer=null; targetMove=null;
  pausedAt=0; pauseTimers={}; landscapePause=false; interruptPause=false; $('pause-notice').hidden=true;
  resumeCountdown=0; clearTimeout(resumeCountdownTimer); resumeCountdownTimer=null;
  $('pause-countdown').hidden=true; $('pause-resume').hidden=false; $('pause-copy').hidden=false; $('pause-title').textContent='Paused';
  document.querySelector('.score-chip').classList.remove('scored'); $('score-toast').hidden=true; $('result').textContent='';
  hideTaunt(); $('taunt-panel').hidden=true;
  clearScene(); initScroll(); previousVertical=false; previousNeedsFlip=null; sameFlipRun=0; insertionCorrect=false; timingStep='flip'; timingLimit=0; timingPerfectStreak=0; timingGrade='good'; timingAward=0; timingMultiplier=0; score=0; round=0; playing=true; phase='idle';
   $('settings-menu').open=false; document.activeElement.blur(); $('game-shell').classList.remove('menu-open','transitioning','result-failure'); $('game-shell').classList.toggle('timing-mode',activeMode==='timing'); $('start-overlay').classList.add('hidden'); newRound();
}
$('start-btn').addEventListener('click',()=>start(activeMode));
$('play-arcade').addEventListener('click',()=>start('arcade'));
$('play-horizontal').addEventListener('click',()=>start('horizontal'));
$('play-timing').addEventListener('click',()=>start('timing'));
$('sound-toggle').addEventListener('click',()=>{
  soundsEnabled=!soundsEnabled; setArcadeSoundButton();
  if(soundsEnabled)wakeArcadeAudio(); else if(audioContext)audioContext.suspend().catch(()=>{});
});
$('taunt-toggle').addEventListener('click',()=>setMessagesEnabled(!messagesEnabled));
function submitTaunt(){
  const input=$('taunt-input'), status=$('taunt-status'), record=saveTaunt(score,input.value,playerName,activeMode);
  if(!record){ status.textContent='Write a short message first.'; input.setAttribute('aria-invalid','true'); input.focus({preventScroll:true}); return; }
  input.removeAttribute('aria-invalid'); $('taunt-compose').hidden=true;
  status.textContent=tauntStorageAvailable
    ? `Posted. Players who reach ${record.score} points in ${modeLabel(activeMode)} will see it.`
    : `Players who reach ${record.score} points in ${modeLabel(activeMode)} will see it for now; this browser cannot save messages.`;
}
$('taunt-submit').addEventListener('click',submitTaunt);
$('taunt-input').addEventListener('keydown',e=>{ if(e.key==='Enter' && !e.isComposing){ e.preventDefault(); submitTaunt(); } });
$('player-name').addEventListener('keydown',e=>{ if(e.key==='Enter' && !e.isComposing){ e.preventDefault(); $('play-btn').focus(); } });
$('change-player').addEventListener('click',()=>{
  scoreSharing.hide();
    $('game-shell').classList.remove('timing-mode'); $('timing-indicator').hidden=true; $('timing-good-zone').hidden=true; $('timing-perfect-zone').hidden=true; $('timing-cursor').hidden=true; $('timer').setAttribute('role','timer'); $('timer').setAttribute('aria-label','Time remaining'); $('timer-label').textContent='Inserting in'; $('start-btn').textContent='Play again';
  $('overlay-title').hidden=false; $('overlay-description').hidden=true; $('how-to-play').hidden=false; $('player-field').hidden=false;
  $('settings-menu').hidden=false; $('settings-menu').open=false; $('info-menu').hidden=false; $('info-menu').open=false; $('start-btn').hidden=true; $('change-player').hidden=true; $('result-actions').hidden=true; $('leaderboard-toggle').hidden=false; $('leaderboard').hidden=true; $('play-btn').hidden=false;
  $('taunt-panel').hidden=true; $('taunt-status').textContent=''; $('taunt-input').value=''; $('taunt-compose').hidden=false;
  showModeChoices(false);
  latestRun=null; renderLeaderboard(); $('player-name').focus();
});
$('stage').addEventListener('pointerdown',e=>{ if(e.isPrimary && e.button===0){e.preventDefault();handleStagePress();} });
window.addEventListener('keydown',e=>{
  if(e.repeat || pausedAt || portraitOnly())return;
  const buttonTarget=e.target?.tagName==='BUTTON';
   if((e.code==='Space'||e.key===' ') && playing && !buttonTarget){e.preventDefault();if(activeMode==='timing')timingAction();else flip();}
});

// Touch devices play in portrait: a landscape phone or tablet shows a rotate panel and
// the run waits instead of burning a countdown the player cannot see. A web page cannot
// change the operating system orientation lock, so this panel is the enforceable equivalent.
const portraitGate=matchMedia('(orientation: landscape)'), coarsePointer=matchMedia('(pointer: coarse)');
function portraitOnly(){
  const landscape=window.innerWidth>window.innerHeight, touch=coarsePointer.matches || navigator.maxTouchPoints>0;
  return landscape && touch && (window.innerHeight<=600 || coarsePointer.matches);
}
// A phone call, notification, app switch, lock screen or another window must not burn the
// run. An interruption freezes every deadline, queued step and phase clock, and the run
// stays on the Paused panel until the player taps Continue with the time that was left.
// The portrait gate resumes by itself, because turning the device is the player's action.
let pausedAt=0, pauseTimingStep='flip';
let pauseTimers={}, landscapePause=false, interruptPause=false;
let resumeCountdown=0, resumeCountdownTimer=null;
function updatePauseUI(){
  const show=!!pausedAt && !portraitOnly();
  $('pause-notice').hidden=!show;
  if(show) $('pause-resume').focus({preventScroll:true});
}
function pauseRun(reason){
  if(pausedAt){
    if(reason==='landscape') landscapePause=true; else interruptPause=true;
    // A second interruption during the resume countdown goes back to the paused panel.
    if(resumeCountdown) cancelResumeCountdown();
    return;
  }
  if(!playing || phase==='over') return;
  const now=performance.now();
  pausedAt=now; pauseTimingStep=timingStep;
  // Capture what each queued step had left, then clear it so nothing can fire while away.
  pauseTimers={
    auto: autoTimer ? Math.max(0,deadline-now) : null,
    timing: timingRoundTimer ? Math.max(0,deadline-now) : null,
    shift: switchTimer ? Math.max(0,deadline-duration*.8-now) : null,
    result: resultTimer ? Math.max(0,resultTimerDue-now) : null,
    next: nextTimer ? Math.max(0,nextTimerDue-now) : null
  };
  clearTimeout(autoTimer); autoTimer=null;
  clearTimeout(timingRoundTimer); timingRoundTimer=null;
  clearTimeout(switchTimer); switchTimer=null;
  clearTimeout(resultTimer); resultTimer=null;
  clearTimeout(nextTimer); nextTimer=null;
  if(reason==='landscape') landscapePause=true; else interruptPause=true;
  updatePauseUI();
}
function resumeRun(){
  if(!pausedAt) return;
  const now=performance.now(), elapsed=now-pausedAt, pending=pauseTimers;
  pausedAt=0; pauseTimers={}; landscapePause=false; interruptPause=false;
  $('pause-notice').hidden=true;
  if(!playing) return;
  // Shift every clock forward by the pause so the phases continue where they stopped.
  deadline+=elapsed; timingStarted+=elapsed; transitionStarted+=elapsed; insertionStarted+=elapsed;
  if(pending.auto!=null) autoTimer=setTimeout(insert,pending.auto);
  if(pending.timing!=null) timingRoundTimer=setTimeout(()=>expireTimingPhase(pauseTimingStep),pending.timing);
  if(pending.shift!=null) switchTimer=setTimeout(switchTarget,pending.shift);
  if(pending.result!=null){ resultTimerDue=now+pending.result; resultTimer=setTimeout(completeInsertion,pending.result); }
  if(pending.next!=null){ nextTimerDue=now+pending.next; nextTimer=setTimeout(runNextStep,pending.next); }
  if(phase==='aim') updateTimer(Math.max(0,deadline-now),activeMode==='timing'?timingLimit:duration);
}
function restorePausePanel(){
  $('pause-countdown').hidden=true;
  $('pause-resume').hidden=false;
  $('pause-copy').hidden=false;
  $('pause-title').textContent='Paused';
}
function cancelResumeCountdown(){
  clearTimeout(resumeCountdownTimer); resumeCountdownTimer=null; resumeCountdown=0;
  restorePausePanel();
  if(pausedAt && !portraitOnly()) $('pause-resume').focus({preventScroll:true});
}
function showResumeCountdown(){
  $('pause-countdown').textContent=String(resumeCountdown);
  $('pause-countdown').hidden=false;
  clearTimeout(resumeCountdownTimer);
  resumeCountdownTimer=setTimeout(tickResumeCountdown,800);
}
function tickResumeCountdown(){
  resumeCountdownTimer=null;
  resumeCountdown--;
  if(resumeCountdown>0){ $('pause-countdown').textContent=String(resumeCountdown); $('pause-countdown').hidden=false; resumeCountdownTimer=setTimeout(tickResumeCountdown,800); return; }
  restorePausePanel();
  resumeRun();
  document.activeElement?.blur?.();
}
// Continue counts 3-2-1 before the clocks restart, so the player can pick up the rhythm
// instead of reacting to a countdown that resumes under their finger.
function continueRun(){
  if(!pausedAt || document.hidden || portraitOnly() || resumeCountdown) return;
  if(audioContext && audioContext.state==='suspended') audioContext.resume?.().catch?.(()=>{});
  resumeCountdown=3;
  $('pause-copy').hidden=true; $('pause-resume').hidden=true; $('pause-title').textContent='Get ready';
  showResumeCountdown();
}
function syncPortraitGate(){
  const required=portraitOnly();
  $('rotate-notice').hidden=!required;
  if(required) pauseRun('landscape');
  else {
    landscapePause=false;
    if(pausedAt && !interruptPause && !document.hidden) resumeRun(); else updatePauseUI();
  }
}
$('pause-resume').addEventListener('click',continueRun);
document.addEventListener('visibilitychange',()=>{
  if(document.hidden) pauseRun('hidden'); else updatePauseUI();
});
window.addEventListener('pagehide',()=>pauseRun('pagehide'));
// Backgrounding is not reported by every phone call overlay or system dialog, so losing
// window focus also pauses. The player continues explicitly once the interruption is over.
window.addEventListener('blur',()=>{ if(playing) pauseRun('blur'); });
window.addEventListener('resize',syncPortraitGate);
window.addEventListener('orientationchange',syncPortraitGate);
// Orientation events can arrive before the new viewport size, so also follow the real layout size.
new ResizeObserver(syncPortraitGate).observe(document.documentElement);
syncPortraitGate();

function animate(now){ requestAnimationFrame(animate); if(plugGroup && !pausedAt){
  if(phase==='aim') updateTargetMove(now);
  if(phase==='insert'){
    const elapsed=now-insertionStarted, turn=Math.min(1,Math.max(0,elapsed/insertionTurnDuration));
    plugGroup.rotation.z=THREE.MathUtils.lerp(plugGroup.userData.insertionStartRoll,targetRoll,turn*turn*(3-2*turn));
    const t=Math.min(1,Math.max(0,elapsed/insertionVisualDuration)); const approach=1-Math.pow(1-Math.min(t/.7,1),3); const end=insertionCorrect?-.32:.12; plugGroup.position.z=plugStartZ+(end-plugStartZ)*approach; if(!insertionCorrect && t>.7) plugGroup.position.z+=.32*((t-.7)/.3);
  } else plugGroup.rotation.z+=(targetRoll-plugGroup.rotation.z)*.18;
  }
  for(const row of scrollRows) if(row.userData.drive) updateDriveFeedback(row.userData.drive,now);
  if(playing && !pausedAt && phase==='scroll'){
    const t=transitionDuration ? Math.min(1,Math.max(0,(now-transitionStarted)/transitionDuration)) : 1;
    updateScroll(scrollSpacing*t*t*(3-2*t));
    if(t===1){ phase='enter'; scrollRows.unshift(roundRig); updateScroll(); retireRows(); plugGroup.visible=true; plugGroup.userData.entranceZ=entranceStartZ(); transitionStarted=now; }
  }
  if(playing && !pausedAt && phase==='enter'){
    const t=entranceDuration ? Math.min(1,Math.max(0,(now-transitionStarted)/entranceDuration)) : 1;
    plugGroup.position.z=THREE.MathUtils.lerp(plugGroup.userData.entranceZ,plugStartZ,t*t*(3-2*t));
    if(t===1) startCountdown(now);
  }
  if(playing && !pausedAt && phase==='aim'){
     if(activeMode==='timing'){if(timingStep==='insert')updateTimingMeter(now);updateTimer(Math.max(0,deadline-now),timingLimit);if(now>=deadline)expireTimingPhase(timingStep);}
    else updateTimer(Math.min(duration,Math.max(0,deadline-now)));
  }
  // The start overlay and the rotate panel are opaque, so drawing behind them only spends battery.
  if(!document.hidden && !pausedAt && $('start-overlay').classList.contains('hidden') && $('rotate-notice').hidden && $('pause-notice').hidden) renderer.render(scene,camera);
}
updateUI(); requestAnimationFrame(animate);
