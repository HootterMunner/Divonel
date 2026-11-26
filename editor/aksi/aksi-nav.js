/* ═══ editor/aksi-nav.js — aksi: navigasi: pindah view, Pustaka, panduan, mode split/play, menu, undo/redo, sidebar ═══
   Dipanggil dari aksi.js. Nilai kembali: undefined = bukan aksi modul ini; true = save()+render();
   false = selesai tanpa render; 'stop' = selesai (render ditangani sendiri); 'render' = render saja. */
function aksiNav(a,id,el,s){
  let go=true;
  switch(a){
    case 'view': diPustaka=false; docView=id; panduanAktif=false; simpanUI(); if(docView==='map') { save(); } render(); break;
    case 'viewmenu': {
  const items = [['main','Main'],['map','Peta'],['kd','Kode']]
    .map(([k,n])=>`<button data-a="view" data-id="${k}" style="width:100%;justify-content:flex-start;${docView===k?'background:var(--p50);color:var(--p)':''}">${n}</button>`)
    .join('');
  dlg(`<h2>Pindah view</h2><div class="row" style="flex-direction:column;gap:8px">${items}</div><div class="row" style="justify-content:flex-end;margin-top:8px"><button data-a="dx">Tutup</button></div>`, null);
  go=false; break;
}
    case 'pustaka': diPustaka=true; panduanAktif=false; edPath=null; laci=false; docView='main'; simpanUI(); break;
    case 'guide-toggle': panduanAktif=!panduanAktif; docView='kd'; render(); break;
    case 'edtoggle': editMode=!editMode; render(); if(editMode) toast('Mode edit: klik judul/teks untuk mengetik. Selesai = keluar.'); return 'stop';
    case 'splitmode':
      splitMode = id; // id berisi 'editor', 'split', atau 'play'
      render();
      go = false;
      break;
    case 'menu': menuDlg(id); go=false; break;
    case 'guide': diPustaka=false; docView='kd'; panduanAktif=true; render(); break; // Alihkan ke panduan
    case 'undo': document.execCommand('undo'); go=false; break;
    case 'redo': document.execCommand('redo'); go=false; break;
    case 'open':eng=null;db.active=id;diPustaka=false;docView='main';hist=[];sel=null;edPath=null;laci=false;break;
    case 'edpath':edPath=id||null;laci=false;simpanUI();break;
    case 'laci':
if (window.innerWidth >= 768) {
  sidebarBuka = !sidebarBuka;
  render();
} else {
  laci = !laci;
  document.getElementById('edside')?.classList.toggle('open', laci);
  // Jika tombol ini diklik di HP (misal ada di drawer), tutup drawer
  if (!laci) render();
}
go = false;
break;
    default: return undefined;
  }
  return go;
}
