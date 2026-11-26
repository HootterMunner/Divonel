/* ═══ editor/aksi-bagian.js — aksi: bagian cerita (passage): buat/ubah/hapus, pilihan, gambar, tombol simpan dialog ═══
   Dipanggil dari aksi.js. Nilai kembali: undefined = bukan aksi modul ini; true = save()+render();
   false = selesai tanpa render; 'stop' = selesai (render ditangani sendiri); 'render' = render saja. */
function aksiBagian(a,id,el,s){
  let go=true;
  switch(a){
    case 'np':pend=null;pDlg(null,id||null);go=false;break;
    case 'mnp':{
  const s0=S();let px=null,py=null;
  const r=$('msv')?.getBoundingClientRect();
  if(r && s0){
    const cx=Math.round((r.width/2-view.x)/view.k-70);
    const cy=Math.round((r.height/2-view.y)/view.k-35);
    const spot=findFreeSpot(s0, mapPath, cx, cy);
    px=spot.x;py=spot.y;
  }
  pend=(px!=null)?{x:px,y:py}:null;
  pDlg(null, id||null);
  go=false;break
}
    case 'ep':pDlg(id);go=false;break;
    case 'st':D.close();s.passages.forEach(p=>p.start=p.id===id);break;
    case 'chn':chain(s,id);break;
    case 'dp':ask('Hapus bagian ini?',()=>{D.close();s.passages=s.passages.filter(p=>p.id!==id);s.passages.forEach(p=>p.choices.forEach(c=>{if(c.to===id)c.to=null}));if(sel===id)sel=null;hist=[]});go=false;break;
    case 'ch':{cur=id;const p=P(s,id);tmp=p.choices.map(c=>({...c}));recentPush('i', s.id, id);rc(s,id);D.showModal&&!D.open&&D.showModal();onSave=()=>{grab();const kn=collectKnown(s),ids=titleIds(s);for(const c of tmp){try{parseSyarat(c.syarat,kn);parseEfek(c.efek,kn,ids)}catch(e){warn(e.message);return false}}p.choices=tmp.map(c=>({...c,text:c.text.trim()||(P(s,c.to)?.title||'')})).filter(c=>c.text)};go=false;break}
    case 'addc':grab();tmp.push({id:uid(),text:'',to:null});rc(s,cur);go=false;break;
    case 'rmc':grab();tmp.splice(+id,1);rc(s,cur);go=false;break;
    case 'ds':if(onSave&&onSave()===false){go=false;break}D.close();save();render();return 'stop';
    case 'cpg':{try{navigator.clipboard.writeText($(id).textContent)}catch(_){}go=false;break}
    case 'sel':sel=sel===id?null:id;break;
    case 'dbg':if(eng)eng.dbg=!eng.dbg;go=false;break;
    case 'pgb':pgbDaftar();go=false;break;
    case 'pgp':pgbVal=id;pgbRender();go=false;break;
    case 'pgx':pgbVal=null;pgbRender();go=false;break;
    default: return undefined;
  }
  return go;
}
