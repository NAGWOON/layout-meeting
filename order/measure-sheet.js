/* 발주앱 · 업체별 발주서 몸통 (간접조명 · 르그랑 아펠라 · 융 LS990) — 2026-10-27 Claude (대표 승인 시안 「나」)
 * 발주 실측에서 담은 줄(item.measure 가 있는 줄)만으로 된 장이면, 목재식 「품명·규격·수량」 표 대신 업체가 보기 쉬운 모양으로 그립니다.
 *  · 머리(회사·수신·현장·납품·주소)와 특기사항은 a4Frame 그대로 — 여기는 가운데 몸통만
 *  · 모두 <table class="stbl"> 의 줄(tr)로 만듭니다 → A4Preview 가 줄 단위로 페이지를 나누고, 이미지·인쇄가 그대로 됩니다
 *  · 텍스트 복사·노션 줄글은 지금처럼 품명·규격 글 (item.spec 에 다 들어 있음)
 * 그림: wiring-kit.js (WiringKit) · 목록: wiring-order.js 가 받아 둔 노션 목록(window.WiringOrderCatalog)
 */
var MeasureSheet = (function () {
  'use strict';
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const fmt = n => Number(n).toLocaleString('ko-KR');
  const two = n => (n < 10 ? '0' : '') + n;
  const K = () => window.WiringKit;
  const cat = () => K() ? K().catalog(window.WiringOrderCatalog || null) : null;
  const catRow = (cols, t, sub) => `<tr class="cat"><td colspan="${cols}"><span>${esc(t)}${sub ? ' <small class="ms-sub">' + esc(sub) + '</small>' : ''}</span></td></tr>`;

  // 이 장의 줄이 모두 실측에서 왔고, 한 종류(조명 / 아펠라 / 융 / 기타)일 때만 업체 모양으로
  function kindOf(lines) {
    if (!lines.length || !lines.every(x => x.measure && x.measure.k)) return '';
    const ks = new Set(lines.map(x => x.measure.k === 'smps' ? 'light' : x.measure.k));
    return ks.size === 1 ? [...ks][0] : '';
  }

  function light(lines) {
    const rows = lines.filter(x => x.measure.k === 'light'), sm = lines.filter(x => x.measure.k === 'smps');
    const ev = Math.max(0, ...rows.map(x => x.measure.ev || 0));
    const max = Math.max(3000, ...rows.flatMap(x => x.measure.lens || [0]));
    let n = 0, total = 0, h = '<colgroup><col style="width:30px"><col><col style="width:118px"><col style="width:178px"><col style="width:42px"><col style="width:58px"></colgroup>'
      + '<thead><tr><th class="no">NO</th><th>위치</th><th>제품</th><th>길이 (mm)</th><th class="c">배선</th><th class="c">SMPS</th></tr></thead><tbody>';
    h += catRow(6, '간접조명 · 위치별 설치 길이', '현장 실측 · 조각 나누기는 업체 판단');
    rows.forEach(x => {
      const m = x.measure, lens = m.lens || [], over = ev && lens.some(v => v > ev);
      total += lens.reduce((a, b) => a + b, 0) * (Number(x.qty) || 1); n++;
      h += `<tr><td class="no">${two(n)}</td><td class="nm">${esc(m.room)} <span class="dim">${esc(m.loc)}</span>${Number(x.qty) > 1 ? ' <b class="ms-x">×' + x.qty + '</b>' : ''}</td><td class="ms-sm">${esc(m.product)}</td>`
        + `<td><div class="ms-mm">${lens.map(fmt).join(' / ')}${lens.length > 1 ? ' <small>' + lens.length + '구간</small>' : ''}${over ? ' <em>나눔</em>' : ''}</div><div class="ms-bars">${lens.map(v => `<i class="${ev && v > ev ? 'over' : ''}" style="width:${Math.max(4, v / max * 150)}px"></i>`).join('')}</div></td>`
        + `<td class="c">${m.wires == null ? '<small>확인</small>' : m.wires}</td><td class="c">${esc(String(m.smps || '').replace('SMPS ', '')) || '—'}</td></tr>`;
    });
    h += `<tr class="ms-sum"><td></td><td class="nm">합계</td><td></td><td class="ms-mm">${(total / 1000).toFixed(1)} m</td><td></td><td></td></tr>`;
    if (sm.length) {
      h += catRow(6, '전원 (SMPS)', '정격의 80%까지 사용 기준');
      sm.forEach(x => { const m = x.measure; n++;
        h += `<tr><td class="no">${two(n)}</td><td class="nm">${esc(m.name)} <span class="dim">· ${esc(m.v)}V ${esc(m.cap)}W</span></td><td class="ms-sm" colspan="2">놓을 곳 <b>${esc(m.place || '미정')}</b></td><td class="c" colspan="2"><small>${m.alone ? '가구 조명용' + (m.note ? ' · ' + esc(m.note) : '') : '부하 ' + esc(m.load) + 'W · ' + esc(m.count) + '곳'}</small>${Number(x.qty) > 1 ? ' <b class="ms-x">×' + x.qty + '</b>' : ''}</td></tr>`; });
    }
    h += '</tbody>';
    return {html: '<table class="stbl ms ms-light">' + h + '</table>', count: n};
  }

  function apella(lines) {
    const k = K(), c = cat(), groups = {스위치: [], 콘센트: [], 통신: []};
    lines.forEach(x => { const g = x.measure.gang || {}; (groups[g.k === '스위치' ? '스위치' : /랜|TV|전화/.test(g.k || '') ? '통신' : '콘센트']).push(x); });
    let n = 0, h = '<colgroup><col style="width:30px"><col style="width:48px"><col><col style="width:150px"><col style="width:66px"></colgroup>'
      + '<thead><tr><th class="no">NO</th><th></th><th>제품</th><th>색</th><th class="r">수량</th></tr></thead><tbody>';
    Object.entries(groups).forEach(([name, xs]) => {
      if (!xs.length) return;
      h += catRow(5, name, xs.reduce((a, x) => a + (Number(x.qty) || 0), 0) + '개');
      xs.forEach(x => { const m = x.measure, col = k && c ? k.colorOf(c, 'apella', m.color) : null; n++;
        const pic = k && c && m.gang ? k.draw(c, {brand: 'apella', gangs: [m.gang], color: m.color}, {maxW: 34, maxH: 46}) : '';
        h += `<tr><td class="no">${two(n)}</td><td class="ms-pic">${pic}</td><td class="nm">${esc(x.name.replace(/^아펠라 /, ''))}${m.gang && m.gang.k === '방우 콘센트' && !/방우/.test(x.name) ? ' <small class="ms-tag">방우형</small>' : ''}${m.modes ? ' <small class="ms-tag">' + esc(m.modes) + '</small>' : ''}${m.issue ? '<i class="ms-warn">⚠️ 확인 필요: ' + esc(m.issue) + '</i>' : ''}</td>`
          + `<td class="ms-sm">${col ? `<i class="ms-sw" style="background:${k.swatch(col)}"></i>` : ''}${esc(m.color || '색 미정')}</td><td class="qt">${x.qty}</td></tr>`; });
    });
    h += '</tbody>';
    return {html: '<table class="stbl ms ms-apella">' + h + '</table>', count: n};
  }

  function jung(lines) {
    const k = K(), c = cat(), frames = {}, parts = {};
    let h = '<colgroup><col style="width:50%"><col style="width:50%"></colgroup><thead><tr><th colspan="2">융 LS990 · 조합 ' + lines.length + '개 <span class="ms-th-sub">그림 = 실제 비율 · 왼쪽부터 ①②③</span></th></tr></thead><tbody>';
    const card = (x, i) => {
      const m = x.measure, q = Number(x.qty) || 1;
      frames[m.gangs.length + '구'] = (frames[m.gangs.length + '구'] || 0) + q;
      (m.parts || []).forEach(p => { parts[p] = (parts[p] || 0) + q; });
      const pic = k && c ? k.draw(c, {brand: 'jung', gangs: m.gangs, color: m.color}, {maxW: 300, maxH: 74}) : '';
      return `<td class="ms-card"><div class="ms-ph">${pic}</div><div class="ms-ct"><b>조합 ${i + 1} · ${esc(m.room)} ${esc(m.loc)}</b><span>× ${q}</span></div>`
        + `<ol>${(m.parts || []).map(p => `<li class="${/^확인 필요/.test(p) ? 'ms-warn' : ''}">${esc(p)}</li>`).join('')}</ol><div class="ms-meta">${m.gangs.length}구 프레임 · ${esc(m.colorOrder || m.color || '색 미정')}</div>`
        + (m.issue ? `<div class="ms-warn">⚠️ ${esc(m.issue)}</div>` : '') + '</td>';
    };
    for (let i = 0; i < lines.length; i += 2) h += '<tr class="ms-pair">' + card(lines[i], i) + (lines[i + 1] ? card(lines[i + 1], i + 1) : '<td></td>') + '</tr>';
    h += catRow(2, '합계') + `<tr class="ms-pair"><td class="ms-tot"><b>프레임</b><br>${Object.entries(frames).map(([a, b]) => esc(a) + ' × ' + b).join(' · ')}</td><td class="ms-tot"><b>기능</b><br>${Object.entries(parts).map(([a, b]) => esc(a) + ' × ' + b).join('<br>')}</td></tr></tbody>`;
    return {html: '<table class="stbl ms ms-jung">' + h + '</table>', count: lines.length};
  }

  function other(lines) {
    let n = 0, h = '<colgroup><col style="width:30px"><col><col style="width:150px"><col style="width:66px"></colgroup><thead><tr><th class="no">NO</th><th>제품</th><th>색 · 마감</th><th class="r">수량</th></tr></thead><tbody>';
    lines.forEach(x => { n++; h += `<tr><td class="no">${two(n)}</td><td class="nm">${esc(x.name)}${x.measure.where ? '<i>' + esc(x.measure.where) + '</i>' : ''}</td><td class="ms-sm">${esc(x.measure.color || '')}</td><td class="qt">${x.qty}</td></tr>`; });
    return {html: '<table class="stbl ms">' + h + '</tbody></table>', count: n};
  }

  // lines: 합치기() 한 줄들 → {html, count} 또는 null(업체 모양 아님 → 원래 표)
  function build(lines) {
    const kind = kindOf(lines);
    try {
      if (kind === 'light') return light(lines);
      if (kind === 'apella') return apella(lines);
      if (kind === 'jung') return jung(lines);
      if (kind === 'other') return other(lines);
    } catch (e) { console.warn('업체별 발주서를 못 그려 원래 표로 —', e); }
    return null;
  }
  return {build, kindOf};
})();
