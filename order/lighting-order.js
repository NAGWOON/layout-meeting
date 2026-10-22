/* Office review only: imports immutable measurement snapshots into an order draft. */
var LightingOrder=(function(){
 'use strict';
 let dialog,rows=[],plans={},siteId='',busy=false;
 const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const field=(key,value,type='text',extra='')=>`<input data-key="${key}" type="${type}" value="${escape(value)}" ${extra}>`;
 function key(){return 'dsf_lighting_office:'+siteId;}
 function remember(){try{localStorage.setItem(key(),JSON.stringify(plans));}catch(e){notice('이 기기에 검토 초안을 보관하지 못했습니다. 화면을 닫기 전에 발주 초안에 담아주세요');}}
 function notice(t){dialog.querySelector('[data-message]').textContent=t;}
 function init(){if(dialog)return;dialog=document.createElement('dialog');dialog.className='lighting-office';document.body.append(dialog);
  dialog.addEventListener('input',e=>{const card=e.target.closest('[data-row]');if(!card)return;plans[card.dataset.row][e.target.dataset.key]=e.target.type==='checkbox'?e.target.checked:e.target.value;remember();});
  dialog.addEventListener('click',async e=>{const act=e.target.dataset.action;if(!act)return;
   if(act==='close')dialog.close();if(act==='reload')await load();if(act==='calculate')calculate();if(act==='import')await importDraft();
   if(act==='split'){const card=e.target.closest('[data-row]'),r=rows.find(x=>x.id===card.dataset.row),p=plans[r.id];p.splits=r.segments.map(s=>LightingCalc.split(s.mm,'reference',2400).join('+')).join(' / ');remember();render();}
  });
 }
 async function open(){if(!S.site)return toast('현장을 먼저 선택해주세요');init();siteId=S.site.id;try{plans=JSON.parse(localStorage.getItem(key())||'{}');}catch(e){plans={};}dialog.showModal();await load();}
 async function load(){if(busy)return;busy=true;dialog.innerHTML='<p>현장의 실측 기록을 불러오는 중입니다.</p><button data-action="close">닫기</button>';
  try{const result=await api('lightingGet',{sitePageId:siteId});if(!result.ok)throw Error(result.error||'실측 조회 실패');rows=result.document.rows;
   rows.forEach(r=>{if(!plans[r.id])plans[r.id]={selected:false,product:r.product||'',voltage:r.office?.voltage||'',watts:r.office?.wattsPerM||'',group:r.office?.smpsGroup||'',splits:r.office?.splits||r.segments.map(s=>s.mm??'').join(' / '),connection:r.office?.connection||'',t5:false,capacity:'',utilization:80};});render();
  }catch(e){dialog.innerHTML='<p>'+escape(e.message)+'</p><button data-action="reload">다시 불러오기</button><button data-action="close">닫기</button>';}finally{busy=false;}
 }
 function render(){dialog.innerHTML=`<header><div><small>사무실 · 간접조명 발주 검토</small><h2>${escape(S.site.name||'현재 현장')}</h2></div><button data-action="close">닫기</button></header><p>실측 원본은 그대로 두고 제작 조건을 정합니다. 2,400mm는 분할 제안값입니다. 배선 갈래와 제작 조각 수는 별개입니다.</p><div data-message role="status"></div><main>${rows.map(r=>{const p=plans[r.id],done=r.status==='done';return `<section data-row="${escape(r.id)}"><h3><label><input type="checkbox" data-key="selected" ${p.selected?'checked':''} ${done?'':'disabled'}> ${escape(r.room)} · ${escape(r.location)}</label><small>${done?'실측 완료':r.status==='pending'?'미측정':r.status==='skip'?'시공 안 함':'삭제 기록'}</small></h3><p>실측 ${r.segments.map(s=>escape(s.label)+': '+escape(s.mm??'미입력')+'mm').join(' / ')} · 실제 배선 ${escape(r.actualWires??'미확인')}갈래 · 스위치 ${escape(r.switchGroup||'미지정')}</p><p>${escape(r.wirePosition)} ${escape(r.note)}</p><div class="lighting-fields"><label>제품·색온도·방습 등${field('product',p.product)}</label><label>제작 길이 mm · 변 사이 /, 조각 사이 +${field('splits',p.splits)}<button data-action="split" ${done?'':'disabled'}>각 변을 2,400 기준으로 제안</button></label><label>연결·접힘·인입 요청${field('connection',p.connection)}</label><label><input type="checkbox" data-key="t5" ${p.t5?'checked':''}> 외부 SMPS 없이 발주 · T5 등 전원 사양 확인</label><label>전압 V${field('voltage',p.voltage,'number','min="1"')}</label><label>소비전력 W/m${field('watts',p.watts,'number','min="0.01" step="any"')}</label><label>SMPS 묶음 이름${field('group',p.group)}</label><label>사용률 % · 초기 80%는 검토 가정${field('utilization',p.utilization,'number','min="1" max="100"')}</label><label>선택 SMPS 정격 W${field('capacity',p.capacity,'number','min="1" step="any"')}</label></div></section>`;}).join('')}</main><div data-results></div><footer><button data-action="reload">최신 실측 다시 읽기</button><button data-action="calculate">분할·전원 검토</button><button data-action="import">검토한 항목을 새 발주 초안에 담기</button></footer><small>제품의 허용 길이·전압강하·설치 환경·디밍 호환은 업체 사양으로 확인하세요. 이 화면은 주문을 전송하지 않습니다. 검토 입력은 이 브라우저에 보관됩니다.</small>`;}
 function review(){const selected=rows.filter(r=>plans[r.id].selected);if(!selected.length)throw Error('발주할 위치를 선택해주세요');let groups=Object.create(null),entries=[];
  selected.forEach(r=>{const p=plans[r.id];if(r.status!=='done')throw Error(r.location+': 실측 완료 후 담을 수 있습니다');if(!p.product.trim())throw Error(r.location+': 제품 사양을 적어주세요');if(r.actualWires===null)throw Error(r.location+': 실제 배선을 확인해주세요');
   const sections=p.splits.split('/');if(sections.length!==r.segments.length)throw Error(r.location+': 각 변의 제작 길이를 /로 나누어 적어주세요');
   const splits=sections.map((v,i)=>LightingCalc.split(r.segments[i].mm,'direct',v));
   if(!p.connection.trim())throw Error(r.location+': 연결·인입 방법을 적어주세요. 변경 없으면 계획대로라고 적어주세요');
   let spec=`${p.product} · 실측 ${r.segments.map(s=>s.label+' '+s.mm+'mm').join('/')} · 제작 ${splits.map(x=>x.join('+')).join(' / ')}mm · 배선 ${r.actualWires}갈래 · 스위치 ${r.switchGroup||'미지정'} · ${p.connection}`;
   if(!p.t5){if(!p.group.trim())throw Error(r.location+': SMPS 묶음을 적어주세요');const group=p.group.trim();const item={mm:r.segments.reduce((a,s)=>a+s.mm,0),voltage:Number(p.voltage),wattsPerM:Number(p.watts)};
    if(!groups[group])groups[group]={rows:[],utilization:Number(p.utilization),capacity:Number(p.capacity)};
    const g=groups[group];if(g.capacity!==Number(p.capacity)||g.utilization!==Number(p.utilization))throw Error(group+': 같은 묶음은 정격 용량과 사용률을 동일하게 입력해주세요');g.rows.push(item);spec+=` · ${p.voltage}V ${p.watts}W/m · SMPS ${group}`;
   }else spec+=' · 외부 SMPS 제외(제품 전원 사양 확인)';
   entries.push({id:'lighting-'+r.id+'-'+r.revision,name:r.room+' '+r.location,spec,cut:'',unit:'세트',qty:1,type:'조명·스위치',group:'간접조명 실측',lightingSource:{id:r.id,revision:r.revision,sourceToken:r.sourceToken,site:siteId}});
  });
  const summaries=Object.entries(groups).map(([name,g])=>{const p=LightingCalc.power(g.rows,g.utilization,g.capacity);if(!p.sufficient)throw Error(name+': 필요한 정격 '+p.requiredW.toFixed(1)+'W 이상으로 SMPS를 선택해주세요');entries.push({id:'lighting-smps-'+crypto.randomUUID(),name:'SMPS '+name,spec:`${p.voltage}V · 정격 ${p.selectedW}W · 부하 ${p.watts.toFixed(1)}W · 사용률 가정 ${g.utilization}%`,unit:'개',qty:1,type:'조명·스위치',group:'간접조명 전원'});return name+': 부하 '+p.watts.toFixed(1)+'W → 필요 정격 '+p.requiredW.toFixed(1)+'W / 선택 '+p.selectedW+'W';});
  return {selected,entries,summaries};
 }
 function calculate(){try{const r=review();dialog.querySelector('[data-results]').textContent=r.summaries.join(' · ')||'분할 합계 확인 · 외부 SMPS 제외';notice('선택한 '+r.selected.length+'개 위치의 분할 합계를 확인했습니다');}catch(e){notice(e.message);}}
 async function importDraft(){if(busy)return;busy=true;try{if(!S.site||S.site.id!==siteId)throw Error('현장이 바뀌었습니다. 다시 열어주세요');const r=review();const live=await api('lightingGet',{sitePageId:siteId});if(!live.ok)throw Error(live.error||'원본 재확인 실패');
   for(const x of r.selected){const latest=live.document.rows.find(z=>z.id===x.id);if(!latest||latest.sourceToken!==x.sourceToken)throw Error(x.location+': 실측이 바뀌었습니다. 최신 실측을 다시 읽어주세요');if(S.extra.some(z=>z.qty>0&&z.lightingSource?.site===siteId&&z.lightingSource?.id===x.id))throw Error(x.location+': 이미 발주 초안에 있습니다. 기존 초안을 확인해주세요');}
   if(!S.site||S.site.id!==siteId)throw Error('현장이 바뀌었습니다');
   const sheet=Math.max(...sheetsUsed(),...Object.keys(S.done).map(Number),0)+1;S.typeBy[sheet]='조명·스위치';
   r.entries.forEach(item=>{S.extra.push(item);S.sheetNo[keyOf(item)]=sheet;});S.noteBy[sheet]='간접조명 실측 검토본 · 제작 분할/인입은 각 품목 사양 참조 · 원본 수정은 이 초안에 자동 반영되지 않습니다';S.cur=sheet;setType('조명·스위치');renderItems();draw();bar();side();dialog.close();toast(r.selected.length+'개 위치를 새 발주 초안에 담았습니다. 업체와 제작 조건을 확인한 뒤 발주 기록을 눌러주세요');
  }catch(e){notice(e.message);}finally{busy=false;}
 }
 return {open};
})();
