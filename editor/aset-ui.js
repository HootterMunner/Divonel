/* ═══ editor/aset-ui.js — aset (UI) ═══
   Dialog Aset di tab Kode, serta gambar latar bagian (pasangGambar, pilihan gambar di pDlg). */
/* ── UI aset (Fase C): dialog di tab Kode. Hanya manajemen; belum dipakai di bagian cerita. ── */
let asetBaru=null,asetTok=0,prevList=[],prevForm=null;
const revokeList=()=>{prevList.forEach(u=>URL.revokeObjectURL(u));prevList=[]},revokeForm=()=>{if(prevForm){URL.revokeObjectURL(prevForm);prevForm=null}};
D.addEventListener('close',()=>{revokeList();revokeForm()});
const jenisDari=t=>String(t||'').startsWith('audio/')?'audio':String(t||'').startsWith('video/')?'video':'gambar';
const medEl=(jenis,u)=>jenis==='audio'?`<audio controls preload="none" src="${u}" style="width:100%"></audio>`:jenis==='video'?`<video muted playsinline preload="metadata" src="${u}" onloadedmetadata="this.currentTime=0.1" style="max-width:100%;max-height:120px;border-radius:8px"></video>`:`<img alt="" src="${u}" style="max-width:100%;max-height:120px;border-radius:8px">`;
const idDari=n=>String(n||'').replace(/\.[^.]*$/,'').replace(/[^A-Za-z0-9_.-]+/g,'-').replace(/^[^A-Za-z0-9]+/,'').slice(0,60)||'aset';
async function asetRender(){
  const s=S(),el=$('alist');if(!s||!el)return;
  let rec=[];try{rec=idb?await asetList(s.id):[]}catch(e){}
  const el2=$('alist');if(!el2||S()!==s)return; // dialog sudah berganti selama menunggu
  revokeList();
  const per=new Map(rec.map(r=>[r.id,r])),ids=Object.keys(daftarAset(s)),tot=rec.reduce((a,r)=>a+(r.ukuran||0),0);
  el2.innerHTML=ids.length?`<p class="sub">${ids.length} aset · ${ukuranTeks(tot)} di perangkat ini</p>`+ids.map(id=>{
    const r=per.get(id),e=entriCerita(s,id)||{},tp=(r&&r.tipe)||e.tipe||'';
    return `<div class="card"><div class="row sp"><div style="flex:1;min-width:0"><h3 style="overflow:hidden;text-overflow:ellipsis">${esc(id)}</h3><p>${esc(tp)}${r?' · '+ukuranTeks(r.ukuran||0):' · belum ada di perangkat ini'}</p></div><button class="sm del" data-a="adel" data-id="${esc(id)}">Hapus</button></div>${r&&r.blob instanceof Blob?`<div style="margin-top:8px">${medEl(jenisDari(tp),(()=>{const u=URL.createObjectURL(r.blob);prevList.push(u);return u})())}</div>`:''}</div>`}).join(''):'<p class="sub">Belum ada aset.</p>';
}
function asetDlg(){
  const s=S();if(!s)return;revokeList();revokeForm();asetBaru=null;asetTok++;
  dlg(`<h2>Aset</h2><p class="sub">Gambar, audio, dan video untuk cerita ini. Gambar dipasang sebagai latar lewat tombol Ubah di bagian cerita.</p><div id="alist"><p class="sub">Memuat…</p></div><div class="sec"><b>Tambah aset</b></div>${idb?'':'<p class="err">IndexedDB tidak tersedia (mode terbatas). Aset belum bisa ditambahkan.</p>'}<input type="file" id="af" accept="image/*,audio/*,video/*" ${idb?'':'disabled'}><div id="apv"></div><div id="ast" class="sub"></div><label>ID aset</label><input id="aid" maxlength="64" autocapitalize="off" spellcheck="false" placeholder="mis. gerbang-pagi"><div id="aidn" class="sub"></div><div class="row" style="justify-content:flex-end"><button data-a="dx">Tutup</button><button class="pr" id="aadd" data-a="aadd" disabled>Tambah</button></div>`,null);
  asetRender();
}
function segarkanAdd(){
  const s=S(),bt=$('aadd'),n=$('aidn');if(!s||!bt||!n)return;
  const id=$('aid').value.trim(),b=asetBaru;let g='',salah=!b;
  if(b){
    if(!ID_ASET.test(id)){g='ID: huruf, angka, _ - . saja; awali huruf atau angka; maksimal 64 karakter.';salah=true}
    else{const ada=entriCerita(s,id);if(ada&&ada.tipe!==b.blob.type){g='ID sudah dipakai untuk jenis lain. Ganti ID atau hapus aset lama.';salah=true}else if(ada)g='ID sudah ada: aset lama akan diganti.'}
  }
  n.className=salah&&g?'err':'sub';n.textContent=g;bt.disabled=salah;
}
async function asetTambah(){
  const s=S(),b=asetBaru,bt=$('aadd');if(!s||!b||!bt||bt.disabled)return;
  if(b.blob.size>KONFIRM_BESAR&&!b.sudahYa){b.sudahYa=true;bt.textContent='Ya, lanjutkan';const n=$('ast');if(n)n.insertAdjacentHTML('beforeend','<p class="err" style="background:var(--a50);color:var(--t)">File ini besar. Lanjutkan?</p>');return} // konfirmasi sekali per berkas
  const id=$('aid').value.trim();bt.disabled=true;bt.textContent='Menambahkan…';
  try{await tambahAset(s.id,id,b.blob);toast('Aset "'+id+'" ditambahkan');asetDlg();render()}
  catch(e){bt.textContent='Tambah';bt.disabled=false;warn('Gagal menambah aset: '+((e&&e.message)||e))}
}
document.addEventListener('input',e=>{if(e.target.id==='aid')segarkanAdd()});
document.addEventListener('change',async e=>{
  if(e.target.id!=='af')return;
  const f=e.target.files&&e.target.files[0],t=++asetTok;asetBaru=null;revokeForm();
  const st=$('ast'),pv=$('apv');if(!st||!pv)return;
  pv.innerHTML='';st.className='sub';st.textContent=f?'Memeriksa…':'';segarkanAdd();
  if(!f)return;
  const h=await validasiAset(f);if(t!==asetTok||!$('ast'))return;
  if(!h.ok){st.innerHTML=`<p class="err">${esc(h.galat)}</p>`;return}
  const blob=new Blob([f],{type:h.mime}); // tidak menyalin data; hanya memberi tipe baku
  asetBaru={blob,h};
  st.innerHTML=`<p class="sub" style="margin:0 0 6px">✓ ${esc(h.format)} · ${ukuranTeks(f.size)}</p>`+h.peringatan.map(m=>`<p class="err" style="background:var(--a50);color:var(--t)">⚠ ${esc(m)}</p>`).join('')+(f.size>INFO_BESAR?`<p class="sub" style="margin:0 0 6px">File cukup besar (${ukuranTeks(f.size)}). Pertimbangkan format lebih kecil untuk file besar.</p>`:'');
  prevForm=URL.createObjectURL(blob);pv.innerHTML=medEl(h.jenis,prevForm);
  $('aid').value=idDari(f.name);segarkanAdd();
});
/* ── Gambar latar bagian (fitur 1) ──
   passage.gambar = id aset (opsional; bagian lama tanpa field tetap valid). Render: latarGambar (blok PLAYER). */
let pgbVal=null;
function pasangGambar(){ // Play di editor: isi <img class="bgi"> lewat resolveAset (online → cache → IndexedDB → placeholder)
  const s=S(),el=document.querySelector('#app .stage .bgi');if(!s||!el)return;
  revokeAset(); // DOM sudah diganti: URL render sebelumnya (scene yang sama) tidak dipakai lagi
  applyAset(el,s.id,el.dataset.gambar,'img').catch(e=>console.warn('[gambar]',e));
}
async function pgbRender(){
  const s=S(),el=$('pgb');if(!s||!el)return;
  const id=pgbVal;let pv='';revokeList();
  if(id){
    let r=null;try{r=idb&&Object.hasOwn(daftarAset(s),id)?await asetGet(s.id,id):null}catch(e){}
    if(!$('pgb'))return; // dialog sudah berganti selama menunggu
    if(r&&r.blob instanceof Blob){const u=URL.createObjectURL(r.blob);prevList.push(u);pv=`<img alt="" src="${u}" style="max-width:100%;max-height:120px;border-radius:8px;display:block;margin-bottom:6px">`}
    else pv='<p class="err" style="background:var(--a50);color:var(--t)">Aset belum tersedia di perangkat ini. Pemain akan melihat placeholder.</p>';
  }
  el.innerHTML=pv+`<p class="sub" style="margin:0 0 6px">${id?esc(id):'Belum ada gambar.'}</p><div class="row" style="margin-bottom:10px"><button type="button" class="sm" data-a="pgb">Pilih gambar</button>${id?'<button type="button" class="sm del" data-a="pgx">Lepas gambar</button>':''}</div><div id="pgl"></div>`;
}
async function pgbDaftar(){
  const s=S(),el=$('pgl');if(!s||!el)return;
  if(el.firstChild){el.innerHTML='';return} // klik lagi = tutup
  const d=daftarAset(s),ids=Object.keys(d).filter(i=>String((d[i]&&d[i].tipe)||'').startsWith('image/'));
  if(!ids.length){el.innerHTML='<p class="sub">Belum ada aset gambar. Impor dulu di tab Kode, tombol Aset.</p>';return}
  let rec=[];try{rec=idb?await asetList(s.id):[]}catch(e){}
  const el2=$('pgl');if(!el2)return;
  const per=new Map(rec.map(r=>[r.id,r]));
  el2.innerHTML=ids.map(i=>{const r=per.get(i);let th='';
    if(r&&r.blob instanceof Blob){const u=URL.createObjectURL(r.blob);prevList.push(u);th=`<img alt="" src="${u}" style="width:56px;height:40px;object-fit:cover;border-radius:6px">`}
    return `<div class="card" data-a="pgp" data-id="${esc(i)}" style="cursor:pointer"><div class="row">${th}<div><h3>${esc(i)}</h3>${r?'':'<p>belum ada di perangkat ini</p>'}</div></div></div>`}).join('');
}
