/* 발주앱 · 간접조명 SMPS 배치·발주 (사무실) — 2026-10-26 Claude (10/22 GPT 검토창을 다시 짬)
 * 현장 실측(보고앱)을 보고 ① 발주 길이 ② 제품·전력 ③ SMPS 를 눈으로 묶은 뒤 발주 초안에 담습니다.
 *  · 조각 나누기는 업체가 합니다(대표 10/26). 우리는 위치별 길이 + 엘리베이터 크기를 넘깁니다.
 *    엘리베이터에 통째로 안 들어가는 길이만 「나눠서(반반 또는 2400 + 재단)」라고 적습니다.
 *  · 정한 것은 노션 간접조명 실측의 사무실 칸에 저장(SMPS 묶음·위치·정격·발주 길이·W/m) — 다른 컴퓨터에서도 이어짐
 *  · 현장 칸(실측 길이·배선·메모)은 고치지 않습니다. 발주 완료된 위치는 담지 않습니다.
 *  · 「발주 기록」 때 서버가 각 위치에 발주 완료를 적습니다 (Order.gs 실측연결 → Lighting.gs)
 * 계산: lighting-calc.js (SMPS 부하·필요 정격)
 */
var LightingOrder = (function () {
  'use strict';
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const NO = '①②③④⑤⑥⑦⑧⑨⑩', CAPS = [60, 100, 150, 200, 250, 300, 350, 400, 500], NONE = '전원 내장';
  let dialog, siteId = '', siteName = '', rows = [], P = {}, W = {}, G = [], sel = '', busy = false, dirty = false, serverVer = '';
  const key = () => 'dsf_lighting_smps:' + siteId;
  const keep = () => { dirty = true; try { localStorage.setItem(key(), JSON.stringify({P, W, G, dirty: true, at: Date.now()})); } catch (e) { } };
  const say = (t, bad) => { const m = dialog.querySelector('[data-msg]'); if (m) { m.textContent = t || ''; m.classList.toggle('bad', !!bad); } };
  const fmt = n => Number(n).toLocaleString('ko-KR');
  const ordered = r => r.order && r.order.status === '발주 완료';
  // 현장이 길이 대신 1 같은 자리표시를 적었거나 도면 확인 위치 → 도면 길이를 사무실이 넣어야 함
  const needsDrawing = r => !r.needsMeasurement || r.segments.every(s => !s.mm || s.mm <= 1);
  const lens = r => String(P[r.id].lengths || '').split('/').map(x => Number(String(x).trim())).filter(x => x > 0);
  const total = r => lens(r).reduce((a, b) => a + b, 0);
  // 메모에서 「300mm 빼서」·「300 짧게」 같은 말을 찾아 제안만 합니다 (자동으로 빼지 않음)
  function memoCut(r) { const m = /(\d{2,4})\s*(?:mm)?\s*(?:정도\s*)?(?:빼|짧게|줄여|덜)/.exec(r.note || ''); return m ? Number(m[1]) : 0; }

  function elev() {
    const n = typeof elevNums === 'function' ? elevNums() : {}, f = window.DFCalc && DFCalc.반입 ? DFCalc.반입(Object.assign({}, n, {여유: S.safe})) : null;
    return {n, long: f ? f.long : 0, text: typeof elevText === 'function' ? elevText() : ''};
  }

  function init() { if (dialog) return; dialog = document.createElement('dialog'); dialog.className = 'mo-dialog mo-light'; document.body.append(dialog); dialog.addEventListener('click', onClick); dialog.addEventListener('change', onChange); dialog.addEventListener('input', onInput); }
  async function open() { if (!S.site) return toast('현장을 먼저 선택해주세요'); init(); siteId = S.site.id; siteName = (S.site.name || '').replace(/\s*PROJECT\s*$/, ''); dialog.showModal(); await load(); }
  async function load(fresh) {
    if (busy) return; busy = true;
    if (!rows.length || fresh) dialog.innerHTML = '<div class="mo-wait">현장의 간접조명 실측을 불러오는 중입니다…</div>';
    try {
      const r = await api('lightingGet', {sitePageId: siteId});
      if (!r || !r.ok) throw Error((r && r.error) || '실측을 불러오지 못했습니다');
      serverVer = r.version || '';
      rows = r.document.rows.filter(x => x.status === 'done' || (x.status === 'pending' && x.needsMeasurement === false));
      let local = null; try { local = JSON.parse(localStorage.getItem(key()) || 'null'); } catch (e) { }
      const fromNotion = rows.some(x => x.office && (x.office.smpsGroup || x.office.orderLengths));
      if (local && local.dirty && !fresh) { P = local.P || {}; W = local.W || {}; G = local.G || []; dirty = true; }
      else { P = {}; W = {}; G = []; dirty = false; }
      // 노션의 사무실 칸 → 화면 (노션이 원본. 이 컴퓨터에 저장 안 한 고침이 있으면 그것을 이어서)
      rows.forEach(x => {
        const o = x.office || {};
        if (!P[x.id]) P[x.id] = {use: !ordered(x), product: x.product || '', lengths: o.orderLengths || (needsDrawing(x) ? '' : x.segments.map(s => s.mm).join('/')), group: o.smpsGroup || ''};
        const pr = P[x.id].product;
        if (pr && !W[pr]) W[pr] = {w: o.wattsPerM ?? '', v: o.voltage || 24};
        if (o.smpsGroup && o.smpsGroup !== NONE && !G.some(g => g.name === o.smpsGroup)) G.push({name: o.smpsGroup, place: o.smpsPlace || '', cap: o.smpsCap || 150, util: o.utilization || 80});
      });
      if (!G.length) G.push({name: 'SMPS ①', place: '', cap: 150, util: 80});
      render();
      say(dirty ? '저장 안 한 고침을 이어서 엽니다 — 「노션에 저장」을 눌러야 다른 컴퓨터에도 보입니다' : fromNotion ? '노션에 저장된 SMPS 배치를 불러왔습니다' : '위치를 눌러 고른 뒤 SMPS 카드를 누르면 묶입니다');
    } catch (e) { dialog.innerHTML = `<div class="mo-wait"><p>${esc(e.message)}</p><button data-act="reload">다시 불러오기</button> <button data-act="close">닫기</button></div>`; }
    finally { busy = false; }
  }

  // ── 계산 ──
  const live = () => rows.filter(r => !ordered(r) && P[r.id].use);
  const watts = r => { const w = W[P[r.id].product]; return w && Number(w.w) > 0 ? total(r) / 1000 * Number(w.w) : 0; };
  function groupLoad(g) {
    const rs = live().filter(r => P[r.id].group === g.name), load = rs.reduce((a, r) => a + watts(r), 0), lim = g.cap * g.util / 100;
    const volts = [...new Set(rs.map(r => Number((W[P[r.id].product] || {}).v) || 24))];
    return {rs, load, lim, need: load / (g.util / 100), ok: load <= lim && volts.length <= 1, volts};
  }
  function problems() {
    const out = [];
    live().forEach(r => {
      const p = P[r.id], nm = r.room + ' ' + r.location, l = lens(r);
      if (!p.product) out.push(nm + ': 조명 종류');
      if (!l.length) out.push(nm + ': ' + (needsDrawing(r) ? '도면 길이' : '발주 길이'));
      else if (!needsDrawing(r) && l.length !== r.segments.length) out.push(nm + ': 구간 ' + r.segments.length + '개인데 길이 ' + l.length + '개');
      if (!p.group) out.push(nm + ': SMPS 안 정함');
      else if (p.group !== NONE && !(Number((W[p.product] || {}).w) > 0)) out.push(p.product + ': W/m');
    });
    G.forEach(g => { const s = groupLoad(g); if (!s.rs.length) return; if (!g.place) out.push(g.name + ': 놓을 곳'); if (s.volts.length > 1) out.push(g.name + ': 전압이 섞임'); else if (!s.ok) out.push(g.name + ': 용량 부족 (필요 ' + Math.ceil(s.need) + 'W)'); });
    return [...new Set(out)];
  }

  // ── 그리기 ──
  const MAXMM = () => Math.max(3000, ...rows.map(r => Math.max(...(lens(r).length ? lens(r) : [0]))));
  function strips(r, ev) {
    const max = MAXMM(), l = lens(r);
    if (!l.length) return `<div class="mo-strip none">${needsDrawing(r) ? '도면 길이를 넣어주세요' : '길이 없음'}</div>`;
    return l.map((mm, i) => `<div class="mo-strip"><i style="width:${Math.min(100, mm / max * 100)}%" class="${ev && mm > ev ? 'over' : ''}"></i>${ev ? `<u style="left:${Math.min(100, ev / max * 100)}%"></u>` : ''}<span class="${ev && mm > ev ? 'over' : ''}">${ev && mm > ev ? '엘리베이터보다 김 · 업체가 나눔 · ' : ''}${l.length > 1 ? (i + 1) + '구간 ' : ''}${fmt(mm)}</span></div>`).join('');
  }
  const smpsPic = () => `<svg width="58" height="40" viewBox="0 0 62 44" aria-hidden="true"><defs><linearGradient id="moal" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#eef0f1"/><stop offset=".5" stop-color="#c9cdd0"/><stop offset="1" stop-color="#a8adb1"/></linearGradient></defs><rect x="2" y="6" width="58" height="34" rx="2.5" fill="url(#moal)" stroke="#8d9297" stroke-width=".8"/>${[0, 1, 2, 3, 4, 5, 6, 7].map(i => `<rect x="${8 + i * 5.4}" y="11" width="2.4" height="15" rx="1" fill="#7d8287" opacity=".55"/>`).join('')}<rect x="6" y="30" width="50" height="7" rx="1" fill="#2a2d30"/>${[0, 1, 2, 3, 4, 5].map(i => `<circle cx="${11 + i * 8}" cy="33.5" r="1.6" fill="#b9bdc1"/>`).join('')}<circle cx="52" cy="15" r="1.4" fill="#3fbf7f"/></svg>`;
  function rowHtml(r, ev) {
    const p = P[r.id], done = ordered(r), cut = memoCut(r), l = lens(r), drawing = needsDrawing(r);
    const products = [...new Set(rows.map(x => P[x.id].product).filter(Boolean))];
    return `<section class="mo-lrow ${done ? 'done' : ''} ${!p.use ? 'off' : ''} ${sel === r.id ? 'sel' : ''}" data-row="${esc(r.id)}">
      <div class="mo-lhead"><label><input type="checkbox" data-act="use" ${p.use && !done ? 'checked' : ''} ${done ? 'disabled' : ''}></label>
        <button class="mo-pick" data-act="pick" ${done ? 'disabled' : ''}><b>${esc(r.room)} · ${esc(r.location)}</b><small>실측 ${drawing ? '도면 확인' : r.segments.map(s => fmt(s.mm)).join(' / ') + 'mm'} · 배선 ${r.actualWires ?? '—'}가닥${r.note ? ' · 「' + esc(r.note) + '」' : ''}</small></button>
        <span class="mo-badge ${p.group ? '' : 'need'}">${done ? '발주 완료 ' + esc(r.order.no) : p.group || 'SMPS 안 정함'}</span></div>
      ${done ? '' : `<div class="mo-lctl">
        <label>조명 종류<input list="mo-products" data-act="product" value="${esc(p.product)}" placeholder="예: 24V LED바"></label>
        <label>${drawing ? '도면 길이' : '발주 길이'} mm${r.segments.length > 1 && !drawing ? ' · 구간 사이 /' : ''}<input data-act="lengths" value="${esc(p.lengths)}" placeholder="${drawing ? '도면에서 재서 넣기' : r.segments.map(s => s.mm).join('/')}" class="${l.length ? '' : 'need'}"></label>
        ${cut && !drawing && r.segments.length === 1 ? `<button class="mo-link" data-act="cut" data-mm="${cut}">메모대로 −${cut} → ${fmt(r.segments[0].mm - cut)}</button>` : ''}
        <label>SMPS<select data-act="group"><option value="">고르기</option>${G.map(g => `<option ${p.group === g.name ? 'selected' : ''}>${esc(g.name)}</option>`).join('')}<option ${p.group === NONE ? 'selected' : ''}>${NONE}</option></select></label>
      </div>`}
      <div class="mo-strips">${strips(r, ev)}</div></section>`;
  }
  function cardHtml(g, i) {
    const s = groupLoad(g), pct = Math.min(100, s.load / g.cap * 100);
    return `<div class="mo-smps ${sel ? 'target' : ''}" data-g="${i}"><div class="mo-sh">${smpsPic()}<div><b>${esc(g.name)}</b><input data-act="place" data-g="${i}" value="${esc(g.place)}" placeholder="놓을 곳 (예: 안방 천장 점검구)"></div>
        <select data-act="cap" data-g="${i}">${[...new Set(CAPS.concat(g.cap))].sort((a, b) => a - b).map(c => `<option ${c === g.cap ? 'selected' : ''}>${c}</option>`).join('')}</select><span class="mo-u">W</span></div>
      <div class="mo-meter"><i style="width:${pct}%" class="${s.rs.length && !s.ok ? 'bad' : ''}"></i><u style="left:${g.util}%"></u></div>
      <div class="mo-mrow"><span>부하 <b>${Math.round(s.load)}W</b> / 정격 ${g.cap}W · ${g.util}%까지</span><span class="${!s.rs.length ? '' : s.ok ? 'ok' : 'bad'}">${!s.rs.length ? '비어 있음' : s.volts.length > 1 ? '전압 섞임' : s.ok ? '여유 ' + Math.round(s.lim - s.load) + 'W' : '모자람 ' + Math.ceil(s.load - s.lim) + 'W'}</span></div>
      ${s.rs.map(r => `<div class="mo-ri"><span>${esc(r.room)} ${esc(r.location)}</span><span>${fmt(total(r))}mm · ${Math.round(watts(r))}W</span><button class="mo-x" data-act="unassign" data-id="${esc(r.id)}">×</button></div>`).join('')}
      ${sel ? `<div class="mo-hint">여기 눌러 「${esc((rows.find(r => r.id === sel) || {}).location || '')}」 넣기</div>` : ''}
      ${!s.rs.length && G.length > 1 ? `<button class="mo-link" data-act="gdel" data-g="${i}">이 SMPS 지우기</button>` : ''}</div>`;
  }
  function render() {
    const ev = elev(), rs = rows, used = live(), prob = problems();
    const products = [...new Set(used.map(r => P[r.id].product).filter(Boolean))];
    const over = used.filter(r => ev.long && lens(r).some(mm => mm > ev.long));
    const metres = used.reduce((a, r) => a + total(r), 0) / 1000;
    dialog.innerHTML = `<header class="mo-head"><div><small>발주 실측 · 사무실 · ${esc(siteName)}</small><h2>간접조명 · SMPS 배치</h2></div>
      <div class="mo-tot"><span><b>${used.length}</b>곳</span><span><b>${metres.toFixed(1)}</b>m</span><span><b>${G.filter(g => groupLoad(g).rs.length).length}</b>SMPS</span><span class="${prob.length ? 'bad' : ''}"><b>${prob.length}</b>남은 것</span></div>
      <div class="mo-headbtn"><button data-act="reload">노션 최신 다시 읽기</button><button data-act="close">닫기</button></div></header>
      ${serverVer && serverVer !== 'lighting-notion4' ? '<p class="mo-banner">서버가 아직 옛 판입니다 — 「노션에 저장」은 Lighting.gs·Code.gs 배포 뒤에 됩니다. 지금 정한 것은 이 컴퓨터에 보관됩니다.</p>' : ''}
      <div class="mo-tools"><span class="mo-elev">🛗 ${ev.text ? '엘리베이터 ' + esc(ev.text) + ' → 통째로 들어가는 길이 약 <b>' + fmt(ev.long) + 'mm</b>' : '엘리베이터 크기가 없습니다 — 발주앱 「엘리베이터」 칸에 넣으면 여기 반영'}</span>
        ${products.map(pr => `<label class="mo-w">${esc(pr)} <input type="number" step="any" min="0" data-act="w" data-p="${esc(pr)}" value="${esc((W[pr] || {}).w ?? '')}" placeholder="W/m" class="${Number((W[pr] || {}).w) > 0 ? '' : 'need'}">W/m <select data-act="v" data-p="${esc(pr)}">${[24, 12].map(v => `<option ${Number((W[pr] || {}).v || 24) === v ? 'selected' : ''}>${v}</option>`).join('')}</select>V</label>`).join('')}</div>
      <datalist id="mo-products">${[...new Set(rows.map(r => P[r.id].product).filter(Boolean).concat(['24V LED바', '방습 LED 스트립(24V)', '얇은 스트립 (24V)']))].map(x => `<option value="${esc(x)}">`).join('')}</datalist>
      <div class="mo-body"><main><h4>위치 — 눌러서 고른 뒤 오른쪽 SMPS 카드를 누르면 묶입니다 <small>막대 = 길이 비율${ev.long ? ' · 점선 = 엘리베이터 한계' : ''}</small></h4>${rs.map(r => rowHtml(r, ev.long)).join('')}</main>
      <aside><h4>SMPS</h4><div class="mo-cards">${G.map(cardHtml).join('')}<button class="mo-addsmps" data-act="gadd">＋ SMPS 추가</button></div>
        <h4>업체에 나가는 내용</h4>${previewHtml(ev, over)}
        <div data-msg role="status"></div>
        ${prob.length ? `<details class="mo-prob" open><summary>담기 전에 정할 것 ${prob.length}</summary>${prob.map(t => `<div>· ${esc(t)}</div>`).join('')}</details>` : ''}
        <div class="mo-actions"><button data-act="save">노션에 저장</button><button class="pri" data-act="import" ${prob.length ? 'disabled' : ''}>발주 초안에 담기</button></div>
        <small>W/m·SMPS 용량은 제품 사양으로 확인하세요. 사용률 80%는 여유를 두는 기준입니다. 이 화면은 업체에 보내지 않습니다.</small></aside></div>`;
  }
  function previewHtml(ev, over) {
    const used = live();
    if (!used.length) return '<p class="mo-empty">담을 위치가 없습니다</p>';
    return `<table>${used.map(r => `<tr><td><b>${esc(r.room)} ${esc(r.location)}</b><small>${esc(P[r.id].product || '조명 종류?')} · ${lens(r).map(fmt).join(' / ') || '길이?'}mm · 배선 ${r.actualWires ?? '—'}</small></td><td>${esc(P[r.id].group || '—')}</td></tr>`).join('')}
      ${G.filter(g => groupLoad(g).rs.length).map(g => `<tr class="mo-smpsrow"><td><b>${esc(g.name)}</b><small>${esc(g.place || '놓을 곳?')}</small></td><td>${g.cap}W</td></tr>`).join('')}</table>
      ${over.length ? `<p class="mo-note">엘리베이터(약 ${fmt(ev.long)}mm)보다 긴 ${over.length}곳 — 「나눠서 보내주세요 (반반 또는 2400 + 재단)」가 발주서 특기사항에 들어갑니다</p>` : ev.long ? '<p class="mo-note">모든 길이가 엘리베이터에 들어갑니다</p>' : ''}`;
  }

  // ── 고치기 ──
  function onInput(e) { const t = e.target, card = t.closest('[data-row]'); if (t.dataset.act === 'lengths' && card) { P[card.dataset.row].lengths = t.value.replace(/[^\d/ ]/g, ''); keep(); } if (t.dataset.act === 'place') { G[+t.dataset.g].place = t.value; keep(); } }
  function onChange(e) {
    const t = e.target, card = t.closest('[data-row]'), p = card ? P[card.dataset.row] : null;
    if (t.dataset.act === 'use' && p) p.use = t.checked;
    else if (t.dataset.act === 'product' && p) { p.product = t.value.trim(); if (p.product && !W[p.product]) W[p.product] = {w: '', v: 24}; }
    else if (t.dataset.act === 'lengths' && p) p.lengths = t.value.split('/').map(x => x.replace(/\D/g, '')).filter(Boolean).join('/');
    else if (t.dataset.act === 'group' && p) p.group = t.value;
    else if (t.dataset.act === 'w') W[t.dataset.p] = Object.assign(W[t.dataset.p] || {v: 24}, {w: t.value});
    else if (t.dataset.act === 'v') W[t.dataset.p] = Object.assign(W[t.dataset.p] || {}, {v: Number(t.value)});
    else if (t.dataset.act === 'cap') G[+t.dataset.g].cap = Number(t.value);
    else if (t.dataset.act === 'place') G[+t.dataset.g].place = t.value.trim();
    else return;
    keep(); render();
  }
  async function onClick(e) {
    const b = e.target.closest('button'), card = e.target.closest('.mo-smps');
    if (!b && card && sel && !e.target.closest('input,select')) { P[sel].group = G[+card.dataset.g].name; sel = ''; keep(); render(); return; }
    if (!b || busy) return;
    const act = b.dataset.act, row = b.closest('[data-row]');
    if (act === 'close') return dialog.close();
    if (act === 'reload') return load(true);
    if (act === 'pick' && row) { sel = sel === row.dataset.row ? '' : row.dataset.row; return render(); }
    if (act === 'cut' && row) { const r = rows.find(x => x.id === row.dataset.row); P[r.id].lengths = String(r.segments[0].mm - Number(b.dataset.mm)); }
    else if (act === 'unassign') P[b.dataset.id].group = '';
    else if (act === 'gadd') G.push({name: 'SMPS ' + (NO[G.length] || G.length + 1), place: '', cap: 150, util: 80});
    else if (act === 'gdel') G.splice(+b.dataset.g, 1);
    else if (act === 'save') return save();
    else if (act === 'import') return importDraft();
    else return;
    keep(); render();
  }

  async function save() {
    const items = rows.filter(r => !ordered(r)).map(r => { const p = P[r.id], g = G.find(x => x.name === p.group) || {}, w = W[p.product] || {};
      return {id: r.id, product: p.product, orderLengths: p.use ? lens(r).join('/') : '', wattsPerM: w.w === '' || w.w == null ? null : Number(w.w), voltage: Number(w.v) || null,
        smpsGroup: p.use ? p.group : '', smpsPlace: g.place || '', smpsCap: g.cap || null, utilization: g.util || null}; });
    if (!items.length) return say('저장할 위치가 없습니다', true);
    busy = true; say('노션에 저장하는 중…');
    try {
      const r = await api('lightingOfficeSave', {sitePageId: siteId, items});
      if (!r || !r.ok) throw Error((r && r.error) || '저장하지 못했습니다');
      dirty = false; try { localStorage.setItem(key(), JSON.stringify({P, W, G, dirty: false, at: Date.now()})); } catch (e) { }
      rows = r.document.rows.filter(x => x.status === 'done' || (x.status === 'pending' && x.needsMeasurement === false));
      busy = false; render(); say('노션에 ' + r.saved + '곳 저장했습니다' + (r.ordered.length ? ' · 이미 발주된 ' + r.ordered.length + '곳 제외' : '') + (r.missing.length ? ' · 노션에서 못 찾은 ' + r.missing.length + '곳' : ''), !!r.missing.length);
    } catch (e) {
      busy = false;
      say(/페이지 id|unknown|lightingOfficeSave/i.test(e.message) ? '서버가 아직 옛 판이라 노션 저장이 안 됩니다 — Lighting.gs·Code.gs 배포 뒤 다시 눌러주세요. 지금 정한 것은 이 컴퓨터에 보관돼 있습니다' : e.message, true);
    }
  }

  async function importDraft() {
    if (!S.site || S.site.id !== siteId) return say('현장이 바뀌었습니다. 다시 열어주세요', true);
    const prob = problems(); if (prob.length) return say('담기 전에 정할 것이 남았습니다: ' + prob[0], true);
    const used = live(); if (!used.length) return say('담을 위치가 없습니다', true);
    if (S.extra.some(z => z.qty > 0 && z.lightingSource && z.lightingSource.site === siteId && used.some(r => r.id === z.lightingSource.id))) return say('이미 발주 초안에 담긴 위치가 있습니다 — 기존 초안을 확인해주세요', true);
    busy = true; say('노션 원본과 한 번 더 맞춰 보는 중…');
    try {
      const live2 = await api('lightingGet', {sitePageId: siteId});
      if (!live2 || !live2.ok) throw Error((live2 && live2.error) || '원본을 다시 읽지 못했습니다');
      const moved = used.filter(r => { const x = live2.document.rows.find(z => z.id === r.id); return !x || x.sourceToken !== r.sourceToken || ordered(x); });
      if (moved.length) throw Error('그사이 현장에서 바뀐(또는 발주된) 위치가 있습니다: ' + moved.map(r => r.room + ' ' + r.location).join(', ') + ' — 「노션 최신 다시 읽기」 후 담아주세요');
      const ev = elev(), over = used.filter(r => ev.long && lens(r).some(mm => mm > ev.long));
      const sheet = Math.max(...sheetsUsed(), ...Object.keys(S.done).map(Number), 0) + 1; S.typeBy[sheet] = '조명·스위치';
      used.forEach(r => { const p = P[r.id], l = lens(r), w = W[p.product] || {};
        const item = {id: 'lighting-' + r.id + '-' + r.revision, name: r.room + ' ' + r.location, spec: p.product + ' · ' + l.map(fmt).join(' / ') + 'mm' + (l.length > 1 ? ' (' + l.length + '구간)' : '') + (r.actualWires == null ? ' · 배선 수 현장 확인' : ' · 배선 ' + r.actualWires + '가닥') + (p.group === NONE ? ' · 전원 내장' : ' · ' + p.group),
          cut: '', unit: '세트', qty: 1, type: '조명·스위치', group: '간접조명', lightingSource: {kind: 'lighting', id: r.id, revision: r.revision, sourceToken: r.sourceToken, site: siteId}};
        S.extra.push(item); S.sheetNo[keyOf(item)] = sheet; });
      G.forEach(g => { const s = groupLoad(g); if (!s.rs.length) return; const v = Number((W[P[s.rs[0].id].product] || {}).v) || 24;
        const item = {id: 'lighting-smps-' + siteId.slice(0, 8) + '-' + g.name + '-' + Date.now().toString(36), name: g.name + ' · ' + g.place, spec: v + 'V ' + g.cap + 'W · 부하 ' + Math.round(s.load) + 'W · ' + [...new Set(s.rs.map(r => r.room))].join('·') + ' ' + s.rs.length + '곳', cut: '', unit: '개', qty: 1, type: '조명·스위치', group: '간접조명 전원 (SMPS)'};
        S.extra.push(item); S.sheetNo[keyOf(item)] = sheet; });
      S.noteBy[sheet] = ['간접조명 길이는 위치별 실제 설치 길이입니다 · 조각 나누기는 맡기겠습니다',
        over.length ? '엘리베이터(' + ev.text + ')에 통째로 안 들어가는 곳: ' + over.map(r => r.room + ' ' + r.location).join(', ') + ' — 나눠서 보내주세요 (반반 또는 2400 + 재단 모두 괜찮습니다)' : '',
        'SMPS 놓을 곳은 품목에 적었습니다'].filter(Boolean).join('\n');
      S.cur = sheet; setType('조명·스위치'); renderItems(); draw(); bar(); side();
      busy = false; if (dirty) save().catch(() => {}); dialog.close();
      toast(used.length + '곳 + SMPS를 새 장에 담았습니다 — 거래처를 고르고 발주 기록을 눌러주세요');
    } catch (e) { busy = false; say(e.message, true); }
  }
  return {open};
})();
