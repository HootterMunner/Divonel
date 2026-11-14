/* ═══ editor/aset.js — aset (lapisan data) ═══
   Manifest, resolveAset (online → cache → IndexedDB → placeholder), validator codec. Tanpa UI. */
/* ── Aset: manifest + resolveAset (Fase B; belum dipakai UI) ──
   Sumber path = cerita.aset {[id]:{path,tipe}} (ikut terekspor/terimpor bersama cerita; cerita lama tanpa field = kosong).
   IndexedDB (store "aset") hanya cache blob + ukuran + hash, kunci fisik "<idCerita>/<id>" (tiap cerita punya ruang sendiri).
   Blob tidak ikut terekspor/terduplikasi: perangkat baru mengambil dari path lalu mengisi cache lagi.
   Manifest TIDAK disimpan: dibangun dari cerita.aset + IndexedDB. Bentuk: {versi:1, aset:{[id]:{path,tipe,ukuran,hash}}}.
   resolveAset(idCerita,id): online → cache → indexeddb → placeholder. URL blob dicatat dan dicabut saat scene berganti. */
const ASET_ONLINE_MS=4000,EKS_ASET={'image/png':'.png','image/jpeg':'.jpg','image/webp':'.webp','image/gif':'.gif','image/svg+xml':'.svg','video/mp4':'.mp4','video/webm':'.webm','audio/mpeg':'.mp3','audio/ogg':'.ogg','audio/wav':'.wav','image/avif':'.avif','audio/mp4':'.m4a','audio/aac':'.aac'};
const PLACEHOLDER_ASET='data:image/svg+xml;charset=utf-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect width="100%" height="100%" fill="#8884"/><text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" font-family="sans-serif" font-size="14" fill="#888">Aset belum tersedia</text></svg>');
/* cerita.aset bisa datang dari impor (tidak tepercaya): id dan path dibatasi, path hanya relatif "aset/<nama>" (bukan URL luar, bukan ../). */
const ID_ASET=/^[A-Za-z0-9][\w.-]{0,63}$/,PATH_ASET=/^aset\/[A-Za-z0-9][\w.-]{0,80}$/;
const cariCerita=idc=>db.stories.find(x=>x.id===idc)||null;
const daftarAset=s=>s&&s.aset&&typeof s.aset==='object'&&!Array.isArray(s.aset)?s.aset:{};
const entriCerita=(s,id)=>{const d=daftarAset(s);return Object.hasOwn(d,id)&&d[id]&&typeof d[id]==='object'?d[id]:null};
const pathCerita=(s,id)=>{const e=entriCerita(s,id);return e&&typeof e.path==='string'&&PATH_ASET.test(e.path)?e.path:null};
async function buatManifest(idc){
  const s=cariCerita(idc),m={versi:1,aset:{}};
  for(const id of Object.keys(daftarAset(s))){
    const e=entriCerita(s,id),r=idb?await asetGet(idc,id).catch(()=>undefined):undefined;
    m.aset[id]={path:pathCerita(s,id),tipe:(e&&e.tipe)||(r&&r.tipe)||null,ukuran:r?r.ukuran:null,hash:r?r.hash:null};
  }
  return m;
}
async function hashAset(b){try{const h=await crypto.subtle.digest('SHA-256',await b.arrayBuffer());return[...new Uint8Array(h)].map(x=>x.toString(16).padStart(2,'0')).join('')}catch(e){return''}}
/* Tambah/hapus aset: dua tempat selalu diubah bersama (IndexedDB dulu, baru cerita) lalu save(). */
async function tambahAset(idc,id,blob){
  id=String(id);const s=cariCerita(idc);if(!s)throw new Error('Cerita tidak ditemukan');
  if(!ID_ASET.test(id))throw new Error('id aset: huruf, angka, _ - . saja; diawali huruf/angka; maksimal 64 karakter');
  if(!idb)throw new Error('IndexedDB tidak tersedia');
  const tipe=blob&&blob.type,eks=EKS_ASET[tipe];if(!eks)throw new Error('Jenis berkas tidak didukung: '+(tipe||'tidak dikenal'));
  const ada=entriCerita(s,id);if(ada&&ada.tipe!==tipe)throw new Error('id "'+id+'" sudah dipakai untuk jenis lain; hapus dulu');
  pastikanPersist(); // sekali per sesi; tidak ditunggu, aset tetap disimpan apa pun hasilnya
  await asetPut(idc,id,{blob,tipe,ukuran:blob.size,hash:await hashAset(blob)});
  if(!ada||!pathCerita(s,id)){if(!s.aset||typeof s.aset!=='object'||Array.isArray(s.aset))s.aset={};s.aset[id]={path:'aset/'+id+eks,tipe}}
  save();
}
async function hapusAset(idc,id){
  id=String(id);const s=cariCerita(idc);if(!s)throw new Error('Cerita tidak ditemukan');
  if(idb)await asetDelete(idc,id);
  if(entriCerita(s,id))delete s.aset[id];
  save();
}

/* Pengelola URL blob. genAset naik setiap revoke; hasil async dari scene lama dikenali lewat gen yang usang. */
let genAset=0,sceneAset=null;const urlAset=new Set();
function buatUrl(blob,gen){if(gen!==genAset){const e=new Error('scene sudah berganti');e.basi=true;throw e}const u=URL.createObjectURL(blob);urlAset.add(u);return u}
function revokeAset(){genAset++;urlAset.forEach(u=>URL.revokeObjectURL(u));urlAset.clear()}
kaitScene=e=>{let sc=null;try{sc=e&&e.inti?e.inti.tampilan().scene:null}catch(x){}if(sc!==sceneAset){revokeAset();sceneAset=sc}};

async function cobaOnline(path){
  if(navigator.onLine===false)return null;
  const ac=new AbortController(),t=setTimeout(()=>ac.abort(),ASET_ONLINE_MS);
  try{const r=await fetch(path,{method:'HEAD',cache:'no-cache',signal:ac.signal});
    if(r.status!==200||/^text\/html/i.test(r.headers.get('content-type')||''))return null; // server yang membalas 200 + halaman web untuk path yang tak ada
    return new URL(path,location.href).href}catch(e){return null}finally{clearTimeout(t)}
}
async function cobaCache(path,gen){
  if(typeof caches==='undefined')return null;
  try{const r=await caches.match(path);return r?buatUrl(await r.blob(),gen):null}catch(e){if(e.basi)throw e;return null}
}
async function resolveAset(idc,id){
  id=String(id);const gen=genAset,s=cariCerita(idc),path=pathCerita(s,id); // path dari cerita.aset, bukan dari IndexedDB
  if(path){
    const on=await cobaOnline(path);if(on)return{url:on,sumber:'online'};
    const ca=await cobaCache(path,gen);if(ca)return{url:ca,sumber:'cache'};
  }
  if(entriCerita(s,id)&&idb){ // blob lokal hanya dipakai untuk aset yang terdaftar di cerita ini
    let rec;try{rec=await asetGet(idc,id)}catch(e){}
    if(rec&&rec.blob instanceof Blob)return{url:buatUrl(rec.blob,gen),sumber:'indexeddb'};
  }
  return{url:PLACEHOLDER_ASET,sumber:'placeholder'};
}
async function unduhAset(idc,id){ // tombol "Unduh aset": ambil dari cerita.aset[id].path lalu simpan ke IndexedDB
  id=String(id);const s=cariCerita(idc),path=pathCerita(s,id);if(!path)throw new Error('aset "'+id+'" tidak punya path di cerita ini');
  if(!idb)throw new Error('IndexedDB tidak tersedia');
  pastikanPersist(); // dipanggil di awal (klik pemain masih berlaku), sebelum menunggu jaringan
  const r=await fetch(path);if(!r.ok)throw new Error('server menjawab '+r.status);
  const blob=await r.blob();if(/^text\/html/i.test(blob.type))throw new Error('server mengirim halaman web, bukan aset');
  await asetPut(idc,id,{blob,tipe:blob.type||entriCerita(s,id).tipe||'',ukuran:blob.size,hash:await hashAset(blob)});
}
async function applyAset(el,idc,id,tipe){
  tipe=tipe||el.tagName.toLowerCase();
  if(!['img','video','audio'].includes(tipe))throw new Error('applyAset: tipe harus img, video, atau audio');
  const g=genAset;if(el._btnAset){el._btnAset.remove();el._btnAset=null}
  let r;try{r=await resolveAset(idc,id)}catch(e){if(e.basi)return null;throw e}
  if(g!==genAset)return null; // scene sudah berganti selama menunggu
  el.dataset.sumber=r.sumber;
  if(r.sumber==='placeholder'){
    if(tipe==='img'){el.src=r.url;if(!el.alt)el.alt='Aset belum tersedia'}else{el.removeAttribute('src');if(el.load)el.load()}
    if(pathCerita(cariCerita(idc),id)){ // tombol hanya bila ada path untuk diunduh
      const b=document.createElement('button');b.type='button';b.className='sm';b.textContent='Unduh aset';
      b.onclick=async()=>{b.disabled=true;b.textContent='Mengunduh…';try{await unduhAset(idc,id);await applyAset(el,idc,id,tipe)}catch(e){b.disabled=false;b.textContent='Unduh aset';toast('Gagal mengunduh aset: '+((e&&e.message)||e))}};
      el.insertAdjacentElement('afterend',b);el._btnAset=b;
    }
  }else{el.src=r.url;if(tipe!=='img'&&el.load)el.load()}
  return r;
}
/* ── Validator codec aset (Fase C) ──
   Jenis ditentukan dari ISI berkas (magic bytes), bukan ekstensi atau file.type. Yang dibaca hanya potongan kecil lewat
   blob.slice().arrayBuffer() (async, di luar thread utama); satu-satunya bacaan besar adalah blok moov MP4 (maks 16 MB).
   Hasil: {ok, jenis:'gambar'|'audio'|'video', format, mime, ext, peringatan:[], galat}. mime = tipe baku yang disimpan ke IndexedDB. */
const INFO_BESAR=2*1048576,KONFIRM_BESAR=10*1048576,BATAS_MOOV=16*1048576,IOS_LAMA='iOS lama mungkin tidak mendukung.';
const ukuranTeks=n=>n<1024?n+' B':n<1048576?Math.round(n/1024)+' KB':(n/1048576).toFixed(n<1.05e7?1:0)+' MB';
const asc=(b,i,n)=>{let t='';for(let k=i;k<i+n&&k<b.length;k++)t+=String.fromCharCode(b[k]);return t};
const u32=(b,i)=>((b[i]<<24)|(b[i+1]<<16)|(b[i+2]<<8)|b[i+3])>>>0;
const potong=async(f,a,z)=>new Uint8Array(await f.slice(a,z).arrayBuffer());
async function periksaMp4(f){ // jalan di kotak tingkat atas (hanya header 16 byte), lalu baca moov: handler trek + codec tiap trek
  let pos=0,moov=null;
  for(let n=0;n<64&&pos<f.size;n++){
    const h=await potong(f,pos,pos+16);if(h.length<8)break;
    let sz=u32(h,0);const tipe=asc(h,4,4);
    if(sz===1){if(h.length<16||u32(h,8)!==0)break;sz=u32(h,12)}else if(sz===0)sz=f.size-pos;
    if(sz<8)break;
    if(tipe==='moov'){moov={pos,sz};break}
    pos+=sz;
  }
  if(!moov||moov.pos+moov.sz>f.size)return{galat:true};
  if(moov.sz>BATAS_MOOV)return{besar:true};
  const t=new TextDecoder('latin1').decode(await potong(f,moov.pos,moov.pos+moov.sz)),video=[],audio=[],re=/hdlr|stsd/g;let cur='',m;
  while((m=re.exec(t))){if(m[0]==='hdlr')cur=t.substr(m.index+12,4);else{const e=t.substr(m.index+16,4);if(cur==='vide')video.push(e);else if(cur==='soun')audio.push(e)}}
  return{video,audio};
}
async function validasiAset(f){
  const no=g=>({ok:false,galat:g,peringatan:[]}),ya=(jenis,format,mime,ext,peringatan=[])=>({ok:true,jenis,format,mime,ext,peringatan,galat:null});
  try{
    if(!f||typeof f.slice!=='function'||typeof f.size!=='number')return no('Berkas tidak terbaca. Pilih ulang.');
    if(!f.size)return no('Berkas kosong. Pilih berkas lain.');
    const b=await potong(f,0,128),a4=asc(b,0,4);
    if(b[0]===0xFF&&b[1]===0xD8&&b[2]===0xFF)return ya('gambar','JPEG','image/jpeg','.jpg');
    if(a4==='\x89PNG'&&b[4]===0x0D&&b[5]===0x0A&&b[6]===0x1A&&b[7]===0x0A)return ya('gambar','PNG','image/png','.png');
    if(a4==='RIFF'){const k=asc(b,8,4);
      if(k==='WEBP')return ya('gambar','WebP','image/webp','.webp');
      if(k==='AVI ')return no('AVI tidak didukung browser. Ubah ke MP4 (H.264).');
      if(k==='WAVE')return ya('audio','WAV','audio/wav','.wav')}
    if(asc(b,4,4)==='ftyp'){
      const mj=asc(b,8,4),br=[mj];for(let i=16;i+4<=Math.min(b.length,u32(b,0)||b.length);i+=4)br.push(asc(b,i,4));
      if(mj==='avif'||mj==='avis'||(['mif1','miaf'].includes(mj)&&br.some(x=>x==='avif'||x==='avis')))return ya('gambar','AVIF','image/avif','.avif',[`AVIF: ${IOS_LAMA} Untuk aman, ubah ke WebP atau JPEG.`]);
      if(['heic','heix','hevc','hevx','mif1','msf1'].includes(mj))return no('HEIC/HEIF tidak didukung browser. Ubah ke JPEG, PNG, atau WebP.');
      if(mj==='qt  ')return no('MOV (QuickTime) tidak didukung browser. Ubah ke MP4 (H.264).');
      const r=await periksaMp4(f);
      if(r.galat)return no('Berkas MP4/M4A rusak atau tidak lengkap. Ekspor ulang dari aplikasi asalnya.');
      if(r.besar){const au=['M4A ','M4B ','M4P '].includes(mj),pr='Struktur berkas terlalu besar untuk diperiksa. Pastikan '+(au?'audio AAC.':'video H.264.');return au?ya('audio','M4A','audio/mp4','.m4a',[pr]):ya('video','MP4','video/mp4','.mp4',[pr])}
      if(r.video.length){
        const v=r.video[0],per=[];let fm='MP4 (H.264)';
        if(v==='avc1'||v==='avc3'){}
        else if(['hvc1','hev1','dvh1','dvhe'].includes(v)){fm='MP4 (HEVC)';per.push('Video HEVC (H.265) hanya jalan di Safari dan sebagian perangkat. Ubah ke H.264.')}
        else if(v==='av01'){fm='MP4 (AV1)';per.push('Video AV1: perangkat lama mungkin tidak bisa memutar. Ubah ke H.264 agar aman.')}
        else if(v==='vp09'){fm='MP4 (VP9)';per.push('Video VP9 di MP4 tidak jalan di semua browser. Ubah ke H.264.')}
        else{fm='MP4';per.push(`Codec video "${v.trim()}" tidak dikenal. Ubah ke H.264.`)}
        if(r.audio.length&&!r.audio.includes('mp4a'))per.push('Audio di dalam video bukan AAC; bisa tanpa suara di sebagian browser.');
        return ya('video',fm,'video/mp4','.mp4',per)}
      if(r.audio.length){
        if(r.audio.includes('mp4a'))return ya('audio','M4A (AAC)','audio/mp4','.m4a');
        return ya('audio','M4A','audio/mp4','.m4a',['Codec audio bukan AAC (mis. ALAC); sebagian browser tidak bisa memutar. Ubah ke AAC atau MP3.'])}
      return no('Tidak ada trek video atau audio di berkas ini.')}
    if(b[0]===0x1A&&b[1]===0x45&&b[2]===0xDF&&b[3]===0xA3){const t=asc(b,0,128);
      if(t.includes('matroska'))return no('MKV tidak didukung browser. Ubah ke MP4 (H.264) atau WebM.');
      if(t.includes('webm'))return ya('video','WebM','video/webm','.webm',[`WebM: ${IOS_LAMA} Untuk aman, ubah ke MP4 (H.264).`]);
      return no('Format video tidak dikenal. Pakai MP4 (H.264) atau WebM.')}
    if(a4==='OggS')return ya('audio','OGG','audio/ogg','.ogg',[`OGG: ${IOS_LAMA} Untuk aman, ubah ke MP3 atau M4A.`]);
    if(a4.startsWith('ID3'))return ya('audio','MP3','audio/mpeg','.mp3');
    if(b[0]===0xFF){
      if((b[1]&0xF6)===0xF0)return ya('audio','AAC','audio/aac','.aac');
      if((b[1]&0xE0)===0xE0&&((b[1]>>1)&3)!==0&&((b[1]>>3)&3)!==1)return ya('audio','MP3','audio/mpeg','.mp3')}
    if(a4==='GIF8')return ya('gambar','GIF','image/gif','.gif');
    if(a4==='fLaC')return no('FLAC belum didukung. Ubah ke MP3 atau M4A.');
    if(asc(b,0,128).includes('<svg'))return no('SVG belum didukung. Ubah ke PNG atau WebP.');
    return no('Format tidak dikenal. Pakai JPEG/PNG/WebP, MP3/M4A/AAC/OGG, atau MP4/WebM.');
  }catch(e){return no('Berkas tidak bisa dibaca ('+((e&&e.message)||e)+'). Pilih ulang.')}
}
