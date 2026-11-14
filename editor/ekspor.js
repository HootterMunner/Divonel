/* ═══ editor/ekspor.js — ekspor cerita ═══
   Game (.html): kode player/ + cerita sebagai data (gambar latar yang dipakai disalin sebagai data URI).
   Cadangan (.json): cerita saja, tanpa aset (format dibekukan). Hanya editor; tidak ikut ekspor. */
/* Ekspor HTML satu file: gambar latar yang dipakai disalin sebagai data URI ke salinan cerita (hanya untuk .html; .json dan bangunGame tidak berubah). */
const inlineJanji=new Map(),inlineCache=new Map();
const keDataUrl=b=>new Promise(ok=>{const f=new FileReader();f.onload=()=>ok(String(f.result));f.onerror=()=>ok('');f.readAsDataURL(b)});
function inlineSiap(id){
  let j=inlineJanji.get(id);if(j)return j;
  j=(async()=>{
    const out={},x=db.stories.find(v=>v.id===id);
    try{if(x&&idb){
      const pakai=[...new Set(x.passages.map(p=>p.gambar).filter(g=>typeof g==='string'&&entriCerita(x,g)))];
      for(const g of pakai){
        const r=await asetGet(id,g).catch(()=>null);
        if(!r||!(r.blob instanceof Blob)||!String(r.tipe).startsWith('image/'))continue;
        const d=await keDataUrl(r.blob);if(d)out[g]=d;
      }
    }}catch(e){console.warn('[inline]',e)}
    inlineCache.set(id,out);return out;
  })();
  inlineJanji.set(id,j);return j;
}
function denganInline(x){
  const o=inlineCache.get(x.id);if(!o||!Object.keys(o).length)return x;
  const a={};for(const k of Object.keys(daftarAset(x)))a[k]=Object.assign({},x.aset[k]);
  for(const k of Object.keys(o))a[k]=Object.assign(a[k]||{},{data:o[k]});
  return Object.assign({},x,{aset:a});
}
/* Sumber kode game untuk ekspor HTML: berkas di folder player/ dibaca lewat fetch lalu disisipkan ke HTML ekspor.
   Daftar ini HARUS sama dengan <link>/<script> player/ di index.html (urutan = urutan muat).
   Di file:// browser memblokir fetch: pengguna memilih berkas player/ sekali lewat tombol (lihat pilihSumber). */
const BERKAS_PLAYER={css:['player/player.css'],js:['player/mesin.js','player/dsl.js','player/player.js']};
class SumberGagal extends Error{}
const sumberManual=new Map(); // jalur berkas → teks, hanya jika dipilih manual (cadangan untuk file://)
let janjiSumber=null;
async function bacaBerkas(p){
  try{const r=await fetch(p,{cache:'no-cache'});if(!r.ok)throw new Error('HTTP '+r.status);return await r.text()}
  catch(e){
    if(sumberManual.has(p))return sumberManual.get(p);
    throw new SumberGagal('Ekspor HTML perlu membaca folder player/, tetapi browser memblokirnya (biasanya karena halaman dibuka lewat file://). Pilih semua berkas di folder player/ sekali saja, atau buka lewat alamat web.');
  }
}
function sumberPlayer(segar){
  if(segar||!janjiSumber){
    const n=BERKAS_PLAYER.css.length,j=Promise.all([...BERKAS_PLAYER.css,...BERKAS_PLAYER.js].map(bacaBerkas)).then(h=>({css:h.slice(0,n),js:h.slice(n)}));
    janjiSumber=j;j.catch(()=>{if(janjiSumber===j)janjiSumber=null});
  }
  return janjiSumber;
}
function sumberGagal(e){
  const n=D.open&&D.querySelector('#dnote');
  if(!n){warn(e.message);return}
  n.textContent=e.message+' ';
  const b=document.createElement('button');b.className='sm';b.dataset.a='pilihsumber';b.textContent='Pilih berkas aplikasi';n.appendChild(b);
}
function pilihSumber(){ // dipanggil langsung dari klik (butuh gestur pengguna)
  const i=document.createElement('input');i.type='file';i.multiple=true;i.accept='.js,.css';
  i.onchange=async()=>{
    const per=new Map([...i.files].map(f=>[f.name,f])),semua=[...BERKAS_PLAYER.css,...BERKAS_PLAYER.js],hilang=[];
    for(const p of semua){const f=per.get(p.split('/').pop());if(f)sumberManual.set(p,await f.text());else hilang.push(p.split('/').pop())}
    janjiSumber=null;
    if(hilang.length)sumberGagal(new SumberGagal('Belum terpilih: '+hilang.join(', ')+'. Pilih semua berkas di folder player/ sekaligus.'));
    else catat('Berkas dimuat. Klik lagi Game (.html).');
  };
  i.click();
}
/* Pengenteng baris (enxuti) mengandaikan kode player tidak punya template literal multibaris yang peka spasi. */
const enxuti=t=>{let c=0,o=[];for(let l of t.split('\n')){l=l.trim();if(c){const i=l.indexOf('*/');if(i<0)continue;c=0;l=l.slice(i+2).trim()}else if(l.startsWith('/*')){const i=l.indexOf('*/');if(i<0){c=1;continue}if(i+2===l.length)continue}if(l&&!l.startsWith('//'))o.push(l)}return o.join('\n')};
async function bangunGame(x){
  const{css,js}=await sumberPlayer();
  const data=JSON.stringify(x).replace(/</g,'\\u003c'),S1='<'+'script>',S2='</'+'script>';
  const boot=`const STORY=${data};
db={stories:[STORY],active:STORY.id};db.stories.forEach(migrasi);
function render(){$('app').innerHTML=vPlay(S())}
document.addEventListener('click',e=>{const el=e.target.closest('[data-a]');if(el&&aksiPlay(el.dataset.a,el.dataset.id,el))render()});
render();`;
  return `<!-- Editor Cerita Interaktif, (c) 2026 Helmy Hidayat, lisensi MIT -->\n<!DOCTYPE html>\n<html lang="id">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<title>${esc(x.title)}</title>\n<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap" rel="stylesheet">\n<style>\n${css.map(c=>c.trim()).join('\n')}\n\nbody{padding-bottom:0!important}</style>\n</head>\n<body>\n<main id="app"></main>\n<dialog id="dlg"></dialog>\n${S1}${enxuti(js.join('\n'))}\n${boot}${S2}\n</body>\n</html>`;
}
/* Unduh: Blob + <a download>. Tanpa API khusus. Jika gagal/terblokir, dialog fallback (salin / buka di tab baru). */
function catat(m){const e=D.open&&D.querySelector('#dnote');if(e)e.textContent=m;else toast(m)}
async function siapkan(id,jenis){
  const x=db.stories.find(v=>v.id===id);if(!x)return null;
  const nama=(x.title||'cerita').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'cerita',h=jenis==='html';
  try{
    if(h)await inlineSiap(id); // gambar latar yang dipakai → data URI (lihat inlineSiap)
    return{nama:nama+(h?'.html':'.json'),mime:h?'text/html':'application/json',data:h?await bangunGame(denganInline(x)):JSON.stringify({version:'1.2',story:x},null,1)};
  }catch(e){if(e instanceof SumberGagal)sumberGagal(e);else warn(e.message);return null}
}
async function unduh(id,jenis){
  const b=await siapkan(id,jenis);if(!b)return;
  try{
    const u=URL.createObjectURL(new Blob([b.data],{type:b.mime})),a=document.createElement('a');
    a.href=u;a.download=b.nama;a.rel='noopener';a.style.display='none';
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(u),10000);
    catat('Unduhan dimulai: '+b.nama+'. Tidak muncul? Pakai tombol di bawah.');
  }catch(e){fallback(id,jenis,'Unduhan gagal ('+((e&&e.message)||e)+').')}
}
async function fallback(id,jenis,pesan){
  const b=await siapkan(id,jenis);if(!b)return;
  dlg(`<h2>Simpan manual</h2><p class="sub">${esc(pesan||'')} Salin teks ini lalu simpan sebagai <b>${esc(b.nama)}</b>, atau buka di tab baru dan simpan dari sana.</p><textarea id="f1" readonly style="min-height:200px;font-family:monospace;font-size:12px">${esc(b.data)}</textarea><p id="dnote" class="sub"></p><div class="row" style="justify-content:flex-end;flex-wrap:wrap"><button data-a="exp" data-id="${id}">Kembali</button><button data-a="fbo" data-id="${id}" data-j="${jenis}">Buka di tab baru</button><button class="pr" data-a="cp">Salin ke papan klip</button></div>`,null);
}
