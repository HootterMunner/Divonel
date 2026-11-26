/* ═══ editor/aksi-akun.js — aksi: akun & cloud: login, logout, simpan/muat cloud ═══
   Dipanggil dari aksi.js. Nilai kembali: undefined = bukan aksi modul ini; true = save()+render();
   false = selesai tanpa render; 'stop' = selesai (render ditangani sendiri); 'render' = render saja. */
function aksiAkun(a,id,el,s){
  let go=true;
  switch(a){
    case 'login':loginDlg();go=false;break;
    case 'login-refresh':{
  sb.auth.getSession().then(({ data: { session } }) => {
    sbUser = session?.user || null;
    loginDlg();
    render();
  });
  go=false;break;
}
    case 'cloud':cloudDlg();go=false;break;
    case 'auth-github':sbLoginOAuth('github').catch(e=>toast(e.message));go=false;break;
    case 'auth-google':sbLoginOAuth('google').catch(e=>toast(e.message));go=false;break;
    case 'auth-in-view':emailLoginDlg();go=false;break;
    case 'auth-out':{
      if(sbUser && sbUser.is_anonymous) {
        toast('Anda masih mode Tamu. Hubungkan email/GitHub dulu agar data tersimpan.');
        go=false; break;
      }
      ask('Yakin logout? Pastikan Anda ingat email/password atau akun GitHub/Google Anda untuk login kembali.', () => {
        sbSignOut().then(()=>{toast('Logout berhasil.');loginDlg();render();}).catch(e=>toast(e.message));
      });
      go=false;break;
    }
    case 'auth-do-in':{
      const em=$('al_em').value.trim(),pw=$('al_pw').value;
      if(!em||!pw){warn('Email dan password wajib.');go=false;break}
      el.disabled=true;
      sbSignInEmail(em,pw).then(async ()=>{
        await _syncLokalKeCloud();
        toast('Berhasil masuk.');loginDlg();render();
      }).catch(e=>{warn(e.message);el.disabled=false});
      go=false;break;
    }
    case 'auth-upgrade':{
      const em=$('au_em').value.trim(),pw=$('au_pw').value;
      if(!em||pw.length<6){warn('Email dan password (min 6) wajib.');go=false;break}
      el.disabled=true;
      sbUpgradeEmail(em,pw).then(async ()=>{
        await _syncLokalKeCloud();
        toast('Terkoneksi. Cek email verifikasi jika diminta.');loginDlg();render();
      }).catch(e=>{warn(e.message);el.disabled=false});
      go=false;break;
    }
    case 'cloud-save':{
      if(!s){warn('Buka cerita dulu.');go=false;break}
      el.style.opacity=.5;
      sbSaveStory(s).then(()=>{toast('Tersimpan di cloud.');el.style.opacity=1}).catch(e=>{toast('Gagal simpan: '+e.message);el.style.opacity=1});
      go=false;break;
    }
    case 'cloud-list':cloudListDlg();go=false;break;
    case 'cloud-load-item':{
      const idc=el.dataset.id;
      el.style.opacity=.5;
      sbLoadStory(idc).then(data=>{
        if(!data||!data.id)throw new Error('Data cloud tidak valid.');
        const idx=db.stories.findIndex(x=>x.id===data.id);
        if(idx>=0)db.stories[idx]=data;else db.stories.push(data);
        db.active=data.id;
        save();D.close();toast('Cerita dimuat dari cloud.');render();
      }).catch(e=>{toast('Gagal muat: '+e.message);el.style.opacity=1});
      go=false;break;
    }
    case 'cloud-del-item':{
  const idc = el.dataset.id;
  if (!idc) { toast('ID tidak ditemukan!'); go=false; break; }
  
  ask('Hapus cerita ini dari cloud?', () => {
    sbDeleteStory(idc).then(()=>{
      toast('Cerita dihapus dari cloud.');
      cloudListDlg(); // refresh daftar
    }).catch(e=>toast('Gagal hapus: '+e.message));
  });
  go=false;break;
}
    default: return undefined;
  }
  return go;
}
