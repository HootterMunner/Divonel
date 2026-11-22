/* ═══ editor/peta.js — Peta: state, vMap, drawMap, edgesHTML, folder — pecahan tampilan.js ═══ */

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
  const s=S();if(!s||docView!=='map'||!$('mg'))return;
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
  const mtb = $('mtb');
  if(mtb) mtb.innerHTML = ''; // Sembunyikan toolbar lama, karena sudah ada di ribbon atas
}
/* ╚══════════════════════════════════════════════════════════╝ */
