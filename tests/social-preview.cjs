// Guard the Open Graph and Twitter card metadata used when a game link is shared.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');

const meta=(attribute,name)=>new RegExp(`<meta ${attribute}="${name}" content="([^"]*)">`).exec(html)?.[1];
assert.equal(meta('property','og:type'),'website');
assert.equal(meta('property','og:site_name'),'PHIT DAN');
assert.equal(meta('property','og:title'),'PHIT DAN','a shared link should show the game name');
assert.match(meta('property','og:description')||'',/Flip the USB drive the right way/,'a shared link needs a short description');
assert.equal(meta('property','og:image'),'./assets/og-card.png');
assert.equal(meta('property','og:image:width'),'1200');
assert.equal(meta('property','og:image:height'),'630');
assert.match(meta('property','og:image:alt')||'',/PHIT DAN/,'the preview image needs alternative text');
assert.equal(meta('name','twitter:card'),'summary_large_image');
assert.equal(meta('name','twitter:title'),'PHIT DAN');
assert.equal(meta('name','twitter:image'),'./assets/og-card.png');

const png=fs.readFileSync(path.join(root,'assets','og-card.png'));
assert.equal(png.subarray(1,4).toString('latin1'),'PNG','the preview card should be a PNG');
assert.equal(png.readUInt32BE(16),1200,'the preview card should be 1200 px wide');
assert.equal(png.readUInt32BE(20),630,'the preview card should be 630 px tall');

console.log('Link-preview metadata and 1200x630 card checks passed.');
