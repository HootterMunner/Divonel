/* ═══ editor/peta-interaksi.js — Peta: drag, wheel, pinch, popstate — pecahan tampilan.js ═══ */
function zoom(f,cx,cy){const k=Math.min(2.5,Math.max(.3,view.k*f));view.x=cx-(cx-view.x)*k/view.k;view.y=cy-(cy-view.y)*k/view.k;view.k=k;applyView()}
$('app').addEventListener('pointerdown',e=>{
  const sv=e.target.closest('#msv');if(!sv)return;
  /* Langkah 3e: mode seleksi — drag di node = pan, drag di kosong = kotak seleksi */
  if(selectMode){
    const r=sv.getBoundingClientRect();
    drag={sx:e.clientX,sy:e.clientY,moved:false,mode:'select',
          hitStart:e.target.closest('.nd'),
          vx:view.x,vy:view.y,
          rectX0:e.clientX-r.left,rectY0:e.clientY-r.top};
    try{sv.setPointerCapture(e.pointerId)}catch(_){}
    return;
  }
  const g=e.target.closest('.nd');
  let jenis=null,obj=null;
  if(g){
    const s=S();
    if(g.classList.contains('folder')){jenis='folder';obj=s.chapters.find(c=>c.id===g.dataset.id)}
    else{jenis='node';obj=s.passages.find(p=>p.id===g.dataset.id)}
  }
  drag={sx:e.clientX,sy:e.clientY,moved:false,id:obj?obj.id:null,jenis,obj,vx:view.x,vy:view.y,px:obj?.x,py:obj?.y};
  try{sv.setPointerCapture(e.pointerId)}catch(_){}
});
$('app').addEventListener('pointermove',e=>{
  if(pinch||!drag)return;const dx=e.clientX-drag.sx,dy=e.clientY-drag.sy;
  if(!drag.moved&&Math.hypot(dx,dy)<5)return;drag.moved=true;
  if(drag.mode==='select'){
    if(drag.hitStart){
      view.x=drag.vx+dx;view.y=drag.vy+dy;applyView();
    }else{
      const sv=document.getElementById('msv');if(!sv)return;
      const r=sv.getBoundingClientRect();
      const x=e.clientX-r.left,y=e.clientY-r.top;
      const rx=Math.min(drag.rectX0,x),ry=Math.min(drag.rectY0,y);
      const rw=Math.abs(x-drag.rectX0),rh=Math.abs(y-drag.rectY0);
      drag.rectX=rx;drag.rectY=ry;drag.rectW=rw;drag.rectH=rh;
      const srect=document.getElementById('srect');
      if(srect){srect.setAttribute('x',rx);srect.setAttribute('y',ry);srect.setAttribute('width',rw);srect.setAttribute('height',rh);srect.setAttribute('visibility','visible')}
    }
    return;
  }
  if(drag.id&&drag.obj){
    drag.obj.x=Math.round(drag.px+dx/view.k);
    drag.obj.y=Math.round(drag.py+dy/view.k);
    const g=document.querySelector(`.nd[data-id="${drag.obj.id}"]`);
    if(g)g.setAttribute('transform',`translate(${drag.obj.x} ${drag.obj.y})`);
    $('eg').innerHTML=edgesHTML(S(),mapPath);
  }
  else{view.x=drag.vx+dx;view.y=drag.vy+dy;applyView()}
});
$('app').addEventListener('pointerup',e=>{
  if(!drag)return;const d=drag;drag=null;const s=S();
  if(d.mode==='select'){
    if(!d.moved){
      if(d.hitStart){
        const id=d.hitStart.dataset.id;
        if(selectIds.has(id))selectIds.delete(id);else selectIds.add(id);
      }else selectIds.clear();
    }else if(!d.hitStart && d.rectW!=null){
      const rx=d.rectX,ry=d.rectY,rw=d.rectW,rh=d.rectH;
      const hit=(ox,oy,ow,oh)=>!(ox+ow<rx||ox>rx+rw||oy+oh<ry||oy>ry+rh);
      const {folders,nodes}=containersAt(s,mapPath);
      if(!e.shiftKey)selectIds.clear();
      folders.forEach(c=>{
        if(c.x==null||c.y==null)return;
        const ox=c.x*view.k+view.x,oy=c.y*view.k+view.y;
        if(hit(ox,oy,160*view.k,88*view.k))selectIds.add(c.id);
      });
      nodes.forEach(p=>{
        if(p.x==null||p.y==null)return;
        const ox=p.x*view.k+view.x,oy=p.y*view.k+view.y;
        if(hit(ox,oy,140*view.k,70*view.k))selectIds.add(p.id);
      });
    }
    const srect=document.getElementById('srect');
    if(srect){srect.setAttribute('visibility','hidden');srect.setAttribute('width','0');srect.setAttribute('height','0')}
    drawMap();
    return;
  }
  if(d.moved){
    if(d.id){if(d.jenis==='folder'){save();drawMap()}else{sel=d.id;save();drawMap()}}
    return;
  }
  if(d.id){
    if(d.jenis==='folder'){masukFolder(s,d.id);render();return}
    if(conn&&sel&&sel!==d.id){const a=P(s,sel),b=P(s,d.id);if(a&&b&&!a.choices.some(c=>c.to===b.id))a.choices.push({id:uid(),text:b.title,to:b.id});conn=false;save()}
    else{const now=Date.now();if(lastTap.id===d.id&&now-lastTap.t<350){lastTap={};sel=d.id;pDlg(d.id);return}lastTap={id:d.id,t:now};sel=d.id}
  }else{sel=null;conn=false}
  drawMap();
});
$('app').addEventListener('wheel',e=>{const sv=e.target.closest('#msv');if(!sv)return;e.preventDefault();const r=sv.getBoundingClientRect();zoom(e.deltaY<0?1.1:.9,e.clientX-r.left,e.clientY-r.top)},{passive:false});
/* ╔══════════════════════════════════════════════════════════╗
   ║ AWAL — Pinch zoom dua jari (Langkah polish peta)         ║
   ║ Letak: setelah handler wheel. Khusus sentuh.             ║
   ╚══════════════════════════════════════════════════════════╝ */
const tJarak=(a,b)=>Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);
document.addEventListener('touchstart',e=>{
  if(e.touches.length!==2||!e.target.closest('#msv'))return;
  const [a,b]=e.touches;
  pinch={d0:tJarak(a,b),k0:view.k,midX:(a.clientX+b.clientX)/2,midY:(a.clientY+b.clientY)/2};
  drag=null;
},{passive:true});
document.addEventListener('touchmove',e=>{
  if(!pinch||e.touches.length!==2)return;
  const sv=document.getElementById('msv');if(!sv)return;
  e.preventDefault();
  const [a,b]=e.touches,d=tJarak(a,b);
  if(!pinch.d0)return;
  const r=sv.getBoundingClientRect();
  const px=pinch.midX-r.left,py=pinch.midY-r.top;
  const kNew=Math.min(2.5,Math.max(.3,pinch.k0*(d/pinch.d0)));
  const s=kNew/view.k;
  view.x=px-(px-view.x)*s;
  view.y=py-(py-view.y)*s;
  view.k=kNew;
  applyView();
},{passive:false});
document.addEventListener('touchend',e=>{if(e.touches.length<2)pinch=null},{passive:true});
document.addEventListener('touchcancel',()=>{pinch=null},{passive:true});
/* ╔══════════════════════════════════════════════════════════╗
   ║ popstate — tombol Back browser untuk navigasi folder (3d)║
   ║ Setiap masukFolder pushState; Back = naik satu level.    ║
   ╚══════════════════════════════════════════════════════════╝ */
window.addEventListener('popstate', e => {
  const target = (e.state && 'mapPath' in e.state) ? e.state.mapPath : null;
  if (target === mapPath) return;
  const s = S();
  if (!s) return;
  viewPerLevel.set(mapPath || 'root', {...view});
  mapPath = target;
  view = viewPerLevel.get(mapPath || 'root') || {x:20, y:20, k:1};
  sel = null;
  if (docView === 'map') render();
});
/* ╚══════════════════════════════════════════════════════════╝ */
