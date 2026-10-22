'use strict';
const API = 'https://script.google.com/macros/s/AKfycbym4-GzQSpHY9yEK7nm6NGbXRf1AIZve1-TmeiZsL7PPbU6qllWhdDzGphpLROHsw/exec';
const $ = id => document.getElementById(id);
const form = $('editor');
let site = '', doc = {rows:[]}, current = null, dirty = false, busy = false, filter = 'active', generation = 0;
const labels = {pending:'미완료', done:'실측 완료', skip:'시공 안 함', removed:'삭제 기록'};
const id = () => crypto.randomUUID();
const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clone = x => JSON.parse(JSON.stringify(x));
function message(t, error=false) {$('message').textContent=t; $('message').classList.toggle('error',error);}
function draftKey(rowId) {return 'dsf_lighting_draft:'+site+':'+rowId;}
function blank(room='',location='') {return {id:id(),revision:0,room,location,product:'',switchGroup:'',wirePosition:'',note:'',reason:'',segments:[{label:'A',mm:null}],plannedWires:null,actualWires:null,photos:[],status:'pending'};}
function download(name,text,type='application/json') {const url=URL.createObjectURL(new Blob([text],{type})); const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),3000);}
async function api(action,data={}) {
  const ctl=new AbortController();const timer=setTimeout(()=>ctl.abort(),90000);
  try {
    const response=await fetch(API,{method:'POST',body:JSON.stringify({action,key:localStorage.getItem('dsf_key')||'',data}),signal:ctl.signal});
    if(!response.ok) throw new Error('서버 연결에 실패했습니다. 다시 시도해주세요');
    const r=await response.json();
    if(!r.ok){const e=new Error(r.error||'서버에서 처리하지 못했습니다');e.conflict=r.conflict;throw e;}
    return r;
  } catch(e) {if(e.name==='AbortError') throw new Error('응답을 확인하지 못했습니다. 입력은 이 기기 초안에 남습니다. 다시 저장하면 같은 요청의 중복 저장을 막습니다');throw e;}
  finally{clearTimeout(timer);}
}
function freeze(on){busy=on;document.querySelectorAll('button,input,textarea,select').forEach(e=>e.disabled=on);}
function collect(){
  if(!current)return null;
  const r=clone(current);
  ['room','location','product','switchGroup','wirePosition','note','reason'].forEach(k=>r[k]=form.elements[k].value.trim());
  ['plannedWires','actualWires'].forEach(k=>r[k]=form.elements[k].value===''?null:Number(form.elements[k].value));
  r.segments=[...$('segments').querySelectorAll('input')].map((e,i)=>({label:String.fromCharCode(65+i),mm:e.value===''?null:Number(e.value)}));
  return r;
}
function persistDraft(){
  if(!current)return;
  const r=collect();
  try{localStorage.setItem(draftKey(r.id),JSON.stringify(r));$('saveState').textContent='이 기기에 초안 보관 · 사무실 미공유';}
  catch(e){$('saveState').textContent='기기 초안 저장 공간이 부족합니다. 화면을 닫지 말고 공유 저장해주세요';}
  dirty=true;
}
function updateTotals(){
  const r=collect();if(!r)return;
  const vals=r.segments.map(x=>x.mm);const valid=vals.every(v=>Number.isInteger(v)&&v>0&&v<=100000);
  $('total').textContent=valid?'합계 '+vals.reduce((a,b)=>a+b,0).toLocaleString()+' mm':'미측정 구간이 있습니다';
  const mismatch=r.actualWires!==null&&(r.actualWires===0||(r.plannedWires!==null&&r.plannedWires!==r.actualWires));
  $('wireWarn').hidden=!mismatch;$('wireWarn').textContent='배선이 없거나 계획과 다릅니다 · 확인 내용을 메모해주세요';
}
function drawPhotos(){
  $('photoList').innerHTML=(current.photos||[]).map((p,i)=>'<figure><img src="'+esc(typeof p==='string'?p:p.url)+'" alt="현장 사진 '+(i+1)+'"><button type="button" data-photo="'+i+'">사진 삭제</button></figure>').join('');
}
function drawSegments(r){
  $('segments').innerHTML=r.segments.map((s,i)=>'<div class="segment"><label for="seg'+i+'">구간 '+esc(s.label)+'</label><input id="seg'+i+'" aria-label="구간 '+esc(s.label)+' 길이 mm" type="number" min="1" max="100000" step="1" inputmode="numeric" placeholder="mm" value="'+(s.mm===null?'':esc(s.mm))+'"><button type="button" data-seg="'+i+'" aria-label="구간 삭제">×</button></div>').join('');
}
function edit(r){
  if(busy)return;
  if(dirty&&!confirm('현재 입력은 이 기기 초안에 남습니다. 다른 위치를 여시겠어요?'))return;
  current=clone(r);dirty=false;
  let saved;try{saved=JSON.parse(localStorage.getItem(draftKey(r.id))||'null');}catch(e){}
  if(saved&&confirm('이 기기에 공유하지 않은 초안이 있습니다. 불러올까요? 최신 공유 기록과 다르면 저장 전 대조가 필요합니다.')){current=saved;dirty=true;}
  ['room','location','product','switchGroup','wirePosition','note','reason','plannedWires','actualWires'].forEach(k=>form.elements[k].value=current[k]??'');
  $('editTitle').textContent=current.room+' · '+current.location;
  $('rowMeta').textContent=current.updatedAt?labels[current.status]+' · '+current.updatedBy+' · '+new Date(current.updatedAt).toLocaleString('ko-KR'):'아직 공유 저장되지 않은 위치';
  drawSegments(current);drawPhotos();updateTotals();
  $('saveState').textContent=dirty?'이 기기 초안 · 사무실 미공유':'입력 후 공유 저장해주세요';
  $('history').innerHTML=(current.history||[]).slice().reverse().map(h=>'<div>'+esc(new Date(h.at).toLocaleString('ko-KR'))+' · '+esc(h.by)+' · '+esc(labels[h.status])+'</div>').join('')||'아직 변경 기록이 없습니다';
  $('editorPanel').hidden=false;
  if(innerWidth<721)$('editorPanel').scrollIntoView({behavior:'smooth',block:'start'});
}
function render(){
  const active=doc.rows.filter(r=>!['skip','removed'].includes(r.status));const done=active.filter(r=>r.status==='done').length;
  $('progress').textContent=done+' / '+active.length;$('remaining').textContent='남은 실측 '+(active.length-done)+'곳 · 시공 안 함 '+doc.rows.filter(r=>r.status==='skip').length+'곳 · 삭제 '+doc.rows.filter(r=>r.status==='removed').length+'곳';
  $('meter').max=Math.max(active.length,1);$('meter').value=done;
  const rows=doc.rows.filter(r=>filter==='active'?r.status!=='removed':filter==='excluded'?['skip','removed'].includes(r.status):r.status===filter);
  $('list').innerHTML=rows.map(r=>'<button class="item" data-id="'+r.id+'" data-status="'+r.status+'"><span><b>'+esc(r.room)+' · '+esc(r.location)+'</b><small>'+esc(r.product||'조명 종류 미지정')+(r.status==='done'?' · '+r.segments.reduce((a,s)=>a+s.mm,0).toLocaleString()+' mm':'')+'</small></span><span class="badge">'+labels[r.status]+'</span></button>').join('')||'<p class="hint">표시할 위치가 없습니다.</p>';
  for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(!k.startsWith('dsf_lighting_draft:'+site+':'))continue;try{const r=JSON.parse(localStorage.getItem(k));if(!doc.rows.some(x=>x.id===r.id))$('list').insertAdjacentHTML('beforeend','<button class="item" data-draft="'+esc(r.id)+'"><span>'+esc(r.room||'새 공간')+' · '+esc(r.location||'새 위치')+'</span><span class="badge">이 기기 초안</span></button>');}catch(e){}}
}
async function load(){
  if(!site)return;
  const seq=++generation;freeze(true);message('공유 기록을 불러옵니다…');
  try{const r=await api('lightingGet',{sitePageId:site});if(seq!==generation)return;doc=r.document;$('siteTitle').textContent=r.siteName+' · 간접조명';$('workspace').hidden=false;current=null;dirty=false;$('editorPanel').hidden=true;render();message('공유 기록을 불러왔습니다. 입력한 값은 저장 버튼을 눌러야 사무실에 공유됩니다.');}
  catch(e){message(e.message+' · 서버 기능이 아직 배포되지 않았다면 기존 기록은 변경되지 않습니다.',true);$('workspace').hidden=true;}
  finally{freeze(false);}
}
async function save(status){
  if(busy||!current)return;
  if(!form.reportValidity())return;
  let r=collect();r.status=status;
  if(status==='done'&&(r.segments.some(s=>!Number.isInteger(s.mm)||s.mm<=0)||r.actualWires===null)){message('완료하려면 구간 길이와 실제 배선 수를 입력해주세요',true);return;}
  if(status==='done'&&(r.actualWires===0||(r.plannedWires!==null&&r.plannedWires!==r.actualWires))&&!r.note){message('배선 차이에 대한 확인 내용을 메모해주세요',true);return;}
  if(['skip','removed'].includes(status)&&!r.reason){message('시공 안 함 또는 삭제 사유를 입력해주세요',true);return;}
  // An unchanged retry reuses its request id; edited input gets a new one.
  const fingerprint=JSON.stringify({...r,requestId:undefined,pendingRequest:undefined});
  const req=current.pendingRequest&&current.pendingRequest.fingerprint===fingerprint?current.pendingRequest.id:id();
  r.pendingRequest={id:req,fingerprint};current=r;persistDraft();
  freeze(true);message('공유 저장 중입니다. 완료 표시를 확인해주세요.');
  try{
    const result=await api('lightingSave',{sitePageId:site,row:r,expectedRevision:r.revision||0,requestId:req});
    const at=doc.rows.findIndex(x=>x.id===r.id);if(at<0)doc.rows.push(result.row);else doc.rows[at]=result.row;
    localStorage.removeItem(draftKey(r.id));dirty=false;current=result.row;
    render();$('saveState').textContent='사무실 공유 저장 완료';$('rowMeta').textContent=labels[current.status]+' · '+current.updatedBy+' · '+new Date(current.updatedAt).toLocaleString('ko-KR');
    message('공유 저장 완료 · '+r.room+' '+r.location);
  }catch(e){message(e.message,true);$('saveState').textContent='공유 저장 미확인 · 이 기기 초안 유지';if(e.conflict)message(e.message+' · 초안을 백업한 뒤 최신 기록을 불러와 비교하세요.',true);}
  finally{freeze(false);}
}
async function initialize(){
  if(!localStorage.getItem('dsf_key')){$('login').hidden=false;message('현장관리와 같은 접속키로 접속해주세요');return;}
  freeze(true);
  try{
    const ping=await api('ping');localStorage.setItem('dsf_owner',ping.owner||'');$('login').hidden=true;
    const r=await api('getSites');$('sites').innerHTML='<option value="">현장을 선택하세요</option>'+(r.sites||[]).map(s=>'<option value="'+esc(s.id)+'">'+esc(s.name)+'</option>').join('');
    site='';
    const chosen=new URLSearchParams(location.search).get('site')||localStorage.getItem('dsf_recent');
    if(chosen&&(r.sites||[]).some(s=>s.id===chosen)){$('sites').value=chosen;site=chosen;}
    message('현장을 선택해 실측 목록을 확인하세요');
  }catch(e){message(e.message,true);$('login').hidden=false;}
  finally{freeze(false);}
  if(site)await load();
}
function exportRows(){
  const lines=[$('siteTitle').textContent,'실측 자료 · 발주 전 제품/분할/전원 사양 확인 필요',''];
  doc.rows.forEach(r=>{lines.push('['+labels[r.status]+'] '+r.room+' · '+r.location,'조명: '+(r.product||'미지정'),'구간(mm): '+r.segments.map(s=>s.label+' '+(s.mm??'미측정')).join(' / '),'배선: 계획 '+(r.plannedWires??'미확인')+' / 실제 '+(r.actualWires??'미확인')+' 갈래','인입 위치: '+(r.wirePosition||'미기록'),'스위치: '+(r.switchGroup||'미기록'),'메모: '+(r.note||'없음'),r.reason?'제외 사유: '+r.reason:'','');});
  return lines.join('\n');
}
$('loginBtn').onclick=async()=>{const k=$('accessKey').value.trim();if(!k)return;localStorage.setItem('dsf_key',k);$('accessKey').value='';await initialize();};
$('sites').onchange=()=>{const next=$('sites').value;if(dirty&&!confirm('입력은 이 기기 초안에 남습니다. 현장을 바꾸시겠어요?')){$('sites').value=site;return;}site=next;current=null;dirty=false;$('workspace').hidden=true;if(site){localStorage.setItem('dsf_recent',site);load();}};
$('refresh').onclick=()=>{if(dirty&&!confirm('입력 초안은 이 기기에 유지됩니다. 공유 기록을 다시 불러올까요?'))return;load();};
$('add').onclick=()=>edit(blank());
$('close').onclick=()=>{if(dirty)persistDraft();$('editorPanel').hidden=true;$('list').scrollIntoView({behavior:'smooth'});};
$('list').onclick=e=>{const b=e.target.closest('[data-id]');if(b)edit(doc.rows.find(r=>r.id===b.dataset.id));const d=e.target.closest('[data-draft]');if(d){try{edit(JSON.parse(localStorage.getItem(draftKey(d.dataset.draft))));}catch(err){message('초안을 읽을 수 없습니다',true);}}};
document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{filter=b.dataset.filter;document.querySelectorAll('[data-filter]').forEach(x=>x.classList.toggle('chosen',x===b));render();});
form.addEventListener('input',()=>{persistDraft();updateTotals();});
form.onsubmit=e=>{e.preventDefault();save('done');};
$('draftSave').onclick=()=>save('pending');$('skip').onclick=()=>save('skip');$('remove').onclick=()=>save('removed');
$('addSegment').onclick=()=>{const r=collect();if(r.segments.length>=20)return;r.segments.push({label:String.fromCharCode(65+r.segments.length),mm:null});drawSegments(r);persistDraft();updateTotals();};
$('segments').onclick=e=>{const b=e.target.closest('[data-seg]');if(!b)return;const r=collect();if(r.segments.length===1)return;r.segments.splice(Number(b.dataset.seg),1);r.segments.forEach((s,i)=>s.label=String.fromCharCode(65+i));drawSegments(r);persistDraft();updateTotals();};
$('photoList').onclick=e=>{const b=e.target.closest('[data-photo]');if(!b)return;current.photos.splice(Number(b.dataset.photo),1);drawPhotos();persistDraft();};
async function photoData(file){
  const url=URL.createObjectURL(file);
  try{const img=new Image();img.src=url;await img.decode();const scale=Math.min(1,1000/Math.max(img.width,img.height));const c=document.createElement('canvas');c.width=Math.max(1,Math.round(img.width*scale));c.height=Math.max(1,Math.round(img.height*scale));c.getContext('2d').drawImage(img,0,0,c.width,c.height);let result=c.toDataURL('image/jpeg',.72);if(result.length>280000)result=c.toDataURL('image/jpeg',.4);if(result.length>280000)throw new Error('사진이 너무 큽니다. 더 작은 사진을 선택해주세요');return result;}finally{URL.revokeObjectURL(url);}
}
$('photos').onchange=async e=>{const files=[...e.target.files];if(current.photos.length+files.length>3){message('사진은 위치당 3장까지입니다',true);e.target.value='';return;}freeze(true);try{for(const f of files)current.photos.push(await photoData(f));drawPhotos();persistDraft();}catch(err){message('사진을 읽지 못했습니다: '+err.message,true);}finally{e.target.value='';freeze(false);}};
$('bulkAdd').onclick=async()=>{
  if(busy)return;const lines=$('bulk').value.split('\n').map(x=>x.trim()).filter(Boolean);if(!lines.length)return;
  const rows=[];for(const line of lines){const parts=line.split('|').map(x=>x.trim());if(parts.length!==2||!parts[0]||!parts[1]){message('각 줄을 공간 | 설치 위치 형식으로 적어주세요',true);return;}if(!doc.rows.some(r=>r.room===parts[0]&&r.location===parts[1])&&!rows.some(r=>r.room===parts[0]&&r.location===parts[1]))rows.push(blank(parts[0],parts[1]));}
  if(!rows.length){message('이미 등록된 위치입니다. 목록에서 확인해주세요');return;}
  freeze(true);let n=0;
  try{for(const r of rows){message('목록 공유 저장 중 · '+(n+1)+' / '+rows.length);const result=await api('lightingSave',{sitePageId:site,row:r,expectedRevision:0,requestId:r.id});doc.rows.push(result.row);n++;render();}$('bulk').value='';message(n+'개 위치를 공유 저장했습니다');}
  catch(e){message(n+'개 저장됨 · 나머지는 저장 미확인: '+e.message+' · 새로 불러온 뒤 남은 목록을 확인해주세요',true);}
  finally{freeze(false);}
};
$('backup').onclick=()=>{const drafts={};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k.startsWith('dsf_lighting_draft:'+site+':'))drafts[k]=JSON.parse(localStorage.getItem(k));}download('간접조명_실측백업.json',JSON.stringify({sitePageId:site,shared:doc,localDrafts:drafts},null,2));};
$('exportText').onclick=()=>download('간접조명_발주검토.txt',exportRows(),'text/plain;charset=utf-8');
addEventListener('beforeunload',e=>{if(dirty||busy){e.preventDefault();e.returnValue='';}});
initialize();

