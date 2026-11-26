/* ═══ editor/mulai.js — startup: inisialisasi() + auto sync cloud — pecahan aksi.js. Dimuat TERAKHIR ═══ */
inisialisasi().then(() => {
  db.stories.forEach(migrasi);
  muatUI();
  save();
  render();
  if (modeTerbatas) toast('IndexedDB tidak tersedia: mode terbatas. Cerita disimpan di localStorage dan aset belum bisa dipakai.');
  
  // ─── AUTO SYNC SETELAH LOGIN OAUTH (GITHUB/GOOGLE) ───
  setTimeout(() => {
    if (typeof sb !== 'undefined' && sbUser && !sbUser.is_anonymous) {
      _syncLokalKeCloud();
    }
  }, 2000);
});