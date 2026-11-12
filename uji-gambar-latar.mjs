import { createRequire } from 'module';
const require=createRequire('/opt/npm-tools/node_modules/');
const { chromium }=require('playwright');
import fs from 'fs';
const R=[];const ok=(n,c,x='')=>{R.push([c?'LULUS':'GAGAL',n,x]);console.log((c?'LULUS ':'GAGAL ')+n+(x?'  → '+x:''))};
const br=await chromium.launch();
const ctx=await br.newContext({viewport:{width:390,height:844},acceptDownloads:true});
const page=await ctx.newPage();
page.on('pageerror',e=>console.log('PAGEERROR',e.message));
await page.goto('http://localhost:8765/index.html');
await page.waitForSelector('[data-a=demo]');
await page.click('[data-a=demo]');
await page.waitForTimeout(400);
const idG=await page.evaluate(()=>S().passages.find(p=>p.title==='Gerbang').id);
const idT=await page.evaluate(()=>S().passages.find(p=>p.title==='Taman').id);
// ---------- (a) impor aset
await page.click('[data-a=tab][data-id=kd]');
await page.click('[data-a=aset]');
await page.setInputFiles('#af','gerbang.png');
await page.waitForFunction(()=>!document.getElementById('aadd').disabled);
await page.fill('#aid','gerbang-pagi');
await page.click('#aadd');await page.waitForTimeout(500);
await page.click('[data-a=dx]').catch(()=>{});
// tambah jpg juga + sebuah audio-bukan-gambar tidak perlu
await page.click('[data-a=aset]');
await page.setInputFiles('#af','taman.png');
await page.waitForFunction(()=>!document.getElementById('aadd').disabled);
await page.fill('#aid','taman-sore');
await page.click('#aadd');await page.waitForTimeout(500);
await page.evaluate(()=>{const d=document.getElementById('dlg');if(d.open)d.close()});
// pasang di pDlg
await page.click('[data-a=tab][data-id=ed]');
await page.click(`[data-a=ep][data-id="${idG}"]`);
ok('pDlg punya bagian Gambar latar + tombol Pilih gambar',await page.locator('#pgb [data-a=pgb]').count()===1);
await page.click('#pgb [data-a=pgb]');
await page.waitForSelector('#pgl [data-a=pgp]');
ok('daftar pilihan memuat 2 aset gambar dengan thumbnail',(await page.locator('#pgl [data-a=pgp]').count())===2&&(await page.locator('#pgl img').count())===2);
await page.click('#pgl [data-a=pgp][data-id="gerbang-pagi"]');
await page.waitForSelector('#pgb > img');
ok('preview kecil tampil setelah memilih, daftar menutup',await page.locator('#pgb > img').evaluate(i=>i.complete&&i.naturalWidth>0)&&await page.locator('#pgl img').count()===0);
await page.screenshot({path:'s-pdlg.png'});
await page.click('[data-a=ds]');await page.waitForTimeout(300);
ok('passage.gambar terisi',await page.evaluate(id=>P(S(),id).gambar,idG)==='gerbang-pagi');
ok('passage lain tanpa field gambar',await page.evaluate(()=>S().passages.filter(p=>'gambar' in p).length)===1);
// main
await page.click('[data-a=tab][data-id=play]');
await page.waitForSelector('.stage .bgi[data-sumber]');
const info=await page.evaluate(()=>{const i=document.querySelector('.bgi'),cs=getComputedStyle(i),st=document.querySelector('.stage').getBoundingClientRect(),ib=i.getBoundingClientRect();
 const card=document.querySelector('.stage .card').getBoundingClientRect();
 const hit=document.elementFromPoint(card.x+card.width/2,card.y+card.height/2);
 return{sumber:i.dataset.sumber,src:i.src.slice(0,5),w:i.naturalWidth,fit:cs.objectFit,z:cs.zIndex,pos:cs.position,cover:Math.abs(ib.width-st.width)<1&&Math.abs(ib.height-st.height)<1,hitIsImg:hit===i,urls:urlAset.size}});
ok('Main: <img> render, sumber indexeddb, blob:',info.sumber==='indexeddb'&&info.src==='blob:'&&info.w>0,JSON.stringify(info));
ok('object-fit cover, z-index -1, menutupi seluruh stage',info.fit==='cover'&&info.z==='-1'&&info.cover);
ok('teks/kartu berada DI ATAS gambar (elementFromPoint bukan img)',!info.hitIsImg);
await page.screenshot({path:'s-play-terang.png'});
// render ulang di scene sama tidak menumpuk URL
for(let i=0;i<4;i++){await page.evaluate(()=>render());await page.waitForSelector('.bgi[data-sumber]');await page.waitForTimeout(80)}
ok('re-render 4x di scene sama: urlAset tetap 1',await page.evaluate(()=>urlAset.size)===1,'size='+await page.evaluate(()=>urlAset.size));
// revoke saat pindah scene
const urlLama=await page.evaluate(()=>document.querySelector('.bgi').src);
await page.click('[data-a=go]:has-text("Ke taman")');
await page.waitForTimeout(300);
const rv=await page.evaluate(async u=>{let gagal=false;try{await fetch(u)}catch(e){gagal=true}return{gagal,urls:urlAset.size,ada:!!document.querySelector('.bgi')}},urlLama);
ok('pindah scene (tanpa gambar): blob URL lama dicabut, urlAset kosong, tidak ada <img>',rv.gagal&&rv.urls===0&&!rv.ada,JSON.stringify(rv));
// kembali ke gerbang, gambar muncul lagi; lalu ke scene bergambar lain (Taman diberi gambar kedua)
await page.evaluate(id=>{P(S(),id).gambar='taman-sore'},idT);
await page.click('[data-a=bk]');await page.waitForSelector('.bgi[data-sumber]');
const u1=await page.evaluate(()=>document.querySelector('.bgi').src);
await page.click('[data-a=go]:has-text("Ke taman")');await page.waitForFunction(()=>document.querySelector('.stage h2')?.textContent==='Taman');await page.waitForSelector('.bgi[data-sumber]');await page.waitForTimeout(200);
const rv2=await page.evaluate(async u=>{let gagal=false;try{await fetch(u)}catch(e){gagal=true}return{gagal,urls:urlAset.size,src:document.querySelector('.bgi').src!==u}},u1);
ok('gambar→gambar: URL scene lama dicabut, URL baru aktif (size 1)',rv2.gagal&&rv2.urls===1&&rv2.src,JSON.stringify(rv2));
await page.evaluate(id=>{delete P(S(),id).gambar},idT);
await page.click('[data-a=bk]');await page.waitForFunction(()=>document.querySelector('.stage h2')?.textContent==='Gerbang');await page.waitForSelector('.bgi[data-sumber]');await page.waitForTimeout(300);
// refresh
await page.reload();await page.waitForSelector('[data-a=tab]');await page.waitForTimeout(500);
await page.click('[data-a=tab][data-id=play]');
if(await page.locator('[data-a=lanjut]').count())await page.click('[data-a=lanjut]');
await page.waitForTimeout(300);
let ada=await page.locator('.bgi[data-sumber]').count();
if(!ada){await page.click('[data-a=baru]').catch(()=>{});await page.waitForTimeout(200)}
await page.waitForSelector('.bgi[data-sumber]',{timeout:4000}).catch(()=>{});
const rf=await page.evaluate(()=>{const i=document.querySelector('.bgi');return i?{sumber:i.dataset.sumber,w:i.naturalWidth}:null});
ok('(a) refresh: gambar tetap tampil dari IndexedDB',!!rf&&rf.sumber==='indexeddb'&&rf.w>0,JSON.stringify(rf));
// ---------- (c) ekspor HTML inline (sebelum (b) menghapus blob)
await page.click('[data-a=tab][data-id=lib]');
const idS=await page.evaluate(()=>S().id);
await page.click(`[data-a=exp][data-id="${idS}"]`);
await page.waitForTimeout(500);
const [dl]=await Promise.all([page.waitForEvent('download'),page.click('[data-a=dlh]')]);
await dl.saveAs('ekspor.html');
const eh=fs.readFileSync('ekspor.html','utf8');
ok('(c) berkas ekspor terunduh, ukuran',eh.length>0,(eh.length/1024).toFixed(0)+' KB');
ok('(c) ekspor memuat data URI hanya untuk gambar yang dipakai (1 dari 2)',(eh.match(/data:image\/png;base64,/g)||[]).length===1);
ok('(c) ekspor tidak membawa kode editor (resolveAset/IndexedDB)',!/resolveAset|asetGet|indexedDB/.test(eh));
const ctx2=await br.newContext({viewport:{width:390,height:844}});
const p2=await ctx2.newPage();p2.on('pageerror',e=>console.log('PAGEERROR2',e.message));
await p2.goto('file://'+process.cwd()+'/ekspor.html');
await p2.waitForSelector('.stage');await p2.waitForTimeout(400);
const ex=await p2.evaluate(()=>{const i=document.querySelector('.bgi');const cs=i&&getComputedStyle(i);return i?{w:i.naturalWidth,src:i.src.slice(0,22),fit:cs.objectFit,z:cs.zIndex,editor:typeof asetGet}:null});
ok('(c) HTML ekspor di konteks baru (tanpa IndexedDB editor): gambar tampil',!!ex&&ex.w>0&&ex.src.startsWith('data:image/png;base64')&&ex.editor==='undefined',JSON.stringify(ex));
await p2.screenshot({path:'s-ekspor.png'});
await p2.click('[data-a=go]:has-text("Ke taman")');await p2.waitForTimeout(200);
ok('(c) ekspor: scene tanpa gambar tidak punya <img>',await p2.locator('.bgi').count()===0);
// json tidak berubah
await page.evaluate(()=>{const d=document.getElementById('dlg');if(d.open)d.close()});
const [dj]=await Promise.all([page.waitForEvent('download'),(async()=>{await page.click(`[data-a=exp][data-id="${idS}"]`);await page.waitForTimeout(300);await page.click('[data-a=dlj]')})()]);
await dj.saveAs('ekspor.json');const js=fs.readFileSync('ekspor.json','utf8');
ok('JSON cadangan tetap tanpa data URI (format tidak berubah)',!/base64/.test(js)&&/"gambar": "gerbang-pagi"/.test(js));
await page.evaluate(()=>{const d=document.getElementById('dlg');if(d.open)d.close()});
// ---------- (b) hapus blob dari IndexedDB
await page.evaluate(idc=>new Promise((ok,no)=>{const r=indexedDB.open('cerita-aset');r.onsuccess=()=>{const t=r.result.transaction('aset','readwrite');t.objectStore('aset').delete(idc+'/gerbang-pagi');t.oncomplete=()=>{r.result.close();ok()};t.onerror=()=>no(t.error)}}),idS);
await page.click('[data-a=tab][data-id=play]');
if(await page.locator('[data-a=lanjut]').count())await page.click('[data-a=lanjut]');
await page.waitForFunction(()=>{const i=document.querySelector('.bgi');return i&&i.dataset.sumber},null,{timeout:6000});
const pb=await page.evaluate(()=>{const i=document.querySelector('.bgi'),cs=getComputedStyle(i);return{sumber:i.dataset.sumber,svg:i.src.startsWith('data:image/svg+xml'),fit:cs.objectFit,btn:!!document.querySelector('.stage button.sm'),teks:document.querySelector('.stage .card')?.innerText.slice(0,20)}});
ok('(b) blob dihapus: placeholder tampil, tombol Unduh aset ada, teks tetap terbaca',pb.sumber==='placeholder'&&pb.svg&&pb.btn&&!!pb.teks,JSON.stringify(pb));
await page.screenshot({path:'s-placeholder.png'});
// gambar bernilai aneh tidak merusak
const aneh=await page.evaluate(()=>{const p=S().passages.find(p=>p.start);const out=[];for(const v of [{},'__proto__','../x',123,null,'x"><script>']){p.gambar=v;try{eng=null;const h=vPlay(S());out.push(h.includes('<script>')?'XSS':'ok')}catch(e){out.push('galat:'+e.message)}}return out});
ok('nilai gambar aneh (objek, __proto__, path, angka, null, tag) aman',aneh.every(x=>x==='ok'),aneh.join(','));
// gelap
await br.close();
fs.writeFileSync('hasil.json',JSON.stringify(R,null,1));
console.log(R.filter(r=>r[0]==='GAGAL').length+' gagal dari '+R.length);
