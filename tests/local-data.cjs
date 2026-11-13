// Guard the Settings control that clears this browser's local game data.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const source=fs.readFileSync(path.join(root,'game.js'),'utf8');

assert.match(html,/<button class="sound-toggle" id="reset-data" type="button">Clear my data<\/button>/,
  'Settings should offer a clear-data control in the menu row style');
const settings=html.slice(html.indexOf('id="settings-menu"'),html.indexOf('id="info-menu"'));
assert.match(settings,/id="taunt-toggle"[\s\S]*id="reset-data"[\s\S]*id="settings-back"/,
  'Clear my data should sit with the other Settings controls and above Back');
assert.match(source,/const gameVersion='1\.0\.0';/,'the version should live in one place');
assert.match(source,/if\(version\) version\.textContent='v'\+gameVersion;/,'the Info footnote should read the version from that setting');
assert.match(source,/if\(!window\.confirm\('Clear your name, scores, messages and settings from this browser\?'\)\) return;/,
  'clearing data should ask for confirmation first');
assert.match(source,/if\(key && key\.indexOf\('phit-dan-'\)===0\) keys\.push\(key\)/,
  'only this game\'s own keys should be removed');
assert.match(source,/for\(const key of keys\) localStorage\.removeItem\(key\);/,'the collected keys should be removed');

const code=source.slice(source.indexOf('const $ ='),source.indexOf('let playing ='));
function makeContext(seed){
  const store=new Map(seed);
  const localStorage={
    get length(){ return store.size; },
    key:index=>[...store.keys()][index] ?? null,
    getItem:key=>store.has(key)?store.get(key):null,
    setItem:(key,value)=>store.set(key,String(value)),
    removeItem:key=>store.delete(key)
  };
  let reloads=0, answer=false;
  const confirmations=[];
  function element(){
    const classes=new Set();
    return {value:'',textContent:'',hidden:false,open:false,attributes:{},children:[],href:'',classes,
      classList:{add(name){classes.add(name);},remove(name){classes.delete(name);},contains(name){return classes.has(name);}},
      setAttribute(name,value){this.attributes[name]=value;},removeAttribute(name){delete this.attributes[name];},
      appendChild(child){this.children.push(child);},append(...children){this.children.push(...children);},
      replaceChildren(){this.children=[];},addEventListener(type,fn){this[type]=fn;},focus(){},querySelector(){return element();}};
  }
  const elements=new Proxy({},{get:(target,id)=>target[id] ||= element()});
  const context=vm.createContext({
    document:{documentElement:{dataset:{}},getElementById:id=>elements[id],createElement:element},
    localStorage,
    window:{confirm(message){ confirmations.push(message); return answer; }},
    location:{reload(){ reloads++; }}
  });
  vm.runInContext(code,context);
  return {elements,store,confirmations,setAnswer(value){ answer=value; },reloads:()=>reloads};
}

const seed=[['phit-dan-player-name','Ada'],['phit-dan-leaderboard-v3','[]'],['phit-dan-taunts-v1','[]'],['other-app-preference','keep']];
const cancelled=makeContext(seed);
cancelled.elements['reset-data'].click();
assert.equal(cancelled.confirmations.length,1,'clicking the control should ask before deleting');
assert.match(cancelled.confirmations[0],/Clear your name, scores, messages and settings/);
assert.equal(cancelled.store.size,seed.length,'cancelling must leave every stored value in place');
assert.equal(cancelled.reloads(),0,'cancelling must not reload the page');

const cleared=makeContext(seed);
cleared.setAnswer(true);
cleared.elements['reset-data'].click();
assert.equal(cleared.store.has('phit-dan-player-name'),false,'the player name should be removed');
assert.equal(cleared.store.has('phit-dan-leaderboard-v3'),false,'the leaderboard should be removed');
assert.equal(cleared.store.has('phit-dan-taunts-v1'),false,'the saved messages should be removed');
assert.equal(cleared.store.get('other-app-preference'),'keep','unrelated site data must be left alone');
assert.equal(cleared.reloads(),1,'the page should reload once the data is cleared');

const empty=makeContext([]);
empty.setAnswer(true);
empty.elements['reset-data'].click();
assert.equal(empty.reloads(),1,'clearing an already empty store should still reload');

console.log('Clear-my-data confirmation, key scoping and reload checks passed.');
