/* ═══ editor/tampilan.js — tampilan editor ═══
   State UI (tab, sel, more), render(), Pustaka, Editor, Peta, panel debug. */
let diPustaka=true, docView='main', sel=null, hist=[], tmp=[], cur=null;
let editMode = false;
let panduanAktif = false;
let splitMode = 'split';//pastikan ini ada (dari T3)
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
/* ╔══════════════════════════════════════════════════════════╗
   ║ ribbonHTML — muncul di atas halaman saat tab bukan Pustaka ║
   ║ HARUS ada. Dipanggil oleh render().                      ║
   ╚══════════════════════════════════════════════════════════╝ */
/* ╔═══ AWAL [T2] ribbonHTML — topbar 2 baris desktop, 1 baris mobile ═══╗ */
function ribbonHTML(){
  const s = S();
  if(diPustaka || !s) return '';

  const views = [['main','Main'],['map','Peta'],['kd','Kode']];
  const seg = views.map(([k,n])=>
    `<button type="button" data-a="view" data-id="${k}" class="${docView===k?'on':''}">${n}</button>`
  ).join('');

  // Baris 2: tools per view
  let tools = '';
   if(docView==='main'){
    tools = `<button class="sm" data-a="undo" title="Undo">↶</button>
             <button class="sm" data-a="redo" title="Redo">↷</button>
             <span class="nav-sep"></span>
             
             <!-- ← BARU: 3 Mode Tampilan (Desktop & Mobile) -->
             <div class="nav-seg" style="margin-left: 10px; border: 1px solid var(--line); border-radius: 8px; padding: 2px;">
               <button class="sm ${splitMode==='editor'?'pr':''}" data-a="splitmode" data-id="editor" style="${splitMode==='editor'?'background:var(--p);color:#fff':''}">✎ Editor</button>
               <button class="sm ${splitMode==='split'?'pr':''}" data-a="splitmode" data-id="split" style="${splitMode==='split'?'background:var(--p);color:#fff':''}">⛶ Split</button>
               <button class="sm ${splitMode==='play'?'pr':''}" data-a="splitmode" data-id="play" style="${splitMode==='play'?'background:var(--p);color:#fff':''}">▶ Play</button>
             </div>`;
  
  } else if(docView==='map'){
    tools = `<button class="sm" data-a="fit">⛶ Fit</button>
             <button class="sm" data-a="resetview">🎯</button>
             <button class="sm" data-a="cari">🔍 Cari</button>
             <span class="nav-sep"></span>
             <button class="sm pr" data-a="mnp" data-id="${mapPath||''}">+ Bagian</button>
             <button class="sm" data-a="ncs" data-id="${mapPath||''}">+ Sub-bab</button>`;
  } else if(docView==='kd'){
    if(panduanAktif){
      tools = `<button class="sm" data-a="guide-toggle">← Kembali ke Kode</button>`;
    } else {
      tools = `<button class="sm pr" data-a="ns" data-id="">+ Skrip</button>
               <button class="sm" data-a="nf" data-id="">+ Folder</button>
               <button class="sm" data-a="guide-toggle">📖 Panduan</button>
               <button class="sm" data-a="aset">🖼 Aset</button>`;
    }
  }

  // Login indicator
  let userBtn;
  if(typeof sb !== 'undefined' && sb && typeof sbUser !== 'undefined' && sbUser){
    userBtn = sbUser.is_anonymous
      ? `<button class="sm" data-a="login" title="Tamu">👤 Tamu</button>`
      : `<button class="sm" data-a="login" style="border-color:var(--p);color:var(--p)">👤 ${esc((sbUser.email||'User').split('@')[0])}</button>`;
  } else {
    userBtn = `<button class="sm" data-a="login">Login</button>`;
  }

  const labelView = (views.find(v=>v[0]===docView)||['main','Main'])[1];

  return `
    <div class="nav-row1">
      <button class="nav-home" data-a="pustaka" title="Kembali ke Pustaka" aria-label="Kembali ke Pustaka">←</button>
      <button class="ed-hamb" data-a="laci" aria-label="Daftar bab">☰</button>
      <div class="nav-menus">
        <button class="sm" data-a="menu" data-id="file">File</button>
        <button class="sm" data-a="menu" data-id="editor">Editor</button>
        <button class="sm" data-a="menu" data-id="tampilan">Tampilan</button>
        <button class="sm" data-a="menu" data-id="format">Format</button>
      </div>
      <div class="nav-seg" role="tablist">${seg}</div>
      <button class="nav-viewmenu sm" data-a="viewmenu">${labelView} ▾</button>
      <div class="nav-user">${userBtn}</div>
    </div>
    <div class="nav-row2">${tools}</div>
  `;
}
/* ╚═══ AKHIR [T2] ribbonHTML ═══╝ */

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
   if(docView === 'main'){
    // Tambahkan class sesuai mode yang dipilih
    app.className = `app-split mode-${splitMode}`;
    
    const html = `
      <div class="split-container">
        <!-- Class 'hidden-mode' akan disembunyikan oleh CSS nanti -->
        <div class="split-editor" id="panel-editor">
          ${vEd(s)}
        </div>
        
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
/* ╔═══ AWAL [T3-Fix] Split Resizer touch-friendly ═══╗ */
document.addEventListener('pointerdown', function(e) {
  // Cek apakah yang diklik adalah resizer atau area ::before-nya
  const resizer = e.target.closest('.split-resizer');
  if (!resizer) return;
  
  // Cegah browser nge-scroll layar saat menarik garis
  e.preventDefault(); 
  resizer.setPointerCapture(e.pointerId); // Kunci pointer ke resizer

  const container = resizer.parentElement;
  const left = container.querySelector('.split-editor');
  const right = container.querySelector('.split-play');
  
  let startX = e.clientX;
  let startLeftWidth = left.getBoundingClientRect().width;
  let startRightWidth = right.getBoundingClientRect().width;
  
  function onMove(ev) {
    const dx = ev.clientX - startX;
    const newLeft = startLeftWidth + dx;
    const newRight = startRightWidth - dx;
    
    // Batasan minimal 250px per sisi
    if (newLeft < 250 || newRight < 250) return;
    
    left.style.flex = 'none';
    right.style.flex = 'none';
    left.style.width = newLeft + 'px';
    right.style.width = newRight + 'px';
  }
  
  function onUp(ev) {
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerup', onUp);
  }
  
  document.addEventListener('pointermove', onMove);
  document.addEventListener('pointerup', onUp);
});
/* ╚═══ AKHIR [T3-Fix] Split Resizer ═══╝ */
/* ╔═══ AWAL [T3] Live Update Editor → Play ═══╗ */
// Pantau perubahan pada input/textarea di dalam editor
document.addEventListener('input', function(e) {
  // Hanya jalankan jika sedang di mode Main dan iframe play sedang aktif
  if (docView !== 'main') return;
  
  const iframe = document.getElementById('play-iframe');
if (iframe) {
  iframe.onload = () => {
    try {
      // Kirim data awal saat iframe selesai loading
      iframe.contentWindow.postMessage({ type: 'LOAD_STORY', data: s }, '*');
    } catch (e) { console.warn('Iframe belum siap:', e); }
  };
}
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