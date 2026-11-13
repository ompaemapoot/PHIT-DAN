// Score images are generated locally; no score data is sent to a server.
const CARD_WIDTH=1080, CARD_HEIGHT=1350, CARD_PAD=80, CARD_BAND_TOP=880;
const CARD_COLORS={canvas:'#eef2f7',surface:'#fafbfe',ink:'#25364f',muted:'#4c5d72',accent:'#3157a4',accentDark:'#294887',line:'#c5cfdf',gold:'#d9ae3c',success:'#51d69a'};
const CARD_FONT="'DM Sans','Kanit',sans-serif", CARD_TEXT_FONT="'Kanit','DM Sans',sans-serif";

function scoreModeLabel(mode){ return mode==='horizontal' ? 'Rail' : mode==='timing' ? 'Beat' : 'Hub'; }
function scoreModeName(mode){ return mode==='horizontal' ? 'RAIL' : mode==='timing' ? 'BEAT' : 'HUB'; }
function cardHost(url){
  const match=String(url).match(/^[a-z][a-z0-9+.-]*:\/\/([^/?#]+)/i);
  const host=(match ? match[1] : String(url)).replace(/^www\./i,'');
  return host.length>34 ? host.slice(0,31)+'...' : host;
}

// Small drawing helpers keep the card readable without relying on newer canvas APIs.
function cardRoundRect(ctx,x,y,w,h,r){
  const radius=Math.max(0,Math.min(r,w/2,h/2));
  ctx.beginPath();
  ctx.moveTo(x+radius,y);
  ctx.lineTo(x+w-radius,y);
  ctx.quadraticCurveTo(x+w,y,x+w,y+radius);
  ctx.lineTo(x+w,y+h-radius);
  ctx.quadraticCurveTo(x+w,y+h,x+w-radius,y+h);
  ctx.lineTo(x+radius,y+h);
  ctx.quadraticCurveTo(x,y+h,x,y+h-radius);
  ctx.lineTo(x,y+radius);
  ctx.quadraticCurveTo(x,y,x+radius,y);
  ctx.closePath();
}
function cardFillRoundRect(ctx,x,y,w,h,r,color){
  ctx.fillStyle=color; cardRoundRect(ctx,x,y,w,h,r); ctx.fill();
}
function cardTrackedWidth(ctx,text,spacing){
  let width=0;
  for(const character of text) width+=ctx.measureText(character).width+spacing;
  return Math.max(0,width-spacing);
}
function cardTrackedText(ctx,text,x,y,spacing){
  let cursor=x;
  for(const character of text){
    ctx.fillText(character,cursor,y);
    cursor+=ctx.measureText(character).width+spacing;
  }
}

// The start-screen lockup: PHIT in ink, DAN in cobalt and the cropped USB icon.
function drawCardUsbGlyph(ctx,x,y,height,color){
  const scale=height/28;
  ctx.save();
  ctx.strokeStyle=color; ctx.lineWidth=2.1*scale; ctx.lineCap='round'; ctx.lineJoin='round';
  cardRoundRect(ctx,x+scale,y+10*scale,16*scale,17*scale,3*scale);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x+4*scale,y+10*scale); ctx.lineTo(x+4*scale,y+scale);
  ctx.lineTo(x+14*scale,y+scale); ctx.lineTo(x+14*scale,y+10*scale);
  ctx.moveTo(x+7*scale,y+4*scale); ctx.lineTo(x+7*scale,y+6*scale);
  ctx.moveTo(x+11*scale,y+4*scale); ctx.lineTo(x+11*scale,y+6*scale);
  ctx.stroke();
  ctx.restore();
}
function cardLogoWidth(ctx,size){
  ctx.font=`800 ${size}px ${CARD_FONT}`;
  const gap=size*.14;
  return ctx.measureText('PHIT').width+gap+ctx.measureText('DAN').width+gap+size*.85*(18/28);
}
function drawCardWordmark(ctx,x,baseline,size,phitColor,danColor,alpha=1){
  ctx.save();
  ctx.globalAlpha=alpha; ctx.textAlign='left';
  ctx.font=`800 ${size}px ${CARD_FONT}`;
  const gap=size*.14;
  ctx.fillStyle=phitColor; ctx.fillText('PHIT',x,baseline);
  ctx.fillStyle=danColor; ctx.fillText('DAN',x+ctx.measureText('PHIT').width+gap,baseline);
  ctx.restore();
}
function drawCardLogo(ctx,x,baseline,size,phitColor,danColor,iconColor,alpha=1){
  drawCardWordmark(ctx,x,baseline,size,phitColor,danColor,alpha);
  ctx.save();
  ctx.globalAlpha=alpha; ctx.textAlign='left';
  ctx.font=`800 ${size}px ${CARD_FONT}`;
  const gap=size*.14;
  const iconHeight=size*.85;
  drawCardUsbGlyph(ctx,x+ctx.measureText('PHIT').width+gap+ctx.measureText('DAN').width+gap*.9,baseline-iconHeight,iconHeight,iconColor);
  ctx.restore();
}

function drawCardBackground(ctx){
  ctx.fillStyle=CARD_COLORS.canvas; ctx.fillRect(0,0,CARD_WIDTH,CARD_HEIGHT);
  const glow=ctx.createRadialGradient(CARD_WIDTH/2,-160,60,CARD_WIDTH/2,-160,1000);
  glow.addColorStop(0,'rgba(255,255,255,.95)'); glow.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle=glow; ctx.fillRect(0,0,CARD_WIDTH,CARD_BAND_TOP);
  // A faint blueprint grid echoes the measured socket layouts.
  ctx.fillStyle='rgba(37,54,79,.045)';
  for(let x=0;x<CARD_WIDTH;x+=68) ctx.fillRect(x,0,1,CARD_BAND_TOP);
  for(let y=0;y<CARD_BAND_TOP;y+=68) ctx.fillRect(0,y,CARD_WIDTH,1);
  ctx.fillStyle='rgba(49,87,164,.16)'; ctx.fillRect(CARD_PAD,208,CARD_WIDTH-CARD_PAD*2,1);
}

function drawCardHeader(ctx,modeName){
  drawCardWordmark(ctx,CARD_PAD,126,48,CARD_COLORS.ink,CARD_COLORS.accent);
  ctx.textAlign='left';
  ctx.font=`700 14px ${CARD_FONT}`; ctx.fillStyle=CARD_COLORS.muted;
  cardTrackedText(ctx,'USB INSERTION GAME',CARD_PAD,166,3.4);

  // Mode chip on the right, matching the leaderboard tabs.
  const top=64, height=58, right=CARD_WIDTH-CARD_PAD;
  ctx.font=`800 22px ${CARD_FONT}`;
  const nameWidth=ctx.measureText(modeName).width;
  ctx.font=`700 13px ${CARD_FONT}`;
  const wordWidth=ctx.measureText('MODE').width;
  const width=43+nameWidth+10+wordWidth+24, x=right-width;
  cardFillRoundRect(ctx,x,top,width,height,height/2,CARD_COLORS.surface);
  ctx.strokeStyle=CARD_COLORS.line; ctx.lineWidth=2; cardRoundRect(ctx,x,top,width,height,height/2); ctx.stroke();
  ctx.fillStyle=CARD_COLORS.accent; ctx.beginPath(); ctx.arc(x+23,top+height/2,5,0,Math.PI*2); ctx.fill();
  ctx.font=`800 22px ${CARD_FONT}`; ctx.fillStyle=CARD_COLORS.ink; ctx.fillText(modeName,x+43,top+height/2+8);
  ctx.font=`700 13px ${CARD_FONT}`; ctx.fillStyle=CARD_COLORS.muted; ctx.fillText('MODE',x+43+nameWidth+10,top+height/2+6);
}

function drawCardScore(ctx,score){
  const centerX=CARD_WIDTH/2;
  ctx.textAlign='center';
  ctx.fillStyle=CARD_COLORS.accent; ctx.fillRect(centerX-29,278,58,7);
  ctx.font=`700 19px ${CARD_FONT}`; ctx.fillStyle=CARD_COLORS.muted;
  cardTrackedText(ctx,'FINAL SCORE',centerX-cardTrackedWidth(ctx,'FINAL SCORE',4.4)/2,336,4.4);

  const value=String(score);
  let size=292;
  ctx.font=`800 ${size}px ${CARD_FONT}`;
  const width=ctx.measureText(value).width;
  if(width>880){
    size=Math.max(120,Math.floor(size*880/width));
    ctx.font=`800 ${size}px ${CARD_FONT}`;
  }
  ctx.fillStyle=CARD_COLORS.ink; ctx.fillText(value,centerX,628);

  ctx.font=`800 21px ${CARD_FONT}`; ctx.fillStyle=CARD_COLORS.ink;
  const pointsWidth=cardTrackedWidth(ctx,'POINTS',5), groupWidth=pointsWidth+26;
  cardTrackedText(ctx,'POINTS',centerX-groupWidth/2,700,5);
  ctx.fillStyle=CARD_COLORS.gold; ctx.fillRect(centerX-groupWidth/2+pointsWidth+16,692,10,10);

  ctx.font=`500 33px ${CARD_TEXT_FONT}`; ctx.fillStyle=CARD_COLORS.muted;
  ctx.fillText('Can you beat my score?',centerX,778);
  ctx.textAlign='left';
}

function cardArrowHead(ctx,x,y,angle,size,color){
  ctx.save(); ctx.translate(x,y); ctx.rotate(angle);
  ctx.beginPath(); ctx.moveTo(size,0); ctx.lineTo(-size*.5,size*.62); ctx.lineTo(-size*.5,-size*.62); ctx.closePath();
  ctx.fillStyle=color; ctx.fill();
  ctx.restore();
}
// A USB drive inside a circular flip arrow: the clearest shorthand for the game.
function drawCardFlipGraphic(ctx){
  const x=252, y=1194, radius=124;
  ctx.save();
  ctx.strokeStyle='rgba(255,255,255,.8)'; ctx.lineWidth=4.5; ctx.lineCap='round';
  const start=.55, end=Math.PI*2-.55;
  ctx.beginPath(); ctx.arc(x,y,radius,start,end); ctx.stroke();
  cardArrowHead(ctx,x+Math.cos(end)*radius,y+Math.sin(end)*radius,end+Math.PI/2,17,'rgba(255,255,255,.9)');

  ctx.save();
  ctx.translate(x,y); ctx.rotate(-.12);
  cardRoundRect(ctx,-96,-40,192,80,18);
  ctx.fillStyle='rgba(255,255,255,.1)'; ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,.85)'; ctx.lineWidth=4; ctx.stroke();
  // The metal connector, its two square holes and the body seam.
  cardRoundRect(ctx,60,-25,88,50,9);
  ctx.fillStyle='rgba(255,255,255,.22)'; ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,.9)'; ctx.stroke();
  cardFillRoundRect(ctx,118,-17,12,12,3,'rgba(41,72,135,.95)');
  cardFillRoundRect(ctx,118,5,12,12,3,'rgba(41,72,135,.95)');
  ctx.strokeStyle='rgba(255,255,255,.35)'; ctx.lineWidth=2.5;
  ctx.beginPath(); ctx.moveTo(56,-40); ctx.lineTo(56,40); ctx.stroke();
  ctx.fillStyle=CARD_COLORS.success; ctx.beginPath(); ctx.arc(-80,0,7,0,Math.PI*2); ctx.fill();
  ctx.restore();
  ctx.restore();
}

function drawCardBand(ctx,url){
  const gradient=ctx.createLinearGradient(0,CARD_BAND_TOP,0,CARD_HEIGHT);
  gradient.addColorStop(0,CARD_COLORS.accent); gradient.addColorStop(1,CARD_COLORS.accentDark);
  ctx.fillStyle=gradient; ctx.fillRect(0,CARD_BAND_TOP,CARD_WIDTH,CARD_HEIGHT-CARD_BAND_TOP);
  ctx.fillStyle='rgba(255,255,255,.05)';
  for(let x=0;x<=CARD_WIDTH;x+=68) ctx.fillRect(x,CARD_BAND_TOP,1,CARD_HEIGHT-CARD_BAND_TOP);
  for(let y=CARD_BAND_TOP;y<=CARD_HEIGHT;y+=68) ctx.fillRect(0,y,CARD_WIDTH,1);
  ctx.fillStyle='rgba(255,255,255,.18)'; ctx.fillRect(0,CARD_BAND_TOP,CARD_WIDTH,2);

  ctx.textAlign='left';
  ctx.font=`800 20px ${CARD_FONT}`; ctx.fillStyle='rgba(255,255,255,.8)';
  cardTrackedText(ctx,'TAP \u00b7 FLIP \u00b7 INSERT',CARD_PAD,CARD_BAND_TOP+96,4.2);
  ctx.font=`500 28px ${CARD_TEXT_FONT}`; ctx.fillStyle='rgba(255,255,255,.68)';
  ctx.fillText('The USB has one right way in.',CARD_PAD,CARD_BAND_TOP+148);

  // The same logo, ghosted behind the footer artwork.
  const ghostSize=92, ghostWidth=cardLogoWidth(ctx,ghostSize);
  drawCardLogo(ctx,CARD_WIDTH-CARD_PAD-ghostWidth,1180,ghostSize,'#ffffff','#ffffff','#ffffff',.14);

  drawCardFlipGraphic(ctx);

  ctx.textAlign='right';
  ctx.font=`700 14px ${CARD_FONT}`; ctx.fillStyle='rgba(255,255,255,.5)';
  const playAtWidth=cardTrackedWidth(ctx,'PLAY AT',3);
  cardTrackedText(ctx,'PLAY AT',CARD_WIDTH-CARD_PAD-playAtWidth,1246,3);
  ctx.font=`600 19px ${CARD_FONT}`; ctx.fillStyle='rgba(255,255,255,.62)';
  ctx.fillText(cardHost(url),CARD_WIDTH-CARD_PAD,1288);
  ctx.textAlign='left';
}

function createScoreCard(score, mode, url){
  const label=scoreModeLabel(mode);
  const canvas=document.createElement('canvas'); canvas.width=CARD_WIDTH; canvas.height=CARD_HEIGHT;
  const ctx=canvas.getContext('2d');
  drawCardBackground(ctx);
  drawCardHeader(ctx,scoreModeName(mode));
  drawCardScore(ctx,score);
  drawCardBand(ctx,url);
  return {dataUrl:canvas.toDataURL('image/png'),text:`I scored ${score} points in ${label} mode on PHIT DAN! Can you beat me?\n${url}`,url};
}

function initScoreSharing(){
  const el=id=>document.getElementById(id);
  let card=null;
  function show(score,mode){
    const url=new URL(location.href); url.search=''; url.hash='';
    card=createScoreCard(score,mode,url.href);
    el('share-download').href=card.dataUrl;
    el('share-download').download='phit-dan-score.png';
    el('share-status').textContent='';
    el('share-panel').hidden=false;
  }
  function hide(){ el('share-panel').hidden=true; card=null; }
  el('share-native').addEventListener('click',async()=>{
    if(!card)return;
    if(navigator.share){
      try {
        await navigator.share({title:'PHIT DAN',text:card.text});
        el('share-status').textContent='';
        return;
      } catch(error) {
        if(error.name==='AbortError') return;
      }
    }
    try {
      if(!navigator.clipboard || !navigator.clipboard.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(card.url);
      el('share-status').textContent='Link copied.';
    } catch(error) {
      el('share-status').textContent='Sharing is unavailable here. Download the image instead.';
    }
  });
  return {show,hide};
}
