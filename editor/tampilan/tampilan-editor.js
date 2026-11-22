/* ═══ editor/tampilan-editor.js — Pustaka (vLib) + Editor (vEd, sidebar) — pecahan tampilan.js ═══ */

function vLib(){
  const l=db.stories.map(s=>`<div class="card ${s.id===db.active?'on':''}"><div class="row sp"><div style="flex:1;cursor:pointer" data-a="open" data-id="${s.id}"><h3>${esc(s.title)}</h3><p>${esc(s.description)||'Tanpa deskripsi'}${s.author?' — '+esc(s.author):''}</p></div><div class="row"><button class="sm" data-a="exp" data-id="${s.id}">Ekspor</button><button class="sm del" data-a="dels" data-id="${s.id}">Hapus</button></div></div></div>`).join('');
  return head('Pustaka',db.stories.length+' cerita')+(l||empty('Belum ada cerita','Buat cerita pertama atau impor dari berkas JSON.'))+`<div class="row"><button class="pr" data-a="news">Buat cerita baru</button><button data-a="imp">Impor</button><button data-a="demo">Muat cerita contoh</button><button data-a="cloud">☁ Cloud Sync</button></div><p class="footer-license">© 2026 Helmy Hidayat · <a href="LICENSE" target="_blank" rel="noopener">MIT License</a></p>`;
}

function pCard(p){
  return `<div class="card"><div class="row sp"><h3>${esc(p.title)}</h3>${p.start?'<span class="badge">★ Mulai</span>':''}${(p.refs||[]).length?`<span class="cnt">${p.refs.length} skrip</span>`:''}</div><p style="white-space:pre-wrap;display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden">${p.content?sanitizeHTML(p.content.slice(0,140)):'<i>Bagian kosong</i>'}</p><div class="row" style="margin-top:8px"><button class="sm" data-a="ch" data-id="${p.id}">Pilihan (${p.choices.length})</button><button class="sm" data-a="ep" data-id="${p.id}">Ubah</button></div></div>`;
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
  `${laci?'<div class="ed-scrim" data-a="laci"></div>':''}`+
  `<div class="ed-main">`+
         `<div class="ed-bar">` +
    `<div class="crumb">${edBreadcrumb(s)}</div>` +
    `</div>` +
    body +
    `</div>` +
  `</div>`;
}
/* ╚══════════════════════════════════════════════════════════╝ */