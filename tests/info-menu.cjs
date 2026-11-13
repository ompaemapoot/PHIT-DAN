// Guard the Info menu below Settings: it holds only the owner's links page and
// the feedback row, which stays inert until a form URL is set.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'style.css'),'utf8');
const source=fs.readFileSync(path.join(root,'game.js'),'utf8');

// The disclosure must follow Settings in the same stacked menu and reuse its row style.
const settingsEnd=html.indexOf('id="settings-menu"');
const infoStart=html.indexOf('id="info-menu"');
assert.ok(settingsEnd>=0 && infoStart>infoStart-1 && infoStart>settingsEnd,'Info should render after Settings in the menu');
assert.match(html,/<details class="settings-menu" id="info-menu">\s*<summary>Info<\/summary>[\s\S]*id="info-linktree"[\s\S]*id="info-github"[\s\S]*id="info-feedback"[\s\S]*id="info-back"[\s\S]*<\/details>/,
  'Info should hold the bio link, the feedback row and Back in its own view');
assert.match(html,/<a class="sound-toggle info-action info-action-pending" id="info-linktree" aria-disabled="true">Link coming soon<\/a>/,
  'the links row should start inactive');
assert.match(html,/<h2>My links<\/h2>/,'the links card should be labelled My links, the plain name readers expect');
assert.match(html,/<a class="sound-toggle info-action info-action-pending" id="info-feedback" aria-disabled="true">/,
  'the feedback row should start inactive until its form URL is configured');
assert.ok(!/info-share|contact-owner|Your data|Support the game/.test(html),
  'the replaced share, contact and data blocks should not return');
assert.match(html,/<a class="sound-toggle info-action info-action-pending" id="info-github" aria-disabled="true">GitHub link coming soon<\/a>/, 'GitHub starts as an inactive placeholder');
assert.match(source,/const infoGithubUrl='';/, 'the repository URL starts empty');
assert.equal((html.match(/class="info-block"/g)||[]).length,3,'Info should hold three link sections');
assert.match(html,/<p class="info-footnote"><span id="game-version">v1\.0\.0<\/span> · Made with three\.js \(MIT\) · Your scores stay in this browser<\/p>/,
  'the footnote under Back should carry the version, the three.js credit and the local-data note');
assert.match(source,/const gameVersion='1\.0\.0';/,'the version in the footnote should come from one setting');
assert.match(source,/const infoLinksUrl='';/,'the profile URL starts empty');
assert.match(source,/const infoFeedbackUrl='';/,'the feedback URL starts empty');
assert.match(css,/\.info-footnote\{[^}]*text-align:center/,'the footnote should read as quiet supporting text');
assert.match(css,/\.info-block\{[^}]*border:1px solid var\(--line\)/,'the Info rows should use the menu card style');
assert.match(css,/\.info-action\{[^}]*text-decoration:none/,'a link row should look like a menu row');
assert.match(css,/\.info-action-pending\{[^}]*cursor:default/,'the unconfigured feedback row should read as inactive');

const code=source.slice(source.indexOf('const $ ='),source.indexOf('let playing ='));
function makeContext(text,seed){
  const storage=new Map();
  function element(){
    const classes=new Set();
    return {value:'',textContent:'',hidden:false,open:false,attributes:{},children:[],href:'',classes,
      classList:{add(name){classes.add(name);},remove(name){classes.delete(name);},contains(name){return classes.has(name);}},
      setAttribute(name,value){this.attributes[name]=value;},
      removeAttribute(name){delete this.attributes[name];},
      appendChild(child){this.children.push(child);},
      append(...children){this.children.push(...children);},
      replaceChildren(){this.children=[];},
      addEventListener(type,fn){this[type]=fn;},focus(){},querySelector(){return element();}};
  }
  const elements=new Proxy({},{get:(target,id)=>target[id] ||= element()});
  const context=vm.createContext({document:{documentElement:{dataset:{}},getElementById:id=>elements[id],createElement:element},localStorage:{getItem:key=>storage.get(key) ?? null,setItem:(key,value)=>storage.set(key,value)}});
  if(seed) seed(elements);
  vm.runInContext(text,context);
  return {elements};
}
// Both personal links start inert; generic addresses can enable either row.
const markPending=elements=>{
  for(const id of ['info-linktree','info-feedback']){
    elements[id].setAttribute('aria-disabled','true');
    elements[id].classList.add('info-action-pending');
  }
};
const pending=makeContext(code,markPending);
for(const id of ['info-linktree','info-feedback']){
  assert.equal(pending.elements[id].href,'','the row must not ship an address');
  assert.equal(pending.elements[id].attributes['aria-disabled'],'true');
  assert.equal(pending.elements[id].classes.has('info-action-pending'),true);
}
const configured=makeContext(code
  .replace("const infoLinksUrl='';","const infoLinksUrl='https://example.com/links';")
  .replace("const infoFeedbackUrl='';","const infoFeedbackUrl='https://example.com/feedback';"),markPending);
for(const [id,url] of [['info-linktree','https://example.com/links'],['info-feedback','https://example.com/feedback']]){
  const element=configured.elements[id];
  assert.equal(element.href,url);
  assert.equal(element.target,'_blank');
  assert.equal(element.rel,'noopener noreferrer');
  assert.equal(element.attributes['aria-disabled'],undefined);
  assert.equal(element.classes.has('info-action-pending'),false);
}
assert.equal(configured.elements['info-linktree'].textContent,'Open my links');
assert.equal(configured.elements['info-feedback'].textContent,'Open feedback form');

const githubPending=makeContext(code, elements=>{ elements['info-github'].setAttribute('aria-disabled','true'); elements['info-github'].classList.add('info-action-pending'); });
assert.equal(githubPending.elements['info-github'].href,'','empty GitHub URL stays inert');
assert.equal(githubPending.elements['info-github'].attributes['aria-disabled'],'true');
const githubActive=makeContext(code.replace("const infoGithubUrl='';","const infoGithubUrl='https://github.com/example/repo';"), elements=>{ elements['info-github'].setAttribute('aria-disabled','true'); elements['info-github'].classList.add('info-action-pending'); });
assert.equal(githubActive.elements['info-github'].href,'https://github.com/example/repo');
assert.equal(githubActive.elements['info-github'].target,'_blank');
assert.equal(githubActive.elements['info-github'].rel,'noopener noreferrer');
assert.equal(githubActive.elements['info-github'].textContent,'Open GitHub repository');
assert.equal(githubActive.elements['info-github'].attributes['aria-disabled'],undefined);
assert.equal(githubActive.elements['info-github'].classes.has('info-action-pending'),false);

const first=makeContext(code);
assert.equal(first.elements['info-menu'].hidden,false,'Info should be on the start screen');
first.elements['info-menu'].open=true; first.elements['info-menu'].toggle();
assert.equal(first.elements['play-btn'].hidden,true,'Info replaces the menu rows');
assert.equal(first.elements['settings-menu'].hidden,true,'Info and Settings should not be open together');
assert.equal(first.elements['leaderboard-toggle'].hidden,true);
assert.equal(first.elements['how-to-play'].hidden,true);
assert.equal(first.elements['player-field'].hidden,true);

first.elements['info-back'].click();
assert.equal(first.elements['info-menu'].open,false,'Back closes Info');
assert.equal(first.elements['play-btn'].hidden,false);
assert.equal(first.elements['settings-menu'].hidden,false);
assert.equal(first.elements['leaderboard-toggle'].hidden,false);
assert.equal(first.elements['how-to-play'].hidden,false);
assert.equal(first.elements['player-field'].hidden,false);

first.elements['settings-menu'].open=true; first.elements['settings-menu'].toggle();
assert.equal(first.elements['info-menu'].hidden,true,'Settings should hide the Info row while it is open');
first.elements['settings-back'].click();
assert.equal(first.elements['info-menu'].hidden,false,'leaving Settings restores Info');

first.elements['player-name'].value='Info tester';
first.elements['play-btn'].click();
assert.equal(first.elements['info-menu'].hidden,true,'the mode view hides Info');
first.elements['mode-back'].click();
assert.equal(first.elements['info-menu'].hidden,false,'Back restores Info');

const gameOver=source.slice(source.indexOf('function showGameOver('),source.indexOf('function expireTimingPhase('));
const returnToMenu=source.slice(source.indexOf("$('change-player').addEventListener('click'"),source.indexOf("$('stage').addEventListener('pointerdown'"));
assert.match(gameOver,/\$\('info-menu'\)\.open=false; \$\('info-menu'\)\.hidden=true/,'Game Over hides Info');
assert.match(source,/\$\('info-menu'\)\.hidden=true; \$\('info-menu'\)\.open=false/,'a running game hides Info');
assert.match(returnToMenu,/\$\('info-menu'\)\.hidden=false/,'returning to the menu restores Info');

console.log('Info menu link placeholders, configured links and lifecycle checks passed.');
