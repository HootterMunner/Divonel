/* ═══ editor/aksi.js — penanganan klik/ubah + startup ═══
   Satu pengendali klik (switch data-a), pengendali change, inisialisasi(). Dimuat TERAKHIR. */
document.addEventListener('click',e=>{
  const el=e.target.closest('[data-a]');if(!el)return;
  const a=el.dataset.a,id=el.dataset.id,s=S();let go=true;
  const r=aksiPlay(a,id,el);if(r!==undefined){if(r)render();return}
  switch(a){
    case 'tab':tab=id;eng=null;break;
    case 'open':eng=null;db.active=id;tab='ed';hist=[];sel=null;edPath=null;laci=false;break;
    case 'edpath':edPath=id||null;laci=false;break;
case 'laci':laci=!laci;document.getElementById('edside')?.classList.toggle('open',laci);go=false;break;
    case 'news':dlg(`<h2>Cerita baru</h2><label>Judul</label><input id="f1"><label>Deskripsi</label><input id="f2"><label>Penulis</label><input id="f3">${btns('Buat')}`,()=>{const t=$('f1').value.trim();if(!t)return false;const n={id:uid(),title:t,description:$('f2').value,author:$('f3').value,chapters:[],passages:[]};db.stories.push(n);db.active=n.id;});go=false;break;
    case 'dels':ask('Hapus cerita ini beserta isinya?',()=>{db.stories=db.stories.filter(x=>x.id!==id);if(db.active===id)db.active=db.stories[0]?.id||null;});go=false;break;
    case 'exp':{inlineJanji.delete(id);inlineSiap(id);sumberPlayer(true).catch(()=>{});dlg(`<h2>Ekspor cerita</h2><p class="sub">Pilih bentuk berkas yang akan disimpan.</p><div class="card" data-a="dlh" data-id="${id}" style="cursor:pointer"><h3>Game (.html)</h3><p>Game lengkap dengan semua aset. Untuk dibagikan ke pembaca.</p></div><div class="card" data-a="dlj" data-id="${id}" style="cursor:pointer"><h3>Cadangan (.json)</h3><p>Logika cerita saja, tanpa aset. Untuk versioning dan pindah editor.</p></div><p id="dnote" class="sub"></p><div class="row" style="align-items:center;flex-wrap:wrap"><span class="sub" style="margin:0">Tidak terunduh? Lihat teksnya:</span><button class="sm" data-a="fbh" data-id="${id}">.html</button><button class="sm" data-a="fbj" data-id="${id}">.json</button></div><div class="row" style="justify-content:flex-end;margin-top:8px"><button data-a="dx">Tutup</button></div>`,null);go=false;break}
    case 'dlh':case 'dlj':go=false;unduh(id,a==='dlh'?'html':'json');break;
    case 'more':more[id]=true;break;
    case 'demo':{go=false;document.querySelector('[data-a="imp"]').click();$('f1').value=DEMO;window.demoOk=1;document.querySelector('[data-a="ds"]').click();window.demoOk=0;break}
    case 'clip':go=false;navigator.clipboard.readText().then(x=>{$('f1').value=x}).catch(()=>warn('Papan klip tidak bisa dibaca di sini. Tekan lama di kotak lalu pilih Tempel.'));break;
    case 'cp':{const t=$('f1'),v=t.value,ok=()=>catat('Tersalin ke papan klip.'),manual=()=>{t.focus();t.select();t.setSelectionRange(0,v.length);let k=false;try{k=document.execCommand('copy')}catch(_){}catat(k?'Tersalin ke papan klip.':'Teks sudah terpilih. Tekan lama lalu pilih Salin.')};if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(v).then(ok,manual);else manual();go=false;break}
    case 'fbh':case 'fbj':go=false;fallback(id,a==='fbh'?'html':'json','Cara lain jika unduhan tidak berjalan.');break;
    case 'fbo':{go=false;siapkan(id,el.dataset.j).then(b=>{if(!b)return;const u=URL.createObjectURL(new Blob([b.data],{type:b.mime==='application/json'?'text/plain':b.mime}));if(!window.open(u,'_blank'))catat('Tab baru diblokir browser. Izinkan pop-up atau pakai Salin.');setTimeout(()=>URL.revokeObjectURL(u),60000)});break}
    case 'pilihsumber':go=false;pilihSumber();break;
    case 'imp':dlg(`<h2>Impor cerita</h2><label>Pilih berkas .json dari penyimpanan</label><input type="file" id="ff" accept=".json,application/json,text/plain"><label>Atau tempel isi JSON</label><button class="sm" data-a="clip" style="margin:4px 0 8px">Tempel dari papan klip</button><textarea id="f1"></textarea>${btns('Impor')}`,()=>{try{const j=JSON.parse($('f1').value),x=j.story||j;if(!x.passages||!x.title)throw 0;if(!window.demoOk&&(x.passages.some(p=>(p.js||'').trim())||(x.files||[]).some(f=>/^[ \t]*js[ \t]*$/m.test(f.code||'')))&&!window.jsOk){window.jsOk=true;warn('Cerita ini berisi JavaScript yang akan dijalankan di halaman ini. Tekan Impor sekali lagi hanya jika kamu percaya sumbernya.');return false}window.jsOk=false;const m={};x.passages.forEach(p=>m[p.id]=uid());const cm={};(x.chapters||[]).forEach(c=>cm[c.id]=uid());x.id=uid();x.chapters=(x.chapters||[]).map(c=>({id:cm[c.id],title:c.title,parent:c.parent?cm[c.parent]||null:null}));x.passages=x.passages.map(p=>({...p,id:m[p.id],chapter:cm[p.chapter]||null,choices:(p.choices||[]).map(c=>({id:uid(),text:c.text,to:m[c.to]||null,syarat:c.syarat||'',efek:c.efek||''}))}));x.description=x.description||'';migrasi(x);x.author=x.author||'';db.stories.push(x);db.active=x.id}catch(_){warn('JSON tidak valid. Pastikan isinya hasil ekspor dari aplikasi ini.');return false}});go=false;break;
    case 'nc':one('Bab baru','',v=>s.chapters.push({id:uid(),title:v,parent:null}));go=false;break;
    case 'ncs':one('Sub-bab baru','',v=>{if(!s.chapters.find(x=>x.id===id))return;s.chapters.push({id:uid(),title:v,parent:id})});go=false;break;
    case 'rc':{const c=s.chapters.find(x=>x.id===id);if(!c){go=false;break}
      dlg(`<h2>Ubah bab</h2><label>Nama</label><input id="f1" value="${esc(c.title)}"><label>Induk bab</label><select id="f2">${chapterParentOpts(s,c.id,c.parent||'')}</select>${btns()}`,
        ()=>{const t=$('f1').value.trim();if(!t){$('f1').focus();return false}c.title=t;c.parent=$('f2').value||null});
      go=false;break}
    case 'dc':ask('Hapus bab ini? Sub-bab di dalamnya dipindah ke induknya, bagian di dalamnya menjadi tanpa bab.',()=>{const c=s.chapters.find(x=>x.id===id),parent=c?c.parent:null;s.chapters.forEach(x=>{if(x.parent===id)x.parent=parent});s.passages.forEach(p=>{if(p.chapter===id)p.chapter=null});s.chapters=s.chapters.filter(x=>x.id!==id);if(edPath===id)edPath=parent||null});go=false;break;
    case 'np':pend=null;pDlg(null,id||null);go=false;break;
    case 'mnp':{const r=$('msv')?.getBoundingClientRect();pend=r?{x:Math.round((r.width/2-view.x)/view.k-70),y:Math.round((r.height/2-view.y)/view.k-35)}:null;pDlg(null,null);go=false;break}
    case 'mz':{const r=$('msv').getBoundingClientRect();if(id==='0'){view={x:20,y:20,k:1};applyView()}else zoom(id==='+'?1.25:.8,r.width/2,r.height/2);go=false;break}
    case 'mconn':conn=!conn;go=false;drawMap();break;
    case 'mlay':s.chapters.forEach((c,i)=>{c.x=30+(i%3)*220;c.y=30+Math.floor(i/3)*140});s.passages.forEach((p,i)=>{p.x=30+(i%3)*200;p.y=30+Math.floor(i/3)*120});break;
    case 'ep':pDlg(id);go=false;break;
    case 'st':D.close();s.passages.forEach(p=>p.start=p.id===id);break;
    case 'chn':chain(s,id);break;
    case 'dp':ask('Hapus bagian ini?',()=>{D.close();s.passages=s.passages.filter(p=>p.id!==id);s.passages.forEach(p=>p.choices.forEach(c=>{if(c.to===id)c.to=null}));if(sel===id)sel=null;hist=[]});go=false;break;
    case 'ch':{cur=id;const p=P(s,id);tmp=p.choices.map(c=>({...c}));rc(s,id);D.showModal&&!D.open&&D.showModal();onSave=()=>{grab();const kn=collectKnown(s),ids=titleIds(s);for(const c of tmp){try{parseSyarat(c.syarat,kn);parseEfek(c.efek,kn,ids)}catch(e){warn(e.message);return false}}p.choices=tmp.map(c=>({...c,text:c.text.trim()||(P(s,c.to)?.title||'')})).filter(c=>c.text)};go=false;break}
    case 'addc':grab();tmp.push({id:uid(),text:'',to:null});rc(s,cur);go=false;break;
    case 'rmc':grab();tmp.splice(+id,1);rc(s,cur);go=false;break;
    case 'ds':if(onSave&&onSave()===false){go=false;break}D.close();save();render();return;
    case 'cpg':{try{navigator.clipboard.writeText($(id).textContent)}catch(_){}go=false;break}
    case 'nf':one('Folder baru','',v=>{(s.folders=s.folders||[]).push({id:uid(),name:v,parent:id||null})});go=false;break;
    case 'rf':{const f=s.folders.find(x=>x.id===id);one('Ganti nama folder',f.name,v=>f.name=v);go=false;break}
    case 'df':ask('Hapus folder ini? Isinya dipindah ke folder di atasnya.',()=>{const f=s.folders.find(x=>x.id===id);s.folders.forEach(x=>{if(x.parent===id)x.parent=f.parent||null});(s.files||[]).forEach(x=>{if(x.folder===id)x.folder=f.parent||null});s.folders=s.folders.filter(x=>x.id!==id)});go=false;break;
    case 'ns':sDlg(null,id||null);go=false;break;
    case 'es':sDlg(id);go=false;break;
    case 'mks':D.close();sDlg(null,null,P(s,id).title);go=false;break;
    case 'dfl':ask('Hapus skrip ini? Sambungannya ke bagian cerita ikut dilepas.',()=>{D.close();s.files=s.files.filter(x=>x.id!==id);s.passages.forEach(p=>p.refs=(p.refs||[]).filter(r=>r!==id))});go=false;break;
    case 'awal':dlg(`<h2>Nilai awal cerita</h2><p class="sub">Satu per baris. Contoh: emas = 0, nyawa = 3, nama = Rani, tas = daftar roti, peta</p><textarea id="f1">${esc(s.awal||'')}</textarea>${btns()}`,()=>{try{parseAwal($('f1').value)}catch(e){warn(e.message);return false}s.awal=$('f1').value});go=false;break;
    case 'sel':sel=sel===id?null:id;break;
    case 'dbg':if(eng)eng.dbg=!eng.dbg;go=false;break;
    case 'aset':asetDlg();go=false;break;
    case 'pgb':pgbDaftar();go=false;break;
    case 'pgp':pgbVal=id;pgbRender();go=false;break;
    case 'pgx':pgbVal=null;pgbRender();go=false;break;
    case 'aadd':asetTambah();go=false;break;
    case 'adel':{go=false;const idc=s.id;ask('Hapus aset "'+id+'"?',async()=>{try{await hapusAset(idc,id)}catch(e){toast('Gagal menghapus aset: '+((e&&e.message)||e))}asetDlg();render()});break}
  }
  if(go){if(!['tab','more'].includes(a))save();render()}
});
document.addEventListener('change',e=>{
  if(e.target.id!=='ff')return;const f=e.target.files&&e.target.files[0];if(!f)return;
  if(f.size>5e6){warn('Berkas terlalu besar (maksimal 5 MB).');return}
  f.text().then(t=>{const a=$('f1');if(a)a.value=t}).catch(()=>warn('Berkas tidak bisa dibaca. Coba tempel isinya langsung.'));
});
inisialisasi().then(()=>{db.stories.forEach(migrasi);save();render();if(modeTerbatas)toast('IndexedDB tidak tersedia: mode terbatas. Cerita disimpan di localStorage dan aset belum bisa dipakai.')});

/* Langkah 3a: klik di luar sidebar (saat laci terbuka di HP) menutup laci. */
document.addEventListener('click',e=>{if(!laci)return;if(e.target.closest('.ed-side')||e.target.closest('[data-a="laci"]'))return;laci=false;document.getElementById('edside')?.classList.remove('open')});