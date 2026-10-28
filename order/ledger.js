/* 발주앱 · 📒 발주 장부 — 2026-10-28 Claude (개편 1단계 · 협업/2026-10-27_발주앱디자인/13 · 시안 바_1)
 * 첫 화면. 이 현장 발주를 전부, 한 줄에 주문 → 입고 → 청구.
 *  · 발주서로 낸 것 · 전화 · 산 것이 모두 한 줄 (노션 📦 발주 DB 그대로 — 새 칸 없음)
 *  · 읽기 전용입니다. 「보냈음 표시」는 2단계, 청구(명세서 대조 결과)는 3단계 — 그 전에는 「기록 전」으로만 보여 줌
 *  · 서버: getLedger (대표 키만 · 끝까지 읽음). 서버가 옛 것이면 현장 정보의 지난 발주(최근 50건)로 대신 보여 주고 그렇다고 알림
 *  · 줄을 누르면 오른쪽에 그 건 — 품목(받은 것 ✓) · 비고 · 「발주서로 열기」 등
 */
(function () {
  'use strict';
  if (typeof el !== 'function') return;
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const TYPES = ['목자재', '설비·방수', '타일', '도기', '도어', '조명·스위치'];
  const DOW = '일월화수목금토';
  const md = d => d ? Number(d.slice(5, 7)) + '/' + Number(d.slice(8, 10)) : '';
  const won = n => { n = Number(n) || 0; const e = Math.floor(n / 1e8), m = Math.floor((n % 1e8) / 1e4), r = n % 1e4;
    return (e ? e + '억 ' : '') + (m ? m.toLocaleString('ko-KR') + '만' + (r ? ' ' : '') : '') + (r ? r.toLocaleString('ko-KR') : '') + '원'; };
  const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const dayName = d => { const t = new Date(d + 'T00:00:00'); const diff = Math.round((t - new Date(today() + 'T00:00:00')) / 864e5);
    return md(d) + ' (' + DOW[t.getDay()] + ')' + (diff === 0 ? ' · 오늘' : diff === 1 ? ' · 내일' : diff < 0 ? ' · 지남' : ''); };

  // ── 화면 ──
  const app = document.createElement('section'); app.id = 'ledgerApp'; app.hidden = true;
  app.innerHTML = '<nav class="lg-rail">' + 메뉴html('ledger') + '</nav><div class="lg-main">'
    + '<header class="lg-hd"><label>현장<select data-site></select></label><div class="lg-chips" data-chips></div></header>'
    + '<div class="lg-top"><div class="lg-new"><button type="button" class="lg-pri" data-a="newmenu">＋ 새 발주 ▾</button><div class="lg-menu" data-newmenu hidden>'
    + TYPES.map(t => '<button type="button" data-new="' + esc(t) + '">' + esc(t) + '</button>').join('') + '</div></div>'
    + '<button type="button" class="lg-fn" data-a="buy">🧾 산 것·전화 주문 기록</button><button type="button" class="lg-fn" data-a="stmt">🔍 명세서 넣기</button>'
    + '<div class="lg-seg" data-seg></div><input class="lg-find" data-find placeholder="찾기 — 품목·업체·번호"></div>'
    + '<p class="lg-warn" data-warn hidden></p>'
    + '<div class="lg-wb"><div class="lg-card lg-list" data-list></div><aside class="lg-card lg-det" data-det></aside></div></div>';
  document.body.append(app);
  const $ = q => app.querySelector(q);

  const L = { siteId: '', orders: [], loading: false, error: '', fallback: false, sel: '', filter: 'open', find: '', showDone: false, seq: 0 };

  // ── 자료 ──
  function load() {
    const id = L.siteId; if (!id) return paint();
    const seq = ++L.seq; L.loading = true; L.error = ''; paint();
    api('getLedger', {sitePageId: id}).then(r => {
      if (seq !== L.seq) return;
      if (!r || !r.ok) throw Error((r && r.error) || '장부를 받지 못했습니다');
      L.orders = r.orders || []; L.fallback = false; L.loading = false;
      L.itemsMissing = r.품목못읽음 || 0;
      if (L.sel && !L.orders.some(o => o.id === L.sel)) L.sel = '';
      paint();
    }).catch(e => {
      if (seq !== L.seq) return;
      L.loading = false;
      // 서버(Order.gs·Code.gs)를 아직 안 올렸으면: 현장 정보의 지난 발주(최근 50건)로 대신 — 대신인 것을 위에 적음
      if (/getLedger|웹훅에 페이지 id/.test(e.message)) { L.fallback = true; return useFallback(); }
      L.error = e.message; paint();
    });
  }
  function useFallback() {
    // 현장 정보(getOrderSite)가 아직 안 왔으면 올 때 다시 — draw 가 부름
    if (!L.fallback) return;
    if (S.detail && S.site && S.site.id === L.siteId && S.detail.orders) L.orders = S.detail.orders.map(o => Object.assign({}, o));
    paint();
  }
  function syncSite(id) {
    // 발주 화면(현장 칸)과 같은 현장으로 — 그쪽이 지난 발주·발주번호를 받아 둠(수정·반품·불러오기가 그걸 씀)
    if (id && el('siteSel') && el('siteSel').value !== id) { el('siteSel').value = id; pickSite(); }
    try { localStorage.setItem('dsf_ledger_site', id || ''); } catch (e) { }
  }

  // ── 줄 나누기 ──
  const isSent = o => o.state === '발주완료' || o.state === '입고완료';
  function bucket(o) {
    if (o.state === '보류') return 'hold';
    if (o.state === '입고완료') return 'done';
    if (o.state === '발주예정') return 'draft';
    return 'recv';
  }
  function matches(o) {
    if (!L.find) return true;
    const t = (o.no + ' ' + o.name + ' ' + (o.vendor || '') + ' ' + (o.items || []).map(x => x.text).join(' ')).toLowerCase();
    return L.find.toLowerCase().split(/\s+/).every(w => t.includes(w));
  }
  function groups() {
    const os = L.orders.filter(matches), out = [];
    const by = k => os.filter(o => bucket(o) === k);
    const recv = by('recv'), dates = {};
    recv.forEach(o => { const k = o.due || ''; (dates[k] = dates[k] || []).push(o); });
    const recvGroups = Object.keys(dates).sort((a, b) => (a || '9') < (b || '9') ? -1 : 1)
      .map(k => [k ? dayName(k) : '날짜 모름', dates[k]]);
    if (L.filter === 'open' || L.filter === 'draft') { const d = by('draft'); if (d.length) out.push(['보낸 기록 없음 — 저장만 된 발주 (「보냈음 표시」는 다음 단계)', d, 'draft']); }
    if (L.filter === 'open' || L.filter === 'recv') recvGroups.forEach(g => out.push([g[0], g[1], 'recv']));
    if (L.filter === 'open') { const h = by('hold'); if (h.length) out.push(['보류', h, 'hold']); }
    if (L.filter === 'all') {
      const d = by('draft'), h = by('hold'), done = by('done');
      if (d.length) out.push(['보낸 기록 없음', d, 'draft']);
      recvGroups.forEach(g => out.push([g[0], g[1], 'recv']));
      if (h.length) out.push(['보류', h, 'hold']);
      if (done.length) out.push(['다 받음', done, 'done']);
    }
    return out;
  }

  // ── 칸 ──
  function ordCell(o) {
    if (o.state === '발주예정') return '<span class="lg-st w">작성 중 · 보낸 기록 없음</span>';
    if (o.state === '보류') return '<span class="lg-st r">보류</span>';
    const how = o.route === '산 것' ? '샀음' : '주문';
    return '<span class="lg-st s">' + how + ' ' + esc(md(o.date)) + '</span>';
  }
  function inCell(o) {
    if (o.state === '입고완료') return '<span class="lg-st d">✓ 다 받음</span>';
    const it = o.items || [], got = it.filter(x => x.checked).length;
    const part = got && got < it.length ? ' <span class="lg-st w">' + got + '/' + it.length + ' 받음</span>' : '';
    if (!o.due) return '<span class="lg-mute">' + (o.state === '발주예정' ? '—' : '날짜 모름') + '</span>' + part;
    return '<span class="lg-st p">' + esc(md(o.due)) + (o.state === '발주예정' ? ' 희망' : ' 예정') + '</span>' + part;
  }
  const billCell = o => o.route === '산 것' ? '<span class="lg-mute">해당 없음 · 결제 캡처</span>' : '<span class="lg-mute">기록 전</span>';
  function head(o) {
    const it = (o.items || []).map(x => String(x.text || '').split('  ·  ')[0].replace(/^조합 · /, '')).filter(Boolean);   // 칸 사이는 「두 칸·두 칸」 — 앞 칸이 품명
    if (it.length) return esc(it.slice(0, 2).join(' · ')) + (it.length > 2 ? ' 외 ' + (it.length - 2) : '');
    return '<span class="lg-mute">' + esc(o.count ? o.count + '품목' : '') + '</span>';
  }

  // ── 그리기 ──
  function paint() {
    // 현장
    const ss = $('[data-site]');
    if (ss.options.length !== (S.sites || []).length + 1) {
      ss.innerHTML = '<option value="">현장을 고르세요</option>' + (S.sites || []).map(x => '<option value="' + esc(x.id) + '">' + esc(x.name.replace(/\s*PROJECT\s*$/, '')) + '</option>').join('');
    }
    ss.value = L.siteId || '';
    const d = S.detail && S.site && S.site.id === L.siteId ? S.detail : null, chips = [];
    if (d) {
      if (d.woodStart) chips.push('<span class="ok">목공 착수 ' + esc(md(d.woodStart)) + '</span>');
      if (d.elevator) chips.push('<span>🛗 ' + esc(d.elevator) + '</span>');
      if (d.unload) chips.push('<span title="' + esc(d.unload) + '">하차 · ' + esc(d.unload.length > 26 ? d.unload.slice(0, 26) + '…' : d.unload) + '</span>');
    }
    $('[data-chips]').innerHTML = chips.join('');
    // 거름
    const n = k => L.orders.filter(o => bucket(o) === k).length;
    const segs = [['open', '진행 중', n('draft') + n('recv') + n('hold')], ['draft', '보낸 기록 없음', n('draft')], ['recv', '받을 것', n('recv')], ['all', '전부', L.orders.length]];
    $('[data-seg]').innerHTML = segs.map(s => '<button type="button" data-f="' + s[0] + '" class="' + (L.filter === s[0] ? 'on' : '') + '">' + s[1] + ' <b>' + s[2] + '</b></button>').join('');
    // 알림 줄
    const warn = L.fallback ? '서버를 새로 올리기 전이라 최근 50건만, 입고 날짜·금액·품목 없이 보입니다 — Order.gs·Code.gs 붙여넣기 뒤 전부 나옵니다'
      : L.itemsMissing ? '품목을 못 받은 발주 ' + L.itemsMissing + '건 — 줄을 누르면 그 건만 다시 받습니다' : '';
    $('[data-warn]').hidden = !warn; $('[data-warn]').textContent = warn;
    // 목록
    const list = $('[data-list]');
    if (!L.siteId) list.innerHTML = '<div class="lg-empty"><b>현장을 고르세요</b>' + (S.sites || []).map(x => '<button type="button" class="lg-sitebtn" data-pick="' + esc(x.id) + '">' + esc(x.name.replace(/\s*PROJECT\s*$/, '')) + '</button>').join('') + '</div>';
    else if ((L.loading || L.fallback) && !L.orders.length) list.innerHTML = '<div class="lg-empty">장부를 받는 중…</div>';
    else if (L.error) list.innerHTML = '<div class="lg-empty bad">장부를 받지 못했습니다 — ' + esc(L.error) + ' <button type="button" data-a="reload">다시</button></div>';
    else if (!L.orders.length) list.innerHTML = '<div class="lg-empty">이 현장에 아직 발주가 없습니다 — 위 「＋ 새 발주」로 시작하세요</div>';
    else {
      let h = '<table><thead><tr><th>발주</th><th>업체</th><th>주요 품목</th><th>주문</th><th>입고</th><th>청구</th><th class="r">금액</th></tr></thead><tbody>';
      groups().forEach(([g, os]) => {
        h += '<tr class="lg-grp"><td colspan="7">' + esc(g) + '<em>' + os.length + '건</em></td></tr>';
        os.forEach(o => {
          h += '<tr data-id="' + esc(o.id) + '" class="' + (o.id === L.sel ? 'sel' : '') + '"><td class="no"><b>' + esc(o.type || '') + '</b><small>' + esc(o.no) + '</small></td>'
            + '<td>' + esc(o.vendor || '') + '<small>' + esc((o.ship || '').replace(' 배송', '')) + '</small></td><td class="it">' + head(o) + '</td>'
            + '<td>' + ordCell(o) + '</td><td>' + inCell(o) + '</td><td>' + billCell(o) + '</td><td class="r">' + (o.amount ? esc(won(o.amount)) : '<span class="lg-mute">—</span>') + '</td></tr>';
        });
      });
      if (L.filter === 'open') {
        const done = L.orders.filter(o => bucket(o) === 'done' && matches(o));
        if (done.length) h += '<tr class="lg-fold"><td colspan="7"><button type="button" data-f="all">▸ 다 받은 것 ' + done.length + '건 — ' + esc(md(done[done.length - 1].date)) + ' ~ ' + esc(md(done[0].date)) + ' · 「전부」에서 보기</button></td></tr>';
      }
      list.innerHTML = h + '</tbody></table>';
    }
    paintDet();
    if (L.loading && L.orders.length) $('[data-list]').classList.add('lg-busy'); else $('[data-list]').classList.remove('lg-busy');
  }

  function paintDet() {
    const det = $('[data-det]'), o = L.orders.find(x => x.id === L.sel);
    if (!o) { det.innerHTML = '<div class="lg-empty">줄을 누르면 그 발주가 여기 나옵니다</div>'; return; }
    const st = (k, t, v, cls) => '<div class="' + cls + '"><small>' + t + '</small><b>' + v + '</b></div>';
    const it = o.items, got = it ? it.filter(x => x.checked).length : 0;
    const steps = st('a', '작성', '✓ ' + esc(md(o.date)), 'ok')
      + (isSent(o) ? st('b', o.route === '산 것' ? '샀음' : '주문', '✓ ' + esc(md(o.date)), 'ok') : st('b', '보냄', '기록 없음', 'now'))
      + (o.state === '입고완료' ? st('c', '입고', '✓ 다 받음', 'ok') : st('c', '입고', it && got ? got + '/' + it.length + ' 받음' : (o.due ? esc(md(o.due)) + (isSent(o) ? ' 예정' : ' 희망') : '—'), ''))
      + st('d', '청구', o.route === '산 것' ? '해당 없음' : '기록 전', '');
    const items = !it ? '<div class="lg-mute">품목 받는 중…</div>'
      : it.length ? it.map(x => '<div class="' + (x.checked ? 'got' : '') + '"><i>' + (x.checked ? '✓' : (x.readonly ? '·' : '○')) + '</i><span>' + esc(x.text) + '</span></div>').join('')
      : '<div class="lg-mute">품목 줄이 없습니다</div>';
    const old = !['타일', '도기', '도어'].includes(o.type);
    const acts = (old
        ? '<button type="button" class="lg-pri" data-a="copy">같은 품목으로 새 발주</button><button type="button" data-a="edit">' + (o.state === '입고완료' ? '📤 반품 기록' : '✎ 수량 수정') + '</button>'
        : '<button type="button" class="lg-pri" data-a="open">발주서 열기 (고치기)</button>')
      + (o.url ? '<a class="lg-btn" href="' + esc(o.url) + '" target="_blank" rel="noopener">노션에서 보기</a>' : '');
    det.innerHTML = '<div class="lg-meta">' + esc(o.no) + ' · ' + esc(o.type || '') + (o.route && isSent(o) ? ' · ' + esc(o.route) : '') + '</div>'
      + '<h2>' + esc(o.vendor || o.name || '') + '</h2>'
      + '<div class="lg-meta">' + [o.due ? md(o.due) + (isSent(o) ? ' 입고 예정' : ' 납품 희망') : '', (o.ship || ''), (o.lift || ''), o.amount ? won(o.amount) : ''].filter(Boolean).map(esc).join(' · ') + '</div>'
      + '<div class="lg-steps">' + steps + '</div>'
      + (o.state === '발주예정' ? '<p class="lg-note w">저장만 되어 있습니다. 업체에 보냈다면 지금은 노션에서 상태를 「발주완료」로 바꿔 주세요 — 「보냈음 표시」 단추는 다음 단계에 생깁니다.</p>' : '')
      + (o.note ? '<p class="lg-note">' + esc(o.note) + '</p>' : '') + (o.ret ? '<p class="lg-note w">반품 · ' + esc(o.ret) + '</p>' : '')
      + '<div class="lg-items">' + items + '</div><div class="lg-acts">' + acts + '</div>';
    if (!it && !o.loadingItems) {   // 끝난 건·못 받은 건은 열 때 그 건만
      o.loadingItems = true;
      api('getSiteOrders', {sitePageId: L.siteId, orderPageId: o.id, itemsOnly: true}).then(r => { o.loadingItems = false; o.items = (r && r.ok && r.items) || []; if (L.sel === o.id) paintDet(); })
        .catch(() => { o.loadingItems = false; o.items = []; if (L.sel === o.id) paintDet(); });
    }
  }

  // ── 동작 ──
  function needSiteReady() {
    if (!S.site || S.site.id !== L.siteId || !S.detail) { toast('현장 정보를 받는 중입니다 — 잠시 뒤 다시 눌러 주세요'); return false; }
    return true;
  }
  function openOrder(o, how) {
    if (!needSiteReady()) return;
    if (how === 'edit') { if (!(S.detail.orders || []).some(x => x.id === o.id)) return toast('최근 50건 밖의 발주라 여기서 못 엽니다 — 노션에서 고쳐 주세요'); return openEdit(o.id); }
    Ledger.work();
    setType(o.type || '목자재');
    if (o.type === '타일' && window.TileOrder) return TileOrder.open(o.id);
    if (['도기', '도어'].includes(o.type) && window.StructuredOrder) return StructuredOrder.open(o.id);
    if (!el('pastSel').querySelector('option[value="' + o.id + '"]')) { const op = document.createElement('option'); op.value = o.id; op.textContent = o.no; el('pastSel').append(op); }
    loadPastById(o.id);
  }
  app.addEventListener('click', e => {
    const t = e.target;
    const tr = t.closest('tr[data-id]'); if (tr) { L.sel = tr.dataset.id; paint(); if (innerWidth < 1100) $('[data-det]').scrollIntoView({behavior: 'smooth', block: 'start'}); return; }
    const pk = t.closest('[data-pick]'); if (pk) return setSite(pk.dataset.pick);
    const f = t.closest('[data-f]'); if (f) { L.filter = f.dataset.f; paint(); return; }
    const nw = t.closest('[data-new]'); if (nw) { $('[data-newmenu]').hidden = true; Ledger.work(); setType(nw.dataset.new); return; }
    const b = t.closest('[data-a]'); if (!b) { if (!t.closest('.lg-new')) $('[data-newmenu]').hidden = true; return; }
    const a = b.dataset.a, o = L.orders.find(x => x.id === L.sel);
    if (a === 'newmenu') $('[data-newmenu]').hidden = !$('[data-newmenu]').hidden;
    else if (a === 'buy') { if (!L.siteId) return toast('현장을 먼저 고르세요'); if (window.산것기록) 산것기록.open(); }
    else if (a === 'stmt') StatementApp.open();
    else if (a === 'reload') load();
    else if (o && a === 'copy') openOrder(o, 'copy');
    else if (o && a === 'edit') openOrder(o, 'edit');
    else if (o && a === 'open') openOrder(o, 'open');
  });
  $('[data-site]').addEventListener('change', e => setSite(e.target.value));
  $('[data-find]').addEventListener('input', e => { L.find = e.target.value.trim(); paint(); });
  function setSite(id) { L.siteId = id; L.orders = []; L.sel = ''; syncSite(id); load(); }

  // 현장 정보(칩)가 늦게 오면 다시 그림
  const oldDraw = draw;
  draw = function () { oldDraw.apply(this, arguments); if (!app.hidden) { try { if (L.fallback && !L.orders.length) useFallback(); else paint(); } catch (e) { } } };

  window.Ledger = {
    // 앱이 준비되면 한 번 — 첫 화면
    start() {
      let id = S.site ? S.site.id : '';
      if (!id) { try { id = localStorage.getItem('dsf_ledger_site') || ''; } catch (e) { } }
      if (id && !(S.sites || []).some(x => x.id === id)) id = '';
      if (!id && (S.sites || []).length === 1) id = S.sites[0].id;
      try { history.replaceState(Object.assign({}, history.state, {orderView: 'ledger'}), ''); } catch (e) { }
      L.siteId = id; if (id) syncSite(id);
      화면.보이기('ledger');   // 보이면서 장부를 받음(show)
    },
    open() { 화면.남기기('ledger'); 화면.보이기('ledger'); },
    show() {
      if (S.site && S.site.id !== L.siteId) { L.siteId = S.site.id; L.orders = []; L.sel = ''; }
      app.hidden = false; document.body.classList.add('ledger-on'); paint(); if (L.siteId) load();
    },
    hide() { app.hidden = true; document.body.classList.remove('ledger-on'); },
    work() { goInput(); },
    refresh() { if (L.siteId) load(); },
    state: () => ({siteId: L.siteId, n: L.orders.length, fallback: L.fallback, filter: L.filter, sel: L.sel})   // 점검용
  };
  // 이 파일이 늦게 읽혀 앱 준비가 먼저 끝났으면 여기서 첫 화면
  if (typeof OrderLoad !== 'undefined' && OrderLoad.phase === 'ready' && !(S.site && document.body.classList.contains('ledger-on'))) Ledger.start();
})();
