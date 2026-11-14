// ---------- read the Pokémon name on screen (whole-word template matching) ----------
const NR={GH:24,GW:96};
function findNameBox(d,W,H,barTop){
  // green HP line under the name: (92,224,168)
  let yG=-1;
  for(let y=Math.floor(barTop*0.35);y<barTop;y++){
    let n=0;for(let x=Math.floor(W*0.1);x<W*0.9;x+=2){const o=(y*W+x)*4,r=d[o],g=d[o+1],b=d[o+2];if(g>180&&g-r>60&&g-b>25)n++}
    if(n>W*0.4*0.5){yG=y;break}
  }
  if(yG<0)return null;
  const y0=Math.max(0,Math.floor(yG-W*0.17)),y1=Math.floor(yG-W*0.015),x0=Math.floor(W*0.08),x1=Math.floor(W*0.86);
  let bx0=1e9,bx1=-1,by0=1e9,by1=-1;
  for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){const o=(y*W+x)*4;const r=d[o],g=d[o+1],b=d[o+2];
    if(r+g+b<420&&Math.max(r,g,b)-Math.min(r,g,b)<60){if(x<bx0)bx0=x;if(x>bx1)bx1=x;if(y<by0)by0=y;if(y>by1)by1=y}}
  if(bx1<0||by1-by0<W*0.02)return null;
  return {x:bx0,y:by0,w:bx1-bx0+1,h:by1-by0+1,yG};
}
// grayscale ink map (0..1) of a box, resampled to GH x GW with area averaging
function inkGrid(get,bw,bh){
  const g=new Float32Array(NR.GH*NR.GW);
  for(let j=0;j<NR.GH;j++)for(let i=0;i<NR.GW;i++){
    const sx0=i*bw/NR.GW,sx1=(i+1)*bw/NR.GW,sy0=j*bh/NR.GH,sy1=(j+1)*bh/NR.GH;let s=0,n=0;
    for(let y=Math.floor(sy0);y<Math.max(Math.ceil(sy1),Math.floor(sy0)+1);y++)for(let x=Math.floor(sx0);x<Math.max(Math.ceil(sx1),Math.floor(sx0)+1);x++){s+=get(x,y);n++}
    g[j*NR.GW+i]=s/n;
  }
  return blurNorm(g);
}
function blurNorm(g){
  const W=NR.GW,H=NR.GH,o=new Float32Array(g.length);
  for(let j=0;j<H;j++)for(let i=0;i<W;i++){let s=0,n=0;for(let dj=-1;dj<=1;dj++)for(let di=-1;di<=1;di++){const y=j+dj,x=i+di;if(x<0||y<0||x>=W||y>=H)continue;const w=(di||dj)?0.5:1;s+=g[y*W+x]*w;n+=w}o[j*W+i]=s/n}
  let m=0;for(const v of o)m+=v;m/=o.length;let sd=0;for(let k=0;k<o.length;k++){o[k]-=m;sd+=o[k]*o[k]}sd=Math.sqrt(sd)||1;for(let k=0;k<o.length;k++)o[k]/=sd;
  return o;
}
let NAME_TPL=null;
function buildTemplates(){
  if(NAME_TPL)return NAME_TPL;
  const c=document.createElement('canvas');c.width=420;c.height=80;const x=c.getContext('2d',{willReadFrequently:true});
  x.font='400 48px "Hiragino Sans","Hiragino Kaku Gothic ProN","Noto Sans CJK JP","Noto Sans JP","Yu Gothic","Meiryo",sans-serif';x.textBaseline='middle';
  const seen=new Set();NAME_TPL=[];
  for(const s of SPLIST){const nm=JA_NAMES[s.dex-1];if(!nm||seen.has(nm))continue;seen.add(nm);
    x.fillStyle='#fff';x.fillRect(0,0,420,80);x.fillStyle='#000';x.fillText(nm,6,42);
    const d=x.getImageData(0,0,420,80).data;let bx0=1e9,bx1=-1,by0=1e9,by1=-1;
    for(let y=0;y<80;y++)for(let i=0;i<420;i++){if(d[(y*420+i)*4]<128){if(i<bx0)bx0=i;if(i>bx1)bx1=i;if(y<by0)by0=y;if(y>by1)by1=y}}
    if(bx1<0)continue;const bw=bx1-bx0+1,bh=by1-by0+1;
    const grid=inkGrid((i,j)=>1-d[((by0+j)*420+bx0+i)*4]/255,bw,bh);
    NAME_TPL.push({name:nm,dex:s.dex,ar:bw/bh,grid});
  }
  return NAME_TPL;
}
function readName(d,W,H,barTop){
  const box=findNameBox(d,W,H,barTop);if(!box)return null;
  const get=(i,j)=>{const o=((box.y+j)*W+box.x+i)*4;const l=(d[o]+d[o+1]+d[o+2])/3;return Math.max(0,Math.min(1,(235-l)/150))};
  const g=inkGrid(get,box.w,box.h),ar=box.w/box.h;
  const res=[];
  for(const t of buildTemplates()){
    const q=Math.abs(Math.log(t.ar/ar));if(q>0.3)continue;
    let s=0;for(let k=0;k<g.length;k++)s+=g[k]*t.grid[k];
    res.push({name:t.name,dex:t.dex,score:s-q*0.5});
  }
  res.sort((a,b)=>b.score-a.score);
  return {best:res[0]||null,second:res[1]||null,box};
}
