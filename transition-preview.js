import * as THREE from './vendor/three.module.min.js';

// This page is a self-contained experiment; it does not change the playable game.
const $=id=>document.getElementById(id);
const width=3, height=3.4, startZ=2.15, insertedZ=-.32;
const examples=[
  {vertical:false,paired:false,flip:false,target:1,decoy:false},
  {vertical:false,paired:false,flip:true,target:1,decoy:true},
  {vertical:true,paired:false,flip:false,target:1,decoy:false},
  {vertical:false,paired:true,flip:true,target:1,decoy:false},
  {vertical:true,paired:true,flip:false,target:-1,decoy:true}
];
let mode='cover', index=0, elapsed=0, swapped=false, paused=false, lastTime=performance.now(), housing;
const scene=new THREE.Scene();
const camera=new THREE.OrthographicCamera(-5.5,5.5,3.2,-3.2,.1,100);
camera.position.set(7,5.2,11); camera.lookAt(0,.65,-.4);
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio,2)); renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.localClippingEnabled=true;
$('preview-scene').appendChild(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xffffff,0x74808d,2));
const light=new THREE.DirectionalLight(0xffffff,2.5); light.position.set(-3,8,7); scene.add(light);
const fill=new THREE.DirectionalLight(0xb8d6ff,1.2); fill.position.set(6,2,-5); scene.add(fill);
const mats={
  black:new THREE.MeshStandardMaterial({color:0x101a25,roughness:.85}),
  cavity:new THREE.MeshStandardMaterial({color:0x27333f,roughness:.7}),
  silver:new THREE.MeshStandardMaterial({color:0xb0b9c5,roughness:.48,metalness:.55}),
  metal:new THREE.MeshStandardMaterial({color:0xd5dee7,roughness:.3,metalness:.75}),
  blue:new THREE.MeshStandardMaterial({color:0x0074ce,roughness:.42}),
  gold:new THREE.MeshStandardMaterial({color:0xe0bc69,metalness:.6,roughness:.4}),
  grip:new THREE.MeshStandardMaterial({color:0x273746,roughness:.65}),
  hub:new THREE.MeshStandardMaterial({color:0xb8c2cc,roughness:.65,metalness:.2}),
  endCap:new THREE.MeshStandardMaterial({color:0x364c5c,roughness:.7})
};
// Match the main game's subtle, world-aligned hub surface.
mats.hub.onBeforeCompile=shader=>{
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying float vHubX;').replace('#include <begin_vertex>','#include <begin_vertex>\nvHubX = (modelMatrix * vec4(transformed, 1.0)).x;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying float vHubX;').replace('#include <color_fragment>',`#include <color_fragment>
    float edge = abs(vHubX) / 1.5;
    float satin = smoothstep(0.58, 0.98, edge);
    float inlay = smoothstep(0.75, 0.76, edge) * (1.0 - smoothstep(0.77, 0.78, edge));
    float glint = smoothstep(0.87, 0.88, edge) * (1.0 - smoothstep(0.89, 0.90, edge));
    diffuseColor.rgb *= 1.0 - 0.14 * satin - 0.10 * inlay + 0.05 * glint;`);
};
function box(w,h,d,mat,x=0,y=0,z=0,parent=scene){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);mesh.position.set(x,y,z);parent.add(mesh);return mesh;}
function rounded(w,h,d,r,mat,parent,x=0,y=0,z=0){
  const s=new THREE.Shape(),a=-w/2,b=-h/2;
  s.moveTo(a+r,b);s.lineTo(a+w-r,b);s.quadraticCurveTo(a+w,b,a+w,b+r);s.lineTo(a+w,b+h-r);s.quadraticCurveTo(a+w,b+h,a+w-r,b+h);s.lineTo(a+r,b+h);s.quadraticCurveTo(a,b+h,a,b+h-r);s.lineTo(a,b+r);s.quadraticCurveTo(a,b,a+r,b);
  const geometry=new THREE.ExtrudeGeometry(s,{depth:d,bevelEnabled:true,bevelThickness:.025,bevelSize:.025,bevelSegments:2,curveSegments:4});geometry.translate(0,0,-d/2);
  const mesh=new THREE.Mesh(geometry,mat);mesh.position.set(x,y,z);parent.add(mesh);return mesh;
}
function cutFront(w,h,parent,holeW,holeH){
  const side=(w-holeW)/2,rim=(h-holeH)/2;
  box(side,h,.4,mats.hub,-(holeW+side)/2,0,-.2,parent);box(side,h,.4,mats.hub,(holeW+side)/2,0,-.2,parent);
  box(holeW,rim,.4,mats.hub,0,(holeH+rim)/2,-.2,parent);box(holeW,rim,.4,mats.hub,0,-(holeH+rim)/2,-.2,parent);
}
function makePort(parent,roll){
  const group=new THREE.Group();parent.add(group);group.rotation.z=roll;
  box(1.19,.37,.02,mats.black,0,0,-.39,group);
  box(1.18,.035,.37,mats.cavity,0,.19,-.20,group);box(1.18,.035,.37,mats.cavity,0,-.19,-.20,group);
  box(.035,.37,.37,mats.cavity,-.59,0,-.20,group);box(.035,.37,.37,mats.cavity,.59,0,-.20,group);
  box(1.02,.105,.28,mats.blue,0,-.105,-.20,group);
  for(let i=0;i<4;i++)box(.12,.012,.20,mats.gold,-.36+i*.24,-.048,-.18,group);
}
function makePlug(parent){
  const group=new THREE.Group();parent.add(group);
  box(1.08,.035,.78,mats.metal,0,.16,.39,group);box(1.08,.035,.78,mats.metal,0,-.16,.39,group);
  box(.035,.30,.78,mats.metal,-.525,0,.39,group);box(.035,.30,.78,mats.metal,.525,0,.39,group);
  box(.96,.10,.69,mats.blue,0,-.095,.40,group);
  for(let i=0;i<4;i++)box(.11,.012,.46,mats.gold,-.34+i*.225,-.037,.30,group);
  for(const x of [-.30,.30])box(.16,.008,.19,mats.cavity,x,.181,.36,group);
  rounded(1.27,.58,1.72,.13,mats.grip,group,0,0,1.67);
  rounded(.94,.43,.12,.09,mats.endCap,group,0,0,2.59);
  for(let i=0;i<3;i++)box(.78,.035,.035,mats.cavity,0,.305,1.80+i*.11,group);
  return group;
}
const rig=new THREE.Group();scene.add(rig);
box(width,height,.22,mats.silver,0,0,-.51,rig);
const plug=makePlug(rig);
const coverMaterial=mats.hub.clone();coverMaterial.onBeforeCompile=mats.hub.onBeforeCompile;
coverMaterial.transparent=true;coverMaterial.depthWrite=false;coverMaterial.opacity=0;
const cover=new THREE.Mesh(new THREE.PlaneGeometry(2.82,2.82),coverMaterial);cover.position.z=.006;rig.add(cover);
function disposeObject(obj){if(!obj)return;obj.removeFromParent();obj.traverse(child=>{if(child.geometry)child.geometry.dispose();if(child.userData.driveMaterials)child.userData.driveMaterials.forEach(material=>material.dispose());});}
function createHousing(example,parent){
  const housing=new THREE.Group();parent.add(housing);
  for(const side of example.paired ? [-1,1] : [0]){
    const cell=new THREE.Group();housing.add(cell);
    if(example.paired){if(example.vertical)cell.position.x=side*width/4;else cell.position.y=side*height/4;}
    cutFront(example.paired&&example.vertical ? width/2 : width,example.paired&&!example.vertical ? height/2 : height,cell,example.vertical ? .40 : 1.22,example.vertical ? 1.22 : .40);
    const isTarget=!example.paired || side===example.target;
    makePort(cell,(example.vertical ? Math.PI/2 : 0)+((isTarget ? example.flip : example.decoy) ? Math.PI : 0));
  }
  return housing;
}
function buildHousing(example){disposeObject(housing);housing=createHousing(example,rig);}
function pose(example){return {x:example.paired&&example.vertical ? example.target*width/4 : 0,y:example.paired&&!example.vertical ? example.target*height/4 : 0,roll:(example.vertical ? Math.PI/2 : 0)+(example.flip ? Math.PI : 0)};}
function posePlug(object,example){const p=pose(example);object.position.set(p.x,p.y,startZ);object.rotation.z=p.roll;}
function setPose(example){posePlug(plug,example);}
function entranceStartZ(example){
  // Start with the complete drive beyond the left viewport edge at every aspect ratio.
  const p=pose(example),c=Math.cos(p.roll),s=Math.sin(p.roll);let right=-Infinity;
  camera.updateMatrixWorld();
  for(const x of [-.7,.7])for(const y of [-.35,.35])for(const z of [0,2.75]){
    const point=new THREE.Vector3(p.x+c*x-s*y,p.y+s*x+c*y,startZ+z).applyMatrix4(camera.matrixWorldInverse);
    right=Math.max(right,point.x);
  }
  const viewZ=new THREE.Vector3(0,0,1).transformDirection(camera.matrixWorldInverse).x;
  return startZ+Math.max(5,(right-camera.left+.3)/Math.max(.01,-viewZ));
}
function smooth(t){t=Math.min(1,Math.max(0,t));return t*t*(3-2*t);}
function easeOut(t){t=Math.min(1,Math.max(0,t));return 1-Math.pow(1-t,3);}
function movePose(from,to,t){
  const a=pose(from),b=pose(to),e=smooth(t),delta=((b.roll-a.roll+3*Math.PI)%(2*Math.PI))-Math.PI;
  plug.position.x=THREE.MathUtils.lerp(a.x,b.x,e);plug.position.y=THREE.MathUtils.lerp(a.y,b.y,e);plug.rotation.z=a.roll+delta*e;
}
function status(text){if($('preview-step').textContent!==text)$('preview-step').textContent=text;}
function slideDistance(){camera.updateMatrixWorld();const v=Math.abs(new THREE.Vector3(0,1,0).transformDirection(camera.matrixWorldInverse).y);return (camera.top-camera.bottom)/Math.max(.2,v)*1.05;}
function renderCover(t,current,next){
  const closeStart=2300,openStart=2700,openEnd=3100;
  rig.position.y=0;coverMaterial.opacity=0;
  if(t<900){setPose(current);status('เตรียมเสียบ');}
  else if(t<1300){setPose(current);plug.position.z=THREE.MathUtils.lerp(startZ,insertedZ,smooth((t-900)/400));status('กำลังเสียบ');}
  else if(t<1800){setPose(current);plug.position.z=insertedZ;status('เสียบสำเร็จ');}
  else if(t<closeStart){setPose(current);plug.position.z=THREE.MathUtils.lerp(insertedZ,startZ,smooth((t-1800)/500));status('ไดรฟ์ถอยกลับ');}
  else if(t<openStart){plug.position.z=startZ;movePose(current,next,(t-closeStart)/(openEnd-closeStart));coverMaterial.opacity=smooth((t-closeStart)/400);status('ปิดช่องเดิม');}
  else {
    if(!swapped){buildHousing(next);swapped=true;}
    plug.position.z=startZ;movePose(current,next,(t-closeStart)/(openEnd-closeStart));
    coverMaterial.opacity=1-smooth((t-openStart)/400);status(t<openEnd ? 'เผยช่องใหม่' : 'พร้อมรอบถัดไป');
  }
}
function renderSlide(t,current,next){
  coverMaterial.opacity=0;
  if(t<900){rig.position.y=0;setPose(current);status('เตรียมเสียบ');}
  else if(t<1300){rig.position.y=0;setPose(current);plug.position.z=THREE.MathUtils.lerp(startZ,insertedZ,smooth((t-900)/400));status('กำลังเสียบ');}
  else if(t<1800){rig.position.y=0;setPose(current);plug.position.z=insertedZ;status('เสียบสำเร็จ');}
  else if(t<2000){rig.position.y=-slideDistance()*easeOut((t-1800)/200);setPose(current);plug.position.z=insertedZ;status('เลื่อนฉากเดิมออก');}
  else {
    if(!swapped){buildHousing(next);swapped=true;}
    setPose(next);rig.position.y=slideDistance()*(1-easeOut((t-2000)/200));status(t<2200 ? 'เลื่อนฉากใหม่เข้า' : 'พร้อมรอบถัดไป');
  }
}
// Two actual faces rotate together: the inserted drive leaves with the old face,
// while the next drive and socket wait on the back face.
let flipRig,flipOldPlug,flipNewPlug,dissolveRig,dissolvePlug,thickRig,thickOldPlug,thickNewPlug;
const thickDepth=2.8,thickWidth=5.2,thickHeight=4.8;
function makeFace(parent,example,z,rotation,backing=true){
  const face=new THREE.Group();parent.add(face);face.position.z=z;face.rotation.y=rotation;
  if(backing)box(width,height,.22,mats.silver,0,0,-.51,face);
  createHousing(example,face);
  const drive=makePlug(face);posePlug(drive,example);return drive;
}
// Keep the brief old-drive-only visibility change isolated from shared materials.
function isolateDriveMaterials(drive){
  const copies=new Map();
  drive.traverse(child=>{
    if(!child.isMesh)return;
    if(!copies.has(child.material)){
      const material=child.material.clone();material.transparent=true;copies.set(child.material,material);
    }
    child.material=copies.get(child.material);
  });
  drive.userData.driveMaterials=[...copies.values()];
}
function extendThickFace(face){
  // Broader sides add real occluding surface without enclosing the front socket.
  const extra=(thickWidth-width)/2;
  for(const side of [-1,1])box(extra,height,.4,mats.hub,side*(width+extra)/2,0,-.2,face);
  const vertical=(thickHeight-height)/2;
  for(const side of [-1,1])box(thickWidth,vertical,.4,mats.hub,0,side*(height+vertical)/2,-.2,face);
}
function buildAlternatives(current,next){
  disposeObject(flipRig);disposeObject(dissolveRig);disposeObject(thickRig);thickRig=null;
  flipRig=new THREE.Group();flipRig.position.z=-.45;scene.add(flipRig);
  box(width,height,.10,mats.silver,0,0,0,flipRig);
  flipOldPlug=makeFace(flipRig,current,.45,0,false);
  flipNewPlug=makeFace(flipRig,next,-.45,Math.PI,false);
  isolateDriveMaterials(flipOldPlug);
  dissolveRig=new THREE.Group();scene.add(dissolveRig);
  dissolvePlug=makeFace(dissolveRig,next,0,0);
  if(mode==='thick'){
    thickRig=new THREE.Group();thickRig.position.z=-thickDepth/2;scene.add(thickRig);
    box(thickWidth,thickHeight,thickDepth-.8,mats.silver,0,0,0,thickRig);
    thickOldPlug=makeFace(thickRig,current,thickDepth/2,0,false);
    thickNewPlug=makeFace(thickRig,next,-thickDepth/2,Math.PI,false);
    extendThickFace(thickOldPlug.parent);extendThickFace(thickNewPlug.parent);
  }
}
function renderThick(t,current,next){
  rig.visible=false;flipRig.visible=false;dissolveRig.visible=false;thickRig.visible=true;
  posePlug(thickOldPlug,current);posePlug(thickNewPlug,next);
  thickRig.rotation.y=0;thickNewPlug.visible=t>=2750;
  if(t<900)status('เตรียมเสียบ');
  else if(t<1300){thickOldPlug.position.z=THREE.MathUtils.lerp(startZ,insertedZ,smooth((t-900)/400));status('กำลังเสียบ');}
  else if(t<1800){thickOldPlug.position.z=insertedZ;status('เสียบสำเร็จ');}
  else {thickOldPlug.position.z=insertedZ;thickRig.rotation.y=Math.PI*smooth((t-1800)/950);status(t<2750?'ฮับหนากำลังพลิก':'พร้อมรอบถัดไป');}
  thickNewPlug.position.z=THREE.MathUtils.lerp(entranceStartZ(next),startZ,smooth((t-2750)/450));
  if(t>=2750&&t<3200)status('ไดรฟ์ใหม่เข้ามา');
}
// A stationary long housing with socket rows and inserted drives scrolling down.
// The upper plane only hides incoming rows above the physical top cap; the
// lower exit is the actual canvas/window edge, not a fade or clipping plane.
const scrollTop=2.1,scrollActive=scrollTop-height/2;
const scrollClip=new THREE.Plane(new THREE.Vector3(0,-1,0),scrollTop);
let scrollRig=null,scrollRows=[],scrollNext=null,scrollFill=null,scrollMaterials=new Map();
function scrollMaterial(material){
  if(!scrollMaterials.has(material)){
    const copy=material.clone();copy.onBeforeCompile=material.onBeforeCompile;
    copy.clippingPlanes=[scrollClip];scrollMaterials.set(material,copy);
  }
  return scrollMaterials.get(material);
}
function makeScrollRow(example){
  const row=new THREE.Group();scrollRig.add(row);createHousing(example,row);
  const drive=makePlug(row);posePlug(drive,example);row.userData.drive=drive;
  row.traverse(child=>{if(child.isMesh)child.material=scrollMaterial(child.material);});
  return row;
}
function disposeScroll(){
  disposeObject(scrollRig);scrollRig=null;scrollRows=[];scrollNext=null;scrollFill=null;
  scrollMaterials.forEach(material=>material.dispose());scrollMaterials=new Map();
}
function initScroll(){
  disposeScroll();scrollRig=new THREE.Group();scene.add(scrollRig);
  const length=1000,center=scrollTop-length/2;
  box(width,length,.22,mats.silver,0,center,-.52,scrollRig);
  // Fill only the empty part below the oldest row, flush with every row face.
  scrollFill=box(width,1,.4,mats.hub,0,0,-.2,scrollRig);
  box(width,.13,.48,mats.silver,0,scrollTop+.065,-.24,scrollRig);
  scrollRows=[makeScrollRow(examples[0])];scrollNext=makeScrollRow(examples[1]);
}
function renderScroll(t){
  rig.visible=false;flipRig.visible=false;dissolveRig.visible=false;scrollRig.visible=true;
  const shift=height*smooth((t-1800)/650);
  scrollRows.forEach((row,i)=>{
    row.position.y=scrollActive-i*height-shift;
    row.userData.drive.position.z=i===0&&t<1300 ? THREE.MathUtils.lerp(startZ,insertedZ,smooth((t-900)/400)) : insertedZ;
  });
  const fillTop=scrollRows[scrollRows.length-1].position.y-height/2,fillBottom=-1000;
  scrollFill.scale.y=fillTop-fillBottom;scrollFill.position.y=(fillTop+fillBottom)/2;
  scrollNext.position.y=scrollActive+height-shift;
  scrollNext.visible=shift>0;
  scrollNext.userData.drive.visible=t>=2450;
  scrollNext.userData.drive.position.z=THREE.MathUtils.lerp(entranceStartZ(examples[(index+1)%examples.length]),startZ,smooth((t-2450)/450));
  status(t<900?'เตรียมเสียบ':t<1300?'กำลังเสียบ':t<1800?'เสียบสำเร็จ':t<2450?'ช่องและไดรฟ์เลื่อนลง':t<2900?'ไดรฟ์ใหม่เข้ามา':'พร้อมรอบถัดไป');
}
function advanceScroll(){
  scrollRows.unshift(scrollNext);
  scrollNext=makeScrollRow(examples[(index+1)%examples.length]);
  // Retire a row only after its full projected bounding box is below the screen.
  camera.updateMatrixWorld();scrollRig.updateMatrixWorld(true);
  while(scrollRows.length>1){
    const row=scrollRows[scrollRows.length-1];
    const b=new THREE.Box3().setFromObject(row);let top=-Infinity;
    for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z])top=Math.max(top,new THREE.Vector3(x,y,z).project(camera).y);
    if(top>=-1.05)break;
    scrollRows.pop();disposeObject(row);
  }
}
function renderFlip(t,current,next,hideBack=false){
  rig.visible=false;dissolveRig.visible=false;flipRig.visible=true;
  posePlug(flipOldPlug,current);posePlug(flipNewPlug,next);
  flipOldPlug.scale.setScalar(1);flipNewPlug.scale.setScalar(1);
  flipOldPlug.parent.visible=true;flipNewPlug.parent.visible=true;
  flipOldPlug.userData.driveMaterials.forEach(material=>{material.opacity=1;material.depthWrite=true;});
  flipNewPlug.position.z=THREE.MathUtils.lerp(insertedZ,startZ,smooth((t-2100)/650));
  flipRig.rotation.y=0;
  if(t<900)status('เตรียมเสียบ');
  else if(t<1300){flipOldPlug.position.z=THREE.MathUtils.lerp(startZ,insertedZ,smooth((t-900)/400));status('กำลังเสียบ');}
  else if(t<1800){flipOldPlug.position.z=insertedZ;status('เสียบสำเร็จ');}
  else {flipOldPlug.position.z=insertedZ;flipRig.rotation.y=Math.PI*smooth((t-1800)/950);status(t<2750?'พลิกฮับไปอีกด้าน':'พร้อมรอบถัดไป');}
  if(hideBack){
    // Keep the drive fixed in the socket and briefly fade only that drive as
    // its face turns edge-on. The hub and the scene never fade or deform.
    const turn=flipRig.rotation.y;
    const view=camera.getWorldDirection(new THREE.Vector3());
    const edge=Math.atan2(-view.x,-view.z)+Math.PI/2;
    const showOld=turn<edge;
    flipOldPlug.parent.visible=showOld;flipNewPlug.parent.visible=!showOld;
    const opacity=1-smooth((turn-(edge-1))/.9);
    flipOldPlug.userData.driveMaterials.forEach(material=>{material.opacity=opacity;material.depthWrite=opacity>=1;});
    // Do not reveal the next drive, including its orientation, during the turn.
    // After the turn it arrives from outside the scene, not from inside the hub.
    flipNewPlug.visible=t>=2750;
    flipNewPlug.position.z=THREE.MathUtils.lerp(entranceStartZ(next),startZ,smooth((t-2750)/450));
    if(t>=1800&&t<2750)status('พลิกโดยซ่อนด้านหลัง');
    else if(t>=2750&&t<3200)status('ไดรฟ์ใหม่เข้ามา');
  }
  else flipNewPlug.visible=true;
}
// Mix complete rendered frames rather than fading individual meshes. This avoids
// transparent-mesh sorting artifacts and never fades through an empty scene.
const frameA=new THREE.WebGLRenderTarget(1,1),frameB=new THREE.WebGLRenderTarget(1,1);
const mixScene=new THREE.Scene(),mixCamera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
const mixMaterial=new THREE.ShaderMaterial({transparent:true,depthTest:false,depthWrite:false,uniforms:{a:{value:frameA.texture},b:{value:frameB.texture},amount:{value:0}},vertexShader:'varying vec2 vUv; void main(){vUv=uv; gl_Position=vec4(position.xy,0.0,1.0);}',fragmentShader:'uniform sampler2D a; uniform sampler2D b; uniform float amount; varying vec2 vUv; void main(){gl_FragColor=mix(texture2D(a,vUv),texture2D(b,vUv),amount);\n#include <colorspace_fragment>\n}'});
mixScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),mixMaterial));
function renderDissolve(t,current,next){
  flipRig.visible=false;rig.position.y=0;coverMaterial.opacity=0;setPose(current);posePlug(dissolvePlug,next);
  if(t<900)status('เตรียมเสียบ');
  else if(t<1300){plug.position.z=THREE.MathUtils.lerp(startZ,insertedZ,smooth((t-900)/400));status('กำลังเสียบ');}
  else {plug.position.z=insertedZ;status(t<1800?'เสียบสำเร็จ':t<2700?'ภาพเก่าและใหม่ซ้อนเปลี่ยน':'พร้อมรอบถัดไป');}
  rig.visible=true;dissolveRig.visible=false;renderer.setRenderTarget(frameA);renderer.clear();renderer.render(scene,camera);
  rig.visible=false;dissolveRig.visible=true;renderer.setRenderTarget(frameB);renderer.clear();renderer.render(scene,camera);
  renderer.setRenderTarget(null);mixMaterial.uniforms.amount.value=smooth((t-1800)/900);renderer.render(mixScene,mixCamera);
}
function reset(){index=0;elapsed=0;swapped=false;rig.position.y=0;coverMaterial.opacity=0;buildHousing(examples[0]);setPose(examples[0]);buildAlternatives(examples[0],examples[1]);if(mode==='scroll')initScroll();else disposeScroll();lastTime=performance.now();}
function setMode(next){
  mode=next;for(const name of ['cover','slide','flip','flip-hidden','thick','dissolve','scroll'])$('mode-'+name).setAttribute('aria-pressed',String(mode===name));
  $('preview-description').textContent={cover:'ฮับอยู่นิ่ง ช่องเก่าถูกปิดแล้วเผยช่องใหม่',slide:'ฉากเดิมเลื่อนออก แล้วฉากใหม่เลื่อนเข้ามา',flip:'ไดรฟ์ติดไปกับฮับที่พลิก เผยช่องและไดรฟ์ใหม่ด้านหลัง','flip-hidden':'ไดรฟ์เดิมติดกับฮับ ไดรฟ์ใหม่เข้ามาหลังพลิกเสร็จ',thick:'ฮับหนาขึ้นบังไดรฟ์ด้วยรูปทรงจริง โดยไม่เฟด',dissolve:'ภาพรอบเก่าซ้อนเปลี่ยนเป็นรอบใหม่ โดยไม่เฟดผ่านฉากว่าง',scroll:'ฮับต่อเนื่องลงถึงขอบจอ ไดรฟ์ที่เสียบแล้วเลื่อนลงตามช่อง'}[mode];
  document.querySelector('.preview-shell').classList.toggle('scroll-preview',mode==='scroll');
  reset();resize();
}
$('mode-cover').addEventListener('click',()=>setMode('cover'));
$('mode-slide').addEventListener('click',()=>setMode('slide'));
$('mode-flip').addEventListener('click',()=>setMode('flip'));
$('mode-flip-hidden').addEventListener('click',()=>setMode('flip-hidden'));
$('mode-thick').addEventListener('click',()=>setMode('thick'));
$('mode-dissolve').addEventListener('click',()=>setMode('dissolve'));
$('mode-scroll').addEventListener('click',()=>setMode('scroll'));
$('pause-btn').addEventListener('click',()=>{paused=!paused;$('pause-btn').textContent=paused?'เล่นต่อ':'หยุดชั่วคราว';$('pause-btn').setAttribute('aria-pressed',String(paused));lastTime=performance.now();});
function resize(){
  const w=$('preview-scene').clientWidth,h=$('preview-scene').clientHeight;if(!w||!h)return;
  renderer.setSize(w,h,false);const aspect=w/h;camera.updateMatrixWorld();
  const size=renderer.getDrawingBufferSize(new THREE.Vector2());frameA.setSize(size.x,size.y);frameB.setSize(size.x,size.y);
  const bounds=mode==='scroll'
    ? new THREE.Box3(new THREE.Vector3(-width/2,scrollActive-height/2,-.62),new THREE.Vector3(width/2,scrollTop,4.8))
    : mode==='thick'
    ? new THREE.Box3(new THREE.Vector3(-4.2,-2.4,-5.6),new THREE.Vector3(4.2,2.4,2.8))
    : new THREE.Box3(new THREE.Vector3(-width/2,-height/2,-.62),new THREE.Vector3(width/2,height/2,4.8));
  let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
  for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){
    const p=new THREE.Vector3(x,y,z).applyMatrix4(camera.matrixWorldInverse);minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y);
  }
  const hubX=new THREE.Vector3(0,0,mode==='thick'?-thickDepth/2:-.2).applyMatrix4(camera.matrixWorldInverse).x;
  const needed=Math.max((maxX-hubX+.65)/.9,(hubX-minX+.65)/1.1);
  const half=Math.max(3.5,(maxY-minY)/2+.9,needed/aspect),cx=hubX-.1*half*aspect,cy=mode==='scroll'?maxY+.6-half:(minY+maxY)/2-.2;
  camera.left=cx-half*aspect;camera.right=cx+half*aspect;camera.top=cy+half;camera.bottom=cy-half;camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe($('preview-scene'));reset();resize();
function animate(now){
  requestAnimationFrame(animate);
  if(!paused)elapsed+=Math.min(50,Math.max(0,now-lastTime));lastTime=now;
  const duration=mode==='cover' ? 3600 : mode==='slide' ? 2700 : mode==='flip-hidden'||mode==='thick' ? 3700 : 3300;
  if(elapsed>=duration){elapsed-=duration;index=(index+1)%examples.length;swapped=false;if(mode==='scroll')advanceScroll();else {buildHousing(examples[index]);buildAlternatives(examples[index],examples[(index+1)%examples.length]);}}
  const current=examples[index],next=examples[(index+1)%examples.length];
  if(thickRig)thickRig.visible=false;
  if(scrollRig)scrollRig.visible=false;
  if(mode==='dissolve')renderDissolve(elapsed,current,next);
  else {
    rig.visible=true;flipRig.visible=false;dissolveRig.visible=false;
    if(mode==='cover')renderCover(elapsed,current,next);else if(mode==='slide')renderSlide(elapsed,current,next);else if(mode==='thick')renderThick(elapsed,current,next);else if(mode==='scroll')renderScroll(elapsed);else renderFlip(elapsed,current,next,mode==='flip-hidden');
    renderer.render(scene,camera);
  }
}
requestAnimationFrame(animate);
