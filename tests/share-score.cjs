const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const script = path.join(__dirname, '../share-score.js');
assert.ok(fs.existsSync(script), 'score sharing implementation should exist');
const texts=[];
const rects=[];
let created=null;
const gradient={addColorStop(){}};
const context=vm.createContext({document:{createElement(tag){
  assert.equal(tag,'canvas');
  const ctx={
    fillStyle:'',strokeStyle:'',lineWidth:1,font:'',textAlign:'left',globalAlpha:1,
    shadowColor:'',shadowBlur:0,shadowOffsetY:0,
    fillRect(...args){rects.push(args);},
    fillText(text){texts.push(String(text));},
    measureText(text){return {width:String(text).length*9};},
    beginPath(){},closePath(){},roundRect(){},fill(){},stroke(){},
    moveTo(){},lineTo(){},quadraticCurveTo(){},arc(){},
    save(){},restore(){},translate(){},rotate(){},
    createLinearGradient(){return gradient;},createRadialGradient(){return gradient;}
  };
  created={width:0,height:0,getContext(){return ctx;},toDataURL(){return 'data:image/png;base64,cG5n';}};
  return created;
}}});
vm.runInContext(fs.readFileSync(script,'utf8'),context);
const card=vm.runInContext("createScoreCard(42, 'horizontal', 'https://example.com/game/')",context);
assert.equal(card.dataUrl,'data:image/png;base64,cG5n');
assert.equal(created.width,1080,'the share card should be a portrait social graphic');
assert.equal(created.height,1350,'the share card should be a 4:5 portrait image');
assert.match(card.text,/42/);
assert.match(card.text,/Rail/);
assert.match(card.text,/https:\/\/example\.com\/game\//);
assert.ok(texts.includes('42'), 'score should be rendered on the card');
assert.ok(texts.includes('RAIL'), 'mode should be rendered on the card');
assert.ok(texts.filter(text=>text==='PHIT').length>=2, 'the start-screen logo should appear in the header and as the footer watermark');
assert.ok(texts.includes('DAN'), 'the wordmark should use the same PHIT DAN lockup as the start screen');
assert.ok(texts.includes('MODE'), 'the mode chip should label the mode');
assert.ok(texts.includes('Can you beat my score?'), 'the card should invite a challenge');
assert.ok(texts.includes('example.com'), 'the card should show where the game lives');
assert.ok(!texts.some(text=>/QR|SCAN TO PLAY/i.test(text)), 'the card should not carry a QR code any more');
assert.equal('qrAvailable' in card,false,'the share card should no longer report QR availability');
const timing=vm.runInContext("createScoreCard(17, 'timing', 'https://example.com/game/')",context);
assert.match(timing.text,/17 points in Beat mode/);
assert.ok(texts.includes('BEAT'),'Beat score cards should identify the mode');
const arcade=vm.runInContext("createScoreCard(0, 'arcade', 'https://' + 'x'.repeat(3000) + '.example/')",context);
assert.equal(arcade.dataUrl,'data:image/png;base64,cG5n','a long URL should still produce a card');
assert.ok(texts.some(text=>text.endsWith('...')),'an overlong host name should be shortened instead of running off the card');
console.log('Score card generation checks passed.');
