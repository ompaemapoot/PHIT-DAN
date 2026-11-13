// Guard the installable-app assets: manifest, icons and the self-hosted fonts.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'fonts.css'),'utf8');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.webmanifest'),'utf8'));

assert.match(html,/<link rel="manifest" href="\.\/manifest\.webmanifest">/,'the page should link its manifest');
assert.match(html,/<link rel="apple-touch-icon" href="\.\/assets\/apple-touch-icon\.png">/,'iOS needs an apple-touch icon');
assert.match(html,/<link rel="stylesheet" href="\.\/fonts\.css\?v=3">/,'the page should load the local font stylesheet');
assert.ok(!/fonts\.googleapis\.com|fonts\.gstatic\.com|preconnect/.test(html),
  'the page must not request fonts from Google any more');

assert.equal(manifest.name,'PHIT DAN');
assert.equal(manifest.short_name,'PHIT DAN');
assert.equal(manifest.display,'standalone','an installed game should open without browser chrome');
assert.equal(manifest.orientation,'portrait','touch play is portrait only');
assert.equal(manifest.start_url,'./');
assert.match(manifest.description,/Flip the USB drive the right way/);
assert.equal(manifest.theme_color,'#eef2f7');
const sizes=manifest.icons.map(icon=>icon.sizes);
assert.ok(sizes.includes('192x192')&&sizes.includes('512x512'),'Android installability needs 192 px and 512 px icons');
assert.ok(manifest.icons.some(icon=>icon.purpose==='maskable'),'a maskable icon keeps the launcher shape safe');

function png(pathname){
  const data=fs.readFileSync(path.join(root,pathname));
  assert.equal(data.subarray(1,4).toString('latin1'),'PNG',`${pathname} should be a PNG`);
  return {width:data.readUInt32BE(16),height:data.readUInt32BE(20)};
}
assert.deepEqual(png('assets/icon-192.png'),{width:192,height:192});
assert.deepEqual(png('assets/icon-512.png'),{width:512,height:512});
assert.deepEqual(png('assets/apple-touch-icon.png'),{width:180,height:180});

const faces=[...css.matchAll(/@font-face\s*\{([^}]*)\}/g)].map(match=>match[1]);
assert.ok(faces.length>=8,`expected the self-hosted font faces, found ${faces.length}`);
for(const face of faces){
  assert.match(face,/url\('\.\/assets\/fonts\/[a-z0-9-]+\.woff2'\)/,'every face should point at a local woff2 file next to the stylesheet');
  assert.doesNotMatch(face,/https?:\/\//,'no face should load from a remote font host');
}
const fontFiles=fs.readdirSync(path.join(root,'assets','fonts')).filter(name=>name.endsWith('.woff2'));
assert.ok(fontFiles.length>=16,`expected the downloaded woff2 subsets, found ${fontFiles.length}`);
for(const name of fontFiles) assert.equal(fs.readFileSync(path.join(root,'assets','fonts',name)).subarray(0,4).toString('latin1'),'wOF2',`${name} should be a woff2 file`);
assert.ok(css.includes("font-family: 'DM Sans'")&&css.includes("font-family: 'Kanit'"),'both UI families should be self-hosted');
assert.ok(css.includes('U+0E01'),'the Kanit Thai subset should be kept for Thai text');

console.log('Manifest, icons and self-hosted font checks passed.');
