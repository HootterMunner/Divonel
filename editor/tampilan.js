/* ═══ editor/tampilan.js — tampilan editor ═══
   State UI (tab, sel, more), render(), Pustaka, Editor, Peta, panel debug. */
let tab='lib',sel=null,hist=[],tmp=[],cur=null;

/* ╔═══ AWAL FUNGSI recentStore (riwayat passage) ═══╗
   Simpan 12 ID terakhir, tampil 4 di dialogCari.
   Per-cerita: localStorage "cerita.recent.<storyId>".
   ═══════════════════════════════════════════════════ */
let recentCache = { _sid: null, interacted: [], searched: [] };
function recentKey(sid){ return 'cerita.recent.' + sid; }
function recentLoad(sid){
  if(!sid) return;
  if(recentCache._sid === sid) return;
  try{
    const raw = localStorage.getItem(recentKey(sid));
    if(raw){
      const j = JSON.parse(raw);
      recentCache = { _sid: sid,
        interacted: Array.isArray(j.i)?j.i:[],
        searched:   Array.isArray(j.s)?j.s:[] };
      return;
    }
  }catch(_){}
  recentCache = { _sid: sid, interacted: [], searched: [] };
}
function recentSave(){
  if(!recentCache._sid) return;
  try{ localStorage.setItem(recentKey(recentCache._sid),
    JSON.stringify({ i: recentCache.interacted, s: recentCache.searched })); }catch(_){}
}
function recentPush(kind, sid, pid){
  if(!sid || !pid) return;
  recentLoad(sid);
  const arr = kind==='s' ? recentCache.searched : recentCache.interacted;
  const i = arr.indexOf(pid);
  if(i !== -1) arr.splice(i, 1);
  arr.unshift(pid);
  if(arr.length > 12) arr.length = 12;
  recentSave();
}
function recentClean(s, list){
  const ids = new Set(s.passages.map(p => p.id));
  return list.filter(id => ids.has(id));
}
/* ╚═══ AKHIR FUNGSI recentStore ═══╝ */

let edPath=null, laci=false; /* Langkah 3a: folder-bab di Editor */
let more={};
const btns=(ok='Simpan')=>`<div class="row" style="justify-content:flex-end"><button data-a="dx">Batal</button><button class="pr" data-a="ds">${ok}</button></div>`;
/* ╔══════════════════════════════════════════════════════════╗
   ║ ribbonHTML — muncul di atas halaman saat tab bukan Pustaka ║
   ║ HARUS ada. Dipanggil oleh render().                      ║
   ╚══════════════════════════════════════════════════════════╝ */
function ribbonHTML(){
  if(tab==='lib'||!S())return ''; // di Pustaka atau belum pilih cerita: ribbon disembunyikan
  const cur = tab==='gd'?'kd':tab;
  const tabs = [['ed','Editor'],['map','Peta'],['kd','Kode'],['play','Main']];
  return `<button type="button" class="nav-home" data-a="tab" data-id="lib" title="Kembali ke Pustaka" aria-label="Kembali ke Pustaka">← Pustaka</button><div class="nav-tabs" role="tablist">${tabs.map(([k,n])=>`<button type="button" role="tab" data-a="tab" data-id="${k}" class="${cur===k?'on':''}" aria-selected="${cur===k}">${n}</button>`).join('')}</div>`;
}

function render(){
  $('nav').innerHTML=ribbonHTML();
  const s=S(),app=$('app');
  app.className = tab === 'map' && s && (s.passages.length || s.chapters.length) ? 'app-map' : '';
document.body.classList.toggle('map-lock', app.className === 'app-map');
  app.innerHTML=tab==='gd'?vGuide():tab==='lib'?vLib():!s?head('Belum ada cerita','Pilih atau buat cerita di Pustaka.')+empty('Tidak ada cerita dipilih','',`<button class="pr" data-a="tab" data-id="lib">Ke Pustaka</button>`):tab==='ed'?vEd(s):tab==='map'?vMap(s):tab==='kd'?vKode(s):vPlay(s)+vDbg();
  if(tab==='map')drawMap();
  if(tab==='play')pasangGambar();
}

function vLib(){
  const l=db.stories.map(s=>`<div class="card ${s.id===db.active?'on':''}"><div class="row sp"><div style="flex:1;cursor:pointer" data-a="open" data-id="${s.id}"><h3>${esc(s.title)}</h3><p>${esc(s.description)||'Tanpa deskripsi'}${s.author?' — '+esc(s.author):''}</p></div><div class="row"><button class="sm" data-a="exp" data-id="${s.id}">Ekspor</button><button class="sm del" data-a="dels" data-id="${s.id}">Hapus</button></div></div></div>`).join('');
  return head('Pustaka',db.stories.length+' cerita')+(l||empty('Belum ada cerita','Buat cerita pertama atau impor dari berkas JSON.'))+`<div class="row"><button class="pr" data-a="news">Buat cerita baru</button><button data-a="imp">Impor</button><button data-a="demo">Muat cerita contoh</button></div><p class="footer-license">© 2026 Helmy Hidayat · <a href="LICENSE" target="_blank" rel="noopener">MIT License</a></p>`;
}

function pCard(p){
  return `<div class="card"><div class="row sp"><h3>${esc(p.title)}</h3>${p.start?'<span class="badge">★ Mulai</span>':''}${(p.refs||[]).length?`<span class="cnt">${p.refs.length} skrip</span>`:''}</div><p style="white-space:pre-wrap;display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden">${p.content?esc(p.content.slice(0,140)):'<i>Bagian kosong</i>'}</p><div class="row" style="margin-top:8px"><button class="sm" data-a="ch" data-id="${p.id}">Pilihan (${p.choices.length})</button><button class="sm" data-a="ep" data-id="${p.id}">Ubah</button></div></div>`;
}
/* ╔══════════════════════════════════════════════════════════╗
   ║ AWAL FUNGSI BARU — chapterLevel                          ║
   ║ Letak: tepat SEBELUM function vEd (yang baru)            ║
   ║ Tugas: hitung kedalaman bab (0 = top-level, 1 = sub, ..) ║
   ╚══════════════════════════════════════════════════════════╝ */
/* ╔══════════════════════════════════════════════════════════╗
   ║ AWAL — Helper navigasi folder-bab (Langkah 3a)           ║
   ║ Letak: tepat sebelum function vEd                        ║
   ╚══════════════════════════════════════════════════════════╝ */
function chapterPath(s,cid){
  const path=[];let cur=cid,guard=0;
  while(cur&&guard++<50){
    const c=s.chapters.find(x=>x.id===cur);
    if(!c)break;
    path.unshift({id:c.id,title:c.title});
    cur=c.parent||null;
  }
  return path;
}

function sidebarHTML(s){
  const node=(cid,level)=>{
    if(level>20)return '';
    const c=s.chapters.find(x=>x.id===cid);
    if(!c)return '';
    const kids=s.chapters.filter(x=>(x.parent||null)===cid);
    const active=edPath===cid;
    const n=s.passages.filter(p=>p.chapter===cid).length;
    return `<div class="sb-item${active?' on':''}" data-a="edpath" data-id="${c.id}" style="padding-left:${8+level*12}px">`+
      `<span class="sb-dot"></span><span class="sb-label">${esc(c.title)}</span>${n?`<span class="cnt">${n}</span>`:''}`+
    `</div>`+
    kids.map(k=>node(k.id,level+1)).join('');
  };
  const roots=s.chapters.filter(c=>(c.parent||null)===null);
  return `<div class="sb-title" title="${esc(s.title)}">${esc(s.title)}</div>`+
    `<div class="sb-head">Navigasi</div>`+
    `<div class="sb-item${edPath===null?' on':''}" data-a="edpath" data-id="">`+
      `<span class="sb-dot"></span><span class="sb-label">Semua bab</span>`+
    `</div>`+
    roots.map(c=>node(c.id,0)).join('')+
    `<div class="sb-foot"><button class="sm pr" data-a="nc">+ Bab</button></div>`;
}

function edBreadcrumb(s){
  if(edPath===null)return `<span class="cur">Semua bab</span>`;
  const path=chapterPath(s,edPath);
  let h=`<button data-a="edpath" data-id="">Semua</button>`;
  path.forEach((c,i)=>{
    h+=`<span class="sep">/</span>`;
    if(i<path.length-1)h+=`<button data-a="edpath" data-id="${c.id}">${esc(c.title)}</button>`;
    else h+=`<span class="cur">${esc(c.title)}</span>`;
  });
  return h;
}

function folderCard(s,c){
  const n=s.passages.filter(p=>p.chapter===c.id).length;
  const kids=s.chapters.filter(x=>(x.parent||null)===c.id).length;
  return `<div class="folder-card" data-a="edpath" data-id="${c.id}">`+
    `<div class="fc-icon">📁</div>`+
    `<div class="fc-body"><b>${esc(c.title)}</b><p>${n} bagian${kids?` · ${kids} sub-bab`:''}</p></div>`+
    `<span class="fc-arrow">›</span>`+
  `</div>`;
}

function edRoot(s){
  const noChap=s.passages.filter(p=>(p.chapter||null)===null);
  const roots=s.chapters.filter(c=>(c.parent||null)===null);
  let h=`<div class="row" style="margin:0 0 12px"><button class="sm" data-a="awal">Nilai awal cerita</button></div>`;
  if(!s.passages.length&&!s.chapters.length){
    return h+empty('Belum ada bab atau bagian','Mulai dengan satu bab atau langsung tulis bagian pertama.',
      `<button class="pr" data-a="nc">Buat bab</button><button data-a="np" data-id="">Buat bagian tanpa bab</button>`);
  }
  if(noChap.length){
    h+=`<div class="sec"><div class="row"><b>Tanpa bab</b><span class="cnt">${noChap.length}</span></div>`+
       `<div class="row"><button class="sm" data-a="np" data-id="">Tambah bagian</button></div></div>`+
       noChap.map(pCard).join('');
  }
  if(roots.length){
    h+=`<div class="sec"><div class="row"><b>Bab</b><span class="cnt">${roots.length}</span></div><div class="row"></div></div>`+
       roots.map(c=>folderCard(s,c)).join('');
  }
  h+=`<div style="margin-top:16px"><button class="pr" data-a="nc">Tambah bab</button></div>`;
  return h;
}

function edInside(s,cid){
  const c=s.chapters.find(x=>x.id===cid);
  if(!c){edPath=null;return edRoot(s)}
  const ps=s.passages.filter(p=>p.chapter===cid);
  const kids=s.chapters.filter(x=>(x.parent||null)===cid);
  let h=`<div class="sec" style="margin-top:0"><div class="row">`+
    `<b style="font-size:16px;text-transform:none;letter-spacing:0;color:var(--t)">${esc(c.title)}</b>`+
    `<span class="cnt">${ps.length} bagian</span></div>`+
    `<div class="row">`+
      `<button class="sm" data-a="ncs" data-id="${c.id}">+ Sub-bab</button>`+
      `<button class="sm" data-a="np" data-id="${c.id}">Tambah bagian</button>`+
      `<button class="sm" data-a="chn" data-id="${c.id}">Sambung semua</button>`+
      `<button class="sm" data-a="rc" data-id="${c.id}">Ubah</button>`+
      `<button class="sm del" data-a="dc" data-id="${c.id}">Hapus</button>`+
    `</div></div>`;
  if(kids.length){
    h+=`<div style="margin-bottom:8px">`+kids.map(k=>folderCard(s,k)).join('')+`</div>`;
  }
  if(ps.length) h+=ps.map(pCard).join('');
  else h+=`<p class="sub">Belum ada bagian di bab ini. Tekan "Tambah bagian".</p>`;
  return h;
}
/* ╚══════════════════════════════════════════════════════════╝ */


/* ╔══════════════════════════════════════════════════════════╗
   ║ AWAL — vEd versi Langkah 3a (sidebar + konten)           ║
   ║ Ini MENGGANTIKAN vEd versi 2a. Jangan ada dua vEd.       ║
   ╚══════════════════════════════════════════════════════════╝ */
function vEd(s){
  if(edPath!==null&&!s.chapters.find(x=>x.id===edPath))edPath=null;
  const body = edPath===null ? edRoot(s) : edInside(s, edPath);
  return `<div class="ed-wrap">`+
    `<aside class="ed-side${laci?' open':''}" id="edside">${sidebarHTML(s)}</aside>`+
    `<div class="ed-main">`+
      `<div class="ed-bar">`+
        `<button class="ed-hamb" data-a="laci" aria-label="Buka daftar bab">☰</button>`+
        `<div class="crumb">${edBreadcrumb(s)}</div>`+
      `</div>`+
      body+
    `</div>`+
  `</div>`;
}
/* ╚══════════════════════════════════════════════════════════╝ */
/* ╚══════════════════════════════════════════════════════════╝ */

let view={x:20,y:20,k:1},drag=null,conn=false,pend=null,lastTap={},pinch=null,mapPath=null;
let selectMode=false, selectIds=new Set(), hapusLanjut=null;
const viewPerLevel=new Map();
function vMap(s){
  const h=`<div class="peta-head">${head('Peta',esc(s.title))}</div>`;
  if(!s.passages.length && !s.chapters.length)return h+empty('Peta kosong','Buat bagian cerita untuk melihatnya di sini.',`<button class="pr" data-a="mnp">Tambah bagian</button>`);
  const {folders,nodes}=containersAt(s,mapPath);
  const help = mapPath && !folders.length && !nodes.length ?
  'Folder ini kosong. Tekan + Bagian atau + Sub-bab di atas.' :
  'Geser latar untuk menggeser peta, cubit dua jari untuk zoom, ketuk folder untuk masuk, ketuk dua kali node untuk mengubah isinya. Tersesat? Tekan ⛶ Fit atau 🎯.';
  return h+
    `<div class="peta-crumb-wrap"><div class="peta-crumb">${petaCrumb(s)}</div></div>`+
    `<div class="peta-bar"><div class="row" id="mtb"></div></div>`+
    `<div class="mapw"><svg id="msv"><defs><pattern id="gr" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" style="fill:var(--line)"/></pattern><marker id="ma" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" markerUnits="userSpaceOnUse" orient="auto"><path d="M0 0L10 5L0 10z" fill="#A3A3A3"/></marker><marker id="mb" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="11" markerHeight="11" markerUnits="userSpaceOnUse" orient="auto"><path d="M0 0L10 5L0 10z" fill="#3B82F6"/></marker></defs><rect width="100%" height="100%" fill="url(#gr)"/><g id="mg"><g id="eg"></g><g id="ng"></g></g><rect id="srect" class="selrect" x="0" y="0" width="0" height="0" visibility="hidden"/></svg></div>`+
    `<p class="peta-help sub" style="margin-top:8px">${help}</p>`;
}

/* ╔══════════════════════════════════════════════════════════╗
   ║ AWAL — Helper navigasi Peta folder (Langkah 3c)          ║
   ║ Letak: tepat setelah function vMap                       ║
   ╚══════════════════════════════════════════════════════════╝ */
function containersAt(s, level){
  if (level === null || level === undefined) {
    return {folders: s.chapters.filter(c => !(c.parent || null)), nodes: s.passages.filter(p => !(p.chapter || null))};
  }
  return {folders: s.chapters.filter(c => (c.parent || null) === level), nodes: s.passages.filter(p => (p.chapter || null) === level)};
}

function containerOf(s, p, level){
  if (level !== null && level !== undefined && p.chapter === level) return p.id;
  return p.chapter || p.id;
}

function petaCrumb(s){
  const path = [];
  let cur = mapPath;
  while (cur) {
    const c = s.chapters.find(x => x.id === cur);
    if (!c) break;
    path.unshift({id: c.id, title: c.title});
    cur = c.parent || null;
  }
  let h = `<button data-a="mapnav" data-id="">Peta</button>`;
  path.forEach((c, i) => {
    h += `<span class="sep">/</span>`;
    if (i < path.length - 1) h += `<button data-a="mapnav" data-id="${c.id}">${esc(c.title)}</button>`;
    else h += `<span class="cur">${esc(c.title)}</span>`;
  });
  return h;
}

function masukFolder(s, cid){
  const newPath = cid || null;
  if (newPath === mapPath) return;
  if (newPath && !s.chapters.find(c => c.id === newPath)) return;
  viewPerLevel.set(mapPath || 'root', {...view});
  mapPath = newPath;
  view = viewPerLevel.get(mapPath || 'root') || {x:20, y:20, k:1};
  sel = null;
selectMode = false;
selectIds.clear();
/* Langkah 3d: dorong history supaya tombol Back browser naik satu level, bukan keluar. */
history.pushState({ mapPath: newPath }, '');
}

/* ╔══════════════════════════════════════════════════════════╗
   ║ findFreeSpot — cari posisi kosong di level peta (3d)     ║
   ║ Dipakai oleh drawMap, case 'mnp', case 'ncs' agar        ║
   ║ node/folder baru tidak menumpuk dengan yang sudah ada.   ║
   ╚══════════════════════════════════════════════════════════╝ */
function findFreeSpot(s, level, preferX, preferY){
  let x = preferX, y = preferY, tries = 0;
  const used = () => {
    const all = [
      ...s.chapters.filter(c => (c.parent || null) === level && c.x != null && c.y != null),
      ...s.passages.filter(p => (p.chapter || null) === level && p.x != null && p.y != null)
    ];
    return all.some(o => Math.abs(o.x - x) < 180 && Math.abs(o.y - y) < 100);
  };
  while (used() && tries < 60) {
    y += 110;
    if (tries % 5 === 4) { y = preferY; x += 200; }
    tries++;
  }
  return {x, y};
}
/* ╚══════════════════════════════════════════════════════════╝ */
/* ╔══════════════════════════════════════════════════════════╗
   ║ AWAL — Peta folder-bab (Langkah 3b)                      ║
   ║ clipBox: hitung titik potong garis dari pusat kotak.     ║
   ║ edgesHTML: gambar garis antar-container (folder/node).   ║
   ║ drawMap: render folder bab + passage tanpa bab.          ║
   ╚══════════════════════════════════════════════════════════╝ */
function clipBox(cx,cy,hw,hh,ux,uy,pad){
  const t = Math.min(hw/(Math.abs(ux)||1e-9), hh/(Math.abs(uy)||1e-9));
  const l = Math.hypot(ux,uy) || 1;
  return [cx + ux*t + ux/l*pad, cy + uy*t + uy/l*pad];
}

function edgesHTML(s, level){
  const {folders, nodes} = containersAt(s, level);
  const visible = new Set();
  const elMap = new Map();
  folders.forEach(c => {visible.add(c.id); elMap.set(c.id, {type:'folder', el:c})});
  nodes.forEach(p => {visible.add(p.id); elMap.set(p.id, {type:'node', el:p})});

  const buckets = new Map();
  s.passages.forEach(p => {
    const srcC = containerOf(s, p, level);
    if (!visible.has(srcC)) return;
    if (!p.choices) return;
    p.choices.forEach(ch => {
      if (!ch.to) return;
      const tgt = s.passages.find(x => x.id === ch.to);
      if (!tgt) return;
      const dstC = containerOf(s, tgt, level);
      if (!visible.has(dstC)) return;
      if (srcC === dstC) return;
      const key = srcC + '>' + dstC;
      if (!buckets.has(key)) buckets.set(key, {src: srcC, dst: dstC, count: 0});
      buckets.get(key).count++;
    });
  });

  let out = '';
  buckets.forEach(({src, dst, count}) => {
    const sInfo = elMap.get(src), dInfo = elMap.get(dst);
    if (!sInfo || !dInfo) return;
    const sEl = sInfo.el, dEl = dInfo.el;
    if (sEl.x == null || sEl.y == null || dEl.x == null || dEl.y == null) return;
    const sw = sInfo.type === 'folder' ? 160 : 140;
    const sh = sInfo.type === 'folder' ? 88 : 70;
    const dw = dInfo.type === 'folder' ? 160 : 140;
    const dh = dInfo.type === 'folder' ? 88 : 70;
    const scx = sEl.x + sw/2, scy = sEl.y + sh/2;
    const dcx = dEl.x + dw/2, dcy = dEl.y + dh/2;
    const dx = dcx - scx, dy = dcy - scy, len = Math.hypot(dx, dy);
    if (!len) return;
    const midx = (scx + dcx)/2 - dy/len*28;
    const midy = (scy + dcy)/2 + dx/len*28;
    const [sx, sy] = clipBox(scx, scy, sw/2, sh/2, midx-scx, midy-scy, 0);
    const [ex, ey] = clipBox(dcx, dcy, dw/2, dh/2, midx-dcx, midy-dcy, 5);
    const hl = sel && (sel === src || sel === dst);
    out += `<path d="M${sx} ${sy} Q${midx} ${midy} ${ex} ${ey}" fill="none" stroke="${hl?'#3B82F6':'#A3A3A3'}" stroke-width="${hl?2.5:1.5}" marker-end="url(#${hl?'mb':'ma'})"/>`;
    if (count > 1) {
      out += `<g transform="translate(${midx} ${midy})"><circle r="9" fill="${hl?'#3B82F6':'#A3A3A3'}" stroke="var(--card)" stroke-width="2"/><text y="4" text-anchor="middle" font-size="10" font-weight="700" fill="#fff">${count}</text></g>`;
    }
  });
  return out;
}

const applyView=()=>$('mg')&&$('mg').setAttribute('transform',`translate(${view.x} ${view.y}) scale(${view.k})`);

function drawMap(){
  const s=S();if(!s||tab!=='map'||!$('mg'))return;
  if(mapPath && !s.chapters.find(c => c.id === mapPath)){mapPath = null; view = {x:20, y:20, k:1};}

  const {folders, nodes} = containersAt(s, mapPath);

  folders.forEach((c,i) => {
    if(c.x==null||c.y==null){
      const spot = findFreeSpot(s, mapPath, 30+(i%3)*220, 30+Math.floor(i/3)*140);
      c.x = spot.x; c.y = spot.y;
    }
  });
  nodes.forEach((p,i) => {
    if(p.x==null||p.y==null){
      const spot = findFreeSpot(s, mapPath, 30+(i%3)*200, 30+Math.floor(i/3)*120);
      p.x = spot.x; p.y = spot.y;
    }
  });

  let n='';
  folders.forEach(c => {
    const ps = s.passages.filter(p => p.chapter === c.id).length;
    const sub = s.chapters.filter(x => x.parent === c.id).length;
    const t = c.title.length > 14 ? c.title.slice(0,13)+'…' : c.title;
    n += `<g class="nd folder${sel===c.id?' on':''}${selectIds.has(c.id)?' sel':''}" data-id="${c.id}" transform="translate(${c.x} ${c.y})"><rect width="160" height="88" rx="14"/><text x="14" y="46" style="font-size:22px">📁</text><text x="46" y="30" class="t1">${esc(t)}</text><text x="46" y="52" class="t2">${ps} bagian${sub?` · ${sub} sub`:''}</text></g>`;
  });
  nodes.forEach(p => {
    const inn = s.passages.reduce((k,x) => k + x.choices.filter(c => c.to === p.id).length, 0);
    const t = p.title.length > 17 ? p.title.slice(0,16)+'…' : p.title;
    n += `<g class="nd${p.start?' st':''}${sel===p.id?' on':''}${selectIds.has(p.id)?' sel':''}" data-id="${p.id}" transform="translate(${p.x} ${p.y})"><rect width="140" height="70" rx="12"/><text x="12" y="30" class="t1">${esc(t)}</text><text x="12" y="52" class="t2">${p.choices.length} keluar · ${inn} masuk</text>${p.start?'<text x="118" y="18" class="stt">★</text>':''}</g>`;
  });

  $('eg').innerHTML = edgesHTML(s, mapPath);
  $('ng').innerHTML = n;
  applyView();

  let tb = '';
  if (selectMode) {
    tb += `<button class="sm" data-a="selmode">✕ Batal</button>`;
    tb += `<button class="sm" data-a="selall">Pilih Semua</button>`;
    if (selectIds.size > 0) tb += `<button class="sm del" data-a="seldel">Hapus (${selectIds.size})</button>`;
  } else {
    const inFolder = mapPath !== null;
    tb += `<button class="sm pr" data-a="mnp" data-id="${inFolder?mapPath:''}">+ Bagian</button>`;
    tb += inFolder ? `<button class="sm" data-a="ncs" data-id="${mapPath}">+ Sub-bab</button>` : `<button class="sm" data-a="nc">+ Bab</button>`;
    tb += `<button class="sm" data-a="mz" data-id="-">−</button><button class="sm" data-a="mz" data-id="+">+</button><button class="sm" data-a="mz" data-id="0">100%</button><button class="sm" data-a="mlay">Rapikan</button>`;
tb += `<button class="sm" data-a="fit" title="Muat semua di layar">⛶ Fit</button><button class="sm" data-a="resetview" title="Reset posisi & zoom">🎯</button><button class="sm" data-a="cari" title="Cari bagian">🔍 Cari</button>`;
    tb += `<button class="sm" data-a="selmode">☐ Pilih</button>`;
    if (sel && P(s, sel)) tb += `<button class="sm ${conn?'pr':''}" data-a="mconn">Sambungkan</button><button class="sm" data-a="ep" data-id="${sel}">Ubah</button><button class="sm del" data-a="dp" data-id="${sel}">Hapus</button>`;
    if (conn) tb += '<span class="sub" style="margin:0">Ketuk bagian tujuan.</span>';
  }
  $('mtb').innerHTML = tb;
}
/* ╚══════════════════════════════════════════════════════════╝ */
function zoom(f,cx,cy){const k=Math.min(2.5,Math.max(.3,view.k*f));view.x=cx-(cx-view.x)*k/view.k;view.y=cy-(cy-view.y)*k/view.k;view.k=k;applyView()}
$('app').addEventListener('pointerdown',e=>{
  const sv=e.target.closest('#msv');if(!sv)return;
  /* Langkah 3e: mode seleksi — drag di node = pan, drag di kosong = kotak seleksi */
  if(selectMode){
    const r=sv.getBoundingClientRect();
    drag={sx:e.clientX,sy:e.clientY,moved:false,mode:'select',
          hitStart:e.target.closest('.nd'),
          vx:view.x,vy:view.y,
          rectX0:e.clientX-r.left,rectY0:e.clientY-r.top};
    try{sv.setPointerCapture(e.pointerId)}catch(_){}
    return;
  }
  const g=e.target.closest('.nd');
  let jenis=null,obj=null;
  if(g){
    const s=S();
    if(g.classList.contains('folder')){jenis='folder';obj=s.chapters.find(c=>c.id===g.dataset.id)}
    else{jenis='node';obj=s.passages.find(p=>p.id===g.dataset.id)}
  }
  drag={sx:e.clientX,sy:e.clientY,moved:false,id:obj?obj.id:null,jenis,obj,vx:view.x,vy:view.y,px:obj?.x,py:obj?.y};
  try{sv.setPointerCapture(e.pointerId)}catch(_){}
});
$('app').addEventListener('pointermove',e=>{
  if(pinch||!drag)return;const dx=e.clientX-drag.sx,dy=e.clientY-drag.sy;
  if(!drag.moved&&Math.hypot(dx,dy)<5)return;drag.moved=true;
  if(drag.mode==='select'){
    if(drag.hitStart){
      view.x=drag.vx+dx;view.y=drag.vy+dy;applyView();
    }else{
      const sv=document.getElementById('msv');if(!sv)return;
      const r=sv.getBoundingClientRect();
      const x=e.clientX-r.left,y=e.clientY-r.top;
      const rx=Math.min(drag.rectX0,x),ry=Math.min(drag.rectY0,y);
      const rw=Math.abs(x-drag.rectX0),rh=Math.abs(y-drag.rectY0);
      drag.rectX=rx;drag.rectY=ry;drag.rectW=rw;drag.rectH=rh;
      const srect=document.getElementById('srect');
      if(srect){srect.setAttribute('x',rx);srect.setAttribute('y',ry);srect.setAttribute('width',rw);srect.setAttribute('height',rh);srect.setAttribute('visibility','visible')}
    }
    return;
  }
  if(drag.id&&drag.obj){
    drag.obj.x=Math.round(drag.px+dx/view.k);
    drag.obj.y=Math.round(drag.py+dy/view.k);
    const g=document.querySelector(`.nd[data-id="${drag.obj.id}"]`);
    if(g)g.setAttribute('transform',`translate(${drag.obj.x} ${drag.obj.y})`);
    $('eg').innerHTML=edgesHTML(S(),mapPath);
  }
  else{view.x=drag.vx+dx;view.y=drag.vy+dy;applyView()}
});
$('app').addEventListener('pointerup',e=>{
  if(!drag)return;const d=drag;drag=null;const s=S();
  if(d.mode==='select'){
    if(!d.moved){
      if(d.hitStart){
        const id=d.hitStart.dataset.id;
        if(selectIds.has(id))selectIds.delete(id);else selectIds.add(id);
      }else selectIds.clear();
    }else if(!d.hitStart && d.rectW!=null){
      const rx=d.rectX,ry=d.rectY,rw=d.rectW,rh=d.rectH;
      const hit=(ox,oy,ow,oh)=>!(ox+ow<rx||ox>rx+rw||oy+oh<ry||oy>ry+rh);
      const {folders,nodes}=containersAt(s,mapPath);
      if(!e.shiftKey)selectIds.clear();
      folders.forEach(c=>{
        if(c.x==null||c.y==null)return;
        const ox=c.x*view.k+view.x,oy=c.y*view.k+view.y;
        if(hit(ox,oy,160*view.k,88*view.k))selectIds.add(c.id);
      });
      nodes.forEach(p=>{
        if(p.x==null||p.y==null)return;
        const ox=p.x*view.k+view.x,oy=p.y*view.k+view.y;
        if(hit(ox,oy,140*view.k,70*view.k))selectIds.add(p.id);
      });
    }
    const srect=document.getElementById('srect');
    if(srect){srect.setAttribute('visibility','hidden');srect.setAttribute('width','0');srect.setAttribute('height','0')}
    drawMap();
    return;
  }
  if(d.moved){
    if(d.id){if(d.jenis==='folder'){save();drawMap()}else{sel=d.id;save();drawMap()}}
    return;
  }
  if(d.id){
    if(d.jenis==='folder'){masukFolder(s,d.id);render();return}
    if(conn&&sel&&sel!==d.id){const a=P(s,sel),b=P(s,d.id);if(a&&b&&!a.choices.some(c=>c.to===b.id))a.choices.push({id:uid(),text:b.title,to:b.id});conn=false;save()}
    else{const now=Date.now();if(lastTap.id===d.id&&now-lastTap.t<350){lastTap={};sel=d.id;pDlg(d.id);return}lastTap={id:d.id,t:now};sel=d.id}
  }else{sel=null;conn=false}
  drawMap();
});
$('app').addEventListener('wheel',e=>{const sv=e.target.closest('#msv');if(!sv)return;e.preventDefault();const r=sv.getBoundingClientRect();zoom(e.deltaY<0?1.1:.9,e.clientX-r.left,e.clientY-r.top)},{passive:false});
/* ╔══════════════════════════════════════════════════════════╗
   ║ AWAL — Pinch zoom dua jari (Langkah polish peta)         ║
   ║ Letak: setelah handler wheel. Khusus sentuh.             ║
   ╚══════════════════════════════════════════════════════════╝ */
const tJarak=(a,b)=>Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);
document.addEventListener('touchstart',e=>{
  if(e.touches.length!==2||!e.target.closest('#msv'))return;
  const [a,b]=e.touches;
  pinch={d0:tJarak(a,b),k0:view.k,midX:(a.clientX+b.clientX)/2,midY:(a.clientY+b.clientY)/2};
  drag=null;
},{passive:true});
document.addEventListener('touchmove',e=>{
  if(!pinch||e.touches.length!==2)return;
  const sv=document.getElementById('msv');if(!sv)return;
  e.preventDefault();
  const [a,b]=e.touches,d=tJarak(a,b);
  if(!pinch.d0)return;
  const r=sv.getBoundingClientRect();
  const px=pinch.midX-r.left,py=pinch.midY-r.top;
  const kNew=Math.min(2.5,Math.max(.3,pinch.k0*(d/pinch.d0)));
  const s=kNew/view.k;
  view.x=px-(px-view.x)*s;
  view.y=py-(py-view.y)*s;
  view.k=kNew;
  applyView();
},{passive:false});
document.addEventListener('touchend',e=>{if(e.touches.length<2)pinch=null},{passive:true});
document.addEventListener('touchcancel',()=>{pinch=null},{passive:true});
/* ╔══════════════════════════════════════════════════════════╗
   ║ popstate — tombol Back browser untuk navigasi folder (3d)║
   ║ Setiap masukFolder pushState; Back = naik satu level.    ║
   ╚══════════════════════════════════════════════════════════╝ */
window.addEventListener('popstate', e => {
  const target = (e.state && 'mapPath' in e.state) ? e.state.mapPath : null;
  if (target === mapPath) return;
  const s = S();
  if (!s) return;
  viewPerLevel.set(mapPath || 'root', {...view});
  mapPath = target;
  view = viewPerLevel.get(mapPath || 'root') || {x:20, y:20, k:1};
  sel = null;
  if (tab === 'map') render();
});
/* ╚══════════════════════════════════════════════════════════╝ */

function vDbg(){
  if(!eng||!eng.inti||eng.err.length||eng.banner)return '';
  let pot;try{pot=JSON.stringify(eng.inti.status.potret(),null,1)}catch(e){pot='(state tidak bisa dibaca: '+e.message+')'}
  const info=eng.autoKB?`Autosave terakhir: ${(eng.autoKB/1024).toFixed(1)} KB (batas ${AUTO_MAX/1024} KB)`:'Autosave belum ditulis';
  return `<details class="card" id="dbg"${eng.dbg?' open':''}><summary data-a="dbg">Debug: state permainan</summary>${eng.autoWarn?`<p class="err">${esc(eng.autoWarn)}</p>`:''}<p class="sub" style="margin:0 0 6px">${info}</p><pre class="kd" style="max-height:260px;overflow:auto;font-size:11px">${esc(pot)}</pre></details>`;
}
/* ╔══════════════════════════════════════════════════════════╗
   ║ hapusTerpilih — hapus massal dengan konfirmasi 2 tahap   ║
   ║ Dipanggil dari case 'seldel' di aksi.js.                 ║
   ╚══════════════════════════════════════════════════════════╝ */
function hapusTerpilih(s){
  if(!s||!selectIds.size)return;
  const ids=[...selectIds];
  const chapters=s.chapters.filter(c=>ids.includes(c.id));
  const rootChapters=chapters.filter(c=>!ids.includes(c.parent));
  const subtrees=new Set();
  const addSubtree=cid=>{subtrees.add(cid);s.chapters.filter(c=>c.parent===cid).forEach(c=>addSubtree(c.id))};
  rootChapters.forEach(c=>addSubtree(c.id));

  const passagesInChapters=s.passages.filter(p=>subtrees.has(p.chapter));
  const extraPassages=s.passages.filter(p=>ids.includes(p.id)&&!subtrees.has(p.chapter));
  const totalChapters=subtrees.size;
  const totalSubChapters=totalChapters-rootChapters.length;
  const parentOf=cid=>{const c=s.chapters.find(x=>x.id===cid);return c?(c.parent||null):null};

  const doDelete=(deleteChapterPassages)=>{
    const passagesToDelete=new Set(extraPassages.map(p=>p.id));
    if(deleteChapterPassages){
      passagesInChapters.forEach(p=>passagesToDelete.add(p.id));
    } else {
      passagesInChapters.forEach(p=>{
        const findRoot=cid=>{
          if(rootChapters.find(c=>c.id===cid))return cid;
          const c=s.chapters.find(x=>x.id===cid);
          return c&&c.parent?findRoot(c.parent):null;
        };
        const root=findRoot(p.chapter);
        p.chapter=root?parentOf(root):null;
      });
    }
    s.chapters=s.chapters.filter(c=>!subtrees.has(c.id));
    s.passages=s.passages.filter(p=>!passagesToDelete.has(p.id));
    s.passages.forEach(p=>p.choices&&p.choices.forEach(ch=>{
      if(ch.to&&passagesToDelete.has(ch.to))ch.to=null;
    }));
    if(mapPath&&subtrees.has(mapPath))mapPath=parentOf(mapPath)||null;
    selectIds.clear();
    selectMode=false;
  };

  if(totalChapters===0){
    ask(`Hapus ${extraPassages.length} bagian?`,()=>{doDelete(false);save();render()});
    return;
  }
  if(passagesInChapters.length===0){
    let msg=`Hapus ${totalChapters} bab`;
    if(totalSubChapters>0)msg+=` (termasuk ${totalSubChapters} sub-bab)`;
    if(extraPassages.length>0)msg+=` dan ${extraPassages.length} bagian`;
    msg+='?';
    ask(msg,()=>{doDelete(false);save();render()});
    return;
  }
  const step2=(hapusPassage)=>{
    const akanHapus=hapusPassage?passagesInChapters.length+extraPassages.length:extraPassages.length;
    let msg=`Hapus ${totalChapters} bab`;
    if(totalSubChapters>0)msg+=` (termasuk ${totalSubChapters} sub-bab)`;
    if(akanHapus>0)msg+=` dan ${akanHapus} bagian`;
    msg+='?';
    if(!hapusPassage)msg+=` (Bagian di dalam bab dipindah ke bab induknya.)`;
    ask(msg,()=>{doDelete(hapusPassage);save();render()});
  };
  hapusLanjut=step2;
  dlg(`<h2>Hapus bab</h2>
    <p class="sub">Ada ${passagesInChapters.length} bagian di dalam ${totalChapters} bab yang akan dihapus.</p>
    <p class="sub">Hapus juga bagian-bagian itu, atau pindahkan ke bab induknya?</p>
    <div class="row" style="justify-content:flex-end;flex-wrap:wrap;margin-top:14px;gap:8px">
      <button data-a="dx">Batal</button>
      <button data-a="passtep" data-id="pindah">Pindah ke induk</button>
      <button class="pr" data-a="passtep" data-id="hapus">Hapus semua</button>
    </div>`,null);
}
/* ╔══════════════════════════════════════════════════════════╗
   ║ AWAL — Recovery Peta (Langkah 3f)                        ║
   ║ fitView / resetView / teleportKe / dialogCari            ║
   ╚══════════════════════════════════════════════════════════╝ */
function resetView(s){
  if(!s){view={x:20,y:20,k:1};applyView();return;}
  if(sel){
    const c=s.chapters.find(x=>x.id===sel);
    const p=s.passages.find(x=>x.id===sel);
    const obj=c||p;
    if(obj&&obj.x!=null&&obj.y!=null){
      const r=document.getElementById('msv')?.getBoundingClientRect();
      if(r){
        const w=c?160:140,h=c?88:70;
        view.x=r.width/2-(obj.x+w/2)*view.k;
        view.y=r.height/2-(obj.y+h/2)*view.k;
        applyView();return;
      }
    }
  }
  const {folders,nodes}=containersAt(s,mapPath);
  const items=[...folders.map(c=>({o:c,w:160,h:88})),...nodes.map(p=>({o:p,w:140,h:70}))].filter(x=>x.o.x!=null&&x.o.y!=null);
  if(items.length){
    let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
    items.forEach(({o,w,h})=>{minX=Math.min(minX,o.x);minY=Math.min(minY,o.y);maxX=Math.max(maxX,o.x+w);maxY=Math.max(maxY,o.y+h)});
    const r=document.getElementById('msv')?.getBoundingClientRect();
    if(r){
      view.x=r.width/2-((minX+maxX)/2)*view.k;
      view.y=r.height/2-((minY+maxY)/2)*view.k;
      applyView();return;
    }
  }
  view={x:20,y:20,k:1};applyView();
}

function fitView(s){
  if(!s) return;
  const {folders, nodes} = containersAt(s, mapPath);
  const items = [];
  folders.forEach(c => {if(c.x != null && c.y != null) items.push({x:c.x, y:c.y, w:160, h:88});});
  nodes.forEach(p => {if(p.x != null && p.y != null) items.push({x:p.x, y:p.y, w:140, h:70});});
  if(!items.length){resetView();return;}
  let minX=Infinity, minY=Infinity, maxX=-Infinity, maxY=-Infinity;
  items.forEach(o => {
    minX=Math.min(minX, o.x); minY=Math.min(minY, o.y);
    maxX=Math.max(maxX, o.x+o.w); maxY=Math.max(maxY, o.y+o.h);
  });
  const r = document.getElementById('msv')?.getBoundingClientRect();
  if(!r) return;
  const pad = 24;
  const w = Math.max(1, maxX-minX);
  const h = Math.max(1, maxY-minY);
  const kx = (r.width - pad*2) / w;
  const ky = (r.height - pad*2) / h;
  const k = Math.min(1.5, Math.max(0.3, Math.min(kx, ky)));
  view.k = k;
  view.x = pad - minX*k;
  view.y = pad - minY*k;
  applyView();
}

function teleportKe(s, passageId){
  const p = s.passages.find(x => x.id === passageId);
  if(!p) return;
  recentPush('s', s.id, passageId);
  const targetLevel = p.chapter || null;
  const levelChanged = targetLevel !== mapPath;
  if(levelChanged){
    viewPerLevel.set(mapPath || 'root', {...view});
    mapPath = targetLevel;
    sel = null;
    selectMode = false;
    selectIds.clear();
    history.pushState({mapPath: targetLevel}, '');
    view = viewPerLevel.get(mapPath || 'root') || {x:20, y:20, k:1};
  }
  tab = 'map';
eng = null;
render();
window.scrollTo(0, 0);
if(document.activeElement && document.activeElement.blur) document.activeElement.blur();
requestAnimationFrame(() => {
    const r = document.getElementById('msv')?.getBoundingClientRect();
    if(!r) return;
    if(p.x == null || p.y == null){drawMap(); if(p.x == null) return;}
    const cx = p.x + 70;
    const cy = p.y + 35;
    view.x = r.width/2 - cx*view.k;
    view.y = r.height/2 - cy*view.k;
    applyView();
    sel = p.id;
    drawMap();
  });
}

/* ╔═══ AWAL FUNGSI dialogCari (dengan riwayat) ═══╗
   Kosong → 4 terakhir dibuka + 4 terakhir dicari.
   Ketik  → hasil cari (perilaku lama).
   ═══════════════════════════════════════════════ */
function dialogCari(s){
  if(!s) return;
  recentLoad(s.id);
  dlg(`<h2>Cari bagian</h2>
    <input id="cfind" placeholder="Ketik judul bagian…" autocomplete="off" spellcheck="false">
    <div id="cres" class="cres"></div>
    <div class="row" style="justify-content:flex-end"><button data-a="dx">Tutup</button></div>`, null);
  const inp = $('cfind'), res = $('cres');
  if(!inp || !res) return;

  const item = (p, tag) => {
    const c = s.chapters.find(x => x.id === p.chapter);
    return `<div class="cres-item" data-a="teleport" data-id="${p.id}"><b>${esc(p.title)}</b><span class="sub">${c?esc(c.title):'tanpa bab'}${tag?' · '+tag:''}</span></div>`;
  };
  const renderRes = () => {
    const q = inp.value.trim().toLowerCase();
    if(q){
      const list = s.passages.filter(p => p.title.toLowerCase().includes(q)).slice(0, 40);
      if(!list.length){ res.innerHTML = '<p class="sub" style="padding:12px;margin:0">Tidak ada hasil.</p>'; return; }
      res.innerHTML = list.map(p => item(p, '')).join('');
      return;
    }
    const inter  = recentClean(s, recentCache.interacted).slice(0, 4);
    const search = recentClean(s, recentCache.searched).slice(0, 4);
    let h = '';
    if(inter.length){
      h += `<div class="cres-head">Terakhir dibuka</div>`;
      h += inter.map(id => { const p = s.passages.find(x => x.id === id); return p ? item(p, '') : ''; }).join('');
    }
    if(search.length){
      h += `<div class="cres-head">Terakhir dicari</div>`;
      h += search.map(id => { const p = s.passages.find(x => x.id === id); return p ? item(p, 'dicari') : ''; }).join('');
    }
    if(!h) h = '<p class="sub" style="padding:12px;margin:0">Belum ada riwayat. Ketik judul bagian untuk mencari.</p>';
    res.innerHTML = h;
  };
  inp.addEventListener('input', renderRes);
  inp.focus();
  renderRes();
}
/* ╚═══ AKHIR FUNGSI dialogCari ═══╝ */