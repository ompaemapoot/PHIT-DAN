const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const elements={};
for(const id of ['share-panel','share-download','share-native','share-status']){
  elements[id]={hidden:true,textContent:'',value:'',href:'',download:'',addEventListener(type,fn){this[type]=fn;}};
}
const calls=[];
const navigator={share:data=>{calls.push(data);return Promise.resolve();},clipboard:{writeText:text=>{calls.push(text);return Promise.resolve();}}};
function fakeCanvas(){
  const gradient={addColorStop(){}};
  const context={fillStyle:'',strokeStyle:'',lineWidth:1,font:'',textAlign:'left',globalAlpha:1,shadowColor:'',shadowBlur:0,shadowOffsetY:0,fillRect(){},fillText(){},measureText:text=>({width:String(text).length*9}),beginPath(){},closePath(){},fill(){},stroke(){},moveTo(){},lineTo(){},quadraticCurveTo(){},arc(){},save(){},restore(){},translate(){},rotate(){},createLinearGradient:()=>gradient,createRadialGradient:()=>gradient};
  return {width:0,height:0,getContext:()=>context,toDataURL:()=> 'data:image/png;base64,cG5n'};
}
const ctx=vm.createContext({document:{getElementById:id=>elements[id],createElement:fakeCanvas},navigator,location:{href:'https://game.example/play/index.html?test=1#x',hostname:'game.example',protocol:'https:'},URL,atob:s=>Buffer.from(s,'base64').toString('binary')});
vm.runInContext(fs.readFileSync(path.join(__dirname,'../share-score.js'),'utf8'),ctx);

const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const panel=html.match(/<section class="share-panel"[\s\S]*?<\/section>/)[0];
assert.doesNotMatch(panel,/<img|textarea|share-copy|share-link-note|share-text/, 'the panel should not preview the card or show a message field');
assert.equal((panel.match(/<button|<a /g)||[]).length,2,'the panel should expose exactly two controls');
assert.match(panel,/Share link/);
assert.match(panel,/Download image/);

(async()=>{
  const sharing=vm.runInContext('initScoreSharing()',ctx);
  sharing.show(17,'horizontal');
  assert.equal(elements['share-panel'].hidden,false);
  assert.match(elements['share-download'].href,/^data:image\/png/);
  assert.equal(elements['share-download'].download,'phit-dan-score.png');
  assert.equal(elements['share-status'].textContent,'');
  await elements['share-native'].click();
  assert.equal(calls[0].title,'PHIT DAN');
  assert.match(calls[0].text,/17 points in Rail/);
  assert.match(calls[0].text,/https:\/\/game\.example\/play\/index\.html$/);
  assert.doesNotMatch(calls[0].text,/test=1/,'the shared link should drop the query string');
  assert.equal(elements['share-status'].textContent,'');
  sharing.show(9,'timing');
  assert.match(calls[0].text,/17 points in Rail/);
  await elements['share-native'].click();
  assert.match(calls[1].text,/9 points in Beat mode/);
  assert.match(calls[1].text,/https:\/\/game\.example\/play\/index\.html$/);
  navigator.share=undefined;
  await elements['share-native'].click();
  assert.equal(calls[2],'https://game.example/play/index.html','the link should be copied when sharing is unavailable');
  assert.equal(elements['share-status'].textContent,'Link copied.');
  navigator.clipboard.writeText=()=>Promise.reject(Error('denied'));
  await elements['share-native'].click();
  assert.match(elements['share-status'].textContent,/download/i);
  navigator.share=()=>Promise.reject(Error('denied'));
  navigator.clipboard.writeText=text=>{calls.push(text);return Promise.resolve();};
  await elements['share-native'].click();
  assert.equal(elements['share-status'].textContent,'Link copied.','a rejected share should fall back to the clipboard');
  navigator.share=data=>{calls.push(data);return Promise.reject(Object.assign(Error('cancelled'),{name:'AbortError'}));};
  elements['share-status'].textContent='unchanged';
  await elements['share-native'].click();
  assert.equal(elements['share-status'].textContent,'unchanged','a cancelled share should leave the status untouched');
  navigator.share=data=>{calls.push(data);return Promise.resolve();};
  ctx.location.href='https://game.example/'+ 'x'.repeat(3000);
  sharing.show(1,'arcade');
  assert.equal(elements['share-status'].textContent,'','a long URL no longer affects the share panel');
  sharing.hide();
  assert.equal(elements['share-panel'].hidden,true);
  console.log('Score sharing controls checks passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
