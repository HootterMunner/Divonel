/* ═══ editor/aksi-tambahan.js — tutup laci, _syncLokalKeCloud, autosave in-place — pecahan aksi.js ═══ */
/* Langkah 3a: klik di luar sidebar (saat laci terbuka di HP) menutup laci. */
document.addEventListener('click',e=>{if(!laci)return;if(e.target.closest('.ed-hamb')||e.target.closest('.ed-side'))return;if(e.target.closest('[data-a="laci"]'))return;laci=false;document.getElementById('edside')?.classList.remove('open');render();});
/* ╔═══ AWAL FUNGSI _syncLokalKeCloud ═══╗ */
async function _syncLokalKeCloud() {
  if(!sb || !sbUser) return;
  if(sbUser.is_anonymous) return;
  await new Promise(r => setTimeout(r, 500));

  // ← TAMBAH: verifikasi ID
  const { data: { session } } = await sb.auth.getSession();
  console.log('[sync] sbUser.id =', sbUser.id);
  console.log('[sync] session.user.id =', session?.user?.id);
  console.log('[sync] sama? =', sbUser.id === session?.user?.id);

  if(!db || !Array.isArray(db.stories) || db.stories.length === 0) return;
  for (const story of db.stories) {
    if(!story || !story.id || !story.title) continue;
    try { await sbSaveStory(story); }
    catch(e) { console.warn('Sync lokal gagal:', e.message || e, '| story.id:', story.id); }
  }
  
}
/* ╚═══ AKHIR FUNGSI _syncLokalKeCloud ═══╝ */
/* ╔═══ AWAL autosave in-place (Tahap 4d) ═══╗ */
let _editTimer = null;

/* Simpan ke db saja. Dipakai debounce saat mengetik. Tidak rebuild, tidak render. */
function _simpanKeDB(el){
  const s = S(); if(!s) return false;
  const pid = el.dataset.pid;
  const field = el.dataset.edit;
  const p = s.passages.find(x=>x.id===pid);
  if(!p) return false;
  if(field==='title'){
    const t = el.textContent.trim();
    if(!t){ el.textContent = p.title; return false; }
    if(t === p.title) return false;
    p.title = t;
    const lbl = document.querySelector('.ed-side .sb-item[data-id="'+pid+'"] .sb-label');
    if(lbl) lbl.textContent = t;
  } else {
    const html = el.innerHTML;
    if(html === p.content) return false;
    p.content = html;
  }
  save();
  return true;
}

/* Rebuild eng.inti tanpa render, agar render berikutnya memakai isi baru. */
function _rebuildScene(s) {
  if (!eng || !eng.inti || eng.err.length) return;
  if (docView !== 'main') return;
  try{
    const snap = eng.inti.simpanGame();
    const histLama = eng.hist.slice();
    const baseLama = eng.base || 0;
    const extraLama = (eng.extra||[]).slice();
    const temaLama = eng.tema;
    const fxLama = eng.fx;
    eng = null;
    mulaiMain(s);
    if(eng && eng.inti && !eng.err.length){
      eng.inti.muatGame(snap);
      eng.hist = histLama;
      eng.base = baseLama;
      eng.extra = extraLama;
      eng.tema = temaLama;
      eng.fx = fxLama;
      eng.lastScene = eng.inti.tampilan().scene;
    }
  }catch(e){ console.warn('[edit] rebuild scene gagal:', e); }
}

document.addEventListener('input', e=>{
  if(!editMode) return;
  const el = e.target.closest && e.target.closest('[data-edit]');
  if(!el) return;
  clearTimeout(_editTimer);
  _editTimer = setTimeout(()=>{ _simpanKeDB(el); }, 400);
});

document.addEventListener('blur', e=>{
  if(!editMode) return;
  const el = e.target.closest && e.target.closest('[data-edit]');
  if(!el) return;
  clearTimeout(_editTimer);
  if(_simpanKeDB(el)){
    const s = S();
    if(s) _rebuildScene(s);
  }
}, true);
/* ╚═══ AKHIR autosave in-place (Tahap 4d) ═══╝ */
