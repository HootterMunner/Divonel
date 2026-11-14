/* ═══ editor/tampilan.js — tampilan editor ═══
   State UI (tab, sel, more), render(), Pustaka, Editor, Peta, panel debug. */
let tab='lib',sel=null,hist=[],tmp=[],cur=null;
let more={};
const btns=(ok='Simpan')=>`<div class="row" style="justify-content:flex-end"><button data-a="dx">Batal</button><button class="pr" data-a="ds">${ok}</button></div>`;
function render(){
  $('nav').innerHTML=[['lib','Pustaka'],['ed','Editor'],['map','Peta'],['kd','Kode'],['play','Main']].map(([k,n])=>`<button data-a="tab" data-id="${k}" class="${tab===k?'on':''}">${n}</button>`).join('');
  const s=S();
  $('app').innerHTML=tab==='gd'?vGuide():tab==='lib'?vLib():!s?head('Belum ada cerita','Pilih atau buat cerita di Pustaka.')+empty('Tidak ada cerita dipilih','',`<button class="pr" data-a="tab" data-id="lib">Ke Pustaka</button>`):tab==='ed'?vEd(s):tab==='map'?vMap(s):tab==='kd'?vKode(s):vPlay(s)+vDbg();
  if(tab==='map')drawMap();
  if(tab==='play')pasangGambar();
}

function vLib(){
  const l=db.stories.map(s=>`<div class="card ${s.id===db.active?'on':''}"><div class="row sp"><div style="flex:1;cursor:pointer" data-a="open" data-id="${s.id}"><h3>${esc(s.title)}</h3><p>${esc(s.description)||'Tanpa deskripsi'}${s.author?' — '+esc(s.author):''}</p></div><div class="row"><button class="sm" data-a="exp" data-id="${s.id}">Ekspor</button><button class="sm del" data-a="dels" data-id="${s.id}">Hapus</button></div></div></div>`).join('');
  return head('Pustaka',db.stories.length+' cerita')+(l||empty('Belum ada cerita','Buat cerita pertama atau impor dari berkas JSON.'))+`<div class="row"><button class="pr" data-a="news">Buat cerita baru</button><button data-a="imp">Impor</button><button data-a="demo">Muat cerita contoh</button></div><p class="footer-license">© 2026 Helmy Hidayat · <a href="LICENSE" target="_blank" rel="noopener">MIT License</a></p>`;
}

function pCard(p){
  return `<div class="card"><div class="row sp"><h3>${esc(p.title)}</h3>${p.start?'<span class="badge">★ Mulai</span>':''}${(p.refs||[]).length?`<span class="cnt">${p.refs.length} skrip</span>`:''}</div><p style="white-space:pre-wrap;display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden">${p.content?esc(p.content.slice(0,140)):'<i>Bagian kosong</i>'}</p><div class="row" style="margin-top:8px"><button class="sm" data-a="ch" data-id="${p.id}">Pilihan (${p.choices.length})</button><button class="sm" data-a="ep" data-id="${p.id}">Ubah</button></div></div>`;
}
function vEd(s){
  const sec=(cid,t,menu)=>{const ps=s.passages.filter(p=>(p.chapter||null)===cid);return `<div class="sec"><div class="row"><b>${esc(t)}</b><span class="cnt">${ps.length}</span></div><div class="row">${menu}<button class="sm" data-a="np" data-id="${cid||''}">Tambah bagian</button></div></div>`+ps.slice(0,ps.length>30&&!more[cid||'-']?30:ps.length).map(pCard).join('')+(ps.length>30&&!more[cid||'-']?`<button class="sm" data-a="more" data-id="${cid||'-'}" style="margin:6px 0">Tampilkan ${ps.length-30} bagian lainnya</button>`:'')};
  let h=head('Editor',esc(s.title))+'<div class="row" style="margin:-8px 0 8px"><button class="sm" data-a="awal">Nilai awal cerita</button></div>';
  if(!s.passages.length&&!s.chapters.length)return h+empty('Belum ada bab atau bagian','Mulai dengan satu bab atau langsung tulis bagian pertama.',`<button class="pr" data-a="nc">Buat bab</button><button data-a="np" data-id="">Buat bagian tanpa bab</button>`);
  h+=sec(null,'Tanpa bab','');
  s.chapters.forEach(c=>h+=sec(c.id,c.title,`<button class="sm" data-a="chn" data-id="${c.id}">Sambung semua</button><button class="sm" data-a="rc" data-id="${c.id}">Ganti nama</button><button class="sm del" data-a="dc" data-id="${c.id}">Hapus bab</button>`));
  return h+`<div style="margin-top:20px"><button class="pr" data-a="nc">Tambah bab</button></div>`;
}

let view={x:20,y:20,k:1},drag=null,conn=false,pend=null,lastTap={};
function vMap(s){
  const h=head('Peta',esc(s.title));
  if(!s.passages.length)return h+empty('Peta kosong','Buat bagian cerita untuk melihatnya di sini.',`<button class="pr" data-a="mnp">Tambah bagian</button>`);
  return h+`<div class="row" id="mtb" style="margin-bottom:10px"></div><div class="mapw"><svg id="msv"><defs><pattern id="gr" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" style="fill:var(--line)"/></pattern><marker id="ma" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" markerUnits="userSpaceOnUse" orient="auto"><path d="M0 0L10 5L0 10z" fill="#A3A3A3"/></marker><marker id="mb" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="11" markerHeight="11" markerUnits="userSpaceOnUse" orient="auto"><path d="M0 0L10 5L0 10z" fill="#3B82F6"/></marker></defs><rect width="100%" height="100%" fill="url(#gr)"/><g id="mg"><g id="eg"></g><g id="ng"></g></g></svg></div><p class="sub" style="margin-top:8px">Geser latar untuk menggeser peta, seret kotak untuk memindahkan, ketuk dua kali untuk mengubah isinya.</p>`;
}
function clip(x,y,ux,uy,pad){const t=Math.min(70/(Math.abs(ux)||1e-9),35/(Math.abs(uy)||1e-9)),l=Math.hypot(ux,uy)||1;return[x+ux*t+ux/l*pad,y+uy*t+uy/l*pad]}
function edgesHTML(s){
  const by={};s.passages.forEach(p=>by[p.id]=p);let e='';
  s.passages.forEach(p=>p.choices.forEach(c=>{const b=by[c.to];if(!b)return;
    const ax=p.x+70,ay=p.y+35,bx=b.x+70,bY=b.y+35,dx=bx-ax,dy=bY-ay,l=Math.hypot(dx,dy);if(!l)return;
    const cx=(ax+bx)/2-dy/l*28,cy=(ay+bY)/2+dx/l*28;
    const [sx,sy]=clip(ax,ay,cx-ax,cy-ay,0),[ex,ey]=clip(bx,bY,cx-bx,cy-bY,5);
    const hl=sel&&(sel===p.id||sel===c.to);
    e+=`<path d="M${sx} ${sy} Q${cx} ${cy} ${ex} ${ey}" fill="none" stroke="${hl?'#3B82F6':'#A3A3A3'}" stroke-width="${hl?2.5:1.5}" marker-end="url(#${hl?'mb':'ma'})"/>`}));
  return e;
}
const applyView=()=>$('mg')&&$('mg').setAttribute('transform',`translate(${view.x} ${view.y}) scale(${view.k})`);
function drawMap(){
  const s=S();if(!s||tab!=='map'||!$('mg'))return;
  s.passages.forEach((p,i)=>{if(p.x==null){p.x=30+(i%3)*200;p.y=30+Math.floor(i/3)*120}});
  let n='';
  s.passages.forEach(p=>{const inn=s.passages.reduce((k,x)=>k+x.choices.filter(c=>c.to===p.id).length,0),t=p.title.length>17?p.title.slice(0,16)+'…':p.title;
    n+=`<g class="nd${p.start?' st':''}${sel===p.id?' on':''}" data-id="${p.id}" transform="translate(${p.x} ${p.y})"><rect width="140" height="70" rx="12"/><text x="12" y="30" class="t1">${esc(t)}</text><text x="12" y="52" class="t2">${p.choices.length} keluar · ${inn} masuk</text>${p.start?'<text x="118" y="18" class="stt">★</text>':''}</g>`});
  $('eg').innerHTML=edgesHTML(s);$('ng').innerHTML=n;applyView();
  $('mtb').innerHTML=`<button class="sm pr" data-a="mnp">+ Bagian</button><button class="sm" data-a="mz" data-id="-">−</button><button class="sm" data-a="mz" data-id="+">+</button><button class="sm" data-a="mz" data-id="0">100%</button><button class="sm" data-a="mlay">Rapikan</button>`+(sel&&P(s,sel)?`<button class="sm ${conn?'pr':''}" data-a="mconn">Sambungkan</button><button class="sm" data-a="ep" data-id="${sel}">Ubah</button><button class="sm del" data-a="dp" data-id="${sel}">Hapus</button>`:'')+(conn?'<span class="sub" style="margin:0">Ketuk bagian tujuan.</span>':'');
}
function zoom(f,cx,cy){const k=Math.min(2.5,Math.max(.3,view.k*f));view.x=cx-(cx-view.x)*k/view.k;view.y=cy-(cy-view.y)*k/view.k;view.k=k;applyView()}
$('app').addEventListener('pointerdown',e=>{
  const sv=e.target.closest('#msv');if(!sv)return;
  const g=e.target.closest('.nd'),p=g&&P(S(),g.dataset.id);
  drag={sx:e.clientX,sy:e.clientY,moved:false,id:p?p.id:null,vx:view.x,vy:view.y,px:p?.x,py:p?.y};
  try{sv.setPointerCapture(e.pointerId)}catch(_){}
});
$('app').addEventListener('pointermove',e=>{
  if(!drag)return;const dx=e.clientX-drag.sx,dy=e.clientY-drag.sy;
  if(!drag.moved&&Math.hypot(dx,dy)<5)return;drag.moved=true;
  if(drag.id){const s=S(),p=P(s,drag.id);p.x=Math.round(drag.px+dx/view.k);p.y=Math.round(drag.py+dy/view.k);
    document.querySelector('.nd[data-id="'+p.id+'"]').setAttribute('transform',`translate(${p.x} ${p.y})`);$('eg').innerHTML=edgesHTML(s)}
  else{view.x=drag.vx+dx;view.y=drag.vy+dy;applyView()}
});
$('app').addEventListener('pointerup',()=>{
  if(!drag)return;const d=drag;drag=null;const s=S();
  if(d.moved){if(d.id){sel=d.id;save();drawMap()}return}
  if(d.id){
    if(conn&&sel&&sel!==d.id){const a=P(s,sel),b=P(s,d.id);if(!a.choices.some(c=>c.to===b.id))a.choices.push({id:uid(),text:b.title,to:b.id});conn=false;save()}
    else{const now=Date.now();if(lastTap.id===d.id&&now-lastTap.t<350){lastTap={};sel=d.id;pDlg(d.id);return}lastTap={id:d.id,t:now};sel=d.id}
  }else{sel=null;conn=false}
  drawMap();
});
$('app').addEventListener('wheel',e=>{const sv=e.target.closest('#msv');if(!sv)return;e.preventDefault();const r=sv.getBoundingClientRect();zoom(e.deltaY<0?1.1:.9,e.clientX-r.left,e.clientY-r.top)},{passive:false});

function vDbg(){
  if(!eng||!eng.inti||eng.err.length||eng.banner)return '';
  let pot;try{pot=JSON.stringify(eng.inti.status.potret(),null,1)}catch(e){pot='(state tidak bisa dibaca: '+e.message+')'}
  const info=eng.autoKB?`Autosave terakhir: ${(eng.autoKB/1024).toFixed(1)} KB (batas ${AUTO_MAX/1024} KB)`:'Autosave belum ditulis';
  return `<details class="card" id="dbg"${eng.dbg?' open':''}><summary data-a="dbg">Debug: state permainan</summary>${eng.autoWarn?`<p class="err">${esc(eng.autoWarn)}</p>`:''}<p class="sub" style="margin:0 0 6px">${info}</p><pre class="kd" style="max-height:260px;overflow:auto;font-size:11px">${esc(pot)}</pre></details>`;
}
