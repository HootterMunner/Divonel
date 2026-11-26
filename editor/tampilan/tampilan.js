/* ═══ editor/tampilan.js — tampilan editor ═══
   State UI (tab, sel, more), render(), Pustaka, Editor, Peta, panel debug. */
let diPustaka=true, docView='main', sel=null, hist=[], tmp=[], cur=null;
let editMode = false;
let panduanAktif = false;
let sidebarBuka = true;
let splitMode = 'split';
/* ╔═══ AWAL FUNGSI recentStore (riwayat passage) ═══╗
   Simpan 12 ID terakhir, tampil 4 di dialogCari.
   Per-cerita: localStorage "cerita.recent.<storyId>".
   ═══════════════════════════════════════════════════ */
let recentCache = { _sid: null, interacted: [], searched: [] };
function recentKey(sid){ return 'cerita.recent.' + sid; }
function recentLoad(sid){
  if(!sid) return;
  if(recentCache._sid === sid) return;
  try{
    const raw = localStorage.getItem(recentKey(sid));
    if(raw){
      const j = JSON.parse(raw);
      recentCache = { _sid: sid,
        interacted: Array.isArray(j.i)?j.i:[],
        searched:   Array.isArray(j.s)?j.s:[] };
      return;
    }
  }catch(_){}
  recentCache = { _sid: sid, interacted: [], searched: [] };
}
function recentSave(){
  if(!recentCache._sid) return;
  try{ localStorage.setItem(recentKey(recentCache._sid),
    JSON.stringify({ i: recentCache.interacted, s: recentCache.searched })); }catch(_){}
}
function recentPush(kind, sid, pid){
  if(!sid || !pid) return;
  recentLoad(sid);
  const arr = kind==='s' ? recentCache.searched : recentCache.interacted;
  const i = arr.indexOf(pid);
  if(i !== -1) arr.splice(i, 1);
  arr.unshift(pid);
  if(arr.length > 12) arr.length = 12;
  recentSave();
}
function recentClean(s, list){
  const ids = new Set(s.passages.map(p => p.id));
  return list.filter(id => ids.has(id));
}
/* ╚═══ AKHIR FUNGSI recentStore ═══╝ */

let edPath=null, laci=false; /* Langkah 3a: folder-bab di Editor */
let more={};
const btns=(ok='Simpan')=>`<div class="row" style="justify-content:flex-end"><button data-a="dx">Batal</button><button class="pr" data-a="ds">${ok}</button></div>`;

/* ╔═══ AWAL [T3] render() Split View ═══╗ */
function render(){
  $('nav').innerHTML = ribbonHTML();
  const s = S(), app = $('app');
  
  if(diPustaka){
    app.className = '';
    app.innerHTML = vLib();
    return;
  }
  
  if(!s){
    app.className = '';
    app.innerHTML = head('Belum ada cerita','Pilih atau buat cerita di Pustaka.')+empty('Tidak ada cerita dipilih','',`<button class="pr" data-a="pustaka">Ke Pustaka</button>`);
    return;
  }

  // --- MODE PETA ---
  if(docView === 'map'){
    app.className = 'app-map';
    app.innerHTML = vMap(s);
    drawMap();
    return;
  }

  // --- MODE KODE ---
  if(docView === 'kd'){
    app.className = '';
    app.innerHTML = panduanAktif ? vGuide() : vKode(s);
    return;
  }

  // --- MODE MAIN (SPLIT VIEW) ---
   if (docView === 'main') {
  const isMobile = window.innerWidth < 768;
  const finalMode = (isMobile && splitMode === 'split') ? 'editor' : splitMode;
  app.className = `app-split mode-${finalMode}`;
  
  const html = `
  <div class="split-container">
    <div class="split-editor" id="panel-editor">
      <!-- Class sidebar-closed ditaruh di sini -->
      <div class="${!sidebarBuka ? 'sidebar-closed' : ''}" style="height:100%">
        ${vEd(s)}
      </div>
    </div>
    
    <!-- Garis Resizer -->
    <div class="split-resizer" id="split-resizer"></div>
    
    <div class="split-play" id="panel-play">
      <iframe src="player/player.html" id="play-iframe" style="width:100%;height:100%;border:0;background:#fff;"></iframe>
    </div>
  </div>
`;
  app.innerHTML = html;

    const iframe = document.getElementById('play-iframe');
    if (iframe) {
      iframe.onload = () => {
        iframe.contentWindow.postMessage({ type: 'LOAD_STORY', data: s }, '*');
      };
    }
  }
}
/* ╚═══ AKHIR [T3] render() ═══╝ */

/* ╔═══ AWAL FUNGSI menuDlg (Kerangka) ═══╗ */
function menuDlg(id){
  let title = id.charAt(0).toUpperCase() + id.slice(1);
  dlg(`<h2>Menu ${title}</h2><p class="sub">Fitur ini akan diisi pada tahap selanjutnya.</p><div class="row" style="justify-content:flex-end"><button data-a="dx">Tutup</button></div>`, null);
}
/* ╚═══ AKHIR FUNGSI menuDlg ═══╝ */
/* ╔═══ AWAL [T3-FINAL] Split Resizer (Geser Panel) ═══╗ */
document.addEventListener('pointerdown', function(e) {
  // Cari apakah yang diklik adalah garis resizer
  const resizer = e.target.closest('.split-resizer');
  if (!resizer) return;
  
  // Cegah teks terblok saat digeser
  e.preventDefault();
  resizer.setPointerCapture(e.pointerId);
  
  const container = resizer.parentElement;
  const left = container.querySelector('.split-editor');
  const right = container.querySelector('.split-play');
  
  // Simpan posisi awal
  let startX = e.clientX;
  let startLeftWidth = left.getBoundingClientRect().width;
  let startRightWidth = right.getBoundingClientRect().width;
  
  function onMove(ev) {
    const dx = ev.clientX - startX;
    const newLeft = startLeftWidth + dx;
    const newRight = startRightWidth - dx;
    
    // Batas minimum lebar panel (misal 250px agar tidak bisa ditutup total)
    if (newLeft < 250 || newRight < 250) return;
    
    // Kunci lebar menggunakan pixel, matikan flex agar tidak membal
    left.style.flex = 'none';
    right.style.flex = 'none';
    left.style.width = newLeft + 'px';
    right.style.width = newRight + 'px';
  }
  
  function onUp(ev) {
    // Lepas event saat jari/mouse diangkat
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerup', onUp);
  }
  
  document.addEventListener('pointermove', onMove);
  document.addEventListener('pointerup', onUp);
});
/* ╚═══ AKHIR [T3-FINAL] Split Resizer ═══╝ */
/* ╔═══ AWAL [T3] Live Update Editor → Play ═══╗ */
// Pantau perubahan pada input/textarea di dalam editor
document.addEventListener('input', function(e) {
  // Hanya jalankan jika sedang di mode Main dan iframe play sedang aktif
  if (docView !== 'main') return;
  
  const iframe = document.getElementById('play-iframe');
/* ╔═══ AWAL [T3] Live Update Editor → Play ═══╗ */
document.addEventListener('input', function(e) {
  if (docView !== 'main') return;
  
  const iframe = document.getElementById('play-iframe');
  if (!iframe || !iframe.contentWindow) return;

  clearTimeout(window._liveUpdateTimer);
  window._liveUpdateTimer = setTimeout(() => {
    const s = S(); 
    if (s) {
      iframe.contentWindow.postMessage({ type: 'LOAD_STORY', data: s }, '*');
    }
  }, 500); 
});
/* ╚═══ AKHIR [T3] Live Update ═══╝ */
  // Beri jeda sedikit (debounce) agar tidak terlalu sering kirim data
  clearTimeout(window._liveUpdateTimer);
  window._liveUpdateTimer = setTimeout(() => {
    const s = S(); // Ambil state cerita terbaru
    if (s) {
      iframe.contentWindow.postMessage({ type: 'LOAD_STORY', data: s }, '*');
    }
  }, 500); // Tunggu 0.5 detik setelah user berhenti mengetik
});
/* ╚═══ AKHIR [T3] Live Update ═══╝ */