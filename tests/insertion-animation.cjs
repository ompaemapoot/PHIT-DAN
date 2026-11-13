// Exercise the actual animation loop at representative per-mode phase durations.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../game.js'),'utf8');
const animation=source.slice(source.indexOf('function animate(now)'),source.indexOf('updateUI(); requestAnimationFrame(animate);'));
let renders=0;
const context=vm.createContext({requestAnimationFrame(){},THREE:{MathUtils:{lerp:(a,b,t)=>a+(b-a)*t}},renderer:{render(){renders++;}},scene:{},camera:{},pausedAt:0,
  document:{hidden:false},$:()=>({hidden:true,classList:{contains:()=>false}}),
  plugGroup:{rotation:{z:0},position:{z:0},userData:{insertionStartRoll:0}},scrollRows:[],phase:'insert',playing:false,
  insertionStarted:1000,insertionVisualDuration:280,insertionTurnDuration:160,insertionCorrect:true,plugStartZ:2.15,targetRoll:Math.PI});
vm.runInContext(animation,context);
for(const [visual,turn] of [[280,160],[240,132],[222,122.1],[180,99],[96,52.8],[90,49.5]]) for(const correct of [true,false]){
  context.insertionVisualDuration=visual; context.insertionTurnDuration=turn; context.insertionCorrect=correct;
  context.animate(1000); assert.equal(context.plugGroup.position.z,2.15); assert.equal(context.plugGroup.rotation.z,0);
  context.animate(1000+turn/2);
  assert(Math.abs(context.plugGroup.rotation.z-Math.PI/2)<1e-10);
  context.animate(1000+visual);
  assert(Math.abs(context.plugGroup.rotation.z-Math.PI)<1e-10);
  assert(Math.abs(context.plugGroup.position.z-(correct ? -.32 : .44))<1e-10);
}
context.phase='insert';
const framesBefore=renders;
context.document.hidden=false; context.$=()=>({hidden:true,classList:{contains:()=>false}});
context.animate(1000); assert.equal(renders,framesBefore,'the opaque start overlay should skip the 3D frame');
context.$=()=>({hidden:true,classList:{contains:()=>true}});
context.animate(1000); assert.equal(renders,framesBefore+1,'an uncovered scene should render');
context.document.hidden=true;
context.animate(1000); assert.equal(renders,framesBefore+1,'a hidden page should not render');
context.document.hidden=false; context.$=()=>({hidden:false,classList:{contains:()=>true}});
context.animate(1000); assert.equal(renders,framesBefore+1,'the rotate-to-portrait panel should also stop rendering');
context.$=()=>({hidden:true,classList:{contains:()=>true}});
context.pausedAt=1000;
context.animate(1000); assert.equal(renders,framesBefore+1,'a paused run should not redraw the scene behind the pause panel');
context.pausedAt=0;
context.animate(1000); assert.equal(renders,framesBefore+2,'the scene should redraw after Continue');
console.log('Insertion animation timing checks passed.');
