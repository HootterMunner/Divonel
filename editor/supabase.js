/* ═══ editor/supabase.js — Cloud sync & Auth ═══ */
const SB_URL = 'https://qnclkvbmtvkdxkzviecj.supabase.co';
const SB_KEY = 'sb_publishable_R5cpWdAVALCfMc_K1V4i4A_ZtfU6AQw'; // <-- Pastikan ini tidak kosong!
const sb = (window.supabase && SB_URL.startsWith('https://') && SB_KEY.length > 20) ?
  window.supabase.createClient(SB_URL, SB_KEY) :
  null;

let sbUser = null;

async function sbInit() {
  if (!sb) { console.info('[cloud] nonaktif'); return; }
  try {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) {
      await sb.auth.signInAnonymously();
    }
    const { data: { user } } = await sb.auth.getUser();
    sbUser = user || null;
    
    sb.auth.onAuthStateChange((event, s) => {
  // Hanya update sbUser jika event relevan
  if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
    sbUser = s?.user || null;
    if (typeof render === 'function') render();
  }
});
  } catch (e) { console.warn('[cloud]', e.message); }
}

async function sbLoginOAuth(provider) {
  if (!sb) throw new Error('Cloud belum diset.');
  const { error } = await sb.auth.signInWithOAuth({
    provider,
    options: { redirectTo: location.origin + location.pathname }
  });
  if (error) throw new Error(error.message);
}

async function sbUpgradeEmail(email, password) {
  if (!sb) throw new Error('Cloud belum diset.');
  const { error } = await sb.auth.updateUser({ email, password });
  if (error) throw new Error(error.message);
}

async function sbSignInEmail(email, password) {
  if (!sb) throw new Error('Cloud belum diset.');
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
}

async function sbSignOut(){
  if(!sb) return;
  await sb.auth.signOut();
  // ← TAMBAH: beri waktu untuk signInAnonymously selesai
  const { data, error } = await sb.auth.signInAnonymously();
  if (error) {
    console.warn('Gagal masuk sebagai tamu:', error.message);
    return;
  }
  // Sinkronkan sbUser langsung
  sbUser = data.user;
  if (typeof render === 'function') render();
}


async function sbSaveStory(story) {
  if (!sb) throw new Error('Cloud belum diset.');
  
  // Ambil sesi terbaru
  const { data: { session } } = await sb.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) throw new Error('Harap login ulang.');

  // ← SINKRONKAN sbUser dengan sesi terbaru
  if (!sbUser || sbUser.id !== uid) {
    console.log('🔄 Sinkronisasi sbUser:', sbUser?.id, '→', uid);
    sbUser = session.user;
  }

  const row = {
    id: story.id,
    user_id: uid, // ← selalu pakai uid dari sesi terbaru
    data: story,
    updated_at: new Date().toISOString()
  };

  // Coba INSERT
  const { error: insErr } = await sb.from('stories')
    .insert(row, { returning: 'minimal' });

  if (!insErr) {
    console.log('✅ INSERT berhasil:', story.id, '| user_id:', uid);
    return;
  }

  if (insErr.code === '23505') {
    const { error: updErr } = await sb.from('stories')
      .update(row, { returning: 'minimal' })
      .eq('id', story.id)
      .eq('user_id', uid);
    if (updErr) throw new Error('Gagal update: ' + updErr.message);
    console.log('✅ UPDATE berhasil:', story.id, '| user_id:', uid);
    return;
  }

  throw new Error('Gagal simpan: ' + insErr.message);
}

async function sbDeleteStory(storyId){
  if(!sb) throw new Error('Cloud belum diset.');
  const { data: { session } } = await sb.auth.getSession();
  const uid = session?.user?.id;
  if(!uid) throw new Error('Harap login ulang.');

  // Hapus langsung tanpa .select()
  const { error: delErr } = await sb.from('stories').delete().eq('id', storyId).eq('user_id', uid);
  if(delErr) throw new Error('Gagal hapus: ' + delErr.message);

  // Verifikasi
  const { data: sisa } = await sb.from('stories').select('id').eq('id', storyId).maybeSingle();
  if(sisa) throw new Error('Gagal: RLS memblokir hapus.');
}

async function sbListStories(){
  if(!sb) throw new Error('Cloud belum diset.');
  const { data: { session } } = await sb.auth.getSession();
  const uid = session?.user?.id;
  if(!uid) throw new Error('Harap login ulang.');

  const { data, error } = await sb.from('stories')
    .select('id, updated_at, data')
    .eq('user_id', uid)
    .order('updated_at', {ascending: false});
  
  if(error) throw new Error(error.message);
  return data.map(row => ({
    id: row.id,
    judul: (row.data && row.data.title) || 'Tanpa Judul',
    updated_at: new Date(row.updated_at).toLocaleString('id-ID'),
    data: row.data
  }));
}
/* ╚═══ AKHIR FUNGSI DAFTAR CLOUD ═══╝ */

sbInit();