/* 발주앱 · 콘센트·스위치 발주 (사무실) — 2026-10-26 Claude
 * 현장(보고앱)이 적은 판을 실물 그림으로 펼쳐 보고, 업체에 보낼 모양으로 정해 발주 초안에 담습니다.
 *  · 현장 원본은 고치지 않습니다. 사무실이 정한 색·구성·나누기는 노션 「주문 원본」에 저장(검토 저장)
 *  · 아펠라(대리점)는 같은 제품·같은 색을 한 줄로 합치고, 융(네오라이팅)은 자리마다 조합 하나
 *  · 목록에 없는 조합은 지어내지 않고 「확인 필요」로 남깁니다
 *  · 「발주 기록」 때 서버가 각 판에 발주 완료를 적습니다 (Order.gs 실측연결 → Wiring.gs)
 * 그림·목록·발주 규칙: wiring-kit.js (보고앱과 같은 파일)
 */
var WiringOrder = (function () {
  'use strict';
  const K = window.WiringKit;
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const clone = x => JSON.parse(JSON.stringify(x));
  const VENDOR = {apella: '르그랑 아펠라 (대리점)', jung: '융 LS990 (네오라이팅)', other: '기타 (직접 발주)'};
  const STALE = '그사이 현장이 바뀜 — 「노션 최신 다시 읽기」';
  let guard = '';
  let dialog, siteId = '', siteName = '', rows = [], cat = K.catalog(null), catNote = '', plans = {}, busy = false, filter = 'all', tab = 'apella', serverVer = '';

  const key = () => 'dsf_wiring_office:' + siteId;
  const keep = () => { try { localStorage.setItem(key(), JSON.stringify(plans)); } catch (e) { } };
  const say = (t, bad) => { const m = dialog.querySelector('[data-msg]'); if (m) { m.textContent = t || ''; m.classList.toggle('bad', !!bad); } };

  // 현장 기록 → 사무실 초안. 검토 뒤 현장이 바뀌었으면(현장 버전이 다르면) 현장 것으로 다시 시작
  function fieldGangs(r) { return r.gangs && r.gangs.length ? K.normalize(r.brand, r.gangs) : (K.fromLegacy(r.brand, r.modules, r.wet) || []); }
  function startPlan(r) {
    // 저장된 검토는 그때 본 현장(버전·변경표시)과 지금이 같을 때만 씀 (GPT R3). 검토 전 초안(reviewBase 없음)은 「사무실 초안」 표시와 함께 씀
    const okReview = r.reviewBase != null && r.reviewBase === r.fieldVersion && r.orderData && r.orderData.basisToken === r.fieldToken;
    const od = r.orderData && Array.isArray(r.orderData.lines) && r.orderData.lines.length && (r.reviewBase == null || okReview) ? r.orderData : null;
    const brand = (od && od.brand) || (K.BRANDS[r.brand] ? r.brand : 'apella');
    const lines = od ? od.lines.map(l => ({gangs: l.gangs && l.gangs.length ? K.normalize(brand, l.gangs) : fieldGangs(r), qty: Number(l.qty) || 1})) : [{gangs: fieldGangs(r), qty: r.qty}];
    return {use: true, brand, color: (od && od.color) || r.color || '', name: (od && od.name) || r.name || '', lines, base: r.fieldVersion, token: r.fieldToken, note: od && od.note || '', vnote: od && od.vnote || '',
      reloaded: !!(r.orderData && r.reviewBase != null && !okReview)};
  }

  function init() {
    if (dialog) return;
    dialog = document.createElement('dialog'); dialog.className = 'mo-dialog mo-wiring'; document.body.append(dialog);
    dialog.addEventListener('click', onClick); dialog.addEventListener('change', onChange);
  }
  async function open() {
    if (!S.site) return toast('현장을 먼저 선택해주세요');
    if (!K) return toast('배선기구 도구(wiring-kit.js)를 불러오지 못했습니다 — 새로고침 해주세요');
    init(); siteId = S.site.id; siteName = (S.site.name || '').replace(/\s*PROJECT\s*$/, '');
    try { plans = JSON.parse(localStorage.getItem(key()) || '{}'); } catch (e) { plans = {}; }
    dialog.showModal(); await load();
  }
  async function load(fresh) {
    if (busy) return; busy = true;
    if (!rows.length || fresh) dialog.innerHTML = '<div class="mo-wait">현장의 콘센트·스위치 실측을 불러오는 중입니다…</div>';
    try {
      const r = await api('wiringGet', {sitePageId: siteId});
      if (!r || !r.ok) throw Error((r && r.error) || '실측을 불러오지 못했습니다');
      serverVer = r.version || ''; guard = r.orderGuard || '';
      cat = K.catalog(r.catalog); window.WiringOrderCatalog = r.catalog || null; catNote = r.catalogError || (cat.source === 'default' ? '노션 목록을 아직 못 받아 기본 목록으로 보여 줍니다 (서버 업데이트 전)' : '');
      rows = r.rows.filter(x => x.kind === 'plate' && x.status !== 'removed');
      rows.forEach(x => { if (fresh || !plans[x.id] || plans[x.id].base !== x.fieldVersion || plans[x.id].token !== x.fieldToken) plans[x.id] = startPlan(x); });
      Object.keys(plans).forEach(id => { if (!rows.some(x => x.id === id)) delete plans[id]; });
      keep(); render();
      if (fresh) say('노션 최신 실측을 다시 읽었습니다');
    } catch (e) {
      dialog.innerHTML = `<div class="mo-wait"><p>${esc(e.message)}</p><button data-act="reload">다시 불러오기</button> <button data-act="close">닫기</button></div>`;
    } finally { busy = false; }
  }

  // ── 계산 ──
  const ordered = r => r.order && r.order.status === '발주 완료';
  function lineOrders(r) {
    const p = plans[r.id];
    return p.lines.map(l => K.order(cat, {brand: p.brand, color: p.color, name: p.name, gangs: l.gangs, qty: l.qty, room: r.room, location: r.location, id: r.id, site: siteId, revision: r.fieldVersion, token: r.fieldToken}));
  }
  function rowIssues(r) {
    const p = plans[r.id], out = [];
    lineOrders(r).forEach(o => o.issues.forEach(t => { if (!out.includes(t)) out.push(t); }));
    if (r.status === 'unknown') out.push('현장에서 「모름」 — 사진·메모로 구성 확인');
    if (r.status === 'pending') out.push('현장 확인 전 (사무실이 적어둔 것)');
    if (p.reloaded) out.push('검토 뒤 현장이 바뀌어 현장 것으로 다시 불러옴');
    if (p.base !== r.fieldVersion || p.token !== r.fieldToken) out.push(STALE);
    return out;
  }
  // 발주서 줄에 실을 사유 — 「다시 불러옴」은 사무실 안내라 빼고, 나머지는 업체도 봐야 할 것 (GPT R1-8)
  const orderIssues = r => rowIssues(r).filter(t => !/다시 불러옴|목록에 맞는 제품 없음/.test(t) && t !== STALE);   // 제품 없음은 줄에 이미 「확인 필요:」로 찍힘
  function preview() {
    const by = {apella: [], jung: [], other: []};
    rows.filter(r => !ordered(r) && plans[r.id].use).forEach(r => { const iss = orderIssues(r), p = plans[r.id]; lineOrders(r).forEach((o, li) => o.lines.forEach(l => { if (p.vnote) l.spec += ' · 메모: ' + p.vnote; if (iss.length) l.spec += ' · ⚠️ 확인 필요: ' + iss.join(' / '); (by[o.vendor] || by.other).push(Object.assign(l, {where: r.room + ' ' + r.location, measure: sheetMeta(o.vendor, r, p, p.lines[li], l, iss)})); })); });
    by.apella = K.merge(by.apella); by.other = K.merge(by.other);
    return by;
  }
  // 업체별 발주서(measure-sheet.js)가 그림·색·부품 목록을 그릴 재료 — 글(spec)은 그대로 두고 따로 실음
  function sheetMeta(vendor, r, p, line, l, iss) {
    const g = line.gangs, issue = iss.join(' / ');
    if (vendor === 'jung') return {k: 'jung', gangs: g, color: p.color, colorOrder: l.spec.split(' · ')[0], room: r.room, loc: r.location, issue,
      note: p.vnote || '',
      parts: g.map(x => { if (x.skip) return '발주 안 함: ' + K.partName('jung', x) + (x.memo ? ' — ' + x.memo : ''); const q = K.findPart(cat, 'jung', x); return q ? q.order + ((q.modes || []).length > 1 && x.modes ? ' [' + x.modes.join('·') + ']' : '') : '확인 필요: ' + K.partName('jung', x); })};
    if (vendor === 'apella') return {k: 'apella', gang: g[0], color: p.color, issue, note: p.vnote || '', modes: g[0].modes && g[0].modes.some(m => m !== '단로') ? g[0].modes.join('·') : ''};
    return {k: 'other', color: p.color, where: ''};
  }
  // 융: 네오 조합 프로그램에 넣을 때 쓰는 합계 (프레임 크기별 · 기능별)
  function jungTotals() {
    const frames = {}, parts = {};
    rows.filter(r => !ordered(r) && plans[r.id].use && plans[r.id].brand === 'jung').forEach(r => plans[r.id].lines.forEach(l => {
      frames[l.gangs.length + '구'] = (frames[l.gangs.length + '구'] || 0) + l.qty;
      l.gangs.forEach(g => { if (g.skip) return; const p = K.findPart(cat, 'jung', g), nm = p ? p.order : '확인 필요: ' + K.partName('jung', g); parts[nm] = (parts[nm] || 0) + l.qty; });
    }));
    return {frames, parts};
  }

  // ── 그리기 ──
  const opt = (v, cur, label) => `<option value="${esc(v)}" ${v === cur ? 'selected' : ''}>${esc(label ?? v)}</option>`;
  function gangEditor(r, li, gi, g, brand) {
    const kinds = brand === 'jung' ? K.KINDS.filter(k => k !== '토글' && k !== 'TV+랜') : brand === 'other' ? K.KINDS : K.KINDS.filter(k => k !== '토글' && k !== '보일러');
    const id = `${r.id}|${li}|${gi}`;
    return `<span class="mo-gang"><select data-g="k" data-at="${id}">${kinds.map(k => opt(k, g.k)).join('')}</select>`
      + `<select data-g="n" data-at="${id}" title="구 수 · 스위치는 회로 수">${[1, 2, 3, 4].map(n => opt(String(n), String(g.n), n + (g.k === '스위치' && brand === 'jung' ? '회로' : '구'))).join('')}</select>`
      + (g.modes ? g.modes.map((m, mi) => `<select data-g="m${mi}" data-at="${id}" class="mo-mode">${K.MODES.map(x => opt(x, m)).join('')}</select>`).join('') : '')
      + (g.k === '방우 콘센트' ? `<select data-g="dir" data-at="${id}" class="mo-mode" title="방우 콘센트 방향">${['세로', '가로'].map(x => opt(x, g.dir || '세로', x + '형')).join('')}</select>` : '')
      + (brand === 'jung' ? `<button class="mo-skip ${g.skip ? 'on' : ''}" data-act="gskip" data-at="${id}" title="이 구를 발주에서 뺍니다 (예: 온도조절기 업체가 시공)">${g.skip ? '발주 안 함' : '발주'}</button>`
        + (g.skip ? `<input data-g="memo" data-at="${id}" value="${esc(g.memo || '')}" placeholder="이유 (예: 온도조절기 업체 시공)" class="mo-memo">` : '')
        + `<button class="mo-x" data-act="gdel" data-at="${id}" title="이 구 빼기">×</button>` : '') + '</span>';
  }
  function rowHtml(r) {
    const p = plans[r.id], done = ordered(r), iss = done ? [] : rowIssues(r), sumQty = p.lines.reduce((a, l) => a + l.qty, 0);
    const cols = cat.colors(p.brand), first = p.lines[0];
    const pic = K.draw(cat, {brand: p.brand, gangs: first.gangs, color: p.color}, {px: 1, maxW: 244, maxH: 112, flag: 1});
    return `<section class="mo-row ${done ? 'done' : ''} ${!p.use ? 'off' : ''} ${iss.length ? 'warn' : ''}" data-row="${esc(r.id)}">
      <label class="mo-use"><input type="checkbox" data-act="use" ${p.use && !done ? 'checked' : ''} ${done ? 'disabled' : ''}></label>
      <div class="mo-pic">${pic}</div>
      <div class="mo-info"><b>${esc(r.location)}</b> <span class="mo-q">×${r.qty}</span>
        <small>현장: ${esc(r.summary || '(구성 없음)')}${r.memo ? ' · 메모 「' + esc(r.memo) + '」' : ''}${r.photos && r.photos.length ? ` · <a href="${esc(r.photos[0].url)}" target="_blank" rel="noopener">사진</a>` : ''}</small>
        ${done ? `<small class="mo-ok">발주 완료 · ${esc(r.order.no)}</small>` : iss.map(t => `<span class="mo-chip">${esc(t)}</span>`).join('')}</div>
      ${done ? '' : `<div class="mo-ctl">
        <div class="mo-line1"><select data-act="brand">${Object.keys(K.BRANDS).map(b => opt(b, p.brand, K.BRANDS[b])).join('')}</select>
        <select data-act="color" class="${p.color ? '' : 'need'}"><option value="">색 고르기</option>${cols.map(c => opt(c.name, p.color)).join('')}${p.color && !cols.some(c => c.name === p.color) ? opt(p.color, p.color, p.color + ' (목록에 없음)') : ''}</select>
        ${p.brand === 'other' ? `<input data-act="name" value="${esc(p.name)}" placeholder="제품 이름">` : ''}</div>
        ${p.lines.map((l, li) => `<div class="mo-line">${p.brand === 'jung' ? `<select data-act="frame" data-at="${r.id}|${li}" class="mo-frame" title="프레임 크기 — 키우면 빈 자리(막음)가 생기고, 그 자리를 바꿔 쓰면 됩니다">${[1, 2, 3, 4, 5].map(n => opt(String(n), String(l.gangs.length), '프레임 ' + n + '구')).join('')}</select>` : ''}${l.gangs.map((g, gi) => gangEditor(r, li, gi, g, p.brand)).join(p.brand === 'jung' ? '<i>+</i>' : '')}
          ${p.brand === 'jung' && l.gangs.length < 5 ? `<button class="mo-add" data-act="gadd" data-at="${r.id}|${li}">＋ 구</button>` : ''}
          <span class="mo-qty"><input type="number" min="1" max="99" value="${l.qty}" data-act="qty" data-at="${r.id}|${li}">개</span>
          ${p.lines.length > 1 ? `<button class="mo-x" data-act="ldel" data-at="${r.id}|${li}" title="이 줄 빼기">×</button>` : ''}</div>`).join('')}
        ${p.note ? `<small class="mo-note">사무실 메모 · ${esc(p.note)}</small>` : ''}
        <label class="mo-notein">발주서 메모 <input data-act="vnote" value="${esc(p.vnote || '')}" placeholder="업체에 전할 말 (예: 온도조절기는 업체가 따로 시공)"></label>
        <div class="mo-line2"><button class="mo-link" data-act="split">＋ 다른 구성으로 나누기</button>${sumQty !== r.qty ? `<span class="mo-chip info">현장 ${r.qty}개 → 주문 ${sumQty}개</span>` : ''}<button class="mo-link" data-act="reset">현장 것으로 되돌리기</button></div>
      </div>`}</section>`;
  }
  function previewHtml() {
    const by = preview(), list = by[tab] || [], jt = tab === 'jung' ? jungTotals() : null;
    const head = Object.keys(VENDOR).map(v => `<button class="${tab === v ? 'on' : ''}" data-act="tab" data-v="${v}">${VENDOR[v].split(' (')[0]} <b>${by[v].reduce((a, x) => a + x.qty, 0)}</b></button>`).join('');
    const body = !list.length ? '<p class="mo-empty">담을 것이 없습니다</p>' : `<table>${list.map(x => `<tr><td><b>${esc(x.name)}</b><small>${esc(x.spec)}${x.where && !x.combo ? '' : ''}</small></td><td>${x.qty}${esc(x.unit)}</td></tr>`).join('')}</table>`
      + (jt ? `<div class="mo-sum"><b>네오 조합 프로그램에 넣을 합계</b><br>프레임 ${Object.entries(jt.frames).map(([k, v]) => k + ' ' + v).join(' · ')}<br>${Object.entries(jt.parts).map(([k, v]) => esc(k) + ' ' + v).join('<br>')}</div><button data-act="copy">융 조합 목록 복사</button>` : '');
    return `<div class="mo-tabs">${head}</div>${body}`;
  }
  // 다시 그려도 보던 자리 그대로 (10/27 대표 「누를 때마다 맨 위로 올라가서 불편」) — 왼쪽 목록·오른쪽 칸의 스크롤을 기억했다가 되돌림
  function render() {
    const pos = ['.mo-body>main', '.mo-body>aside'].map(q => { const n = dialog && dialog.querySelector(q); return n ? n.scrollTop : 0; });
    render0();
    ['.mo-body>main', '.mo-body>aside'].forEach((q, i) => { const n = dialog.querySelector(q); if (n) n.scrollTop = pos[i]; });
  }
  function render0() {
    const live = rows.filter(r => !ordered(r)), used = live.filter(r => plans[r.id].use), warn = used.filter(r => rowIssues(r).length);
    const noColor = used.filter(r => !plans[r.id].color);
    const rooms = []; rows.forEach(r => { if (!rooms.includes(r.room)) rooms.push(r.room); });
    const shown = r => filter === 'all' || (filter === 'warn' && !ordered(r) && plans[r.id].use && rowIssues(r).length);
    dialog.innerHTML = `<header class="mo-head"><div><small>발주 실측 · 사무실 · ${esc(siteName)}</small><h2>콘센트·스위치 발주</h2></div>
      <div class="mo-tot"><span><b>${used.length}</b>종</span><span><b>${used.reduce((a, r) => a + plans[r.id].lines.reduce((s, l) => s + l.qty, 0), 0)}</b>개</span><span class="${warn.length ? 'bad' : ''}"><b>${warn.length}</b>확인 필요</span></div>
      <div class="mo-headbtn"><button data-act="reload">노션 최신 다시 읽기</button><button data-act="close">닫기</button></div></header>
      ${catNote ? `<p class="mo-banner">${esc(catNote)}</p>` : ''}${serverVer && serverVer !== 'wiring2' ? '<p class="mo-banner">서버가 아직 옛 판입니다 — 색·구성 상세·검토 저장은 Wiring.gs 배포 뒤에 됩니다. 지금 정한 것은 이 컴퓨터에 보관됩니다.</p>' : ''}
      <div class="mo-tools">${noColor.length ? `<span>색 미정 <b>${noColor.length}</b>곳 →</span>${['apella', 'jung', 'other'].filter(b => noColor.some(r => plans[r.id].brand === b)).map(b => `<label>${K.BRANDS[b]} <select data-act="bulk" data-b="${b}"><option value="">고르기</option>${cat.colors(b).map(c => opt(c.name, '')).join('')}</select></label>`).join('')}<button data-act="bulkgo">색 미정에 한꺼번에</button>` : '<span class="mo-ok">모든 판의 색이 정해졌습니다</span>'}
        <span class="mo-flt"><button class="${filter === 'all' ? 'on' : ''}" data-act="flt" data-f="all">전체</button><button class="${filter === 'warn' ? 'on' : ''}" data-act="flt" data-f="warn">확인 필요만 ${warn.length}</button></span></div>
      <div class="mo-body"><main>${rooms.map(rm => { const rs = rows.filter(r => r.room === rm && shown(r)); return rs.length ? `<h3>${esc(rm)} <small>${rs.length}종</small></h3>` + rs.map(rowHtml).join('') : ''; }).join('') || '<p class="mo-empty">보여 줄 판이 없습니다</p>'}</main>
      <aside><h4>발주 미리보기</h4>${previewHtml()}<div data-msg role="status"></div>
        <div class="mo-actions"><button data-act="save">검토 저장 (노션)</button><button class="pri" data-act="import">발주 초안에 담기 — 업체별 장으로</button></div>
        <small>그림은 실제 비율(융 1구 81mm · 아펠라 세로판은 비율 참고). 「확인 필요」가 남아도 담을 수는 있지만, 발주서에 「확인 필요」 글자가 그대로 나갑니다.</small></aside></div>`;
  }

  // ── 고치기 ──
  const at = s => { const [id, li, gi] = String(s).split('|'); return {id, li: +li, gi: +gi, p: plans[id]}; };
  function onChange(e) {
    const t = e.target, card = t.closest('[data-row]'), p = card ? plans[card.dataset.row] : null;
    if (t.dataset.act === 'use' && p) p.use = t.checked;
    else if (t.dataset.act === 'brand' && p) { p.brand = t.value; p.color = cat.colors(p.brand).some(c => c.name === p.color) ? p.color : ''; p.lines.forEach(l => { l.gangs = K.normalize(p.brand, l.gangs); }); }
    else if (t.dataset.act === 'color' && p) p.color = t.value;
    else if (t.dataset.act === 'name' && p) p.name = t.value.trim();
    else if (t.dataset.act === 'vnote' && p) p.vnote = t.value.trim();   // 업체에 나가는 메모 — 사무실 안 메모(note)와 따로
    else if (t.dataset.act === 'frame') {   // 융 프레임 크기를 사람이 정함 (10/27 대표) — 늘리면 「막음」 자리, 줄이면 뒤에서부터 뺌
      // 늘릴 때: 여러 회로 스위치를 1회로 스위치로 하나씩 떼어 냄 (2회로 단로·3로 → 프레임 2구 = 1회로 단로 + 1회로 3로) · 더 뗄 게 없으면 막음
      // 줄일 때: 뒤의 1회로 스위치를 앞 스위치에 도로 합침 (회로 4까지) · 아니면 뒤에서부터 뺌
      const a = at(t.dataset.at), l = a.p.lines[a.li], want = Math.max(1, Math.min(5, +t.value)), G = l.gangs;
      while (G.length < want) {
        const i = G.findIndex(g => g.k === '스위치' && g.n > 1);
        if (i < 0) { G.push({k: '막음', n: 1}); continue; }
        const g = G[i], modes = (g.modes || []).slice(), last = modes.pop() || '단로';
        G.splice(i, 1, Object.assign({}, g, {n: g.n - 1, modes}), {k: '스위치', n: 1, modes: [last]});
      }
      while (G.length > want) {
        const x = G[G.length - 1], y = G[G.length - 2];
        if (x.k === '막음') { G.pop(); continue; }
        if (y && x.k === '스위치' && y.k === '스위치' && y.n + x.n <= 4) { y.modes = (y.modes || []).concat(x.modes || []); y.n += x.n; G.pop(); continue; }
        G.pop();
      }
      l.gangs = K.normalize(a.p.brand, G);
    }
    else if (t.dataset.act === 'qty') { const a = at(t.dataset.at); a.p.lines[a.li].qty = Math.max(1, Math.min(99, Math.round(Number(t.value) || 1))); }
    else if (t.dataset.g) {
      const a = at(t.dataset.at), g = a.p.lines[a.li].gangs[a.gi];
      if (t.dataset.g === 'k') g.k = t.value; else if (t.dataset.g === 'n') g.n = +t.value; else if (t.dataset.g === 'dir') g.dir = t.value; else if (t.dataset.g === 'memo') g.memo = t.value.trim(); else g.modes[+t.dataset.g.slice(1)] = t.value;
      a.p.lines[a.li].gangs = K.normalize(a.p.brand, a.p.lines[a.li].gangs);
    } else return;
    keep(); render();
  }
  async function onClick(e) {
    const b = e.target.closest('button'); if (!b || busy) return;
    const act = b.dataset.act, card = b.closest('[data-row]'), p = card ? plans[card.dataset.row] : null;
    if (act === 'close') return dialog.close();
    if (act === 'reload') return load(true);
    if (act === 'tab') { tab = b.dataset.v; return render(); }
    if (act === 'flt') { filter = b.dataset.f; return render(); }
    if (act === 'bulkgo') {
      let n = 0; dialog.querySelectorAll('[data-act="bulk"]').forEach(s => { if (!s.value) return; rows.forEach(r => { const q = plans[r.id]; if (!ordered(r) && q.use && !q.color && q.brand === s.dataset.b) { q.color = s.value; n++; } }); });
      keep(); render(); return say(n ? '색 미정 ' + n + '곳에 색을 넣었습니다 — 「검토 저장」을 눌러야 노션에 남습니다' : '넣을 색을 먼저 골라주세요', !n);
    }
    if (act === 'gskip') { const a = at(b.dataset.at); const g = a.p.lines[a.li].gangs[a.gi]; g.skip = !g.skip; if (!g.skip) delete g.memo; }
    else if (act === 'gadd') { const a = at(b.dataset.at); a.p.lines[a.li].gangs.push({k: '스위치', n: 1, modes: ['단로']}); }
    else if (act === 'gdel') { const a = at(b.dataset.at); const l = a.p.lines[a.li]; if (l.gangs.length > 1) l.gangs.splice(a.gi, 1); }
    else if (act === 'ldel') { const a = at(b.dataset.at); a.p.lines.splice(a.li, 1); }
    else if (act === 'split' && p) { const f = p.lines[0]; if (f.qty > 1) f.qty--; p.lines.push({gangs: clone(f.gangs), qty: 1}); }
    else if (act === 'reset' && p) { plans[card.dataset.row] = startPlan(Object.assign({}, rows.find(x => x.id === card.dataset.row), {orderData: null})); }
    else if (act === 'copy') return copyJung();
    else if (act === 'save') return saveReview();
    else if (act === 'import') return importDraft();
    else return;
    keep(); render();
  }
  function copyJung() {
    const by = preview(), jt = jungTotals();
    const t = `[융 LS990 조합] ${siteName}\n` + by.jung.map((x, i) => `${i + 1}. ${x.name} — ${x.spec} × ${x.qty}`).join('\n')
      + `\n\n프레임 ${Object.entries(jt.frames).map(([k, v]) => k + ' ' + v).join(' · ')}\n` + Object.entries(jt.parts).map(([k, v]) => '· ' + k + ' ' + v).join('\n');
    const done = () => say('융 조합 목록을 복사했습니다 — 네오 조합 프로그램이나 카톡에 붙여넣으세요');
    if (navigator.clipboard) navigator.clipboard.writeText(t).then(done, () => say('복사하지 못했습니다', true)); else say('이 브라우저는 복사를 못 합니다', true);
  }

  // 노션에 「주문 원본·주문 구성·검토」 저장 — 현장 칸은 안 건드립니다
  async function saveReview() {
    const live = rows.filter(r => !ordered(r) && plans[r.id].use);
    if (!live.length) return say('저장할 판이 없습니다', true);
    busy = true; say('노션에 검토를 저장하는 중…');
    try {
      const items = live.map(r => { const p = plans[r.id], iss = rowIssues(r);
        return {id: r.id, fieldVersion: p.base, fieldToken: p.token, review: iss.length ? '확인 필요' : '검토 완료',
          orderSpec: lineOrders(r).map(o => o.lines.map(l => l.name + ' · ' + l.spec + ' ×' + l.qty).join(' / ')).join(' / ').slice(0, 500),
          orderData: {v: 1, brand: p.brand, color: p.color, name: p.name, lines: p.lines, note: p.note, vnote: p.vnote || ''}}; });
      const r = await api('wiringReview', {sitePageId: siteId, items});
      if (!r || !r.ok) throw Error((r && r.error) || '저장하지 못했습니다');
      const extra = [r.changed.length ? '현장이 그사이 바꾼 ' + r.changed.length + '곳은 저장 안 함(다시 읽어 주세요): ' + r.changed.join(', ') : '', r.ordered.length ? '이미 발주된 ' + r.ordered.length + '곳 제외' : '', r.missing.length ? '노션에서 못 찾은 ' + r.missing.length + '곳' : ''].filter(Boolean).join(' · ');
      rows = r.rows.filter(x => x.kind === 'plate' && x.status !== 'removed');   // 기준(base·token)은 그대로 — 현장이 바뀐 판은 「그사이 현장이 바뀜」으로 남아 담기를 막음 (GPT R1-4)
      keep(); busy = false; render(); say('노션에 ' + r.saved + '곳 저장했습니다' + (extra ? ' · ' + extra : ''), !!extra);
    } catch (e) {
      busy = false;
      say(/페이지 id|unknown|wiringReview/i.test(e.message) ? '서버가 아직 옛 판이라 노션 저장이 안 됩니다 — Wiring.gs·Code.gs 배포 뒤 다시 눌러주세요. 지금 정한 것은 이 컴퓨터에 보관돼 있습니다' : e.message, true);
    }
  }

  async function importDraft() {
    if (!S.site || S.site.id !== siteId) return say('현장이 바뀌었습니다. 다시 열어주세요', true);
    const by = preview(), vendors = Object.keys(by).filter(v => by[v].length);
    if (!vendors.length) return say('담을 판이 없습니다', true);
    if (serverVer !== 'wiring2' || guard !== 'recheck2') return say('서버(Wiring.gs·Order.gs)를 새로 올린 뒤에 담을 수 있습니다 — 발주 기록 직전 실측 재확인이 아직 없습니다', true);
    if (S.extra.some(z => z.qty > 0 && (z.sources || []).some(s => s.kind === 'wiring' && s.site === siteId))) return say('이 현장의 콘센트·스위치가 이미 발주 초안에 있습니다 — 기존 초안을 확인해주세요', true);
    busy = true; say('노션 원본과 한 번 더 맞춰 보는 중…');
    try {
      const live = await api('wiringGet', {sitePageId: siteId});
      if (!live || !live.ok) throw Error((live && live.error) || '원본을 다시 읽지 못했습니다');
      const changed = rows.filter(r => !ordered(r) && plans[r.id].use).filter(r => { const x = live.rows.find(z => z.id === r.id), p = plans[r.id]; return !x || x.fieldVersion !== p.base || x.fieldToken !== p.token || ordered(x); });
      if (changed.length) throw Error('그사이 현장에서 바뀐(또는 발주된) 판이 있습니다: ' + changed.map(r => r.room + ' ' + r.location).join(', ') + ' — 「노션 최신 다시 읽기」 후 담아주세요');
      let sheet = Math.max(...sheetsUsed(), ...Object.keys(S.done).map(Number), 0);
      const jt = jungTotals(), group = {apella: '콘센트·스위치 · 르그랑 아펠라', jung: '콘센트·스위치 · 융 LS990', other: '콘센트·스위치 · 기타'};
      vendors.forEach(v => {
        sheet++; S.typeBy[sheet] = '조명·스위치';
        by[v].forEach((x, i) => { const item = {id: 'wiring-' + v + '-' + siteId.slice(0, 8) + '-' + i + '-' + Date.now().toString(36), name: v === 'jung' ? '조합 · ' + x.name : x.name, spec: x.spec, cut: '', unit: x.unit, qty: x.qty, type: '조명·스위치', group: group[v], sources: x.sources,
          measure: Object.assign({}, x.measure, v === 'other' ? {where: [].concat(x.where || []).join(', ')} : {})};
          S.extra.push(item); S.sheetNo[keyOf(item)] = sheet; });
        S.noteBy[sheet] = v === 'jung' ? '네오라이팅 조합 기준 · 프레임 ' + Object.entries(jt.frames).map(([k, n]) => k + ' ' + n).join(' · ') + ' · 「확인 필요」 표시는 통화로 확인 부탁드립니다'
          : v === 'apella' ? '색은 품목마다 적었습니다 · 방우는 방우형으로 부탁드립니다' : '제품 이름·색은 현장 사진 기준 — 비슷한 제품이면 사진 보내드립니다';
      });
      S.cur = sheet - vendors.length + 1; setType('조명·스위치'); renderItems(); draw(); bar(); side();
      busy = false; dialog.close();
      toast(vendors.length + '개 업체 장으로 담았습니다 (' + vendors.map(v => VENDOR[v].split(' (')[0]).join(' · ') + ') — 장마다 거래처를 고르고 발주 기록을 눌러주세요');
    } catch (e) { busy = false; say(e.message, true); }
  }
  return {open};
})();
