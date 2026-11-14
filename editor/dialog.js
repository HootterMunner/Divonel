/* ═══ editor/dialog.js — sambungan skrip, panduan, tab Kode, dialog ═══
   link/joinChain/chain, vGuide, vKode, sDlg, setupSambung, pDlg, one(). */
function link(a,b,t){if(!a.choices.some(c=>c.to===b.id))a.choices.push({id:uid(),text:t,to:b.id})}
function joinChain(s,p){const l=s.passages.filter(x=>x.chapter===p.chapter&&x!==p).pop();if(l){link(l,p,'Lanjut ke: '+p.title);link(p,l,'Kembali ke: '+l.title)}}
function chain(s,cid){const ps=s.passages.filter(p=>p.chapter===cid);for(let i=1;i<ps.length;i++){link(ps[i-1],ps[i],'Lanjut ke: '+ps[i].title);link(ps[i],ps[i-1],'Kembali ke: '+ps[i-1].title)}}
/* Pilihan bab untuk dialog bagian — hierarki dengan indentasi. */
function cOpts(s,cur){
  const opts=[`<option value="">Tanpa bab</option>`];
  const walk=(pid, level)=>{
    s.chapters.filter(c=>(c.parent||null)===pid).forEach(c=>{
      opts.push(`<option value="${c.id}" ${c.id===cur?'selected':''}>${'— '.repeat(level)}${esc(c.title)}</option>`);
      walk(c.id, level+1);
    });
  };
  walk(null, 0);
  return opts.join('');
}
/* Pilihan induk bab — untuk dialog "Ubah bab". Menyembunyikan diri sendiri dan keturunannya (cegah siklus). */
function chapterParentOpts(s,selfId,cur){
  const opts=[`<option value="" ${!cur?'selected':''}>(tanpa induk)</option>`];
  const block=new Set([selfId]);
  let berubah=true;
  while(berubah){berubah=false;s.chapters.forEach(c=>{if(!block.has(c.id)&&c.parent&&block.has(c.parent)){block.add(c.id);berubah=true}})}
  const walk=(pid, level)=>{
    s.chapters.filter(c=>(c.parent||null)===pid).forEach(c=>{
      if(block.has(c.id))return;
      opts.push(`<option value="${c.id}" ${c.id===cur?'selected':''}>${'— '.repeat(level)}${esc(c.title)}</option>`);
      walk(c.id, level+1);
    });
  };
  walk(null, 0);
  return opts.join('');
}
function tOpts(s,from,cur){return `<option value="">— ujung buntu —</option>`+s.passages.filter(p=>p.id!==from).map(p=>{const c=s.chapters.find(x=>x.id===p.chapter);return `<option value="${p.id}" ${p.id===cur?'selected':''}>${esc(p.title)}${c?' ('+esc(c.title)+')':''}</option>`}).join('')}
function rc(s,pid){$('dlg').innerHTML=`<h2>Pilihan cerita</h2><p class="sub">Dari: ${esc(P(s,pid).title)}</p><p class="sub">Syarat: punya kunci, emas >= 10. Efek: emas + 5; ambil kunci (pisahkan dengan ;)</p>`+(tmp.map((c,i)=>`<div class="card"><input class="ct" value="${esc(c.text)}" placeholder="Teks pilihan"><select class="cto">${tOpts(s,pid,c.to)}</select><details${c.syarat||c.efek?' open':''}><summary>Syarat dan efek</summary><input class="cs" value="${esc(c.syarat||'')}" placeholder="Muncul jika… (contoh: punya kunci)"><input class="ce" value="${esc(c.efek||'')}" placeholder="Lalu ubah… (contoh: emas + 5; ambil kunci)"></details><button class="sm del" data-a="rmc" data-id="${i}">Hapus pilihan</button></div>`).join('')||'<p class="sub">Belum ada pilihan.</p>')+`<button class="sm" data-a="addc" style="margin-bottom:14px">Tambah pilihan</button>`+btns()}
function grab(){const t=[...D.querySelectorAll('.ct')],o=[...D.querySelectorAll('.cto')],cs=[...D.querySelectorAll('.cs')],ce=[...D.querySelectorAll('.ce')];tmp=t.map((x,i)=>({id:tmp[i]?.id||uid(),text:x.value,to:o[i].value||null,syarat:cs[i].value.trim(),efek:ce[i].value.trim()}))}

function vGuide(){
  const ex=(id,t)=>`<div class="kd" id="${id}">${esc(t)}</div><button class="sm" data-a="cpg" data-id="${id}">Salin contoh</button>`;
  return head('Panduan','Cara menulis skrip')+'<div class="row" style="margin:-4px 0 10px"><button class="sm" data-a="tab" data-id="kd">← Kembali ke Kode</button></div>'+
  `<details class="card" open><summary>Cara pakai</summary><p>Kode ditulis di tab <b>Kode</b> sebagai skrip, dirapikan dalam folder. Cara termudah: beri skrip <b>nama yang sama dengan judul sebuah bagian</b>, maka keduanya tersambung otomatis (huruf besar-kecil tidak berpengaruh), bahkan bila bagiannya baru dibuat nanti. Untuk satu skrip di banyak bagian, centang manual lewat Ubah skrip atau Ubah bagian; skrip itu berjalan saat pembaca masuk ke bagian tersebut. Skrip bertanda <b>Bersama</b> tidak dijalankan sendiri: fungsi di dalamnya bisa dipakai semua skrip lain. Satu baris = satu perintah. Nilai seperti emas atau nyawa (disebut <i>variabel</i>, yaitu wadah angka atau teks yang bisa berubah) harus dibuat dulu lewat tombol "Nilai awal cerita" di Editor, misalnya <code>emas = 0</code>. Coba hasilnya di tab Main.</p></details>`+
  `<details class="card"><summary>Tingkat 1: Dasar</summary><p>Mengubah nilai, mengambil barang, pindah bagian, dan menampilkan teks.</p>`+ex('g1','// ini catatan, tidak dijalankan\nemas = 5\nemas + 3\nnyawa -= 1\nhadiah = acak(1,6)\nambil kunci\nbuang kunci\npergi ke Gerbang\nteks "Emasmu sekarang {emas}."\nteks "Kamu terluka." if nyawa < 3')+`<p>acak(1,6) = angka acak 1 sampai 6, seperti dadu. pergi ke memakai judul bagian.</p></details>`+
  `<details class="card"><summary>Tingkat 2: Logika</summary><p><b>if</b> artinya "kalau", <b>else</b> artinya "kalau tidak". Isinya ditulis di dalam { }.</p>`+ex('g2','if punya kunci {\n  pergi ke Aula\n} else if emas >= 5 {\n  emas - 5\n  ambil kunci\n} else {\n  nyawa - 1\n}')+`<p>Syarat yang bisa dipakai: punya kunci, bukan punya kunci, emas >= 5 (juga &gt; &lt; &lt;= == !=). Gabungkan dengan <b>dan</b> (atau &amp;&amp;) serta <b>atau</b> (atau ||). Catatan: baris teks "..." tidak boleh di dalam if. Pakai bentuk teks "..." if syarat.</p></details>`+
  `<details class="card"><summary>Tingkat 3: Struktur</summary><p>Tiga alat untuk kode yang lebih rapi. <b>Fungsi</b> = potongan kode yang diberi nama lalu dipanggil berulang (tulis di atas, sebelum dipakai). <b>ulang N kali</b> = menjalankan isinya N kali (maksimal 100). <b>Objek</b> = nama dengan titik untuk mengelompokkan data, misalnya musuh.nyawa dan musuh.nama (buat dulu di Nilai awal cerita).</p>`+ex('g3','function serang(sasaran, daya) {\n  sasaran.nyawa - daya\n}\nserang(musuh, 3)\nulang 2 kali {\n  emas + 1\n}\nteks "Nyawa musuh: {musuh.nyawa}"')+`<p>Isian fungsi (daya, sasaran) diganti apa adanya saat dipanggil. Jumlah ulang boleh angka tetap atau nilai yang berubah (lihat bagian berikutnya).</p></details><details class="card"><summary>Tingkat 3 lanjutan: acak berbobot, ulang dinamis, selama</summary><p><b>acakBerbobot</b> = mengundi dengan peluang tidak sama. Tiap pilihan ditulis [nilai, bobot]; makin besar bobot, makin sering keluar (bobot 2 muncul dua kali lebih sering dari bobot 1). <b>ulang (nilai) kali</b> = jumlah ulangnya boleh mengikuti nilai yang berubah, misalnya jumlah emas. <b>selama syarat</b> = mengulang selama syaratnya masih benar. Semua perulangan dibatasi 100 putaran supaya tidak macet.</p>`+ex('g6','hadiah = acakBerbobot([["emas", 1], ["nyawa", 2]])\nteks "Kamu mendapat: {hadiah}"')+ex('g7','ulang (emas) kali {\n  nyawa + 1\n}\nteks "Nyawa sekarang {nyawa}"')+ex('g8','selama nyawa > 0 {\n  nyawa - 1\n}\nteks "Nyawa habis: {nyawa}"')+`<p>Di bagian cerita, acakBerbobot diundi ulang setiap bagian dibuka. Di Nilai awal, hasilnya diundi sekali saat cerita dimulai. Pada ulang, tulis nilainya di dalam kurung biasa ( ), bukan kurung kurawal. Kalau lebih dari 100 akan muncul galat "ulang maksimal 100".</p></details><details class="card"><summary>Tingkat 4: JavaScript</summary><p>Bahasa asli web, tanpa batas. Di skrip yang sama, tulis satu baris <code>js</code> sendiri. Semua baris di bawahnya dibaca sebagai JavaScript dan berjalan setelah bagian atasnya. Alat yang tersedia lewat <code>g</code>: g.baca("nama"), g.tulis("nama", nilai), g.tambah("nama", angka), g.punya("barang"), g.ambil("barang"), g.buang("barang"), g.acak(a, b), g.acakBerbobot([[nilai, bobot], ...]), g.teks("tulisan"), g.pergi("Judul bagian").</p>`+ex('g4','js\nlet dmg = g.acak(1, 6) + g.baca("serang")\nwhile (g.baca("musuh.nyawa") > 0 && dmg > 0) {\n  g.tambah("musuh.nyawa", -dmg)\n  dmg -= 2\n}\ng.teks("Musuh tersisa: " + g.baca("musuh.nyawa"))\nif (g.baca("musuh.nyawa") <= 0) g.pergi("Menang")')+`<p>Beda dari tingkat 3: perulangannya bisa mengikuti nilai yang berubah (while). Hati-hati, perulangan tanpa akhir membuat halaman macet; muat ulang untuk keluar. Cerita impor yang berisi JavaScript akan meminta konfirmasi dulu.</p></details><details class="card"><summary>Efek global dan skrip Otomatis</summary><p>Skrip berjenis <b>Otomatis</b> berjalan di setiap bagian tanpa perlu disambungkan satu per satu. Cocok untuk sistem di balik layar (nyawa menipis, waktu berjalan) dan tampilan. Di JavaScript tersedia: <code>g.tema({...})</code> untuk mengubah tampilan (latar, kartu, teks, aksen, font: "serif", "mono", atau "sans", ukuran), <code>g.tema(null)</code> untuk mengembalikan ke awal, dan <code>g.fade(masuk, keluar)</code> untuk memudar (satuan milidetik, maksimal 3000).</p>`+ex('g5','js\nif (g.baca("nyawa") < 2) {\n  g.tema({ latar: "#2a0a0a", teks: "#ffd6d6" })\n} else {\n  g.tema(null)\n}\ng.fade(400, 300)')+`<p>Simpan dengan jenis Otomatis, lalu lihat hasilnya di tab Main.</p></details>`;
}
const KA='spellcheck="false" autocapitalize="off" autocorrect="off" style="min-height:200px;font:13px/1.5 ui-monospace,monospace"';
function jalur(s,fid){const n=[];let f=(s.folders||[]).find(x=>x.id===fid),g=0;while(f&&g++<20){n.unshift(f.name);f=s.folders.find(x=>x.id===f.parent)}return n.join('/')}
function fOpts(s,cur){return `<option value="">(tanpa folder)</option>`+(s.folders||[]).map(f=>`<option value="${f.id}" ${f.id===cur?'selected':''}>${esc(jalur(s,f.id))}</option>`).join('')}
function vKode(s){
  const F=s.files||[],Fo=s.folders||[];
  const fl=f=>{const m=mode(f),L=s.passages.filter(p=>terhubung(f,p));
    const [c,t]=m==='tiap'?['oto','semua bagian']:m==='bersama'?['bs','fungsi bersama']:L.length?['on','→ '+L[0].title+(L.length>1?' +'+(L.length-1):'')]:['wt','belum tersambung'];
    return `<div class="fr" data-a="es" data-id="${f.id}"><span class="dt ${c}"></span><b>${esc(f.name)}</b><span class="mt">${esc(t)}</span></div>`};
  const dir=pid=>Fo.filter(x=>(x.parent||null)===pid).map(x=>`<details class="fd" open><summary>${esc(x.name)}</summary><div class="tr">${dir(x.id)}<div class="fa"><button class="ln" data-a="ns" data-id="${x.id}">+ Skrip</button><button class="ln" data-a="nf" data-id="${x.id}">+ Subfolder</button><button class="ln" data-a="rf" data-id="${x.id}">Ganti nama</button><button class="ln" data-a="df" data-id="${x.id}">Hapus</button></div></div></details>`).join('')+F.filter(x=>(x.folder||null)===pid).map(fl).join('');
  return head('Kode',F.length+' skrip · '+Fo.length+' folder')+`<p class="sub" style="margin-top:-8px">Skrip yang namanya sama dengan judul sebuah bagian tersambung otomatis, termasuk bagian yang baru dibuat nanti.</p><div class="row" style="margin-bottom:6px"><button class="pr sm" data-a="ns" data-id="">+ Skrip</button><button class="sm" data-a="nf" data-id="">+ Folder</button><button class="sm" data-a="tab" data-id="gd">Panduan</button><button class="sm" data-a="aset">Aset (${Object.keys(daftarAset(s)).length})</button></div>`+(F.length||Fo.length?dir(null):empty('Belum ada skrip','Beri skrip nama yang sama dengan judul bagian cerita, maka keduanya tersambung otomatis.'))+`<p class="sub" style="margin-top:16px">Penyimpanan: <span id="stPersist">${labelPersist()}</span></p>`;
}
function sDlg(id,fid,nama){
  const s=S(),nid=id||uid(),f=id?s.files.find(x=>x.id===id):{name:nama||'',folder:fid||null,code:'',lib:false};
  const cocok=f.name?s.passages.filter(p=>nm(p.title)===nm(f.name)):[],oto=mode(f)!=='biasa'?'':!f.name?'Beri nama yang sama dengan judul sebuah bagian agar tersambung otomatis.':cocok.length?'Tersambung otomatis ke: '+cocok.map(p=>esc(p.title)).join(', ')+'.':'Belum ada bagian bernama "'+esc(f.name)+'". Begitu bagian itu dibuat, skrip ini otomatis tersambung.';const pil=new Set(s.passages.filter(p=>(p.refs||[]).includes(nid)).map(p=>p.id));
  dlg(`<h2>${id?'Ubah skrip':'Skrip baru'}</h2><label>Nama</label><input id="f1" value="${esc(f.name)}"><label>Folder</label><select id="f2">${fOpts(s,f.folder)}</select><label>Jenis</label><select id="f3"><option value="biasa" ${mode(f)==='biasa'?'selected':''}>Biasa: jalan di bagian yang disambungkan</option><option value="tiap" ${mode(f)==='tiap'?'selected':''}>Otomatis: jalan di setiap bagian</option><option value="bersama" ${mode(f)==='bersama'?'selected':''}>Bersama: fungsi untuk skrip lain</option></select><label>Kode (tingkat 1 sampai 4, lihat Panduan)</label><textarea id="f4" ${KA}>${esc(f.code)}</textarea><div id="sb" ${mode(f)==='biasa'?'':'hidden'}><p class="sub" style="margin:0 0 8px">${oto}</p><label>Sambungkan juga ke</label><div class="chips" id="chips"></div><select id="tb"></select></div>${id?`<div class="row" style="margin-bottom:10px"><button class="sm del" data-a="dfl" data-id="${id}">Hapus skrip</button></div>`:''}${btns()}`,()=>{
    const n=$('f1').value.trim();if(!n){$('f1').focus();return false}
    const code=$('f4').value,k=pisah(code);
    try{const L=pustaka({files:(s.files||[]).filter(x=>x.id!==id)});parseKode(k.kode,collectKnown(s),titleIds(s),L.fn);new Function('g',k.js)}catch(e){warn(e.message);return false}
    const mo=$('f3').value,d={name:n,folder:$('f2').value||null,code,mode:mo,lib:mo==='bersama'};
    if(id)Object.assign(f,d);else(s.files=s.files||[]).push({id:nid,...d});const pk=pil;s.passages.forEach(p=>{const r=(p.refs||[]).filter(x=>x!==nid);if(pk.has(p.id))r.push(nid);p.refs=r});
  });
  setupSambung(s,pil);
}
function setupSambung(s,pil){
  const draw=()=>{
    $('chips').innerHTML=[...pil].map(i=>{const p=s.passages.find(x=>x.id===i);return p?`<span class="chip">${esc(p.title)}<button type="button" data-x="${i}">×</button></span>`:''}).join('')||'<span class="mt">Belum ada</span>';
    const sisa=s.passages.filter(p=>!pil.has(p.id)&&nm(p.title)!==nm($('f1').value));
    $('tb').innerHTML='<option value="">+ Tambah bagian</option>'+sisa.map(p=>`<option value="${p.id}">${esc(p.title)}</option>`).join('');
    $('tb').hidden=!sisa.length;
  };
  $('chips').onclick=e=>{const x=e.target.closest('[data-x]');if(x){pil.delete(x.dataset.x);draw()}};
  $('tb').onchange=()=>{if($('tb').value){pil.add($('tb').value);draw()}};
  $('f3').onchange=()=>{$('sb').hidden=$('f3').value!=='biasa'};
  $('f1').oninput=draw;
  draw();
}
function pDlg(id,cid){
  const s=S(),p=id?P(s,id):{title:'',content:'',chapter:cid||null,refs:[]};
  pgbVal=typeof p.gambar==='string'&&p.gambar?p.gambar:null;
  const sk=(s.files||[]).filter(f=>mode(f)==='biasa').map(f=>{const j=jalur(s,f.folder);return `<label class="ck"><input type="checkbox" class="rf" value="${f.id}" ${nm(f.name)===nm(p.title)&&id?'checked disabled':(p.refs||[]).includes(f.id)?'checked':''}>${esc((j?j+'/':'')+f.name)}${nm(f.name)===nm(p.title)&&id?' <span class="mt">otomatis</span>':''}</label>`}).join('');
  dlg(`<h2>${id?'Ubah bagian':'Bagian baru'}</h2><label>Judul</label><input id="f1" value="${esc(p.title)}"><label>Isi cerita</label><textarea id="f2">${esc(p.content)}</textarea><label>Bab</label><select id="f3">${cOpts(s,p.chapter)}</select><label>Gambar latar</label><div id="pgb"></div><label>Skrip tersambung (jalan saat bagian dibuka)</label>${sk||'<p class="sub">Belum ada skrip. Buat di tab Kode.</p>'}${id&&!(s.files||[]).some(f=>mode(f)==='biasa'&&nm(f.name)===nm(p.title))?`<button class="sm" data-a="mks" data-id="${id}" style="margin-bottom:10px">+ Buat skrip bernama sama</button>`:''}${id?`<div class="row" style="margin:6px 0 10px">${p.start?'':`<button class="sm" data-a="st" data-id="${id}">Jadikan bagian awal</button>`}<button class="sm del" data-a="dp" data-id="${id}">Hapus bagian</button></div>`:''}${btns()}`,()=>{
    const t=$('f1').value.trim();if(!t){$('f1').focus();return false}
    const refs=[...D.querySelectorAll('.rf:checked:not(:disabled)')].map(x=>x.value);
    if(id){const nc=$('f3').value||null,moved=nc!==(p.chapter||null);Object.assign(p,{title:t,content:$('f2').value,chapter:nc,refs});if(pgbVal)p.gambar=pgbVal;else delete p.gambar;if(moved&&nc)joinChain(s,p)}
    else{const np={id:uid(),title:t,content:$('f2').value,chapter:$('f3').value||null,start:!s.passages.length,choices:[],refs,...(pgbVal?{gambar:pgbVal}:{}),...(pend||{})};pend=null;s.passages.push(np);if(np.chapter)joinChain(s,np)}
  });
  pgbRender();
}
function one(t,v,fn){dlg(`<h2>${t}</h2><label>Judul</label><input id="f1" value="${esc(v)}">${btns()}`,()=>{const x=$('f1').value.trim();if(!x)return false;fn(x)})}