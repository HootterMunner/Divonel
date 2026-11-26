/* ═══ editor/aksi-peta.js — aksi: peta, hierarki bab/sub-bab, mode pilih, zoom, cari, teleport ═══
   Dipanggil dari aksi.js. Nilai kembali: undefined = bukan aksi modul ini; true = save()+render();
   false = selesai tanpa render; 'stop' = selesai (render ditangani sendiri); 'render' = render saja. */
function aksiPeta(a,id,el,s){
  let go=true;
  switch(a){
    case 'mapnav':masukFolder(S(), id||null);break;
    case 'selmode':selectMode=!selectMode;if(!selectMode)selectIds.clear();sel=null;conn=false;go=false;drawMap();break;
    case 'selall':{
  const s2=S();
  if(s2){
    const {folders,nodes}=containersAt(s2,mapPath);
    selectIds=new Set([...folders.map(c=>c.id),...nodes.map(p=>p.id)]);
  }
  go=false;drawMap();break;
}
    case 'seldel':hapusTerpilih(S());go=false;break;
    case 'passtep':{
  const f=hapusLanjut;hapusLanjut=null;
  D.close();
  if(f)f(id==='hapus');
  return 'stop';
}
    case 'fit':fitView(S());go=false;break;
    case 'resetview':resetView(S());go=false;break;
    case 'cari':dialogCari(S());go=false;break;
    case 'teleport':{D.close();teleportKe(S(), id);return 'stop'}
    case 'nc':one('Bab baru','',v=>s.chapters.push({id:uid(),title:v,parent:null}));go=false;break;
    case 'ncs':one('Sub-bab baru','',v=>{
  if(!s.chapters.find(x=>x.id===id))return;
  const spot=findFreeSpot(s, id, 30, 30);
  s.chapters.push({id:uid(),title:v,parent:id,x:spot.x,y:spot.y});
});go=false;break;
    case 'rc':{const c=s.chapters.find(x=>x.id===id);if(!c){go=false;break}
      dlg(`<h2>Ubah bab</h2><label>Nama</label><input id="f1" value="${esc(c.title)}"><label>Induk bab</label><select id="f2">${chapterParentOpts(s,c.id,c.parent||'')}</select>${btns()}`,
        ()=>{const t=$('f1').value.trim();if(!t){$('f1').focus();return false}c.title=t;c.parent=$('f2').value||null});
      go=false;break}
    case 'dc':ask('Hapus bab ini? Sub-bab di dalamnya dipindah ke induknya, bagian di dalamnya menjadi tanpa bab.',()=>{const c=s.chapters.find(x=>x.id===id),parent=c?c.parent:null;s.chapters.forEach(x=>{if(x.parent===id)x.parent=parent});s.passages.forEach(p=>{if(p.chapter===id)p.chapter=null});s.chapters=s.chapters.filter(x=>x.id!==id);if(edPath===id)edPath=parent||null});go=false;break;
    case 'mz':{const r=$('msv').getBoundingClientRect();if(id==='0'){view={x:20,y:20,k:1};applyView()}else zoom(id==='+'?1.25:.8,r.width/2,r.height/2);go=false;break}
    case 'mconn':conn=!conn;go=false;drawMap();break;
    case 'mlay':{
  const s2=S();
  if(s2){
    const {folders, nodes}=containersAt(s2, mapPath);
    let idx=0;
    folders.forEach(c=>{c.x=30+(idx%3)*220;c.y=30+Math.floor(idx/3)*140;idx++});
    nodes.forEach(p=>{p.x=30+(idx%3)*220;p.y=30+Math.floor(idx/3)*140;idx++});
  }
  break;
}
    default: return undefined;
  }
  return go;
}
