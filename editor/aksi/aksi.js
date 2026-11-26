/* ═══ editor/aksi.js — pengendali klik/ubah ═══
   Satu pengendali klik: tiap aksi (data-a) diteruskan ke modul aksi-*.js sampai ada yang menanganinya.
   Urutan muat: aksi-nav, aksi-peta, aksi-bagian, aksi-skrip, aksi-cerita, aksi-akun, lalu aksi.js (TERAKHIR). */
document.addEventListener('click',e=>{
  const el=e.target.closest('[data-a]');if(!el)return;
  const a=el.dataset.a,id=el.dataset.id,s=S();
  const r=aksiPlay(a,id,el);if(r!==undefined){if(r)render();return}
  for(const modul of [aksiNav,aksiPeta,aksiBagian,aksiSkrip,aksiCerita,aksiAkun]){
    const h=modul(a,id,el,s);
    if(h===undefined)continue;          // bukan aksi modul ini
    if(h==='stop')return;               // sudah selesai, tanpa render
    if(h==='render'){render();return}   // render saja
    if(h){save();render()}              // true = simpan + render
    return;                             // false = tidak ada tindak lanjut
  }
  // aksi tak dikenal: perilaku lama (simpan + render, kecuali 'tab')
  if(a!=='tab')save();
  render();
});
document.addEventListener('change',e=>{
  if(e.target.id!=='ff')return;const f=e.target.files&&e.target.files[0];if(!f)return;
  if(f.size>5e6){warn('Berkas terlalu besar (maksimal 5 MB).');return}
  f.text().then(t=>{const a=$('f1');if(a)a.value=t}).catch(()=>warn('Berkas tidak bisa dibaca. Coba tempel isinya langsung.'));
});
