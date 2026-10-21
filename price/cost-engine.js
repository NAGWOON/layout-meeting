/* 견적 계획용 산출. 시공 적합성·최적 재단을 판정하지 않는다. */
(function(root){
 'use strict';
 function num(v,label,positive){if(v===''||v==null||!Number.isFinite(Number(v))||Number(v)<0||(positive&&Number(v)<=0))throw Error(label+' 입력을 확인해 주세요.');return Number(v);}
 function ceil(v){return Math.ceil(v-1e-9);}
 function calculate(c){
  const w=num(c.width,'길이',true),h=num(c.height,'높이',true),count=num(c.count,'동일 면 수',true);
  if(!Number.isInteger(count))throw Error('동일 면 수는 정수로 입력해 주세요.');
  const area=w*h*count,basis=c.trade==='wood'?w*count:area;
  if(!c.rows.length)throw Error('자재를 한 줄 이상 추가해 주세요.');
  const rows=c.rows.map(r=>{
   const loss=num(r.loss,'여유율',false),rate=num(r.rate,'소요계수 / 겹수',false),pack=num(r.pack,'구매단위',true);
   let quantity,formula;
   if(r.mode==='length'){quantity=w*count*rate;formula='길이 × 동일 면 수 × 계수';if(!c.frameChecked)throw Error('각재 규격·높이·간격에 맞는 소요계수를 확인해 주세요.');}
   else if(r.mode==='board'){const a=num(r.cover,'판재 면적',true);if(!Number.isInteger(rate))throw Error('판재 겹수는 정수로 입력해 주세요.');quantity=area*rate/a;formula='면적 × 겹수 ÷ 원장 면적';}
   else if(r.mode==='area'){quantity=area*rate;formula='면적 × 소요계수';}
   else if(r.mode==='film'){
    const roll=num(r.cover,'필름 폭',true),edge=num(c.edge,'한쪽 감싸기 여유',false),pw=w+2*edge,ph=h+2*edge;
    const across=Math.floor((roll+1e-9)/pw);
    if(across<1)throw Error('감싸기 포함 폭이 필름 폭보다 큽니다. 이음 계획에 따라 면을 나누어 계산해 주세요.');
    quantity=ceil(count/across)*ph*rate;formula='⌈면 수 ÷ 폭 방향 배치 수⌉ × 감싸기 포함 높이';
   }else if(r.mode==='fixed'){quantity=rate;formula='직접 소요량';}
   else throw Error('알 수 없는 산출 방식입니다.');
   quantity*=1+loss/100;
   const purchase=ceil(quantity/pack)*pack;
   if(!Number.isFinite(quantity)||!Number.isFinite(purchase))throw Error('소요량이 계산 범위를 초과했습니다.');
   const price=r.price===''||r.price==null?null:num(r.price,'단가',false);
   return {...r,quantity,purchase,formula,cost:price===null?null:quantity*price,buyCost:price===null?null:purchase*price};
  });
  const missing=rows.filter(r=>r.price===''||r.price==null),cost=missing.length?null:rows.reduce((a,r)=>a+r.cost,0),buyCost=missing.length?null:rows.reduce((a,r)=>a+r.buyCost,0);
  const base=c.costBasis==='purchase'?buyCost:cost;
  const opt=(v,l)=>v===''||v==null?null:num(v,l,false);
  const labor=opt(c.labor,'노무비'),extra=opt(c.extra,'기타비'),sale=opt(c.sale,'판매단가');
  const total=base===null||labor===null||extra===null?null:base+labor+extra;
  const revenue=sale===null?null:sale*basis;
  const gain=total===null||revenue===null||!c.taxChecked?null:revenue-total;
  const result={area,basis,unit:c.trade==='wood'?'m':'㎡',rows,missing:missing.map(r=>r.name),cost,buyCost,per:base===null?null:base/basis,total,revenue,gain,margin:gain===null||!revenue?null:gain/revenue*100,markup:gain===null||!total?null:gain/total*100};
  if([area,basis,cost,buyCost,total,revenue,gain].some(v=>v!==null&&!Number.isFinite(v)))throw Error('계산 범위를 초과했습니다. 입력값을 확인해 주세요.');
  return result;
 }
 const api={calculate};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.PriceCost=api;
})(typeof window==='undefined'?globalThis:window);
