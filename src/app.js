// ---------- species ----------
const FORM_JA={Alolan:'アローラ',Galarian:'ガラル',Hisuian:'ヒスイ',Paldean:'パルデア',Origin:'オリジン',Altered:'アナザー',Attack:'アタック',Defense:'ディフェンス',Speed:'スピード',Incarnate:'けしん',Therian:'れいじゅう',Female:'メス',Male:'オス',Armored:'アーマード',Crowned:'けんのおう',Hero:'れきせんのゆうしゃ',Aqua:'ウォーター',Blaze:'ブレイズ',Combat:'コンバット',Plant:'くさき',Sandy:'すなち',Trash:'ゴミ',Fan:'スピン',Frost:'フロスト',Heat:'ヒート',Mow:'カット',Wash:'ウォッシュ',Land:'ランド',Sky:'スカイ',Black:'ブラック',Ordinary:'いつも',Aria:'ボイス',Shield:'シールド',Average:'ふつう',Large:'おおきい',Small:'ちいさい',Super:'ギガ',Unbound:'ときはなたれし',Baile:'めらめら',Dusk:'たそがれ',Midday:'まひる',Midnight:'まよなか',Core:'コア','Dawn Wings':'あかつきのつばさ','Rapid Strike':'れんげき','Full Belly':'まんぷく',Curly:'そったすがた',Complete:'パーフェクト'};
const SP={},SPLIST=[];
for(const line of GM.split('\n')){
  const [dex,id,form,a,d,h,ev]=line.split('|');
  const base=JA_NAMES[+dex-1]||id;
  const name=form?base+'('+(FORM_JA[form]||form)+')':base;
  const s={dex:+dex,id,name,st:[+a,+d,+h],evos:ev?ev.split('+'):[]};
  SP[id]=s;SPLIST.push(s);
}
for(const s of SPLIST)s.evos=s.evos.filter(e=>SP[e]);
function baseIdOf(dex){const c=SPLIST.filter(s=>s.dex===dex);return (c.find(s=>!/_(alolan|galarian|hisuian|paldean)/.test(s.id))||c[0]).id}
function family(id){const out=[],seen=new Set();(function walk(x){if(seen.has(x)||!SP[x])return;seen.add(x);out.push(SP[x]);SP[x].evos.forEach(walk)})(id);return out}
const kana=s=>s.replace(/[ぁ-ゖ]/g,c=>String.fromCharCode(c.charCodeAt(0)+0x60));
function searchSpecies(q){q=kana(q.trim()).toLowerCase();if(!q)return[];
  const a=[],b=[];for(const s of SPLIST){const n=s.name.toLowerCase();if(n.startsWith(q))a.push(s);else if(n.includes(q)||s.id.includes(q))b.push(s)}
  return a.concat(b).slice(0,8)}

// ---------- ranking ----------
const LEAGUES=[{key:'gl',name:'スーパー',cap:1500},{key:'ul',name:'ハイパー',cap:2500},{key:'ml',name:'マスター',cap:Infinity}];
function maxIdxFor(lv){return LV.indexOf(lv)}
function bestAt(st,iv,cap,maxIdx){
  if(cpOf(st,iv,CPM[0])>cap)return null;
  let lo=0,hi=maxIdx;
  while(lo<hi){const m=(lo+hi+1)>>1;if(cpOf(st,iv,CPM[m])<=cap)lo=m;else hi=m-1}
  const c=CPM[lo];
  const sp=(st[0]+iv[0])*c*(st[1]+iv[1])*c*Math.floor((st[2]+iv[2])*c);
  return {lv:LV[lo],cp:cpOf(st,iv,c),sp};
}
const TCACHE={};
function table(s,lg,maxIdx){
  const k=s.id+'|'+lg.key+'|'+maxIdx;if(TCACHE[k])return TCACHE[k];
  const arr=[];for(let a=0;a<16;a++)for(let d=0;d<16;d++)for(let h=0;h<16;h++){const r=bestAt(s.st,[a,d,h],lg.cap,maxIdx);if(r)arr.push(r.sp)}
  arr.sort((x,y)=>y-x);return TCACHE[k]={sorted:arr,top:arr[0]};
}
function rankOf(s,iv,lg,maxIdx){
  const r=bestAt(s.st,iv,lg.cap,maxIdx);if(!r)return null;
  const t=table(s,lg,maxIdx);
  let lo=0,hi=t.sorted.length;while(lo<hi){const m=(lo+hi)>>1;if(t.sorted[m]>r.sp+1e-9)lo=m+1;else hi=m}
  return {rank:lo+1,pct:r.sp/t.top*100,cp:r.cp,lv:r.lv};
}

// ---------- state ----------
const state={maxLv:50,items:[],next:1};
try{const v=localStorage.getItem('ivr_maxlv');if(v)state.maxLv=+v}catch(e){}
const $=s=>document.querySelector(s);
function esc(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
function rankClass(r){return r<=10?'r1':r<=100?'r2':r<=500?'r3':'r4'}

function renderItem(it){
  const ivSel=(i,label)=>`<label class="iv"><span>${label}</span><select data-iv="${i}">${Array.from({length:16},(_,v)=>`<option${v===it.iv[i]?' selected':''}>${v}</option>`).join('')}</select></label>`;
  let body='';
  if(it.species){
    const maxIdx=maxIdxFor(state.maxLv);
    const rows=family(it.species).map(s=>{
      const cells=LEAGUES.map(lg=>{const r=rankOf(s,it.iv,lg,maxIdx);
        if(!r)return `<td class="na">CP超過</td>`;
        return `<td><b class="${rankClass(r.rank)}">${r.rank}位</b><small>${r.pct.toFixed(1)}%</small><small>CP${r.cp} Lv${r.lv}</small></td>`}).join('');
      return `<tr><th>${esc(s.name)}</th>${cells}</tr>`}).join('');
    body=`<table class="rk"><thead><tr><th></th>${LEAGUES.map(l=>`<th>${l.name}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>`;
  }else body=`<p class="hint">ポケモンを選ぶと順位が出ます</p>`;
  return `<div class="card" data-id="${it.id}">
    <div class="top">
      ${it.thumb?`<img src="${it.thumb}" alt="">`:`<div class="noimg">手入力</div>`}
      <div class="meta">
        <div class="ivs">${ivSel(0,'攻撃')}${ivSel(1,'防御')}${ivSel(2,'HP')}</div>
        <div class="sp"><div class="splabel">${it.species?(it.auto?'名前を自動判定（違えば入力し直し）':'ポケモン'):'↓ ポケモン名を入力して候補をタップ'}</div><input type="text" class="${it.species?'':'need'}" placeholder="例: ぽにーた" value="${it.species?esc(SP[it.species].name):''}" autocomplete="off"><div class="sug"></div>${formsOf(it)}</div>
        ${it.t!=null?`<div class="tm">録画 ${it.t.toFixed(1)}秒</div>`:''}
      </div>
      <button class="del" title="削除">×</button>
    </div>${body}</div>`;
}
function formsOf(it){if(!it.species)return '';const dex=SP[it.species].dex;const fs=SPLIST.filter(x=>x.dex===dex);if(fs.length<2)return '';
  return `<div class="forms">${fs.map(f=>`<button data-sp="${f.id}" class="${f.id===it.species?'on':''}">${esc(f.name.replace(/^[^(]*/,'')||'通常')}</button>`).join('')}</div>`}
function render(){
  $('#list').innerHTML=state.items.map(renderItem).join('');
  $('#empty').style.display=state.items.length?'none':'';
  document.querySelectorAll('.lvbtn').forEach(b=>b.classList.toggle('on',+b.dataset.lv===state.maxLv));
}
function itemOf(el){const c=el.closest('.card');return c&&state.items.find(x=>x.id===+c.dataset.id)}
function rerenderCard(it){const c=document.querySelector(`.card[data-id="${it.id}"]`);if(c)c.outerHTML=renderItem(it)}

document.addEventListener('change',e=>{
  if(e.target.dataset.iv!=null){const it=itemOf(e.target);it.iv[+e.target.dataset.iv]=+e.target.value;rerenderCard(it)}
});
document.addEventListener('input',e=>{
  if(!e.target.closest('.sp'))return;
  const box=e.target.parentNode.querySelector('.sug');
  const res=searchSpecies(e.target.value);
  box.innerHTML=res.map(s=>`<button data-sp="${s.id}">${esc(s.name)}</button>`).join('');
});
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-sp]');
  if(b){const it=itemOf(b);it.species=b.dataset.sp;it.auto=false;rerenderCard(it);return}
  if(e.target.closest('.del')){const it=itemOf(e.target);state.items=state.items.filter(x=>x!==it);render();return}
  const lv=e.target.closest('.lvbtn');
  if(lv){state.maxLv=+lv.dataset.lv;try{localStorage.setItem('ivr_maxlv',state.maxLv)}catch(err){}render();return}
});
document.addEventListener('focusin',e=>{if(e.target.closest('.sp')&&e.target.tagName==='INPUT')e.target.select()});
$('#add').onclick=()=>{state.items.push({id:state.next++,iv:[15,15,15],species:null,thumb:null,t:null});render();window.scrollTo(0,document.body.scrollHeight)};
$('#clear').onclick=()=>{state.items=[];render()};

// ---------- video analysis ----------
function waitEv(el,ev,ms){return new Promise(res=>{let done=false;const f=()=>{if(done)return;done=true;el.removeEventListener(ev,f);res()};el.addEventListener(ev,f);if(ms)setTimeout(f,ms)})}
async function seek(v,t){v.currentTime=t;await waitEv(v,'seeked',2000);if(v.requestVideoFrameCallback)await new Promise(r=>{let ok=false;v.requestVideoFrameCallback(()=>{ok=true;r()});setTimeout(()=>{if(!ok)r()},60)})}
function frameStats(d){let sum=0,n=0;for(let i=0;i<d.length;i+=4*97){sum+=d[i]+d[i+1]+d[i+2];n++}return sum/n/3}
// iPhone Safari: the video must be in the page and actually playing for frames to reach the canvas
async function collect(v,onFrame,setPct){
  const dur=v.duration;
  if(v.requestVideoFrameCallback){
    try{
      v.currentTime=0;await waitEv(v,'seeked',1500);
      v.playbackRate=2;let last=-1,count=0;
      await new Promise((res,rej)=>{
        let done=false;const fin=()=>{if(!done){done=true;res()}};
        const cb=(now,meta)=>{if(done)return;const t=meta.mediaTime;if(t-last>=0.18){last=t;count++;onFrame(t);setPct(t/dur)}
          if(!v.ended)v.requestVideoFrameCallback(cb)};
        v.requestVideoFrameCallback(cb);v.addEventListener('ended',fin);
        setTimeout(fin,(dur/2+15)*1000);
        v.play().catch(rej);
      });
      v.pause();
      if(count>=Math.min(5,dur*2))return 'play';
    }catch(e){}
  }
  // fallback: seek frame by frame
  for(let t=0.05;t<dur;t+=0.2){await seek(v,t);onFrame(t);setPct(t/dur)}
  return 'seek';
}
async function analyze(file){
  const st=$('#status'),bar=$('#prog');st.textContent='動画を読み込み中…';bar.style.width='0%';$('#progwrap').style.display='';$('#diag').innerHTML='';
  const v=document.createElement('video');v.muted=true;v.defaultMuted=true;v.playsInline=true;v.setAttribute('playsinline','');v.setAttribute('muted','');v.preload='auto';
  v.style.cssText='position:fixed;left:0;bottom:0;width:2px;height:2px;opacity:0.01;pointer-events:none';
  document.body.appendChild(v);
  v.src=URL.createObjectURL(file);
  await waitEv(v,'loadedmetadata',10000);
  if(!v.videoWidth){st.textContent='この動画は読み込めませんでした';v.remove();return}
  await waitEv(v,'canplay',5000);
  buildTemplates();
  const W=400,H=Math.round(v.videoHeight*W/v.videoWidth);
  const cv=document.createElement('canvas');cv.width=W;cv.height=H;const ctx=cv.getContext('2d',{willReadFrequently:true});
  const W2=Math.min(v.videoWidth,800),H2=Math.round(v.videoHeight*W2/v.videoWidth);
  const cv2=document.createElement('canvas');cv2.width=W2;cv2.height=H2;const ctx2=cv2.getContext('2d',{willReadFrequently:true});
  const th=document.createElement('canvas');
  const samples=[];let dark=0,mid=null,lastKey='',lastNameT=-9;
  // everything is captured while the video plays: iPhone gives no picture after seeking
  const mode=await collect(v,t=>{
    ctx.drawImage(v,0,0,W,H);
    const d=ctx.getImageData(0,0,W,H).data;
    if(frameStats(d)<6)dark++;
    const det=detectBars(d,W,H);
    const s={t,det,sig:det?signature(d,W,H,det.top):null};
    if(det){
      const key=det.iv.join('/');
      if(key!==lastKey||t-lastNameT>0.5){
        lastKey=key;lastNameT=t;
        ctx2.drawImage(v,0,0,W2,H2);
        try{const r=readName(ctx2.getImageData(0,0,W2,H2).data,W2,H2,det.top*W2/W);if(r&&r.best)s.name={dex:r.best.dex,name:r.best.name,score:r.best.score}}catch(e){}
        const h=Math.max(40,Math.round(det.top*0.6));th.width=160;th.height=Math.round(h*160/W);
        th.getContext('2d').drawImage(cv,0,0,W,h,0,0,th.width,th.height);s.thumb=th.toDataURL('image/jpeg',0.75);
      }
    }
    samples.push(s);
    if(!mid&&t>v.duration*0.4)mid=cv.toDataURL('image/jpeg',0.6);
  },p=>{bar.style.width=(p*100).toFixed(0)+'%';st.textContent=`解析中… ${Math.round(p*100)}%`});
  const groups=groupSamples(samples);
  let named=0;
  for(const g of groups){
    const inG=samples.filter(s=>s.det&&s.t>=g.t0-0.01&&s.t<=g.t1+0.01&&s.det.iv.join()===g.iv.join());
    const votes={};for(const s of inG)if(s.name&&s.name.score>0.55){const k=s.name.dex;votes[k]=votes[k]||{n:0,score:0,dex:k};votes[k].n++;votes[k].score=Math.max(votes[k].score,s.name.score)}
    const best=Object.values(votes).sort((a,b)=>b.n-a.n||b.score-a.score)[0];
    const withThumb=inG.filter(s=>s.thumb);const tsm=withThumb.sort((a,b)=>Math.abs(a.t-g.t)-Math.abs(b.t-g.t))[0];
    if(best)named++;
    state.items.push({id:state.next++,iv:g.iv.slice(),species:best?baseIdOf(+best.dex):null,auto:!!best,score:best?best.score:null,thumb:tsm?tsm.thumb:null,t:g.t});
  }
  URL.revokeObjectURL(v.src);v.remove();
  $('#progwrap').style.display='none';
  const found=samples.filter(s=>s.det).length,tried=samples.filter(s=>s.name!==undefined||s.thumb).length,nm=samples.filter(s=>s.name&&s.name.score>0.55).length;
  const info=`動画 ${v.videoWidth}×${v.videoHeight} / ${v.duration.toFixed(1)}秒 / 方式 ${mode} / 解析 ${samples.length}コマ / 暗いコマ ${dark} / バー検出 ${found}コマ / 名前判定 ${nm}/${tried}`;
  if(groups.length){const na=groups.length-named;st.textContent=`${groups.length}匹見つかりました。`+(na?`名前を読めなかった${na}匹は、名前を入力してください。`:'');$('#diag').textContent=info}
  else{
    st.textContent=dark>samples.length*0.5?'動画のコマを取り出せませんでした（真っ黒）。この画面のスクショを送ってください。':'評価画面が見つかりませんでした。この画面のスクショを送ってください。';
    $('#diag').innerHTML=esc(info)+(mid?`<br><img src="${mid}" style="width:120px;margin-top:6px;border-radius:6px">`:'');
  }
  render();
}
$('#file').addEventListener('change',e=>{const f=e.target.files[0];if(f)analyze(f).catch(err=>{$('#status').textContent='エラー: '+err.message});e.target.value=''});
render();
