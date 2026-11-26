/* ═══ editor/aksi-skrip.js — aksi: skrip, folder kode, nilai awal cerita, aset ═══
   Dipanggil dari aksi.js. Nilai kembali: undefined = bukan aksi modul ini; true = save()+render();
   false = selesai tanpa render; 'stop' = selesai (render ditangani sendiri); 'render' = render saja. */
function aksiSkrip(a,id,el,s){
  let go=true;
  switch(a){
    case 'nf':one('Folder baru','',v=>{(s.folders=s.folders||[]).push({id:uid(),name:v,parent:id||null})});go=false;break;
    case 'rf':{const f=s.folders.find(x=>x.id===id);one('Ganti nama folder',f.name,v=>f.name=v);go=false;break}
    case 'df':ask('Hapus folder ini? Isinya dipindah ke folder di atasnya.',()=>{const f=s.folders.find(x=>x.id===id);s.folders.forEach(x=>{if(x.parent===id)x.parent=f.parent||null});(s.files||[]).forEach(x=>{if(x.folder===id)x.folder=f.parent||null});s.folders=s.folders.filter(x=>x.id!==id)});go=false;break;
    case 'ns':sDlg(null,id||null);go=false;break;
    case 'es':sDlg(id);go=false;break;
    case 'mks':D.close();sDlg(null,null,P(s,id).title);go=false;break;
    case 'dfl':ask('Hapus skrip ini? Sambungannya ke bagian cerita ikut dilepas.',()=>{D.close();s.files=s.files.filter(x=>x.id!==id);s.passages.forEach(p=>p.refs=(p.refs||[]).filter(r=>r!==id))});go=false;break;
    case 'awal':dlg(`<h2>Nilai awal cerita</h2><p class="sub">Satu per baris. Contoh: emas = 0, nyawa = 3, nama = Rani, tas = daftar roti, peta</p><textarea id="f1">${esc(s.awal||'')}</textarea>${btns()}`,()=>{try{parseAwal($('f1').value)}catch(e){warn(e.message);return false}s.awal=$('f1').value});go=false;break;
    case 'aset':asetDlg();go=false;break;
    case 'aadd':asetTambah();go=false;break;
    case 'adel':{go=false;const idc=s.id;ask('Hapus aset "'+id+'"?',async()=>{try{await hapusAset(idc,id)}catch(e){toast('Gagal menghapus aset: '+((e&&e.message)||e))}asetDlg();render()});break}
    default: return undefined;
  }
  return go;
}
