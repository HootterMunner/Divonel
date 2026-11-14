/* ═══ player/dsl.js — penerjemah DSL ═══
   Status permainan aktif (eng, kaitScene), parser nilai/syarat/efek/kode, bangun(), mulaiMain().
   Ikut ke HTML ekspor. Jangan ubah tanpa alasan kuat. */
let eng=null,kaitScene=null; /* kait perpindahan scene: diisi editor (lihat blok Aset), kosong di ekspor */
const NUM=/^-?\d+(\.\d+)?$/;
function parseNilai(t,known){t=String(t??'').trim();
  if(!t)throw new Error('Nilai kosong. Tulis angka, ya/tidak, acak(1, 6), atau "teks"');
  if(NUM.test(t))return +t;
  if((t.match(/"/g)||[]).length%2||(t[0]==='"')!==(t[t.length-1]==='"'))throw new Error(`Kutip tidak seimbang: ${t}. Tulis "teks" dengan kutip pembuka dan penutup`);
  if(/^acakBerbobot\b/i.test(t)){const mb=t.match(/^acakBerbobot\s*\(([\s\S]*)\)$/i),contoh='acakBerbobot([["emas", 1], ["nyawa", 2]])';
    if(!mb)throw new Error(`acakBerbobot ditulis seperti ini: ${contoh}. Tertulis: ${t}`);
    let d;try{d=JSON.parse(mb[1])}catch{throw new Error(`Daftar acakBerbobot tidak terbaca. Tulis seperti ${contoh} (teks pakai kutip dua, pisahkan dengan koma). Tertulis: ${t}`)}
    const g=Mesin.cekBerbobot(d);if(g)throw new Error(g);return{acakBerbobot:d}}
  if(/^acak\s*\(/i.test(t)){const ma=t.match(/^acak\s*\(\s*(-?\d+)\s*,\s*(-?\d+)\s*\)$/i);if(!ma||+ma[1]>+ma[2])throw new Error(`acak butuh dua bilangan bulat dengan a ≤ b, mis. acak(1, 6). Tertulis: ${t}`);return{acak:[+ma[1],+ma[2]]}}
  if(/^ya$/i.test(t))return true;if(/^tidak$/i.test(t))return false;
  const m=t.match(/^"(.*)"$/);if(m)return m[1];
  if(/^(?:[=<>]|!=)/.test(t))throw new Error(`Operator ganda di "${t}". Tulis satu operator saja, mis. emas >= 5`);
  if(/[<>=]/.test(t))throw new Error(`Nilai "${t}" berisi < > =. Kalau itu teks, bungkus dengan kutip`);
  if(/^[-+]?\s*[.,]?\d[\d.,]*$/.test(t))throw new Error(`Angka tidak valid: "${t}". Pakai titik untuk desimal, mis. 1.5 atau -2`);
  return known.has(t)?{dari:t}:t}
function parseItem(v){v=String(v??'').trim();
  if(!v)throw new Error('Nama item kosong. Contoh: ambil kunci');
  if(NUM.test(v))return +v;
  if((v.match(/"/g)||[]).length%2||(v[0]==='"')!==(v[v.length-1]==='"'))throw new Error(`Kutip tidak seimbang: ${v}. Tulis "nama item" dengan kutip pembuka dan penutup`);
  const m=v.match(/^"(.*)"$/);if(m)return m[1];
  if(/[<>=]/.test(v))throw new Error(`Nama item "${v}" berisi < > =. Perbandingan hanya untuk kolom Syarat; kalau ini nama item, bungkus dengan kutip`);
  return v}
function titleIds(s){const m=new Map();s.passages.forEach(p=>{const k=p.title.trim().toLowerCase();if(!m.has(k))m.set(k,p.id)});return m}
function collectKnown(s){
  const k=new Set(),add=t=>pre(String(t||'')).split(/[\n;]+/).forEach(x=>{x=x.trim();if(/^(ambil|buang|pergi ke|if|else|teks|selama|ulang)\s/i.test(x)||/^(\}|\/\/)/.test(x))return;const m=x.match(/^([^+\-*\/=]+?)\s*(\+|-|\*|\/|=)/);if(m)k.add(m[1].trim())});
  add(s.awal);(s.files||[]).forEach(f=>add(pisah(f.code).kode));s.passages.forEach(p=>{add(p.masuk);add(p.kode);p.choices.forEach(c=>add(c.efek))});return k;
}
function parseSyarat(str,known){
  str=pre((str||'').trim());if(!str)return undefined;
  const items=str.split(/\s+dan\s+/i).map(x=>x.trim()).filter(Boolean).map(x=>{
    let neg=false,m,r;if(/^bukan\s+/i.test(x)){neg=true;x=x.replace(/^bukan\s+/i,'')}
    const salah=`Baris ini terlihat seperti efek, bukan syarat. Efek hanya untuk kolom Efek. ("${x}")`;
    if(m=x.match(/^punya\s+(.+)$/i))r={punya:parseItem(m[1])};
    else if(m=x.match(/^([^<>=!]+?)\s*(>=|<=|==|!=|=|>|<)\s*(.+)$/)){if(/[+\-*\/]\s*$|\s[+\-*\/]\s/.test(m[1]))throw new Error(salah);r={kunci:m[1].trim(),op:m[2]==='='?'==':m[2],nilai:parseNilai(m[3],known)}}
    else if(/^(ambil|buang|pergi ke)\s/i.test(x)||/^[^+\-*\/=]+?\s*[+\-*\/]\s*.+$/.test(x.replace(/"[^"]*"/g,'""')))throw new Error(salah);
    else throw new Error(`Syarat tidak dimengerti: "${x}". Contoh: punya kunci, emas >= 10`);
    return neg?{bukan:r}:r;
  });
  return items.length===1?items[0]:{dan:items};
}
function parseEfek(str,known,ids){str=pre(str);
  if(/(^|[\n;])\s*(selama\s|ulang\s*\()[^\n;]*\{/i.test(str)){const r=parseKode(str,known,ids,{});if(r.teks.length)throw new Error('teks tidak bisa dipakai di kolom efek. Pakai tab Kode');return r.efek.length?r.efek:undefined}
  const out=[];
  (str||'').split(/[\n;]+/).map(x=>x.trim()).filter(Boolean).forEach(x=>{
    let m;const luar=x.replace(/"[^"]*"/g,'""');
    if(m=x.match(/^ambil\s+(.+)$/i))out.push({item:parseItem(m[1])});
    else if(m=x.match(/^buang\s+(.+)$/i))out.push({buang:parseItem(m[1])});
    else if(m=x.match(/^pergi ke\s+(.+)$/i)){const id=ids.get(m[1].trim().toLowerCase());if(!id)throw new Error(`Bagian "${m[1].trim()}" tidak ditemukan`);out.push({pergi:id})}
    else if(!luar.includes('"')&&/>=|<=|==|!=|>|</.test(luar))throw new Error(`Baris ini terlihat seperti syarat, bukan efek. Syarat hanya untuk kolom Syarat. ("${x}")`);
    else if(m=x.match(/^([^+\-*\/=]+?)\s*(\+|-|\*|\/|=)\s*(.+)$/)){
      const nama=m[1].trim();
      if(/[<>!]/.test(nama))throw new Error(`Nama variabel "${nama}" tidak boleh berisi < > ! atau =. Tulis nama saja, mis. emas + 5`);
      if(/^[=+*\/]/.test(m[3]))throw new Error(`Operator ganda di "${x}". Tulis satu operator saja, mis. emas + 5`);
      out.push({kunci:nama,op:{'+':'tambah','-':'kurang','*':'kali','/':'bagi','=':'set'}[m[2]],nilai:parseNilai(m[3],known)})}
    else throw new Error(`Perubahan tidak dimengerti: "${x}". Contoh: emas + 5, ambil kunci`);
  });
  return out.length?out:undefined;
}
const pre=t=>String(t??'').replace(/([A-Za-z_]\w*)\.([A-Za-z_]\w*)/g,'$1_$2');
const preT=t=>String(t||'').replace(/\{([^{}]*)\}/g,(m,x)=>'{'+pre(x)+'}');
function ambilBlok(T,i){if(T[i]!=='{')throw new Error(`Setelah "${T[i-1]}" harus ada {`);let d=0;for(let j=i;j<T.length;j++){if(T[j]==='{')d++;else if(T[j]==='}'&&--d===0)return[T.slice(i+1,j),j]}throw new Error('Ada { yang belum ditutup dengan }')}
function pisahArg(s){const a=[];let b='',q=false;for(const c of s){if(c==='"')q=!q;if(c===','&&!q){a.push(b.trim());b=''}else b+=c}if(b.trim()||a.length)a.push(b.trim());return a}
function ekspansi(T,fn,d){
  if(d>8)throw new Error('Fungsi terlalu bersarang (mungkin memanggil dirinya sendiri)');
  const out=[];
  for(let i=0;i<T.length;i++){const t=T[i];let m;
    if(m=t.match(/^function\s+(\w+)\s*\(([^)]*)\)$/i)){const [b,e]=ambilBlok(T,i+1);fn[m[1]]={p:m[2].split(',').map(x=>x.trim()).filter(Boolean),b};i=e}
    else if(m=t.match(/^ulang\s+(\d+)\s+kali$/i)||t.match(/^ulang\s*\(\s*(\d+)\s*\)\s*kali$/i)){if(+m[1]>100)throw new Error('ulang maksimal 100');const [b,e]=ambilBlok(T,i+1),x=ekspansi(b,fn,d+1);for(let k=0;k<+m[1];k++)out.push(...x);i=e}
    else if(/^ulang\s*\(.+\)\s*kali$/i.test(t)||/^selama\s+.+$/i.test(t)){const [b,e]=ambilBlok(T,i+1);out.push(t,'{',...ekspansi(b,fn,d+1),'}');i=e}
    else if((m=t.match(/^(\w+)\((.*)\)$/))&&fn[m[1]]){const f=fn[m[1]],a=pisahArg(m[2]);if(a.length!==f.p.length)throw new Error(`${m[1]} butuh ${f.p.length} isian, tapi diberi ${a.length}`);
      out.push(...ekspansi(f.b.map(x=>f.p.reduce((s,p,k)=>/^\w+$/.test(p)?s.replace(new RegExp('\\b'+p+'\\b','g'),a[k]):s,x)),fn,d+1))}
    else out.push(t)}
  return out;
}
function tokKode(src){
  const T=[],s=String(src||'');let b='',q=false;
  const p=()=>{const x=b.trim();if(x)T.push(x);b=''};
  for(let i=0;i<s.length;i++){const c=s[i];
    if(q){b+=c;if(c==='"')q=false;continue}
    if(c==='"'){q=true;b+=c}
    else if(c==='/'&&s[i+1]==='/'){while(i<s.length&&s[i]!=='\n')i++;p()}
    else if(c==='{'){p();T.push('{')}
    else if(c==='}'){p();T.push('}')}
    else if(c==='\n'||c===';')p();
    else b+=c}
  if(q)throw new Error('Ada tanda kutip " yang belum ditutup');
  p();return T;
}
function parseKode(src,known,ids,fn0){
  const T=ekspansi(tokKode(src),Object.assign({},fn0),0).map(pre),teks=[];let i=0;
  const kond=c=>{const o=c.split(/\s+atau\s+|\s*\|\|\s*/i).map(x=>parseSyarat(x.replace(/\s*&&\s*/g,' dan '),known));if(o.some(x=>!x))throw new Error('Syarat kosong setelah if');return o.length===1?o[0]:{atau:o}};
  const blok=top=>{const out=[];
    while(i<T.length){const t=T[i];
      if(t==='}'){if(top)throw new Error('Ada } tanpa pasangan {');return out}
      if(t==='{')throw new Error('Tanda { hanya boleh setelah if atau else');
      i++;let m;
      if(m=t.match(/^selama\s+(.+)$/i)){if(T[i]!=='{')throw new Error(`Setelah "selama ${m[1]}" harus ada {`);i++;const mk=blok(false);i++;out.push({jenis:'selama',syarat:kond(m[1]),maka:mk})}
      else if(m=t.match(/^ulang\s*\((.+)\)\s*kali$/i)){if(T[i]!=='{')throw new Error(`Setelah "ulang (${m[1]}) kali" harus ada {`);const kl=parseNilai(m[1],known);if(typeof kl!=='number'&&(kl===null||typeof kl!=='object'))throw new Error(`ulang: "${m[1]}" bukan angka atau nama nilai yang dikenal`);i++;const mk=blok(false);i++;out.push({jenis:'ulang',kali:kl,maka:mk})}
      else if(m=t.match(/^if\s+(.+)$/i))out.push(cab(m[1]));
      else if(m=t.match(/^teks\s+"(.*)"(?:\s+if\s+(.+))?$/i)){if(!top)throw new Error('teks "..." hanya boleh di luar if, ulang, dan selama. Pakai: teks "..." if syarat');teks.push({isi:m[1],jika:m[2]?kond(m[2]):undefined})}
      else out.push(...(parseEfek(t.replace(/^([^+\-*\/=]+?)\s*([+\-*\/])=\s*/,'$1 $2 '),known,ids)||[]));
    }
    if(!top)throw new Error('Ada { yang belum ditutup dengan }');return out};
  const cab=c=>{if(T[i]!=='{')throw new Error(`Setelah "if ${c}" harus ada {`);i++;
    const mk=blok(false);i++;const e={jika:kond(c),maka:mk.length?mk:undefined},n=T[i];
    if(n&&/^else(\s|$)/i.test(n)){i++;const mm=n.match(/^else\s+if\s+(.+)$/i);
      if(mm)e.lain=[cab(mm[1])];
      else if(/^else$/i.test(n)){if(T[i]!=='{')throw new Error('Setelah else harus ada {');i++;const l=blok(false);i++;if(l.length)e.lain=l}
      else throw new Error(`"${n}" tidak dimengerti. Contoh: else, atau else if syarat`)}
    return e};
  const out=blok(true);return{efek:out,teks};
}
function parseAwal(str){str=pre(str);
  const o={};
  (str||'').split(/[\n;]+/).map(x=>x.trim()).filter(Boolean).forEach(x=>{
    const m=x.match(/^([^=]+?)\s*=\s*(.+)$/);if(!m)throw new Error(`Nilai awal tidak dimengerti: "${x}". Contoh: emas = 0`);
    const v=m[2].trim(),n=m[1].trim();if(/^daftar(\s|$)/i.test(v)){const r=v.replace(/^daftar\s*/i,'');o[n]=r?r.split(',').map(parseItem):[]}else{const nv=parseNilai(v,new Set());o[n]=nv!==null&&typeof nv==='object'?Mesin.hitung(nv,Mesin.buatStatus({})):nv}
  });
  return o;
}
function bangun(s){
  const known=collectKnown(s),ids=titleIds(s),masalah=[];
  const ex=(fn,l)=>{try{return fn()}catch(e){masalah.push(l+': '+e.message)}};
  const scene={};
  s.passages.forEach(p=>{
    const l=`Bagian "${p.title}"`;
    scene[p.id]={jenis:'teks',judul:p.title,isi:preT(p.content||'').split(/\n\s*\n/).map(x=>x.trim()).filter(Boolean),
      saatMasuk:ex(()=>parseEfek(p.masuk,known,ids),l+' (saat dibuka)'),
      pilihan:p.choices.map(c=>{const ke=c.to&&s.passages.some(x=>x.id===c.to)?c.to:undefined,lb=`${l}, pilihan "${c.text}"`;
        return{label:c.text,ke,syarat:ex(()=>parseSyarat(c.syarat,known),lb),efek:ex(()=>parseEfek(c.efek,known,ids),lb)}}).filter(c=>c.ke||c.efek)};
  });
  const LIB=ex(()=>pustaka(s),'Skrip bersama')||{fn:{},js:''};s.passages.forEach(p=>{const kd=ex(()=>parseKode(komposisi(s,p).kode,known,ids,LIB.fn),`Bagian "${p.title}" (kode)`);if(!kd)return;const sc=scene[p.id];
    if(kd.teks.length)sc.isi=[...sc.isi,...kd.teks.map(t=>t.jika?t:t.isi)];
    if(kd.efek.length)sc.saatMasuk=[...(sc.saatMasuk||[]),...kd.efek]});
  const st=s.passages.find(p=>p.start);let awal={};
  ex(()=>{awal=parseAwal(s.awal)},'Nilai awal');
  return{cerita:{mulai:st?st.id:'',scene},awal,masalah};
}
function mulaiMain(s){
  const b=bangun(s);eng={hist:[],err:b.masalah};
  if(b.masalah.length)return;
  try{const inti=Mesin.buatInti({cerita:b.cerita,status:Mesin.buatStatus(b.awal)}).pasang(Mesin.teksDasar);const v=inti.validasi();if(v.galat.length){eng.err=v.galat;return}inti.mulai();eng.inti=inti}catch(e){eng.err=[e.message]}
}
