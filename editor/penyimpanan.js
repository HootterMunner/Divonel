/* ═══ editor/penyimpanan.js — penyimpanan editor ═══
   IndexedDB "cerita-aset" (cerita + aset), migrasi dari localStorage, penyimpanan tetap (persist), save(). */
/* ── Penyimpanan: IndexedDB "cerita-aset" (cerita + aset). State pemain tetap di localStorage (saveKey). ──
   Store "cerita" key=storyId; store "aset" key="<idCerita>/<idAset>", nilai {blob,tipe,ukuran,hash}.
   localStorage hanya menyimpan meta kecil (KM: urutan Pustaka + cerita aktif) dan K lama (dihapus setelah migrasi terverifikasi). */
const K='cerita-interaktif-v1',KM='cerita-meta';
let idb=null,modeTerbatas=false;
const bukaDB=()=>new Promise((ok,gagal)=>{let r;try{if(!window.indexedDB)throw new Error('IndexedDB tidak tersedia');r=indexedDB.open('cerita-aset',1)}catch(e){return gagal(e)}
  r.onupgradeneeded=()=>{r.result.createObjectStore('cerita');r.result.createObjectStore('aset')};
  r.onsuccess=()=>ok(r.result);r.onerror=()=>gagal(r.error);r.onblocked=()=>gagal(new Error('DB terblokir'))});
const tx=(st,mode,fn)=>new Promise((ok,gagal)=>{const t=idb.transaction(st,mode);let v;const q=fn(t.objectStore(st));if(q)q.onsuccess=()=>{v=q.result};t.oncomplete=()=>ok(v);t.onerror=t.onabort=()=>gagal(t.error)});
const ceritaPut=s=>tx('cerita','readwrite',o=>o.put(s,s.id));
const ceritaGet=id=>tx('cerita','readonly',o=>o.get(id));
const ceritaDelete=id=>tx('cerita','readwrite',o=>o.delete(id));
const ceritaList=()=>tx('cerita','readonly',o=>o.getAll());
const kunciAset=(idc,id)=>{if(typeof idc!=='string'||!idc||idc.includes('/'))throw new Error('idCerita tidak valid');return idc+'/'+id};
const rentangAset=idc=>{kunciAset(idc,'');return IDBKeyRange.bound(idc+'/',idc+'/\uffff')};
const asetPut=(idc,id,v)=>tx('aset','readwrite',o=>o.put({blob:v.blob,tipe:v.tipe,ukuran:v.ukuran,hash:v.hash},kunciAset(idc,id)));
const asetGet=(idc,id)=>tx('aset','readonly',o=>o.get(kunciAset(idc,id)));
const asetDelete=(idc,id)=>tx('aset','readwrite',o=>o.delete(kunciAset(idc,id)));
const asetHapusCerita=idc=>tx('aset','readwrite',o=>o.delete(rentangAset(idc)));
const asetList=idc=>new Promise((ok,gagal)=>{const t=idb.transaction('aset'),r=[],aw=idc.length+1,c=t.objectStore('aset').openCursor(rentangAset(idc));c.onsuccess=()=>{const k=c.result;if(k){r.push({id:String(k.key).slice(aw),...k.value});k.continue()}};t.oncomplete=()=>ok(r);t.onerror=t.onabort=()=>gagal(t.error)});
const tulisBanyak=(ubah,hapus)=>new Promise((ok,gagal)=>{const t=idb.transaction('cerita','readwrite'),o=t.objectStore('cerita');ubah.forEach(s=>o.put(s,s.id));hapus.forEach(i=>o.delete(i));t.oncomplete=ok;t.onerror=t.onabort=()=>gagal(t.error)});
const bacaLS=k=>{try{return JSON.parse(localStorage.getItem(k))}catch(e){return null}};
const cache=new Map();let tmr=0;
function sinkron(){tmr=0;if(!idb)return;
  const ubah=[],ada=new Set();
  for(const s of db.stories){ada.add(s.id);const j=JSON.stringify(s);if(cache.get(s.id)!==j)ubah.push([s,j])}
  const hapus=[...cache.keys()].filter(i=>!ada.has(i));
  if(!ubah.length&&!hapus.length)return;
  tulisBanyak(ubah.map(x=>x[0]),hapus).then(()=>{ubah.forEach(([s,j])=>cache.set(s.id,j));hapus.forEach(i=>{cache.delete(i);asetHapusCerita(i).catch(e=>console.warn('[aset] blob cerita tidak terhapus:',i,e))})}).catch(e=>toast('Gagal menyimpan ke IndexedDB: '+((e&&e.message)||e)))}
addEventListener('pagehide',sinkron);document.addEventListener('visibilitychange',()=>{if(document.hidden)sinkron()});
/* Migrasi: K (localStorage) → IndexedDB. K dihapus hanya setelah semua cerita terbaca ulang dari IndexedDB. */
async function inisialisasi(){
  const lama=bacaLS(K),ls=lama&&Array.isArray(lama.stories)?lama:null,meta=bacaLS(KM)||{};
  try{idb=await bukaDB();
    let ada=await ceritaList();
    if(ls){
      const baru=ls.stories.filter(s=>s&&s.id&&!ada.some(a=>a.id===s.id));
      if(baru.length)await tulisBanyak(baru,[]);
      ada=await ceritaList();
      if(!ls.stories.every(s=>!s||!s.id||ada.some(a=>a.id===s.id)))throw new Error('verifikasi migrasi gagal');
      localStorage.removeItem(K);
      console.info('[migrasi] '+baru.length+' cerita dipindah ke IndexedDB, key lama dihapus');
      if(!meta.active)meta.active=ls.active;
      meta.urut=[...(meta.urut||[]),...ls.stories.map(s=>s&&s.id)];
    }
    const per=new Map(ada.map(s=>[s.id,s])),urut=[...new Set([...(meta.urut||[]),...ada.map(s=>s.id)])].filter(i=>per.has(i));
    db={stories:urut.map(i=>per.get(i)),active:per.has(meta.active)?meta.active:(urut[0]||null)};
    db.stories.forEach(s=>cache.set(s.id,JSON.stringify(s)));
  }catch(e){
    console.warn('[penyimpanan] IndexedDB tidak dipakai:',e);idb=null;modeTerbatas=true;
    db=ls||{stories:[],active:null};
  }
}
/* ── Penyimpanan tetap (persist): lapisan tambahan untuk cache aset ──
   Diminta SEKALI per sesi, saat aset pertama akan disimpan (bukan saat halaman dimuat). Hasil apa pun (true/false/galat) dicatat
   di statusPersist dan tidak ditanyakan lagi di sesi yang sama; aset selalu tetap disimpan. Status hanya ditampilkan di tab Kode (bukan di Play). */
let statusPersist=null,alasanPersist='',persistSesi=null; // statusPersist: null | 'permanen' | 'best-effort'
const labelPersist=()=>statusPersist==='permanen'?'permanen':statusPersist==='best-effort'?'best-effort'+(alasanPersist?' ('+alasanPersist+')':''):'belum diketahui';
function setStatusPersist(st,alasan){statusPersist=st;alasanPersist=alasan||'';const e=document.getElementById('stPersist');if(e)e.textContent=labelPersist()}
async function cekPersist(){ // hanya membaca status, tidak meminta izin
  try{if(navigator.storage&&navigator.storage.persisted)setStatusPersist((await navigator.storage.persisted())?'permanen':'best-effort')}catch(e){}
}
function pastikanPersist(){ // tidak pernah menolak (reject) dan tidak perlu ditunggu
  if(persistSesi)return persistSesi;
  return persistSesi=(async()=>{
    try{
      const st=navigator.storage;
      if(!st||!st.persist){setStatusPersist('best-effort','tidak didukung');return false}
      if(st.persisted&&await st.persisted()){setStatusPersist('permanen');return true}
      const ya=await st.persist();setStatusPersist(ya?'permanen':'best-effort',ya?'':'ditolak');return !!ya;
    }catch(e){setStatusPersist('best-effort','galat');return false}
  })();
}
cekPersist();

save=()=>{if(idb){try{localStorage.setItem(KM,JSON.stringify({active:db.active,urut:db.stories.map(x=>x.id)}))}catch(e){}clearTimeout(tmr);tmr=setTimeout(sinkron,250)}else try{localStorage.setItem(K,JSON.stringify(db))}catch(e){}};
