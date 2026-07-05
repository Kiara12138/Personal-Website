const svg    = document.getElementById('cable-svg');
const cable  = document.getElementById('cable');
const shadow = document.getElementById('cable-shadow');

function pageXY(el, ax, ay){
  const r = el.getBoundingClientRect();
  return [r.left + scrollX + r.width*ax, r.top + scrollY + r.height*ay];
}

function edgeSide(el, near){
  const r = el.getBoundingClientRect();
  const cx = r.left + scrollX + r.width * .5;
  return near[0] < cx ? 'left' : 'right';
}

function edgePoint(el, side){
  return pageXY(el, side === 'left' ? .035 : .965, .52);
}

function cablePath(from, to, index, kind){
  const [x0,y0] = from, [x1,y1] = to;
  if(kind === 'loop'){
    const dx = x1 - x0;
    const dy = y1 - y0;
    const loopR = Math.min(Math.max(Math.abs(dx)*.14, 50), 68);
    const loopCx = x0 + dx*.34;
    const loopCy = y0 + Math.max(dy*.30, 96);
    const approachY = loopCy + loopR*.50;

    return [
      `M ${x0} ${y0}`,
      `C ${x0+dx*.08} ${y0+58}, ${loopCx-loopR*1.82} ${approachY-10}, ${loopCx-loopR*.26} ${approachY}`,
      `C ${loopCx+loopR*.92} ${approachY+6}, ${loopCx+loopR*1.10} ${loopCy-loopR*.92}, ${loopCx+loopR*.04} ${loopCy-loopR}`,
      `C ${loopCx-loopR*1.10} ${loopCy-loopR*.88}, ${loopCx-loopR*1.12} ${loopCy+loopR*.76}, ${loopCx+loopR*.04} ${loopCy+loopR*.52}`,
      `C ${loopCx+dx*.24} ${loopCy+loopR*.78}, ${x1-dx*.24} ${y1+18}, ${x1} ${y1}`
    ].join(' ');
  }
  if(kind === 'wave'){
    const dx = x1 - x0;
    const dy = y1 - y0;
    const tuckY = y0 + Math.max(dy*.26, 74);
    const bellyY = y0 + Math.max(dy*.58, 168);
    const shelfY = y0 + Math.max(dy*.82, 234);
    const tuckX = x0 + dx*.18;
    const bellyX = x0 - dx*.24;
    const shelfX = x0 + dx*.42;

    return [
      `M ${x0} ${y0}`,
      `C ${x0-36} ${y0+38}, ${tuckX-92} ${tuckY-24}, ${tuckX-34} ${tuckY}`,
      `C ${bellyX+80} ${tuckY+24}, ${bellyX+92} ${bellyY-86}, ${bellyX+10} ${bellyY}`,
      `C ${bellyX-54} ${bellyY+62}, ${shelfX-32} ${shelfY-8}, ${shelfX-76} ${shelfY}`,
      `C ${shelfX-118} ${shelfY+16}, ${x1+54} ${y1-24}, ${x1} ${y1}`
    ].join(' ');
  }

  const dy = Math.max(Math.abs(y1-y0)*.42, 64);
  const dir = x1 >= x0 ? 1 : -1;
  const swing = Math.min(Math.max(Math.abs(x1-x0)*.45 + 90, 120), 260);
  const lift = index % 2 ? -18 : 18;
  return `M ${x0} ${y0} C ${x0+dir*swing} ${y0+dy+lift}, ${x1-dir*swing} ${y1-dy-lift}, ${x1} ${y1}`;
}

let segments = [];
let samples = [];
function buildCable(){
  const W = document.documentElement.scrollWidth;
  const H = document.documentElement.scrollHeight;
  svg.setAttribute('width', W);
  svg.setAttribute('height', H);
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);

  cable.replaceChildren();
  shadow.replaceChildren();
  segments = [];
  samples = [];

  const pedals = [...document.querySelectorAll('[data-node]')].filter(el=>!el.classList.contains('amp'));
  const ampInput = document.getElementById('amp-input');
  const figureTail = pageXY(document.getElementById('figure'), .977, .935);
  const ampJack = pageXY(ampInput, .5, .5);

  const runs = pedals.map((el, i)=>{
    const prev = i ? pageXY(pedals[i-1], .5, .52) : figureTail;
    const entrySide = edgeSide(el, prev);
    const exitSide = entrySide === 'left' ? 'right' : 'left';
    return { el, entry: edgePoint(el, entrySide), exit: edgePoint(el, exitSide) };
  });

  const links = [];
  if(runs.length){
    links.push({ from: figureTail, to: runs[0].entry });
    for(let i=0;i<runs.length-1;i++){
      if(i === 0 && innerWidth >= 900){
        links.push({
          from: pageXY(runs[i].el, .56, .995),
          to: edgePoint(runs[i+1].el, 'left'),
          kind: 'loop'
        });
      } else if(i === 1 && innerWidth >= 900){
        links.push({
          from: pageXY(runs[i].el, .58, .995),
          to: edgePoint(runs[i+1].el, 'right'),
          kind: 'wave'
        });
      } else {
        links.push({ from: runs[i].exit, to: runs[i+1].entry });
      }
    }
    links.push({ from: runs[runs.length-1].exit, to: ampJack });
  }

  let offset = 0;
  links.forEach(({ from, to, kind }, i)=>{
    const d = cablePath(from, to, i, kind);
    const base = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const live = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    [base, live].forEach(path=>{
      path.setAttribute('d', d);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke-linecap', 'round');
    });
    base.setAttribute('stroke', 'rgba(26,26,26,.14)');
    base.setAttribute('stroke-width', '7');
    live.setAttribute('stroke', 'var(--cable)');
    live.setAttribute('stroke-width', '5');
    shadow.appendChild(base);
    cable.appendChild(live);

    const len = live.getTotalLength();
    live.style.strokeDasharray = len;
    segments.push({ path: live, len, offset });
    for(let s=0; s<=len; s+=14){
      samples.push([offset+s, live.getPointAtLength(s).y]);
    }
    offset += len;
  });
  const total = segments.reduce((sum, seg)=>sum+seg.len, 0);
  if(segments.length) samples.push([total, segments[segments.length-1].path.getPointAtLength(segments[segments.length-1].len).y]);
  drawProgress();
}

function drawProgress(){
  if(!samples.length) return;
  const doc = document.documentElement;
  const total = segments.reduce((sum, seg)=>sum+seg.len, 0);
  let drawn;
  if(scrollY + innerHeight >= doc.scrollHeight - 4){
    drawn = total;                                    // bottom: fully plugged in
  } else {
    const targetY = scrollY + innerHeight*0.62;       // the line's tip rides at ~62% of the viewport
    let lo=0, hi=samples.length-1;
    while(lo<hi){ const mid=(lo+hi)>>1; (samples[mid][1] < targetY) ? lo=mid+1 : hi=mid; }
    drawn = samples[lo][0];
  }
  drawn = Math.max(drawn, 60);                        // always show a little tail at the start
  segments.forEach(seg=>{
    const visible = Math.min(Math.max(drawn - seg.offset, 0), seg.len);
    seg.path.style.strokeDashoffset = seg.len - visible;
    seg.path.style.filter = visible > 0 && visible < seg.len ? 'drop-shadow(0 0 5px rgba(192,57,43,.45))' : '';
  });
}

addEventListener('scroll', drawProgress, {passive:true});
addEventListener('resize', buildCable);
addEventListener('load', buildCable);
buildCable();
setTimeout(buildCable, 300); // once more after fonts settle


/* footswitches: hover (or tap) to light up an image in the preview window */
document.querySelectorAll('.pedal').forEach(pd=>{
  const shots = pd.querySelectorAll('.pimg');
  const sws   = pd.querySelectorAll('.fsw');
  function show(i){
    pd.classList.add('previewing');
    shots.forEach(s=>s.classList.toggle('show', s.dataset.i===String(i)));
    sws.forEach(b=>b.classList.toggle('active', b.dataset.i===String(i)));
  }
  function clear(){
    pd.classList.remove('previewing');
    shots.forEach(s=>s.classList.remove('show'));
    sws.forEach(b=>b.classList.remove('active'));
  }
  sws.forEach(b=>{
    b.addEventListener('mouseenter', ()=>show(b.dataset.i));
    b.addEventListener('mouseleave', clear);
    b.addEventListener('click', e=>{           // touch devices: tap toggles
      e.preventDefault();
      b.classList.contains('active') ? clear() : show(b.dataset.i);
    });
  });
});

/* reveal cards */
const io = new IntersectionObserver(es=>{
  es.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('show'); io.unobserve(e.target); } });
},{threshold:.15});
document.querySelectorAll('.rv').forEach(el=>io.observe(el));
