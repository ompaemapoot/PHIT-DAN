// Exercise the real scrolling function and verify every socket handoff stays evenly spaced.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../game.js'),'utf8');
const code=source.slice(source.indexOf('function updateScroll('),source.indexOf('function retireRows('));
const pitch=1, row=()=>({position:{y:0}});
const context=vm.createContext({activeMode:'horizontal',horizontalPitch:pitch,hubHeight:3.4,scrollSpacing:pitch,activeRowY:()=>-.6,
  scrollRows:[row()], roundRig:row(),nextHorizontal:{row:row()},scrollFill:{scale:{},position:{}},phase:'aim'});
vm.runInContext(code,context);
const near=(a,b)=>assert(Math.abs(a-b)<1e-9,`${a} != ${b}`);
context.updateScroll();
near(context.nextHorizontal.row.position.y-context.scrollRows[0].position.y,pitch);
for(let round=0;round<20;round++){
  const priorPreview=context.nextHorizontal.row.position.y;
  context.roundRig=row(); context.nextHorizontal={row:row()}; context.phase='scroll';
  for(const shift of [0,.25,.5,.75,1]){
    context.updateScroll(shift);
    near(context.roundRig.position.y-context.scrollRows[0].position.y,pitch);
    near(context.nextHorizontal.row.position.y-context.roundRig.position.y,pitch);
    for(let i=1;i<context.scrollRows.length;i++) near(context.scrollRows[i-1].position.y-context.scrollRows[i].position.y,pitch);
    near(context.scrollFill.position.y+context.scrollFill.scale.y/2,context.scrollRows.at(-1).position.y-pitch/2);
    if(shift===0) near(context.roundRig.position.y,priorPreview);
  }
  const before=[context.roundRig.position.y,context.scrollRows[0].position.y,context.nextHorizontal.row.position.y];
  context.phase='enter'; context.scrollRows.unshift(context.roundRig); context.updateScroll();
  [context.scrollRows[0].position.y,context.scrollRows[1].position.y,context.nextHorizontal.row.position.y].forEach((y,i)=>near(y,before[i]));
}
assert(pitch>.4 && pitch<1.5);
console.log('Continuous horizontal scrolling checks passed.');
