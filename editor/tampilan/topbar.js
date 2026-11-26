/* ═══ editor/tampilan/topbar.js — Topbar: Desktop & Mobile TERPISAH ═══ */

// Lokasi berkas logo (relatif terhadap index.html) — sesuaikan dengan struktur proyek
const LOGO_SRC = 'editor/aset/logo-divonel.png';

function ribbonHTML(){
  const s = S();
  if(diPustaka || !s) return '';

  const views = [['main','Main'],['map','Peta'],['kd','Kode']];
  const labelView = (views.find(v=>v[0]===docView)||views[0])[1];

  // helper tombol (semua aksi tetap lewat data-a / data-id)
  const btn = (a, label, o={}) =>
    `<button type="button" class="rb-btn${o.pri?' pri':''}${o.on?' on':''}" data-a="${a}"` +
    (o.id!==undefined ? ` data-id="${o.id}"` : '') +
    (o.title ? ` title="${o.title}"` : '') + `>${label}</button>`;
  const sep = '<span class="rb-sep"></span>';
  // Logo dipakai sebagai mask: warnanya mengikuti tema (putih di gelap, hitam di terang)
  const logo = `<span class="rb-logo" role="img" aria-label="Pustaka" style="-webkit-mask-image:url('${LOGO_SRC}');mask-image:url('${LOGO_SRC}')"></span>`;
  const hamb = '<button type="button" class="rb-btn rb-ic ed-hamb" data-a="laci" title="Daftar bab">☰</button>';

  // ── TOOLS per tampilan (isi sama, dipakai kedua layout) ──
  let tools = '';
  if(docView==='main'){
    tools = btn('undo','↶',{title:'Undo'}) + btn('redo','↷',{title:'Redo'});
  } else if(docView==='map'){
    const mp = mapPath||'';
    tools = btn('fit','⛶ Fit') + btn('resetview','🎯') + btn('cari','🔍 Cari') + sep
          + btn('mnp','+ Bagian',{pri:1,id:mp}) + btn('ncs','+ Sub-bab',{id:mp});
  } else if(docView==='kd'){
    tools = panduanAktif
      ? btn('guide-toggle','← Kembali ke Kode')
      : btn('ns','+ Skrip',{pri:1,id:''}) + btn('nf','+ Folder',{id:''})
        + btn('guide-toggle','📖 Panduan') + btn('aset','🖼 Aset');
  }

  // ── MODE (hanya di Main) ──
  let modes = '', toggle = '';
  if(docView==='main'){
    const m = [['editor','✎ Editor'],['split','⛶ Split'],['play','▶ Play']];
    modes = `<div class="rb-modes">` + m.map(([id,l])=>btn('splitmode',l,{id,on:splitMode===id})).join('') + `</div>`;
    // Mobile: satu tombol saja, bergantian Play <-> Editor
    const kePlay = splitMode !== 'play';
    toggle = `<button type="button" class="rb-toggle" data-a="splitmode" data-id="${kePlay?'play':'editor'}">${kePlay?'▶ Play':'✎ Editor'}</button>`;
  }

  // ── USER (desktop saja) ──
  let userBtn;
  if(typeof sb !== 'undefined' && sb && typeof sbUser !== 'undefined' && sbUser){
    userBtn = sbUser.is_anonymous
      ? `<button type="button" class="btn-user rb-user" data-a="login" title="Tamu">👤 Tamu</button>`
      : `<button type="button" class="btn-user rb-user" data-a="login" style="color:var(--p)">👤 ${esc((sbUser.email||'User').split('@')[0])}</button>`;
  } else {
    userBtn = `<button type="button" class="btn-user rb-user" data-a="login">Login</button>`;
  }

  const tabs = views.map(([k,n])=>btn('view',n,{id:k,on:docView===k})).join('');
  const menus = [['file','File'],['editor','Editor'],['tampilan','Tampilan'],['format','Format']]
    .map(([id,l])=>btn('menu',l,{id})).join('');

  // ── MODE PLAY: topbar disembunyikan ──
  const play = docView==='main' && splitMode==='play';

  // Desktop baris 2: saat play hanya sisakan Editor | Split | Play
  const desk2 = play
    ? `<div class="rb-d2 rb-d2-play"><span class="rb-spacer"></span>${modes}</div>`
    : `<div class="rb-d2">${hamb}${tools}<span class="rb-spacer"></span>${modes}</div>`;

  // Mobile: saat play seluruh topbar hilang, sisa satu tombol kembali ke editor
  const mobile = play
    ? `<div class="rb rb-m rb-m-play">
         <button type="button" class="rb-fab" data-a="splitmode" data-id="editor">✎ Editor</button>
       </div>`
    : `<div class="rb rb-m">
         <div class="rb-m1">
           <button type="button" class="rb-home" data-a="pustaka" title="Pustaka" aria-label="Pustaka">${logo}</button>
           <div class="rb-m-judul">${esc(s.title)}</div>
           <details class="rb-m-more"><summary aria-label="Menu">⋮</summary><div class="rb-m-panel">${menus}</div></details>
           ${toggle}
         </div>
         <div class="rb-m2">
           ${hamb}
           <div class="rb-m-tools">${tools}</div>
           <button type="button" class="rb-btn nav-viewmenu rb-view" data-a="viewmenu">${labelView} ▾</button>
         </div>
       </div>`;

  return `
  <!-- ═══ DESKTOP ═══ -->
  <div class="rb rb-d">
    <div class="rb-d1">
      <button type="button" class="rb-home" data-a="pustaka" title="Kembali ke Pustaka" aria-label="Pustaka">${logo}</button>
      <div class="rb-judul">
        <div class="rb-judul-teks">${esc(s.title)}</div>
        <div class="rb-menu">${menus}</div>
      </div>
      <div class="rb-tabs">${tabs}</div>
      ${userBtn}
    </div>
    ${desk2}
  </div>

  <!-- ═══ MOBILE ═══ -->
  ${mobile}
  `;
}
