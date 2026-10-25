'use strict';
const API='https://script.google.com/macros/s/AKfycbym4-GzQSpHY9yEK7nm6NGbXRf1AIZve1-TmeiZsL7PPbU6qllWhdDzGphpLROHsw/exec';
const $=id=>document.getElementById(id),form=$('editor');
let site='',doc={rows:[]},current=null,dirty=false,busy=false,filter='pending';
const labels={pending:'미측정',done:'완료',skip:'시공 안 함',removed:'삭제'};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clone=x=>JSON.parse(JSON.stringify(x));
const draftKey=id=>'dsf_lighting_draft:'+site+':'+id;
function message(text,error=false){$('message').textContent=text;$('message').classList.toggle('error',error);}
function freeze(on){busy=on;document.querySelectorAll('button,input,textarea').forEach(e=>e.disabled=on);}
async function api(action,data={}){const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),90000);try{const res=await fetch(API,{method:'POST',body:JSON.stringify({action,key:localStorage.getItem('dsf_key')||'',data}),signal:ctl.signal});if(!res.ok)throw Error('서버 연결에 실패했습니다');const r=await res.json();if(!r.ok){const err=Error(r.error||'처리하지 못했습니다');err.result=r;throw err;}return r;}catch(e){if(e.name==='AbortError')throw Error('저장 응답을 확인하지 못했습니다. 초안은 남아 있습니다. 다시 저장하면 중복을 확인합니다');throw e;}finally{clearTimeout(timer);}}
const FIELD_NAME={room:'공간',location:'위치',note:'메모',reason:'사유',segments:'길이',actualWires:'배선'};
const fieldPart=r=>({room:r.room||'',location:r.location||'',note:r.note||'',reason:r.reason||'',actualWires:r.actualWires??null,segments:(r.segments||[{label:'A',mm:null}]).map(s=>({label:s.label,mm:s.mm??null}))});
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
// 초안을 그대로 되살리면 그 안의 옛 사무실 정보·변경표시까지 살아나 저장할 때마다 충돌합니다.
// 현장에서 실제로 바꾼 칸만 노션 최신 기록 위에 얹고, 나머지는 최신 기록을 따릅니다.
function rebase(latest,draft){const base=draft.base||null,mine=fieldPart(draft),theirs=fieldPart(latest),out=clone(latest),clash=[];
 Object.keys(FIELD_NAME).forEach(k=>{if(base&&same(mine[k],base[k]))return;if(base&&!same(theirs[k],base[k])&&!same(theirs[k],mine[k]))clash.push(FIELD_NAME[k]);out[k]=clone(mine[k]);});
 out.base=theirs;out.pendingRequest=draft.pendingRequest;return {row:out,clash,changed:draft.sourceToken!==latest.sourceToken};}
function fieldRows(){return doc.rows.filter(r=>r.needsMeasurement!==false);}
function blank(){return {id:crypto.randomUUID(),revision:0,needsMeasurement:true,room:'',location:'',product:'',switchGroup:'',wirePosition:'',note:'',reason:'',segments:[{label:'A',mm:null}],plannedWires:null,actualWires:null,photos:[],status:'pending'};}
function collect(){if(!current)return null;const r=clone(current);['room','location','note','reason'].forEach(k=>r[k]=form.elements[k].value.trim());r.actualWires=form.elements.wires.value===''?null:Number(form.elements.wires.value);r.segments=[...$('segments').querySelectorAll('input')].map((e,i)=>({label:String.fromCharCode(65+i),mm:e.value===''?null:Number(e.value)}));return r;}
function persistDraft(){if(!current)return;try{localStorage.setItem(draftKey(current.id),JSON.stringify(collect()));$('saveState').textContent='이 기기에 초안 보관 · 아직 공유 전';}catch(e){$('saveState').textContent='기기 초안 저장 공간이 부족합니다. 화면을 닫지 말고 저장하세요';}dirty=true;}
function updateTotals(){const r=collect();if(!r)return;const ok=r.segments.every(s=>Number.isInteger(s.mm)&&s.mm>0&&s.mm<=100000);$('total').textContent=ok?'합계 '+r.segments.reduce((a,s)=>a+s.mm,0).toLocaleString()+' mm':'미측정 구간';}
function drawSegments(r){$('segments').innerHTML=r.segments.map((s,i)=>'<div class="segment"><label for="seg'+i+'">'+(i+1)+'구간</label><input id="seg'+i+'" aria-label="'+(i+1)+'구간 길이 mm" type="number" min="1" max="100000" step="1" inputmode="numeric" placeholder="mm" value="'+(s.mm===null?'':esc(s.mm))+'"><button type="button" data-seg="'+i+'" aria-label="'+(i+1)+'구간 지우기">×</button></div>').join('');}
function closeEditor(){if(dirty)persistDraft();$('editorPanel').hidden=true;document.body.classList.remove('editing');current=null;dirty=false;}
function edit(row,opt={}){if(busy||!row)return;if(dirty&&!confirm('입력은 이 기기 초안에 남습니다. 다른 위치를 여시겠어요?'))return;
 const latest=doc.rows.find(x=>x.id===row.id),known=!!latest;let note='',saved;current=clone(latest||row);if(!current.base)current.base=fieldPart(current);dirty=false;
 try{saved=JSON.parse(localStorage.getItem(draftKey(row.id))||'null');}catch(e){}
 // 응답만 못 받았고 노션에는 이미 들어간 초안이면 지웁니다.
 if(saved&&known&&saved.pendingRequest&&latest.requestId===saved.pendingRequest.id&&same(fieldPart(saved),fieldPart(latest))){localStorage.removeItem(draftKey(row.id));saved=null;note='앞서 보낸 입력은 노션에 저장돼 있었습니다';}
 if(saved&&(opt.restore||confirm('공유하지 않은 입력이 있습니다. 불러올까요?'))){
  if(known){const m=rebase(latest,saved);current=m.row;if(m.clash.length)note='노션에서도 고친 칸('+m.clash.join('·')+')은 현장 입력으로 두었습니다. 확인 후 저장하세요';else if(m.changed)note='노션 최신 기록에 현장 입력을 다시 얹었습니다';}
  // 노션에서 사라진 위치의 초안은 새 위치로 다시 등록합니다.
  else{current=saved;if(current.pageId){current.revision=0;delete current.pageId;delete current.sourceToken;note='노션에 없는 위치입니다. 저장하면 새 위치로 등록됩니다';}}
  dirty=true;}
 ['room','location','note','reason'].forEach(k=>form.elements[k].value=current[k]||'');form.elements.wires.value=current.actualWires??'';(!current.room||!current.location?$('nameTop'):$('nameSpot')).append($('locationFields'));$('roomName').textContent=current.room||'새 위치';$('editTitle').textContent=current.location||'실측할 위치 추가';$('rowMeta').textContent=labels[current.status];$('productInfo').textContent=current.product||'';$('productInfo').hidden=!current.product;$('locationFields').open=!current.room||!current.location;$('noteFields').open=!!current.note;drawSegments(current);updateTotals();$('saveState').textContent=note||(dirty?'이 기기 초안 · 공유 전':'길이를 입력하고 저장하세요');$('editorPanel').hidden=false;document.body.classList.add('editing');$('editorPanel').scrollIntoView({block:'start',behavior:'smooth'});}
function render(){const all=fieldRows(),active=all.filter(r=>!['skip','removed'].includes(r.status)),done=active.filter(r=>r.status==='done').length;$('progress').textContent=done+' / '+active.length;$('meter').value=done;$('meter').max=Math.max(1,active.length);$('remaining').textContent='남은 곳 '+(active.length-done)+' · 도면 확인 '+doc.rows.filter(r=>r.needsMeasurement===false&&!['removed','skip'].includes(r.status)).length+'곳은 사무실에서 확인';
 const rows=all.filter(r=>filter==='all'?r.status!=='removed':filter==='excluded'?['skip','removed'].includes(r.status):r.status===filter);let last='';$('list').innerHTML=rows.map(r=>{const heading=last!==r.room?'<div class="roomHeading">'+esc(r.room)+'</div>':'';last=r.room;return heading+'<button class="item" data-id="'+esc(r.id)+'" data-status="'+esc(r.status)+'"><span><b>'+esc(r.location)+'</b><small>'+esc(r.status==='done'?r.segments.reduce((a,s)=>a+(s.mm||0),0).toLocaleString()+' mm':r.segments.length>1?r.segments.length+'개 구간':'길이를 입력하세요')+'</small></span><span class="badge">'+labels[r.status]+'</span></button>';}).join('')||'<p>이 목록에 남은 위치가 없습니다.</p>';
 for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(!key.startsWith('dsf_lighting_draft:'+site+':'))continue;try{const r=JSON.parse(localStorage.getItem(key));if(!doc.rows.some(x=>x.id===r.id))$('list').insertAdjacentHTML('beforeend','<button class="item" data-draft="'+esc(r.id)+'">'+esc(r.room||'새 공간')+' · '+esc(r.location||'새 위치')+'<span class="badge">미공유 초안</span></button>');}catch(e){}}
}
async function load(){if(!site)return;freeze(true);message('실측 목록을 불러옵니다…');try{const r=await api('lightingGet',{sitePageId:site});if(r.version!=='lighting-notion3')throw Error('실측 간소화 서버가 아직 반영되지 않았습니다. 새 Lighting.gs 배포 후 다시 열어주세요');doc=r.document;$('siteTitle').textContent=r.siteName.replace(/\s*PROJECT\s*$/,'');$('workspace').hidden=false;closeEditor();render();message('실측이 필요한 위치만 표시합니다.');}catch(e){message(e.message,true);$('workspace').hidden=true;}finally{freeze(false);}}
async function save(status){if(busy||!current)return;if(!form.reportValidity()){$('locationFields').open=true;form.reportValidity();return;}const r=collect();r.status=status;if(status==='done'&&r.segments.some(s=>!Number.isInteger(s.mm)||s.mm<=0||s.mm>100000)){message('모든 구간 길이를 확인해주세요',true);return;}if(r.actualWires!==null&&(!Number.isInteger(r.actualWires)||r.actualWires<0||r.actualWires>50)){message('배선 가닥 수를 확인해주세요 (0~50)',true);return;}if(['skip','removed'].includes(status)&&!r.reason){message('빼는 이유를 적어주세요',true);document.querySelector('.exclude').open=true;return;}
 const fingerprint=JSON.stringify({...r,requestId:undefined,pendingRequest:undefined});const req=current.pendingRequest?.fingerprint===fingerprint?current.pendingRequest.id:crypto.randomUUID();r.pendingRequest={id:req,fingerprint};current=r;persistDraft();freeze(true);message('노션에 저장 중…');
 try{const result=await api('lightingSave',{sitePageId:site,row:r,expectedRevision:r.revision||0,requestId:req});const at=doc.rows.findIndex(x=>x.id===r.id);if(at<0)doc.rows.push(result.row);else doc.rows[at]=result.row;localStorage.removeItem(draftKey(r.id));dirty=false;current={...result.row,base:fieldPart(result.row)};render();message('저장 완료 · '+r.room+' '+r.location);freeze(false);
  if(status==='done'){const list=fieldRows(),at=list.findIndex(x=>x.id===r.id),next=[...list.slice(at+1),...list.slice(0,Math.max(at,0))].find(x=>x.status==='pending');if(next){edit(next);$('saveState').textContent='✓ '+r.room+' '+r.location+' 저장됨 · 다음 위치입니다';}else{closeEditor();message('저장 완료 · 남은 실측 위치가 없습니다');}}else if(['skip','removed'].includes(status))closeEditor();else $('saveState').textContent='노션에 진행 상태를 저장했습니다';
 }catch(e){if(e.result&&e.result.conflict){freeze(false);await recover(r);return;}message(e.message,true);$('saveState').textContent='공유 저장 미확인 · 입력 초안 유지';}finally{freeze(false);}}
// 저장 직전에 노션에서 바뀐 경우: 최신 기록을 받아 현장 입력만 다시 얹고, 한 번 더 확인받고 저장합니다.
async function recover(r){freeze(true);message('노션에서 먼저 바뀐 내용이 있어 최신 기록을 불러옵니다…');let fresh;
 try{fresh=await api('lightingGet',{sitePageId:site});}catch(e){freeze(false);message('노션에서 바뀐 내용이 있어 저장하지 않았습니다. 새로고침 후 다시 열어주세요. 입력은 이 기기에 남아 있습니다',true);return;}
 doc=fresh.document;freeze(false);dirty=false;current=null;render();const latest=doc.rows.find(x=>x.id===r.id);
 edit(latest||r,{restore:true});message(latest?'노션에서 먼저 바뀐 내용을 불러왔습니다. 입력한 값은 그대로 두었으니 확인 후 다시 저장해주세요':'이 위치가 노션에서 지워졌습니다. 입력은 남겨두었으니 필요하면 다시 저장해주세요',true);}
async function initialize(){site=new URLSearchParams(location.search).get('site')||'';if(!/^[a-f0-9-]{32,36}$/i.test(site)){message('현장관리에서 현장을 선택한 뒤 들어와주세요.',true);return;}if(!localStorage.getItem('dsf_key')){$('login').hidden=false;message('현장관리와 같은 접속키로 접속해주세요');return;}document.getElementById('toWiring').href='wiring.html?v=20261025c&site='+encodeURIComponent(site);$('login').hidden=true;await load();if($('workspace').hidden)$('login').hidden=false;}
$('loginBtn').onclick=async()=>{const k=$('accessKey').value.trim();if(!k)return;localStorage.setItem('dsf_key',k);$('accessKey').value='';await initialize();};
$('refresh').onclick=()=>{if(dirty&&!confirm('입력 초안은 유지됩니다. 최신 목록을 불러올까요?'))return;load();};$('add').onclick=()=>edit(blank());$('close').onclick=closeEditor;
$('list').onclick=e=>{const b=e.target.closest('[data-id]');if(b)edit(doc.rows.find(r=>r.id===b.dataset.id));const d=e.target.closest('[data-draft]');if(d){try{edit(JSON.parse(localStorage.getItem(draftKey(d.dataset.draft))));}catch(err){message('초안을 읽지 못했습니다',true);}}};
document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{filter=b.dataset.filter;document.querySelectorAll('[data-filter]').forEach(x=>x.classList.toggle('chosen',x===b));render();});
form.addEventListener('input',()=>{persistDraft();updateTotals();});form.onsubmit=e=>{e.preventDefault();save('done');};$('draftSave').onclick=()=>save('pending');$('skip').onclick=()=>save('skip');$('remove').onclick=()=>save('removed');
const wireStep=d=>{const e=form.elements.wires,v=e.value===''?(d>0?1:0):Number(e.value)+d;e.value=Math.max(0,Math.min(50,v));e.dispatchEvent(new Event('input',{bubbles:true}));};$('wireMinus').onclick=()=>wireStep(-1);$('wirePlus').onclick=()=>wireStep(1);
$('addSegment').onclick=()=>{const r=collect();if(r.segments.length>=20)return;r.segments.push({label:String.fromCharCode(65+r.segments.length),mm:null});drawSegments(r);persistDraft();updateTotals();};
$('segments').onclick=e=>{const b=e.target.closest('[data-seg]');if(!b)return;const r=collect();if(r.segments.length===1)return;r.segments.splice(Number(b.dataset.seg),1);r.segments.forEach((s,i)=>s.label=String.fromCharCode(65+i));drawSegments(r);persistDraft();updateTotals();};
// 폰 키보드가 올라오면 화면이 줄어듭니다. 입력 중인 칸을 저장 막대 위로 다시 올립니다.
const keepVisible=()=>{const e=document.activeElement;if(e&&form.contains(e)&&/INPUT|TEXTAREA/.test(e.tagName))e.scrollIntoView({block:'nearest'});};
form.addEventListener('focusin',()=>setTimeout(keepVisible,250));if(typeof visualViewport!=='undefined')visualViewport.addEventListener('resize',keepVisible);
addEventListener('beforeunload',e=>{if(dirty||busy){e.preventDefault();e.returnValue='';}});
initialize();
