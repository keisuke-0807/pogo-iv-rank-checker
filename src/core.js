// ---- appraisal bar detection (pure functions on RGBA data) ----
function cls(r,g,b){
  const mx=Math.max(r,g,b),mn=Math.min(r,g,b);
  if(r>195&&g>115&&g<205&&b<140&&r-b>90)return 1;          // orange (partial)
  if(r>185&&g>70&&g<165&&b>70&&b<170&&r-g>45&&r-b>40)return 2; // red/pink (15)
  if(mx-mn<14&&mx>=198&&mx<=240)return 3;                     // gray (empty)
  if(mn>238)return 4;                                         // white gap
  return 0;
}
function scanRow(d,W,y){
  const o=y*W*4;let best=null;let x=0;
  const gapMax=Math.max(3,Math.round(W*0.012));
  while(x<W){
    let c=cls(d[o+x*4],d[o+x*4+1],d[o+x*4+2]);
    if(c<1||c>3){x++;continue}
    let segs=[],s=x,e=x,gap=0,cnt=0,fillEnd=-1,red=0,colored=0;
    let cur=x;
    while(cur<W){
      c=cls(d[o+cur*4],d[o+cur*4+1],d[o+cur*4+2]);
      if(c>=1&&c<=3){
        if(gap>0){segs.push([s,e]);s=cur}
        e=cur;gap=0;colored++;
        if(c===1||c===2){fillEnd=cur;if(c===2)red++;}
      }else if(gap<gapMax){gap++}
      else break;
      cur++;
    }
    segs.push([s,e]);
    const len=e-segs[0][0]+1;
    if(!best||len>best.len)best={x0:segs[0][0],x1:e,len,segs,fillEnd,red,colored};
    x=cur+1;
  }
  return best;
}
function valueOf(row){
  if(row.fillEnd<0)return 0;
  const L=row.x1-row.x0+1;
  if(row.red>L*0.5)return 15;
  // gaps between pieces; keep the two closest to 1/3 and 2/3 of the bar
  const gaps=[];for(let i=1;i<row.segs.length;i++)gaps.push([row.segs[i-1][1]+1,row.segs[i][0]-1]);
  const pick=p=>{let best=null,bd=1e9;for(const g of gaps){const dd=Math.abs((g[0]+g[1])/2-(row.x0+L*p));if(dd<bd){bd=dd;best=g}}return bd<L*0.06?best:null};
  let g1=pick(1/3),g2=pick(2/3);
  if(!g1||!g2){const sl=L/3;g1=[Math.round(row.x0+sl)-1,Math.round(row.x0+sl)];g2=[Math.round(row.x0+2*sl)-1,Math.round(row.x0+2*sl)];}
  const segs=[[row.x0,g1[0]-1],[g1[1]+1,g2[0]-1],[g2[1]+1,row.x1]];
  const fe=row.fillEnd;
  for(let k=0;k<3;k++){const[s,e]=segs[k];
    if(fe<s)return 5*k;
    if(fe<=e){const f=(fe+1-s)/(e+1-s);return 5*k+Math.round(f*5);}
  }
  return 15;
}
function detectBars(d,W,H){
  const rows=[];
  for(let y=Math.floor(H*0.4);y<Math.floor(H*0.97);y++){
    const r=scanRow(d,W,y);
    if(r&&r.len>=W*0.28&&r.len<=W*0.8&&r.segs.length>=1&&r.segs.length<=4)rows.push(Object.assign(r,{y}));
  }
  // group into bands
  const bands=[];
  for(const r of rows){
    const b=bands[bands.length-1];
    if(b&&r.y-b.y1<=1&&Math.abs(r.x0-b.x0)<=3&&Math.abs(r.x1-b.x1)<=3){b.y1=r.y;b.rows.push(r)}
    else bands.push({x0:r.x0,x1:r.x1,y0:r.y,y1:r.y,rows:[r]});
  }
  const good=bands.filter(b=>b.rows.length>=Math.max(3,H*0.004)&&b.rows.length<=H*0.02);
  for(let i=0;i+2<good.length;i++){
    const a=good[i],b=good[i+1],c=good[i+2];
    if(Math.abs(a.x0-b.x0)>4||Math.abs(a.x0-c.x0)>4||Math.abs(a.x1-b.x1)>4||Math.abs(a.x1-c.x1)>4)continue;
    const g1=b.y0-a.y0,g2=c.y0-b.y0;
    if(g1<H*0.02||Math.abs(g1-g2)>g1*0.2)continue;
    const val=band=>{const vs=band.rows.slice(1,-1).map(valueOf);if(!vs.length)return valueOf(band.rows[0]);vs.sort((p,q)=>p-q);return vs[vs.length>>1]};
    return {iv:[val(a),val(b),val(c)],top:a.y0,x0:a.x0,x1:a.x1};
  }
  return null;
}
// signature of the upper screen (pokemon + name) for telling individuals apart
function signature(d,W,H,top){
  const n=12,sig=[];const y1=Math.max(8,Math.floor(top*0.85));
  for(let j=0;j<n;j++)for(let i=0;i<n;i++){
    const x=Math.floor((i+.5)*W/n),y=Math.floor((j+.5)*y1/n),o=(y*W+x)*4;
    sig.push((d[o]+d[o+1]+d[o+2])/3);
  }
  return sig;
}
function sigDist(a,b){let s=0;for(let i=0;i<a.length;i++)s+=Math.abs(a[i]-b[i]);return s/a.length}
// samples: [{t, det:{iv,top}|null, sig}] -> individuals
function groupSamples(samples){
  // 1) contiguous runs of the same reading (a missed frame does not break a run)
  const runs=[];let cur=null,miss=0;
  for(const s of samples){
    if(!s.det){miss++;if(miss>2)cur=null;continue}
    miss=0;const key=s.det.iv.join('/');
    if(!cur||cur.key!==key){cur={key,iv:s.det.iv,items:[]};runs.push(cur)}
    cur.items.push(s);
  }
  // 2) short runs are bar animations / swipes: drop them
  let out=runs.filter(r=>r.items.length>=3).map(r=>{const mid=r.items[r.items.length>>1];
    return {iv:r.iv,key:r.key,t:mid.t,sig:mid.sig,top:mid.det.top,n:r.items.length,t0:r.items[0].t,t1:r.items[r.items.length-1].t}});
  // 3) same reading again right after a blip and same picture -> same individual
  const m=[];for(const r of out){const p=m[m.length-1];
    if(p&&p.key===r.key&&r.t0-p.t1<1.5&&sigDist(p.sig,r.sig)<14){p.n+=r.n;p.t1=r.t1}else m.push(r)}
  return m;
}
if(typeof module!=='undefined')module.exports={detectBars,signature,sigDist,groupSamples,cls};
if(typeof module!=='undefined')module.exports.debug=function(d,W,H){const out=[];for(let y=Math.floor(H*0.4);y<Math.floor(H*0.97);y++){const r=scanRow(d,W,y);if(r&&r.len>=W*0.28&&r.len<=W*0.8)out.push([y,r.x0,r.x1,r.segs.map(s=>s.join('-')).join(','),r.fillEnd,r.red,valueOf(r)].join(' '))}return out};
