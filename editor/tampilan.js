/* ═══ editor/tampilan.js — tampilan editor ═══
   State UI (tab, sel, more), render(), Pustaka, Editor, Peta, panel debug. */
let tab='lib',sel=null,hist=[],tmp=[],cur=null;
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
  app.className = tab==='map' && s && (s.passages.length || s.chapters.length) ? 'app-map' : '';
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
const viewPerLevel=new Map();
function vMap(s){
  const h=`<div class="peta-head">${head('Peta',esc(s.title))}</div>`;
  if(!s.passages.length && !s.chapters.length)return h+empty('Peta kosong','Buat bagian cerita untuk melihatnya di sini.',`<button class="pr" data-a="mnp">Tambah bagian</button>`);
  const {folders,nodes}=containersAt(s,mapPath);
  const help=mapPath&&!folders.length&&!nodes.length
    ?'Folder ini kosong. Tekan + Bagian atau + Sub-bab di atas.'
    :'Geser latar untuk menggeser peta, seret kotak untuk memindahkan, cubit dua jari untuk zoom, ketuk folder untuk masuk, ketuk dua kali node untuk mengubah isinya.';
  return h+
    `<div class="peta-crumb-wrap"><div class="peta-crumb">${petaCrumb(s)}</div></div>`+
    `<div class="peta-bar"><div class="row" id="mtb"></div></div>`+
    `<div class="mapw"><svg id="msv"><defs><pattern id="gr" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" style="fill:var(--line)"/></pattern><marker id="ma" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" markerUnits="userSpaceOnUse" orient="auto"><path d="M0 0L10 5L0 10z" fill="#A3A3A3"/></marker><marker id="mb" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="11" markerHeight="11" markerUnits="userSpaceOnUse" orient="auto"><path d="M0 0L10 5L0 10z" fill="#3B82F6"/></marker></defs><rect width="100%" height="100%" fill="url(#gr)"/><g id="mg"><g id="eg"></g><g id="ng"></g></g></svg></div>`+
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
  viewPerLevel.set(mapPath || 'root', {...view});
  mapPath = newPath;
  view = viewPerLevel.get(mapPath || 'root') || {x:20, y:20, k:1};
  sel = null;
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

  folders.forEach((c,i) => {if(c.x==null||c.y==null){c.x=30+(i%3)*220;c.y=30+Math.floor(i/3)*140}});
  const yOffset = folders.length ? Math.ceil(folders.length/3)*140 : 0;
  nodes.forEach((p,i) => {if(p.x==null||p.y==null){p.x=30+(i%3)*200;p.y=30+Math.floor(i/3)*120+yOffset}});

  let n='';
  folders.forEach(c => {
    const ps = s.passages.filter(p => p.chapter === c.id).length;
    const sub = s.chapters.filter(x => x.parent === c.id).length;
    const t = c.title.length > 14 ? c.title.slice(0,13)+'…' : c.title;
    n += `<g class="nd folder${sel===c.id?' on':''}" data-id="${c.id}" transform="translate(${c.x} ${c.y})"><rect width="160" height="88" rx="14"/><text x="14" y="46" style="font-size:22px">📁</text><text x="46" y="30" class="t1">${esc(t)}</text><text x="46" y="52" class="t2">${ps} bagian${sub?` · ${sub} sub`:''}</text></g>`;
  });
  nodes.forEach(p => {
    const inn = s.passages.reduce((k,x) => k + x.choices.filter(c => c.to === p.id).length, 0);
    const t = p.title.length > 17 ? p.title.slice(0,16)+'…' : p.title;
    n += `<g class="nd${p.start?' st':''}${sel===p.id?' on':''}" data-id="${p.id}" transform="translate(${p.x} ${p.y})"><rect width="140" height="70" rx="12"/><text x="12" y="30" class="t1">${esc(t)}</text><text x="12" y="52" class="t2">${p.choices.length} keluar · ${inn} masuk</text>${p.start?'<text x="118" y="18" class="stt">★</text>':''}</g>`;
  });

  $('eg').innerHTML = edgesHTML(s, mapPath);
  $('ng').innerHTML = n;
  applyView();

  const inFolder = mapPath !== null;
  let tb = `<button class="sm pr" data-a="mnp" data-id="${inFolder?mapPath:''}">+ Bagian</button>`;
  tb += inFolder ? `<button class="sm" data-a="ncs" data-id="${mapPath}">+ Sub-bab</button>` : `<button class="sm" data-a="nc">+ Bab</button>`;
  tb += `<button class="sm" data-a="mz" data-id="-">−</button><button class="sm" data-a="mz" data-id="+">+</button><button class="sm" data-a="mz" data-id="0">100%</button><button class="sm" data-a="mlay">Rapikan</button>`;
  if (sel && P(s, sel)) tb += `<button class="sm ${conn?'pr':''}" data-a="mconn">Sambungkan</button><button class="sm" data-a="ep" data-id="${sel}">Ubah</button><button class="sm del" data-a="dp" data-id="${sel}">Hapus</button>`;
  if (conn) tb += '<span class="sub" style="margin:0">Ketuk bagian tujuan.</span>';
  $('mtb').innerHTML = tb;
}
/* ╚══════════════════════════════════════════════════════════╝ */
function zoom(f,cx,cy){const k=Math.min(2.5,Math.max(.3,view.k*f));view.x=cx-(cx-view.x)*k/view.k;view.y=cy-(cy-view.y)*k/view.k;view.k=k;applyView()}
$('app').addEventListener('pointerdown',e=>{
  const sv=e.target.closest('#msv');if(!sv)return;
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
  if(drag.id&&drag.obj){
    drag.obj.x=Math.round(drag.px+dx/view.k);
    drag.obj.y=Math.round(drag.py+dy/view.k);
    const g=document.querySelector(`.nd[data-id="${drag.obj.id}"]`);
    if(g)g.setAttribute('transform',`translate(${drag.obj.x} ${drag.obj.y})`);
    $('eg').innerHTML=edgesHTML(S(),mapPath);
  }
  else{view.x=drag.vx+dx;view.y=drag.vy+dy;applyView()}
});
$('app').addEventListener('pointerup',()=>{
  if(!drag)return;const d=drag;drag=null;const s=S();
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
/* ╚══════════════════════════════════════════════════════════╝ */

function vDbg(){
  if(!eng||!eng.inti||eng.err.length||eng.banner)return '';
  let pot;try{pot=JSON.stringify(eng.inti.status.potret(),null,1)}catch(e){pot='(state tidak bisa dibaca: '+e.message+')'}
  const info=eng.autoKB?`Autosave terakhir: ${(eng.autoKB/1024).toFixed(1)} KB (batas ${AUTO_MAX/1024} KB)`:'Autosave belum ditulis';
  return `<details class="card" id="dbg"${eng.dbg?' open':''}><summary data-a="dbg">Debug: state permainan</summary>${eng.autoWarn?`<p class="err">${esc(eng.autoWarn)}</p>`:''}<p class="sub" style="margin:0 0 6px">${info}</p><pre class="kd" style="max-height:260px;overflow:auto;font-size:11px">${esc(pot)}</pre></details>`;
}
