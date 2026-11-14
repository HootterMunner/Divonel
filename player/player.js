/* ═══ player/player.js — pemain (Play) ═══
   Pembantu bersama (db, S, esc, dlg, toast, warn), simpan/muat pemain, renderer Play (vPlay, latarGambar),
   jalankanJs, pustaka skrip, migrasi, aksiPlay. Ikut ke HTML ekspor; editor memakainya juga di tab Main. */
/* ── Pembantu bersama (editor & ekspor) ── */
let db={stories:[],active:null},onSave=null,askFn=null;
let save=()=>{};
const uid=()=>Math.random().toString(36).slice(2,10);
const S=()=>db.stories.find(s=>s.id===db.active);
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const P=(s,id)=>s.passages.find(p=>p.id===id);
const $=id=>document.getElementById(id);
const D=$('dlg');
const dlg=(h,fn)=>{D.innerHTML=h;onSave=fn;if(!D.open)D.showModal()};
function toast(m){let t=document.getElementById('toast');if(!t){t=document.createElement('div');t.id='toast';t.className='toast';document.body.appendChild(t)}t.textContent=m;t.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>{t.hidden=true},3500)}
function warn(m){if(D.open){let e=D.querySelector('#derr');if(!e){e=document.createElement('p');e.id='derr';e.className='err';D.prepend(e)}e.textContent=m}else toast(m)}
function ask(m,f){askFn=f;dlg(`<h2 style="font-size:15px">${esc(m)}</h2><div class="row" style="justify-content:flex-end;margin-top:12px"><button data-a="dx">Batal</button><button class="pr" data-a="askyes">Ya, lanjutkan</button></div>`,null)}
const empty=(t,s,x='')=>`<div class="empty"><b>${t}</b>${s}<div class="row" style="justify-content:center;margin-top:14px">${x}</div></div>`;
const head=(t,s)=>`<h1>${t}</h1><p class="sub">${s}</p>`;
function stageCss(){
  const t=(eng&&eng.tema)||{},z=v=>String(v).replace(/[^\w#(),.% \-]/g,''),c=[];
  if(t.latar)c.push(`--bg:${z(t.latar)};background:${z(t.latar)}`);
  if(t.kartu)c.push(`--card:${z(t.kartu)}`);
  if(t.teks)c.push(`--t:${z(t.teks)};--t2:${z(t.teks)};color:${z(t.teks)}`);
  if(t.aksen)c.push(`--p:${z(t.aksen)}`);
  if(t.font)c.push(`font-family:${({serif:'Georgia,serif',mono:'ui-monospace,monospace',sans:'inherit'})[t.font]||z(t.font)}`);
  if(t.ukuran)c.push(`font-size:${Math.max(12,Math.min(24,+t.ukuran||14))}px`);
  const f=eng&&eng.fx&&eng.fx.masuk;if(f)c.push(`animation:fin ${f}ms ease both`);
  return c.join(';');
}
/* ── Simpan/muat pemain: 3 slot manual + autosave (localStorage, hanya state permainan, tanpa hist) ── */
const AUTO_MAX=100*1024;
const saveKey=(id,slot)=>slot==='auto'?`cerita-autosave-${id}`:`cerita-save-${id}-${slot}`;
const fmtT=t=>{try{return new Date(t).toLocaleString('id-ID',{dateStyle:'medium',timeStyle:'short'})}catch(e){return ''}};
function bacaRec(id,slot){try{const r=JSON.parse(localStorage.getItem(saveKey(id,slot)));return r&&r.v===1&&r.game&&typeof r.scene==='string'?r:null}catch(e){return null}}
function hapusAuto(id){try{localStorage.removeItem(saveKey(id,'auto'))}catch(e){}}
function listSlots(id){return [1,2,3].map(n=>({slot:n,rec:bacaRec(id,n)}))}
function saveGame(s,slot){
  const g=eng.inti.simpanGame();
  const rec={v:1,t:Date.now(),scene:g.scene,judul:(P(s,g.scene)||{}).title||g.scene,n:eng.hist.length+1+(eng.base||0),game:g,extra:eng.extra||[],tema:eng.tema||null,fx:eng.fx||null};
  const raw=JSON.stringify(rec),kb=new TextEncoder().encode(raw).length;
  if(slot==='auto'){eng.autoKB=kb;
    if(kb>AUTO_MAX){eng.autoWarn=`Autosave dilewati: ${(kb/1024).toFixed(1)} KB melebihi batas ${AUTO_MAX/1024} KB. Simpanan otomatis terakhir tidak diperbarui.`;return false}
    eng.autoWarn=null}
  try{localStorage.setItem(saveKey(s.id,slot),raw);return true}catch(e){if(slot==='auto')eng.autoWarn='Autosave gagal ditulis: penyimpanan browser penuh atau diblokir.';return false}
}
function loadGame(s,slot){
  const r=bacaRec(s.id,slot);if(!r)throw new Error('Simpanan kosong atau rusak');
  eng.inti.muatGame(r.game);
  eng.hist=[];eng.extra=Array.isArray(r.extra)?r.extra.map(String):[];eng.tema=r.tema||null;eng.fx=r.fx||null;
  eng.lastScene=eng.inti.tampilan().scene;eng.base=Math.max(0,(+r.n||1)-1);eng.banner=null;if(slot!=='auto')eng.dirty=true;
}
function slotDlg(s,mode){
  const sv=mode==='sv',kartu=(n,r,nama)=>{const ok=sv||r;return `<div class="card" ${ok?`data-a="${sv?'sv-go':'ld-go'}" data-id="${n}" style="cursor:pointer"`:'style="opacity:.55"'}><div class="row sp"><h3>${nama}</h3>${r?'':'<span class="mt">Kosong</span>'}</div>${r?`<p>${esc((P(s,r.scene)||{}).title||r.judul)} · Bagian ke-${r.n}</p><p>${esc(fmtT(r.t))}</p>`:''}</div>`};
  const rows=listSlots(s.id).map(x=>kartu(x.slot,x.rec,'Slot '+x.slot)).join('')+(sv?'':kartu('auto',bacaRec(s.id,'auto'),'Otomatis'));
  dlg(`<h2>${sv?'Simpan permainan':'Muat permainan'}</h2><p class="sub">${sv?'Pilih slot. Slot yang sudah terisi akan menanyakan konfirmasi sebelum ditimpa.':'Pilih simpanan yang ingin dimuat. Riwayat tombol Kembali dikosongkan.'}</p>${rows}<div class="row" style="justify-content:flex-end"><button data-a="dx">Tutup</button></div>`,null);
}
/* Gambar latar bagian aktif (passage.gambar = id aset). Dibaca SETELAH vPlay0 (jalankanJs bisa memindah scene).
   Editor (kaitScene terisi): src diisi sesudah render oleh pasangGambar lewat resolveAset. Ekspor: src dari s.aset[id].data (data URI gambar). */
const DATA_GAMBAR=/^data:image\/(?:png|jpeg|webp|gif|avif);base64,[A-Za-z0-9+\/=]+$/;
function latarGambar(s){
  try{
    if(!eng||!eng.inti||eng.err.length||eng.banner)return '';
    const p=P(s,eng.inti.tampilan().scene),g=p&&typeof p.gambar==='string'?p.gambar:'';
    if(!g)return '';
    let src='';
    if(!kaitScene){const a=s.aset&&Object.prototype.hasOwnProperty.call(s.aset,g)?s.aset[g]:null,d=a&&typeof a.data==='string'?a.data:'';if(!DATA_GAMBAR.test(d))return '';src=` src="${d}"`}
    return `<img class="bgi" alt="" data-gambar="${esc(g)}"${src}>`;
  }catch(e){return ''}
}
function vPlay(s){if(kaitScene)kaitScene(eng);const o=vPlay0(s),g=latarGambar(s);return `<div class="stage${g?' gb':''}" style="${stageCss()}">${g}${o}</div>`}
function vPlay0(s){
  const h0=ok=>`<div class="row sp">${head('Main',esc(s.title))}<div class="row">${ok?'<button data-a="sv">Simpan</button><button data-a="ld">Muat</button>':''}<button data-a="rs">Mulai ulang</button></div></div>`,h=h0(false);
  if(!s.passages.length)return h+empty('Cerita masih kosong','Tulis bagian di tab Editor.');
  if(!s.passages.some(p=>p.start))return h+empty('Tidak ada bagian awal','Tandai satu bagian sebagai awal di Editor.');
  if(!eng){mulaiMain(s);if(!eng.err.length){const r=bacaRec(s.id,'auto');if(r)eng.banner=r}}
  jalankanJs(s);
  if(eng.err.length)return h+`<div class="card"><h3>Ada yang perlu diperbaiki</h3>${eng.err.map(m=>`<p>• ${esc(m)}</p>`).join('')}</div>`;
  if(eng.dirty){eng.dirty=false;try{saveGame(s,'auto')}catch(e){eng.autoWarn='Autosave gagal: '+e.message}}
  if(eng.banner){const r=eng.banner;return h+`<div class="card"><h3>Lanjutkan dari “${esc((P(s,r.scene)||{}).title||r.judul)}”?</h3><p>Disimpan ${esc(fmtT(r.t))} · Bagian ke-${r.n}</p><div class="row" style="margin-top:10px"><button class="pr" data-a="lanjut">Lanjutkan</button><button data-a="baru">Mulai baru</button></div></div>`}
  let v;try{v=eng.inti.tampilan()}catch(e){return h+`<div class="card"><h3>Terjadi kesalahan</h3><p>${esc(e.message)}</p></div>`}
  const mulai=(s.passages.find(p=>p.id===v.scene)||{}).start,pil=v.elemen.filter(e=>e.jenis==='pilihan');
  let o=h0(true)+`<div class="row sp" style="margin-bottom:8px"><span class="sub" style="margin:0">Bagian ${eng.hist.length+1+(eng.base||0)}</span>${eng.hist.length?'<button class="sm" data-a="bk">← Kembali</button>':''}</div><div class="card">`;
  v.elemen.forEach(e=>{if(e.jenis==='judul')o+=`<div class="row sp"><h2 style="margin:0">${esc(e.isi)}</h2>${mulai?'<span class="badge">Awal</span>':''}</div>`;else if(e.jenis==='teks')o+=`<p class="pc" style="color:var(--t);font-size:15px;margin-top:10px">${esc(e.isi)}</p>`});
  if(!v.elemen.some(e=>e.jenis==='teks')&&!(eng.extra||[]).length)o+='<p class="sub" style="margin-top:10px"><i>Bagian ini belum memiliki teks.</i></p>';(eng.extra||[]).forEach(t=>o+=`<p class="pc" style="color:var(--t);font-size:15px;margin-top:10px">${esc(t)}</p>`);
  o+='</div>';
  if(!pil.length)return o+empty('Cerita berakhir di sini','Tidak ada pilihan lagi untuk dilanjutkan.',`<button class="pr" data-a="rs">Mulai ulang</button>`+(eng.hist.length?'<button data-a="bk">Kembali ke bagian sebelumnya</button>':''));
  return o+`<p class="sub">Pilihan:</p>`+pil.map((c,i)=>`<button class="ch" data-a="go" data-id="${c.id}"><i>${i+1}</i><span style="flex:1">${esc(c.label)}</span></button>`).join('');
}
function jalankanJs(s){
  if(!eng||!eng.inti||eng.err.length)return;
  const st=eng.inti.status,N=k=>pre(String(k));
  for(let n=0;n<20;n++){
    const sc=eng.inti.tampilan().scene;
    if(eng.lastScene===sc)return;
    eng.lastScene=sc;eng.extra=[];
    const p=P(s,sc);if(!p)return;const kp=komposisi(s,p);if(!kp.js.trim())return;const jsKode=pustaka(s).js+'\n'+kp.js;
    let ke=null;
    const g={baca:k=>st.baca(N(k)),tulis:(k,v)=>st.tulis(N(k),v),tambah:(k,a)=>st.tulis(N(k),(Number(st.baca(N(k)))||0)+Number(a)),punya:i=>st.punya(i),ambil:i=>st.tambahItem(i),buang:i=>st.hapusItem(i),acak:(a,b)=>a+Math.floor(Math.random()*(b-a+1)),acakBerbobot:d=>Mesin.hitung({acakBerbobot:d},st),teks:t=>eng.extra.push(String(t)),pergi:t=>{ke=t},tema:o=>{eng.tema=o?Object.assign({},eng.tema,o):null},fade:(a,b)=>{eng.fx={masuk:Math.max(0,Math.min(3000,+a||0)),keluar:Math.max(0,Math.min(3000,+b||0))}}};
    try{new Function('g',jsKode)(g)}catch(e){eng.err=[`Bagian "${p.title}" (JavaScript): ${e.message}`];return}
    if(ke===null)return;
    const id=titleIds(s).get(String(ke).trim().toLowerCase());
    if(!id){eng.err=[`g.pergi: bagian "${ke}" tidak ditemukan`];return}
    try{eng.inti.pindahKe(id)}catch(e){eng.err=[e.message];return}
  }
}
const gabung=p=>[(p.masuk||'').trim(),(p.kode||'').trim(),(p.js||'').trim()?'js\n'+p.js:''].filter(Boolean).join('\n');
const pisah=t=>{const m=String(t||'').match(/^[ \t]*js[ \t]*$/m);return m?{kode:t.slice(0,m.index),js:t.slice(m.index+m[0].length).replace(/^\r?\n/,'')}:{kode:t,js:''}};
const mode=f=>f.mode||(f.lib?'bersama':'biasa');
const nm=t=>String(t||'').trim().toLowerCase().replace(/\s+/g,' ');
const terhubung=(f,p)=>mode(f)==='biasa'&&((p.refs||[]).includes(f.id)||nm(f.name)===nm(p.title));
function pustaka(s){const fn={};let js='';(s.files||[]).filter(f=>mode(f)==='bersama').forEach(f=>{const k=pisah(f.code);ekspansi(tokKode(k.kode),fn,0);js+=k.js+'\n'});return{fn,js}}
function komposisi(s,p){const k=[],j=[];(s.files||[]).forEach(f=>{const m=mode(f);if(m==='bersama'||(m==='biasa'&&!terhubung(f,p)))return;const x=pisah(f.code);k.push(x.kode);j.push(x.js)});return{kode:k.join('\n'),js:j.join('\n')}}
function migrasi(s){
  s.files=s.files||[];s.folders=s.folders||[];
  s.passages.forEach(p=>{const kode=gabung(p);if(!kode.trim())return;
    let fo=s.folders.find(x=>x.name==='Bagian'&&!x.parent);if(!fo){fo={id:uid(),name:'Bagian',parent:null};s.folders.push(fo)}
    const f={id:uid(),name:p.title,folder:fo.id,code:kode,lib:false};s.files.push(f);
    p.refs=[...(p.refs||[]),f.id];p.masuk='';p.kode='';p.js=''});
}
/* ── Aksi klik pemain (dipakai editor di tab Main dan oleh ekspor).
   Hasil: undefined = bukan aksi pemain; true = gambar ulang; false = sudah ditangani. ── */
function aksiPlay(a,id,el){
  const s=S();
  if(a==='go'&&eng&&eng.fx&&eng.fx.keluar&&window.__fo!==2){if(window.__fo!==1){window.__fo=1;const sg=$('app').querySelector('.stage');if(sg)sg.style.cssText+=`;transition:opacity ${eng.fx.keluar}ms;opacity:0`;setTimeout(()=>{window.__fo=2;el.click()},eng.fx.keluar)}return false}
  if(window.__fo===2)window.__fo=0;
  switch(a){
    case 'go':if(eng&&eng.inti){const sn=eng.inti.simpanGame();try{if(eng.inti.kirim({aksi:'pilih',id:+id})){eng.hist.push(sn);eng.dirty=true}}catch(e){warn('Tidak bisa dilanjutkan: '+e.message)}}return true;
    case 'bk':if(eng&&eng.hist.length){eng.inti.muatGame(eng.hist.pop());eng.extra=[];eng.lastScene=eng.inti.tampilan().scene;eng.dirty=true}return true;
    case 'rs':if(s)hapusAuto(s.id);eng=null;return true;
    case 'sv':case 'ld':if(s&&eng&&eng.inti&&!eng.err.length)slotDlg(s,a);return false;
    case 'sv-go':{const n=+id,tulis=()=>{toast(saveGame(s,n)?`Tersimpan di slot ${n}`:'Gagal menyimpan: penyimpanan browser penuh atau diblokir');render()};if(bacaRec(s.id,n))ask(`Timpa simpanan slot ${n}?`,tulis);else{D.close();tulis()}return false}
    case 'ld-go':{try{loadGame(s,id==='auto'?'auto':+id)}catch(e){warn('Tidak bisa memuat: '+e.message);return false}D.close();toast('Permainan dimuat');render();return false}
    case 'lanjut':if(eng){try{loadGame(s,'auto')}catch(e){hapusAuto(s.id);eng.banner=null;toast('Simpanan otomatis tidak cocok lagi dengan cerita ini. Dimulai dari awal.')}}return true;
    case 'baru':if(eng){hapusAuto(s.id);eng.banner=null}return true;
    case 'askyes':{D.close();const f=askFn;askFn=null;if(f)f();save();return true}
    case 'dx':D.close();return false;
  }
}
