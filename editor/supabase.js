/* ═══ editor/supabase.js — Cloud sync & Auth ═══ */
const SB_URL = 'https://qnclkvbmtvkdxkzviecj.supabase.co';
const SB_KEY = 'sb_publishable_R5cpWdAVALCfMc_K1V4i4A_ZtfU6AQw'; // <-- Pastikan ini tidak kosong!
const sb = (window.supabase && SB_URL.startsWith('https://') && SB_KEY.length > 20)
  ? window.supabase.createClient(SB_URL, SB_KEY)
  : null;

let sbUser = null;

async function sbInit(){
  if(!sb){ console.info('[cloud] nonaktif'); return; }
  try{
    const {data:{session}} = await sb.auth.getSession();
    if(!session){
      await sb.auth.signInAnonymously();
    }
    const {data:{user}} = await sb.auth.getUser();
    sbUser = user || null;
    
    sb.auth.onAuthStateChange((event, s) => {
      sbUser = s?.user || null;
      if(typeof render === 'function') render();
    });
  }catch(e){ console.warn('[cloud]', e.message); }
}

async function sbLoginOAuth(provider){
  if(!sb) throw new Error('Cloud belum diset.');
  const {error} = await sb.auth.signInWithOAuth({ 
    provider, 
    options: { redirectTo: location.origin + location.pathname } 
  });
  if(error) throw new Error(error.message);
}

async function sbUpgradeEmail(email, password){
  if(!sb) throw new Error('Cloud belum diset.');
  const {error} = await sb.auth.updateUser({email, password});
  if(error) throw new Error(error.message);
}

async function sbSignInEmail(email, password){
  if(!sb) throw new Error('Cloud belum diset.');
  const {error} = await sb.auth.signInWithPassword({email, password});
  if(error) throw new Error(error.message);
}

async function sbSignOut(){
  if(!sb) return;
  await sb.auth.signOut();
  await sb.auth.signInAnonymously(); // Kembali ke tamu baru
}

async function sbSaveStory(story){
  if(!sb || !sbUser) throw new Error('Harap login/tunggu koneksi.');
  const {error} = await sb.from('stories').upsert({
    id: story.id, user_id: sbUser.id, data: story, updated_at: new Date().toISOString()
  }, {onConflict: 'id'});
  if(error) throw new Error(error.message);
}

async function sbLoadStory(storyId){
  if(!sb || !sbUser) throw new Error('Harap login/tunggu koneksi.');
  const {data, error} = await sb.from('stories').select('data').eq('id', storyId).maybeSingle();
  if(error) throw new Error(error.message);
  if(!data) throw new Error('Cerita tidak ditemukan di cloud.');
  return data.data;
}

sbInit();