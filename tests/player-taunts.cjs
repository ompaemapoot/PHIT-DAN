// Guard score-tied player messages: composer at game over, one plain theme-coloured
// message in the empty left column during play, and a Settings switch.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'style.css'),'utf8');
const source=fs.readFileSync(path.join(root,'game.js'),'utf8');

assert.match(html,/class="hud-taunt" id="hud-taunt" aria-live="polite" hidden/,'the message lane should be a live region');
assert.equal((html.match(/id="hud-taunt"/g)||[]).length,1,'only one message lane exists');

const panel=html.match(/<section class="taunt-panel"[\s\S]*?<\/section>/);
assert(panel,'the game-over screen should offer a place to leave a message');
assert.match(panel[0],/id="taunt-input"[^>]*maxlength="60"/,'messages must be length limited');
assert.match(panel[0],/id="taunt-submit"/);
assert.match(panel[0],/id="taunt-score"/,'the panel should name the score that unlocks the message');
assert.match(html,/id="taunt-panel"[\s\S]*?hidden/,'the panel stays hidden until a run ends');
assert.match(html,/<details class="settings-menu" id="settings-menu">[\s\S]*id="taunt-toggle"[\s\S]*<\/details>/,
  'the Settings menu should own the player-message switch');

const laneRule=css.match(/\.hud-taunt\{[^}]*\}/)[0];
assert.match(laneRule,/position:fixed/,'the message sits in the playfield, not in the HUD stack');
assert.match(laneRule,/top:21vh/,'the message sits below the score in the empty left column');
assert.match(laneRule,/left:max\(22px/,'the message hugs the left edge');
assert.doesNotMatch(laneRule,/background:|border:|box-shadow:/,'the message must be plain text without a card');
assert.match(laneRule,/pointer-events:none/,'the message must not swallow taps');
assert.match(css,/\.hud-taunt-text\{[^}]*var\(--accent-dark\)/,'the message should use a theme colour');
assert.match(css,/\.hud-taunt-author\{[^}]*var\(--muted\)/,'the credit should use the quieter theme colour');
assert.match(css,/\.hud-taunt-item\{[^}]*flex-direction:column/,'the message and its credit stack on separate lines');
assert.match(css,/\.hud-taunt-meta\{[^}]*display:flex/,'the name and score share one credit line');
assert.match(css,/\.hud-taunt-text\{[^}]*display:block/,'the message should own its own line');

assert.match(source,/const tauntsKey='phit-dan-taunts-v1'/);
assert.match(source,/showTauntForScore\(previousScore,score\)/,'a successful insertion should look for a message at the new score');
assert.match(source,/\$\('taunt-panel'\)\.hidden=!\(messagesEnabled && score>=1\)/,'game over should invite a message only when messages are on and a point was scored');
assert.match(source,/\$\('taunt-toggle'\)\.addEventListener\('click',\(\)=>setMessagesEnabled\(!messagesEnabled\)\)/);
assert.match(source,/hideTaunt\(\); \$\('taunt-panel'\)\.hidden=true;/,'a new run should clear the message');
assert.doesNotMatch(source,/CanvasTexture|drawTauntSurface|createTauntSurface/,'messages should be plain text, not a 3D texture');
assert.match(source,/tauntLane=\[record\]/,'only one message should be shown at a time');
assert.match(source,/tauntTimer=setTimeout\(hideTaunt,7000\)/,'the message should clear itself after a few seconds');

const block=source.slice(source.indexOf('// Player messages:'),source.indexOf('// Player messages end.'));
assert(block.length>0,'the player-message logic should be extractable for checks');

function element(){
  return {hidden:true,textContent:'',className:'',attrs:{},children:[],
    setAttribute(name,value){this.attrs[name]=value;},
    replaceChildren(...nodes){this.children=nodes;},
    append(...nodes){this.children.push(...nodes);},
    addEventListener(){}};
}
const store={};
const elements={};
for(const id of ['hud-taunt','taunt-panel','taunt-toggle']) elements[id]=element();
const makeContext=local=>vm.createContext({
  localStorage:{getItem:key=>key in local?local[key]:null,setItem:(key,value)=>{local[key]=String(value);}},
  document:{getElementById:id=>elements[id],createElement:()=>element()},
  $:id=>elements[id],
  activeMode:'arcade', playerName:'Mind', playing:true,
  setTimeout(){return 1;}, clearTimeout(){}, console
});
const ctx=makeContext(store);
vm.runInContext(block,ctx);
vm.runInContext('loadMessagesSetting(); loadTaunts(); setMessagesButton();',ctx);
assert.equal(vm.runInContext('messagesEnabled',ctx),true,'messages start on');
assert.equal(elements['taunt-toggle'].textContent,'Player messages on');
assert.equal(elements['taunt-toggle'].attrs['aria-pressed'],'true');

const taunt='พวกกากได้แค่นี้เองหรอ';
const record=ctx.saveTaunt(100,`  ${taunt}  `,'Mind','arcade');
assert.equal(record.score,100);
assert.equal(record.text,taunt,'the saved message should be trimmed');
assert.equal(record.author,'Mind');
assert.equal(JSON.parse(store['phit-dan-taunts-v1']).length,1);

assert.equal(ctx.tauntForScore(99,100,'arcade').text,taunt,'crossing the score should surface the message');
assert.equal(ctx.tauntForScore(100,101,'arcade'),null,'a message shows on the score that unlocked it');
assert.equal(ctx.tauntForScore(99,100,'horizontal'),null,'messages stay inside their mode');

assert.equal(ctx.saveTaunt(100,` ${taunt} `,'Mind','arcade').text,taunt,'an identical message should not be stored twice');
assert.equal(JSON.parse(store['phit-dan-taunts-v1']).length,1);

ctx.saveTaunt(104,'nice','Bee','timing');
assert.equal(ctx.tauntForScore(100,108,'timing').score,104,'a Beat bonus jump may cross a message score');
assert.equal(ctx.tauntForScore(108,116,'timing'),null);

assert.equal(ctx.saveTaunt(0,'free points'),null,'a zero-score message would never display');
assert.equal(ctx.saveTaunt(5,'   '),null,'an empty message should be rejected');
assert.equal(ctx.saveTaunt(5.5,'fraction'),null);
assert.equal(ctx.saveTaunt(7,'x'.repeat(80)).text.length,60,'long messages should be clipped');

ctx.showTauntForScore(99,100);
const lane=elements['hud-taunt'];
assert.equal(lane.hidden,false,'the message becomes visible at the score');
assert.equal(lane.children.length,1,'only one message is shown at a time');
assert.equal(lane.children[0].className,'hud-taunt-item');
assert.equal(lane.children[0].children[0].textContent,taunt);
const meta=lane.children[0].children[1];
assert.equal(meta.className,'hud-taunt-meta','the credit sits in its own row');
assert.equal(meta.children.length,2,'the name and score are separate fields');
assert.equal(meta.children[0].className,'hud-taunt-author');
assert.equal(meta.children[0].textContent,'Mind','the credit names the author');
assert.equal(meta.children[1].className,'hud-taunt-score');
assert.equal(meta.children[1].textContent,'100 pts','the credit shows the score separately');
ctx.showTauntForScore(100,101);
assert.equal(lane.children.length,1,'a score without messages keeps the current one');
ctx.hideTaunt();
assert.equal(lane.hidden,true,'the message clears between runs');
assert.equal(lane.children.length,0);
ctx.showTauntForScore(99,100);
assert.equal(lane.children[0].children[0].textContent,taunt);
vm.runInContext('playing=false',ctx);
ctx.hideTaunt();
ctx.showTauntForScore(99,100);
assert.equal(lane.hidden,true,'no message outside a live run');

vm.runInContext('setMessagesEnabled(false)',ctx);
assert.equal(store['phit-dan-messages-enabled'],'off','the choice should be remembered');
assert.equal(elements['taunt-toggle'].textContent,'Player messages off');
assert.equal(elements['taunt-toggle'].attrs['aria-pressed'],'false');
assert.equal(ctx.tauntForScore(99,100,'arcade'),null,'turning messages off should stop them appearing');
assert.equal(elements['taunt-panel'].hidden,true);
vm.runInContext('setMessagesEnabled(true)',ctx);
assert.equal(ctx.tauntForScore(99,100,'arcade').text,taunt);

const reloadStore={...store,'phit-dan-messages-enabled':'off'};
for(const id of ['hud-taunt','taunt-panel','taunt-toggle']){const fresh=element();Object.assign(elements[id],fresh);}
const reloadCtx=makeContext(reloadStore);
vm.runInContext(block,reloadCtx);
vm.runInContext('loadMessagesSetting(); loadTaunts(); setMessagesButton();',reloadCtx);
assert.equal(vm.runInContext('messagesEnabled',reloadCtx),false,'the switch should survive a reload');
assert.equal(vm.runInContext('playerTaunts.length',reloadCtx),3,'saved messages should reload');
assert.equal(reloadCtx.tauntForScore(99,100,'arcade'),null,'a disabled page shows nothing');

console.log('Score-tied player message checks passed.');
