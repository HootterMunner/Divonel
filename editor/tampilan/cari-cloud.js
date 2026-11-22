/* ═══ editor/cari-cloud.js — dialogCari, login & cloud dialog — pecahan tampilan.js ═══ */
/* ╔═══ AWAL FUNGSI dialogCari (dengan riwayat) ═══╗
   Kosong → 4 terakhir dibuka + 4 terakhir dicari.
   Ketik  → hasil cari (perilaku lama).
   ═══════════════════════════════════════════════ */
function dialogCari(s){
  if(!s) return;
  recentLoad(s.id);
  dlg(`<h2>Cari bagian</h2>
    <input id="cfind" placeholder="Ketik judul bagian…" autocomplete="off" spellcheck="false">
    <div id="cres" class="cres"></div>
    <div class="row" style="justify-content:flex-end"><button data-a="dx">Tutup</button></div>`, null);
  const inp = $('cfind'), res = $('cres');
  if(!inp || !res) return;

  const item = (p, tag) => {
    const c = s.chapters.find(x => x.id === p.chapter);
    return `<div class="cres-item" data-a="teleport" data-id="${p.id}"><b>${esc(p.title)}</b><span class="sub">${c?esc(c.title):'tanpa bab'}${tag?' · '+tag:''}</span></div>`;
  };
  const renderRes = () => {
    const q = inp.value.trim().toLowerCase();
    if(q){
      const list = s.passages.filter(p => p.title.toLowerCase().includes(q)).slice(0, 40);
      if(!list.length){ res.innerHTML = '<p class="sub" style="padding:12px;margin:0">Tidak ada hasil.</p>'; return; }
      res.innerHTML = list.map(p => item(p, '')).join('');
      return;
    }
    const inter  = recentClean(s, recentCache.interacted).slice(0, 4);
    const search = recentClean(s, recentCache.searched).slice(0, 4);
    let h = '';
    if(inter.length){
      h += `<div class="cres-head">Terakhir dibuka</div>`;
      h += inter.map(id => { const p = s.passages.find(x => x.id === id); return p ? item(p, '') : ''; }).join('');
    }
    if(search.length){
      h += `<div class="cres-head">Terakhir dicari</div>`;
      h += search.map(id => { const p = s.passages.find(x => x.id === id); return p ? item(p, 'dicari') : ''; }).join('');
    }
    if(!h) h = '<p class="sub" style="padding:12px;margin:0">Belum ada riwayat. Ketik judul bagian untuk mencari.</p>';
    res.innerHTML = h;
  };
  inp.addEventListener('input', renderRes);
  inp.focus();
  renderRes();
}
/* ╚═══ AKHIR FUNGSI dialogCari ═══╝ */
/* ╔═══ AWAL FUNGSI AUTH & CLOUD DIALOG ═══╗ */
function loginDlg(){
  if(!sb){ dlg('<h2>Login</h2><p class="sub">Cloud belum diset.</p><button data-a="dx">Tutup</button>', null); return; }
  
  let h = '<h2>Akun</h2>';
  
  if(!sbUser){
  h += '<p class="sub">Menghubungkan ke cloud…</p>';
  h += '<div class="row" style="justify-content:center;margin-top:12px"><button class="sm" data-a="login-refresh">Coba lagi</button></div>';

  } else if(sbUser.is_anonymous){
    h += '<p class="sub" style="margin-bottom:16px">Anda masuk sebagai <b>Tamu</b>. Data tersimpan di cloud, tapi hanya untuk browser ini. Login untuk mengakses dari perangkat lain.</p>';
    
    // Tombol OAuth
    h += '<div class="row" style="margin-bottom:8px"><button class="pr" data-a="auth-github" style="width:100%;justify-content:center;background:#24292e;border-color:#24292e;color:#fff;height:44px;font-size:14px;font-weight:600">Login with GitHub</button></div>';
    h += '<div class="row" style="margin-bottom:16px"><button class="pr" data-a="auth-google" style="width:100%;justify-content:center;background:#fff;border:1px solid #ddd;color:#333;height:44px;font-size:14px;font-weight:600"><img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" style="width:18px;margin-right:8px"> Login with Google</button></div>';
    
    h += '<div style="text-align:center;font-size:12px;color:var(--t2);margin:12px 0">atau</div>';
    
    // Email Form
    h += '<div style="background:var(--bg);border-radius:12px;padding:16px;margin-bottom:12px">';
    h += '<p class="sub" style="margin:0 0 8px;font-weight:600;color:var(--t)">Hubungkan Email</p>';
    h += '<input id="au_em" type="email" placeholder="Email (contoh: nama@gmail.com)" style="margin:0 0 8px">';
    h += '<input id="au_pw" type="password" placeholder="Password (min. 6 karakter)" style="margin:0 0 12px">';
    h += '<button class="pr" data-a="auth-upgrade" style="width:100%;height:40px">Buat Akun / Hubungkan</button>';
    h += '</div>';
    
    h += '<div style="text-align:center;font-size:12px;color:var(--t2);margin:12px 0">sudah punya akun?</div>';
    h += '<div class="row" style="margin-bottom:16px"><button class="sm" data-a="auth-in-view" style="width:100%;justify-content:center">Masuk dengan Email</button></div>';
    
  } else {
    // Sudah login permanen
    h += '<div class="card" style="text-align:center;padding:24px 16px;background:var(--p50);border-color:var(--p200)">';
    h += '<div style="font-size:32px;margin-bottom:8px">✓</div>';
    h += '<h3 style="color:var(--p);margin-bottom:4px">Terhubung</h3>';
    h += `<p style="font-weight:600;color:var(--t);margin:0">${esc(sbUser.email)}</p>`;
    h += '</div>';
 h += '<div class="row" style="justify-content:center;margin-top:16px"><button class="sm del" data-a="auth-out">Logout Akun</button></div>';
  }
  
  h += '<div class="row" style="justify-content:flex-end;margin-top:16px"><button data-a="dx">Tutup</button></div>';
  dlg(h, null);
}

function emailLoginDlg(){
  dlg('<h2>Masuk</h2><p class="sub">Masukkan email dan password akun Anda.</p><label>Email</label><input id="al_em" type="email" placeholder="nama@email.com"><label>Password</label><input id="al_pw" type="password" placeholder="Password"><div class="row" style="justify-content:flex-end;margin-top:16px"><button data-a="dx">Batal</button><button class="pr" data-a="auth-do-in">Masuk</button></div>', null);
}

function cloudDlg(){
  const s = S();
  let h = '<h2>☁ Cloud Sync</h2>';
  
  if(!sb){
    h += '<p class="sub">Cloud belum diset.</p>';
  } else if(!sbUser) {
    h += '<p class="sub">Menghubungkan…</p>';
  } else {
    if(sbUser.is_anonymous){
      h += '<div class="card" style="border-color:var(--a);background:var(--a50);margin-bottom:16px"><p style="margin:0;color:#92400e"><b>Mode Tamu:</b> Data tersimpan hanya untuk browser ini. <a href="#" data-a="login" style="color:#92400e;text-decoration:underline">Login</a> agar aman.</p></div>';
    } else {
      h += `<div class="card" style="border-color:var(--p200);background:var(--p50);margin-bottom:16px"><p style="margin:0;color:var(--p)"><b>Akun:</b> ${esc(sbUser.email)}</p></div>`;
    }
    
    if(s){
      h += `<div class="card" data-a="cloud-save" data-id="${s.id}" style="cursor:pointer;display:flex;align-items:center;gap:12px"><div style="font-size:24px">☁️</div><div><h3>Simpan ke Cloud</h3><p>${esc(s.title)}</p></div></div>`;
    } else {
      h += '<p class="sub">Buka cerita dulu untuk simpan ke cloud.</p>';
    }
    h += `<div class="card" data-a="cloud-list" style="cursor:pointer;display:flex;align-items:center;gap:12px;margin-top:16px;border-style:dashed"><div style="font-size:24px">☁️</div><div><h3>Lihat Daftar Cerita Cloud</h3><p>Muat cerita lain dari akun Anda</p></div></div>`;
  }
  
  h += '<div class="row" style="justify-content:flex-end;margin-top:16px"><button data-a="dx">Tutup</button></div>';
  dlg(h, null);
}
/* ╚═══ AKHIR FUNGSI AUTH & CLOUD DIALOG ═══╝ */
/* ╔═══ AWAL FUNGSI cloudListDlg ═══╗ */
function cloudListDlg(){
  if(!sb || !sbUser) return;
  dlg('<h2>Daftar Cerita Cloud</h2><p class="sub">Memuat data dari server…</p><div class="row" style="justify-content:flex-end;margin-top:16px"><button data-a="dx">Tutup</button></div>', null);
  
  sbListStories().then(list => {
    if(!list.length) {
      dlg('<h2>Daftar Cerita Cloud</h2><p class="sub">Belum ada cerita yang tersimpan di akun ini.</p><div class="row" style="justify-content:flex-end;margin-top:16px"><button data-a="dx">Tutup</button></div>', null);
      return;
    }
    
    let h = '<h2>Daftar Cerita Cloud</h2><div class="cres" style="max-height:50vh">';
    list.forEach(item => {
  const isActive = S() && S().id === item.id;
  h += `<div class="cres-item" style="border-color:${isActive?'var(--p)':'var(--line)'}">`;
  h += `<div data-a="cloud-load-item" data-id="${item.id}" style="cursor:pointer;flex:1">`;
  h += `<b>${esc(item.judul)} ${isActive?'(Aktif)':''}</b>`;
  h += `<span class="sub">Terakhir disimpan: ${esc(item.updated_at || '-')}</span>`;
  h += `</div>`;
  // Tombol hapus diletakkan terpisah dari kartu, tidak pakai stopPropagation
  h += `<div class="row" style="margin-top:8px"><button class="sm del" data-a="cloud-del-item" data-id="${item.id}">Hapus</button></div>`;
  h += `</div>`;
});
    h += '</div><div class="row" style="justify-content:flex-end;margin-top:16px"><button data-a="dx">Tutup</button></div>';
    dlg(h, null);
  }).catch(e => {
    dlg(`<h2>Daftar Cerita Cloud</h2><p class="err">${esc(e.message)}</p><div class="row" style="justify-content:flex-end;margin-top:16px"><button data-a="dx">Tutup</button></div>`, null);
  });
}
/* ╚═══ AKHIR FUNGSI cloudListDlg ═══╝ */
