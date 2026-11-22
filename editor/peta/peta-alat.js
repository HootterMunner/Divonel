/* ═══ editor/peta-alat.js — Debug (vDbg), hapusTerpilih, fit/reset/teleport — pecahan tampilan.js ═══ */

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

function teleportKe(s, id){
  const p = s.passages.find(x => x.id === id);      // ← TAMBAH
  if(p) recentPush('s', s.id, id);   // ← TAMBAH: catat ke riwayat cari
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
  docView = 'map';
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
