(function(root){
 'use strict';
 const positive=(v,label)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<=0)throw Error(label+'을 입력해주세요');return v;};
 function split(mm,mode,value){positive(mm,'실측 길이');if(!Number.isInteger(mm))throw Error('길이는 정수 mm로 입력해주세요');
  let parts;
  if(mode==='direct'){parts=String(value).split(/[,+\s]+/).filter(Boolean).map(Number);if(!parts.length||parts.some(x=>!Number.isInteger(x)||x<=0)||parts.reduce((a,b)=>a+b,0)!==mm)throw Error('분할 길이 합계가 실측 길이와 같아야 합니다');}
  else if(mode==='equal'){positive(value,'분할 개수');if(!Number.isInteger(value)||value>100||value>mm)throw Error('분할 개수를 확인해주세요');parts=Array.from({length:value},(_,i)=>Math.floor(mm/value)+(i<mm%value?1:0));}
  else if(mode==='reference'){positive(value,'기준 길이');if(!Number.isInteger(value)||Math.ceil(mm/value)>100)throw Error('분할 기준을 확인해주세요');parts=Array.from({length:Math.ceil(mm/value)},(_,i)=>Math.min(value,mm-i*value));}
  else throw Error('분할 방법을 선택해주세요');return parts;
 }
 function power(rows,usablePercent,selectedW){positive(usablePercent,'사용률');if(usablePercent>100)throw Error('사용률은 100% 이하여야 합니다');if(!rows.length)throw Error('SMPS에 연결할 위치가 없습니다');
  const voltage=rows[0].voltage;if(![12,24].includes(voltage))throw Error('제품 전압을 확인해주세요');
  let watts=0;rows.forEach(r=>{if(r.kind==='T5')throw Error('T5는 제품 전원 사양을 별도로 확인해주세요');if(r.voltage!==voltage)throw Error('한 SMPS에 서로 다른 전압을 묶을 수 없습니다');watts+=positive(r.mm,'길이')/1000*positive(r.wattsPerM,'미터당 소비전력');});
  const requiredW=watts/(usablePercent/100);return {voltage,watts,requiredW,selectedW:selectedW||null,sufficient:typeof selectedW==='number'&&selectedW>=requiredW,currentA:watts/voltage};
 }
 const api={split,power};if(typeof module!=='undefined')module.exports=api;root.LightingCalc=api;
})(typeof window!=='undefined'?window:globalThis);
