/* 발주앱 · 「🧾 산 것 기록」 — 2026-10-27 Claude (대표 승인 시안 라)
 * 네이버·사이트·전화·현장에서 이미 산 것을 캡처 한 장(또는 직접 입력)으로 노션 발주 보드에 남기고, 검수 목록을 만듭니다.
 *  · 캡처는 이 컴퓨터에서 이름·주소·전화·카드 칸을 끌어서 가린 뒤 서버로 보냅니다 (가린 그림만 저장)
 *  · 서버: readPurchaseImage(읽기) → recordPurchase(기록 · 같은 주문번호 막음 · 버튼 두 번 한 건 · 실측 재확인)
 *  · 기록 전에 「발주서 만들기」 초안에 같은 물건이 있는지 보여 주고, 빼면 그 줄의 실측 출처를 이 기록으로 옮깁니다
 * 맨 위 입구 셋: 📄 발주서 만들기(지금 화면) · 🧾 산 것 기록 · ✔ 받기·대조
 */
(function () {
  'use strict';
  const root = document.getElementById('unifiedOrder');
  if (!root || typeof el !== 'function') return;
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const won = n => (Number(n) || 0).toLocaleString('ko-KR');
  const TYPES = ['조명·스위치', '목자재', '설비·방수', '타일', '도기', '도어'];
  const SHOPS = ['네이버', '쿠팡', '네오라이팅', '칸트라이팅', '오늘의집', '현장 구매', '전화 주문'];

  // ── 맨 위 입구 셋 ──
  const modes = document.createElement('nav'); modes.className = 'v6-modes';
  modes.innerHTML = '<button data-m="order" class="on">📄 발주서 만들기<small>업체에 보내는 것</small></button>'
    + '<button data-m="buy">🧾 산 것 기록<small>네이버·사이트·전화·현장</small></button>'
    + '<button data-m="recv">✔ 받기·대조<small>검수 · 명세서 · 기록</small></button>';
  el('unifiedContext').after(modes);
  const panel = document.createElement('div'); panel.id = 'v6Buy'; panel.hidden = true;
  modes.after(panel);
  const recv = document.createElement('div'); recv.id = 'v6Recv'; recv.hidden = true;
  recv.innerHTML = '<div class="v6b-recv"><a class="v6b-big" href="https://nagwoon.github.io/layout-meeting/report/" target="_blank" rel="noopener"><b>✔ 현장 검수</b><span>보고앱 📦 발주 탭 — 받은 품목을 하나씩 체크</span></a>'
    + '<button class="v6b-big" data-go="stmt"><b>🧾 명세서 대조</b><span>거래처 명세서 사진 → 발주와 줄마다 맞춤</span></button>'
    + '<button class="v6b-big" data-go="settle"><b>🗂 기록</b><span>명세서 기록 · 단가 · 실적</span></button></div>';
  modes.after(recv);
  let mode = 'order';
  function setMode(m) {
    mode = m; modes.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.m === m));
    root.classList.toggle('v6-buymode', m !== 'order');
    panel.hidden = m !== 'buy'; recv.hidden = m !== 'recv';
    if (m === 'buy') paint();   // 발주 유형은 보던 탭을 따르지 않음 — 읽은 품목으로 짐작하거나 직접 고름 (10/27 목자재 탭에서 산 콘센트가 목자재로 잡힘)
  }
  modes.addEventListener('click', e => { const b = e.target.closest('[data-m]'); if (b) setMode(b.dataset.m); });
  recv.addEventListener('click', e => { const b = e.target.closest('[data-go]'); if (!b) return; if (b.dataset.go === 'stmt' && window.StatementApp) StatementApp.open(); if (b.dataset.go === 'settle' && typeof goSettle === 'function') goSettle(); });

  // ── 상태 ──
  let img = null, masks = [], drag = null, busy = false, reqId = '', last = null;
  const blank = () => ({kind: '주문완료', vendor: '', seller: '', extOrderNo: '', orderDate: new Date().toISOString().slice(0, 10), payMethod: '', total: '', type: '', note: '', items: [{name: '', option: '', qty: 1, unit: '개'}]});
  let F = blank();

  panel.innerHTML = `<div class="v6b-grid">
    <div class="v6b-card"><h3>캡처 넣기 <small>Ctrl+V · 끌어다 놓기 · 눌러서 고르기</small></h3>
      <label class="v6b-drop" data-drop>📷 주문 완료 화면을 붙여넣으세요<input type="file" accept="image/*" hidden data-file></label>
      <div class="v6b-canvas" hidden><canvas></canvas>
        <p class="v6b-maskhelp">🔒 <b>이름 · 주소 · 전화 · 카드 번호</b>를 마우스로 끌어서 까맣게 칠하세요. 칠한 그림만 서버로 가고, 그것만 기록에 붙습니다.</p>
        <div class="v6b-row"><button data-act="undo">한 칸 되돌리기</button><button data-act="clearimg">캡처 지우기</button><button class="v6b-fn" data-act="read">가린 뒤 읽기 →</button></div></div>
      <div class="v6b-kind"><label><input type="radio" name="v6bk" value="주문완료" checked> 주문 완료<small>결제까지 함 → 검수 대기</small></label><label><input type="radio" name="v6bk" value="장바구니"> 장바구니<small>아직 안 삼 → 초안으로만</small></label></div>
      <p class="v6b-msg" data-readmsg></p>
    </div>
    <div class="v6b-card v6b-main"><h3>확인하고 기록 <small>틀린 칸만 고치세요 · 캡처 없이 직접 쳐도 됩니다</small></h3>
      <div class="v6b-f">
        <label>구매처<input data-f="vendor" list="v6bShops" placeholder="네이버 · 쿠팡 · 현장 구매…"><datalist id="v6bShops">${SHOPS.map(s => `<option value="${esc(s)}">`).join('')}</datalist></label>
        <label>판매자 (상점)<input data-f="seller" placeholder="비워도 됨"></label>
        <label>주문일<input type="date" data-f="orderDate"></label>
        <label>주문번호<input data-f="extOrderNo" placeholder="같은 주문 두 번 기록 막음"></label>
        <label>결제<input data-f="payMethod" placeholder="신용카드 · 네이버페이 · 계좌이체"></label>
        <label>결제 금액 (원)<input type="number" data-f="total" placeholder="참고값"></label>
        <label>발주 유형<select data-f="type"><option value="">— 골라주세요 —</option>${TYPES.map(t => `<option>${esc(t)}</option>`).join('')}</select></label>
        <label class="v6b-w">메모 (노션 비고 · 검수 안내)<input data-f="note" placeholder="예: 거실 매립장 가구 조명용"></label>
      </div>
      <table class="v6b-items"><thead><tr><th>품명</th><th>옵션 · 규격</th><th class="r">수량</th><th>단위</th><th></th></tr></thead><tbody data-items></tbody></table>
      <button class="v6b-add" data-act="addrow">＋ 줄 추가</button>
      <div data-dup></div>
      <div class="v6b-acts"><span data-sum></span><button class="v6b-pri" data-act="record">🧾 구매 기록하고 검수로 →</button></div>
      <p class="v6b-msg" data-msg role="status"></p>
    </div>
    <div class="v6b-card"><h3>이 현장 최근 발주·구매 <small>노션 발주 보드</small></h3><div data-list></div></div>
  </div>`;
  const $ = q => panel.querySelector(q);
  const cv = $('canvas'), ctx = cv.getContext('2d');

  // ── 캡처 → 캔버스 (가리기) ──
  function loadFile(file) {
    if (!file || !/^image\//.test(file.type)) return say('그림 파일이 아닙니다', true, 'readmsg');
    const r = new FileReader();
    say('');   // 앞 건의 「기록했습니다」가 남아 있으면 지금 건도 기록된 줄 압니다 (10/27 대표)
    r.onload = () => { const im = new Image(); im.onload = () => { img = im; masks = []; draw2(); $('.v6b-canvas').hidden = false; say('가릴 칸을 칠한 뒤 「가린 뒤 읽기」를 누르세요', false, 'readmsg'); }; im.src = r.result; };
    r.readAsDataURL(file);
  }
  function draw2() {
    if (!img) return;
    const k = Math.min(1, 1400 / img.width); cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
    ctx.drawImage(img, 0, 0, cv.width, cv.height); ctx.fillStyle = '#111';
    masks.concat(drag ? [drag] : []).forEach(m => ctx.fillRect(Math.min(m.x, m.x2), Math.min(m.y, m.y2), Math.abs(m.x2 - m.x), Math.abs(m.y2 - m.y)));
  }
  const pt = e => { const b = cv.getBoundingClientRect(); return {x: (e.clientX - b.left) * cv.width / b.width, y: (e.clientY - b.top) * cv.height / b.height}; };
  cv.addEventListener('mousedown', e => { const p = pt(e); drag = {x: p.x, y: p.y, x2: p.x, y2: p.y}; e.preventDefault(); });
  addEventListener('mousemove', e => { if (!drag) return; const p = pt(e); drag.x2 = p.x; drag.y2 = p.y; draw2(); });
  addEventListener('mouseup', () => { if (!drag) return; if (Math.abs(drag.x2 - drag.x) > 4 && Math.abs(drag.y2 - drag.y) > 4) masks.push(drag); drag = null; draw2(); });
  $('[data-file]').addEventListener('change', e => loadFile(e.target.files[0]));
  const drop = $('[data-drop]');
  drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('over'));
  drop.addEventListener('drop', e => { e.preventDefault(); drop.classList.remove('over'); loadFile(e.dataTransfer.files[0]); });
  document.addEventListener('paste', e => { if (mode !== 'buy') return; const f = [...(e.clipboardData || {}).files || []].find(x => /^image\//.test(x.type)); if (f) { e.preventDefault(); loadFile(f); } });
  const shot = () => cv.toDataURL('image/jpeg', 0.82).split(',')[1];

  async function readShot() {
    if (!img) return say('캡처를 먼저 넣어주세요', true, 'readmsg');
    if (!masks.length) say('가린 칸이 없습니다 — 이름·주소·전화·카드가 안 보이는 캡처면 그대로 읽습니다', false, 'readmsg');
    busy = true; say('읽는 중… (10초쯤)', false, 'readmsg');
    try {
      const r = await api('readPurchaseImage', {image: shot(), mime: 'image/jpeg'});
      if (!r || !r.ok) throw Error((r && r.error) || '읽지 못했습니다');
      F.kind = r.kind === '장바구니' ? '장바구니' : '주문완료';
      F.vendor = r.platform || r.seller || F.vendor; F.seller = r.platform && r.seller && r.seller !== r.platform ? r.seller : F.seller;
      F.extOrderNo = r.orderNo || ''; if (/^\d{4}-\d{2}-\d{2}$/.test(r.orderDate || '')) F.orderDate = r.orderDate;
      F.payMethod = r.payMethod || ''; F.total = r.total || '';
      F.items = r.items.map(x => ({name: x.name, option: x.option || '', qty: x.qty, unit: x.unit || '개', unsure: x.unsure}));
      if (!F.items.length) F.items = [{name: '', option: '', qty: 1, unit: '개'}];
      if (!F.type) F.type = guessType(F.items);
      say((r.kind === '모름' ? '주문 완료인지 확실하지 않습니다 — 아래에서 골라주세요 · ' : '') + F.items.length + '줄 읽었습니다' + (r.items.some(x => x.unsure) ? ' · 흐린 줄(노란색)은 꼭 확인' : ''), r.kind === '모름', 'readmsg');
      paint();
    } catch (e) { say(/unknown|readPurchaseImage/i.test(e.message) ? '서버(Order.gs·Code.gs)를 새로 올린 뒤에 됩니다' : e.message, true, 'readmsg'); }
    finally { busy = false; paint(); }   // 읽는 동안 잠근 버튼을 다시 풂 — 안 그리면 칸을 건드리기 전까지 「구매 기록」이 잠긴 채로 남음 (10/27 대표)
  }

  // 품목 이름으로 발주 유형 짐작 — 확실한 것만. 모르면 비워 두고 고르게 함
  function guessType(items) {
    const t = items.map(x => (x.name || '') + ' ' + (x.option || '')).join(' ');
    if (/스위치|콘센트|조명|LED|다운라이트|SMPS|램프|센서|감지기|전구|멀티탭|플러그|매입등|레일등/i.test(t)) return '조명·스위치';
    return '';
  }

  // ── 초안에 같은 물건이 있는지 ──
  const norm = t => String(t || '').toLowerCase().replace(/[\s·.,()\[\]\-_/+]/g, '');
  function similar(a, b) {
    const x = norm(a), y = norm(b); if (!x || !y) return false;
    if (x.includes(y.slice(0, 8)) || y.includes(x.slice(0, 8))) return true;
    // 낱말 둘 이상이 겹치되, 그중 하나는 흔한 말(스위치·콘센트·3구·색…)이 아니어야 — 「아펠라 스위치 3구」 ↔ 「스텐 토글 스위치 3구」 는 다른 물건
    const GEN = /^(스위치|콘센트|조명|다운라이트|led|화이트|블랙|실버|\d+구|\d+로|\d+(w|mm|인치)|커버|세트|개)$/i;
    const ta = String(a).split(/[\s·,()/]+/).filter(w => w.length >= 2), tb = new Set(String(b).split(/[\s·,()/]+/).filter(w => w.length >= 2));
    const both = ta.filter(w => tb.has(w));
    return both.length >= 2 && both.some(w => !GEN.test(w));
  }
  function dupDraft() {
    const out = [];
    const drafts = (typeof picked === 'function' ? picked() : []);
    F.items.forEach((it, i) => { if (!it.name) return; drafts.forEach(d => { if (similar(it.name, d.name + ' ' + (d.spec || ''))) out.push({i, d}); }); });
    return out;
  }
  function dupOrders() {
    const os = (S.detail && S.detail.orders) || [];
    return os.filter(o => F.vendor && (o.name || '').includes(F.vendor) && (o.date || '') === F.orderDate);
  }
  function takeFromDraft(d, i) {
    // 초안 줄을 빼고, 그 줄이 실측에서 왔으면 출처를 이 기록으로 옮김 → 기록 때 실측 표에 「발주 완료」
    const ex = S.extra.find(x => x === d || (x.name === d.name && (x.spec || '') === (d.spec || '') && x.qty > 0));
    if (ex) { F.items[i].sources = (F.items[i].sources || []).concat(ex.sources || []); ex.qty = 0; }
    else if (d.id && S.qty && S.qty[d.id]) delete S.qty[d.id];
    if (typeof renderItems === 'function') renderItems(); if (typeof draw === 'function') draw();
    paint(); say('「발주서 만들기」 초안에서 뺐습니다 — 이 기록으로 남깁니다', false);
  }

  // ── 그리기 ──
  function paint() {
    panel.querySelectorAll('[data-f]').forEach(i => { if (document.activeElement !== i) i.value = F[i.dataset.f] ?? ''; });
    panel.querySelectorAll('input[name="v6bk"]').forEach(r => { r.checked = r.value === F.kind; });
    $('[data-items]').innerHTML = F.items.map((x, i) => `<tr class="${x.unsure ? 'unsure' : ''}"><td><input data-i="${i}" data-k="name" value="${esc(x.name)}" placeholder="품명"></td><td><input data-i="${i}" data-k="option" value="${esc(x.option)}" placeholder="색 · 규격 · 선택"></td>`
      + `<td class="r"><input type="number" min="0" data-i="${i}" data-k="qty" value="${esc(x.qty)}" class="q"></td><td><input data-i="${i}" data-k="unit" value="${esc(x.unit)}" class="u"></td>`
      + `<td>${(x.sources || []).length ? '<span class="v6b-link" title="실측에서 온 줄 — 기록하면 실측 표에 발주 완료">🔗 실측</span>' : ''}<button class="v6b-x" data-act="delrow" data-i="${i}" title="이 줄 빼기">×</button></td></tr>`).join('');
    const n = F.items.filter(x => x.name && Number(x.qty) > 0).length;
    $('[data-sum]').textContent = (n && !F.type ? '⚠️ 발주 유형을 골라주세요 · ' : '') + n + '품목' + (Number(F.total) ? ' · ' + won(F.total) + '원' : '') + ' · ' + (F.kind === '장바구니' ? '장바구니(초안)' : '주문 완료 → 검수 대기');
    const dd = dupDraft(), dor = dupOrders();
    $('[data-dup]').innerHTML = (dd.length ? `<div class="v6b-alert dup">⚠️ <b>「발주서 만들기」 초안에 같은 물건이 있습니다</b> — 그대로 두면 업체 발주서에도 나갑니다.${dd.map(m => `<div class="v6b-dl"><span>${esc(F.items[m.i].name)} ↔ <b>${esc(m.d.name)}</b>${m.d.spec ? ' · ' + esc(m.d.spec) : ''} × ${esc(m.d.qty)}</span><button data-act="take" data-i="${m.i}" data-d="${esc(m.d.name)}|${esc(m.d.spec || '')}">초안에서 빼고 이 기록으로</button></div>`).join('')}</div>` : '')
      + (dor.length ? `<div class="v6b-alert dup">⚠️ <b>같은 날 같은 구매처 기록이 이미 있습니다</b> — ${dor.map(o => esc(o.no + ' ' + o.name)).join(', ')}. 다른 주문이면 그대로 기록하세요.</div>` : '');
    const os = ((S.detail && S.detail.orders) || []).slice(0, 10);
    $('[data-list]').innerHTML = os.length ? os.map(o => `<div class="v6b-o"><b>${esc(o.name || o.no)}</b><span class="v6b-st s-${esc(o.state || '')}">${esc(o.state || '')}</span><small>${esc(o.no || '')} · ${esc(o.count || 0)}품목 · ${esc(o.date || '')}</small></div>`).join('') : '<p class="v6b-empty">현장을 고르면 나옵니다</p>';
    $('[data-act="record"]').disabled = busy || !S.site || !n || !F.type;
  }
  function say(t, bad, which) { const m = $(which === 'readmsg' ? '[data-readmsg]' : '[data-msg]'); if (!m) return; m.innerHTML = t || ''; m.classList.toggle('bad', !!bad); }

  panel.addEventListener('input', e => {
    const t = e.target;
    if (t.dataset.f) { F[t.dataset.f] = t.value; if (t.dataset.f === 'vendor' || t.dataset.f === 'orderDate' || t.dataset.f === 'type') paintSoon(); return; }
    if (t.dataset.k) { const it = F.items[+t.dataset.i]; it[t.dataset.k] = t.dataset.k === 'qty' ? Number(t.value) : t.value; delete it.unsure; paintSoon(); }
  });
  let pt2 = 0; const paintSoon = () => { clearTimeout(pt2); pt2 = setTimeout(() => { const a = document.activeElement, sel = a && a.dataset ? [a.dataset.i, a.dataset.k, a.dataset.f, a.selectionStart] : null; paint(); if (sel) { const q = sel[2] ? `[data-f="${sel[2]}"]` : `[data-i="${sel[0]}"][data-k="${sel[1]}"]`; const n = panel.querySelector(q); if (n) { n.focus(); try { n.setSelectionRange(sel[3], sel[3]); } catch (x) { } } } }, 350); };
  panel.addEventListener('change', e => { if (e.target.name === 'v6bk') { F.kind = e.target.value; paint(); } });
  panel.addEventListener('click', async e => {
    const b = e.target.closest('[data-act]'); if (!b || busy) return;
    const a = b.dataset.act;
    if (a === 'undo') { masks.pop(); draw2(); }
    else if (a === 'clearimg') { img = null; masks = []; $('.v6b-canvas').hidden = true; say('', false, 'readmsg'); }
    else if (a === 'read') readShot();
    else if (a === 'addrow') { F.items.push({name: '', option: '', qty: 1, unit: '개'}); paint(); }
    else if (a === 'delrow') { F.items.splice(+b.dataset.i, 1); if (!F.items.length) F.items.push({name: '', option: '', qty: 1, unit: '개'}); paint(); }
    else if (a === 'take') { const [nm, sp] = b.dataset.d.split('|'); const d = (picked() || []).find(x => x.name === nm && (x.spec || '') === sp); if (d) takeFromDraft(d, +b.dataset.i); }
    else if (a === 'record') record(false);
    else if (a === 'force') record(true);
  });

  async function record(force) {
    if (!S.site) return say('현장을 먼저 고르세요', true);
    const items = F.items.filter(x => x.name && Number(x.qty) > 0).map(x => ({name: x.name, option: x.option, qty: Number(x.qty), unit: x.unit || '개', sources: x.sources || []}));
    if (!items.length) return say('품목을 하나 이상 적어주세요', true);
    if (!F.vendor.trim()) return say('구매처를 적어주세요 (예: 네이버)', true);
    if (!F.type) return say('발주 유형을 골라주세요 — 검수할 공정이 여기서 정해집니다', true);
    if (!reqId) reqId = 'buy-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    busy = true; paint(); say('노션에 기록하는 중…');
    try {
      const r = await api('recordPurchase', {sitePageId: S.site.id, type: F.type, vendor: F.vendor.trim(), seller: F.seller, extOrderNo: F.extOrderNo, orderDate: F.orderDate,
        payMethod: F.payMethod, total: Number(F.total) || 0, kind: F.kind, note: F.note, items, image: img ? shot() : '', requestId: reqId, force: !!force});
      if (r && r.duplicate) { busy = false; paint(); return say(`⚠️ ${esc(r.error)} · <a href="${esc(r.pageUrl)}" target="_blank" rel="noopener">노션에서 보기</a> · 다른 주문이면 <button class="v6b-fn" data-act="force">그래도 기록</button>`, true); }
      if (!r || !r.ok) throw Error((r && r.error) || '기록하지 못했습니다');
      last = r; reqId = '';
      if (S.detail) { S.detail.orders = S.detail.orders || []; if (!S.detail.orders.some(o => o.id === r.orderPageId)) S.detail.orders.unshift({id: r.orderPageId, no: r.orderNo, name: F.type + ' · ' + F.vendor + ' (산 것)', count: items.length, date: F.orderDate, state: F.kind === '장바구니' ? '발주예정' : '발주완료'}); }
      const warn = [r.fileError, r.linkWarning].filter(Boolean).join(' · ');
      F = blank(); img = null; masks = []; $('.v6b-canvas').hidden = true; say('', false, 'readmsg');
      busy = false; paint();
      say(`✅ <b>${esc(r.orderNo)}</b> 기록했습니다${r.again ? ' (이미 기록돼 있던 것)' : ''} · <a href="${esc(r.pageUrl)}" target="_blank" rel="noopener">노션에서 보기</a> · 택배가 오면 보고앱에서 체크${warn ? '<br>⚠️ ' + esc(warn) : ''}`, !!warn);
    } catch (e) { busy = false; paint(); say(/unknown|recordPurchase/i.test(e.message) ? '서버(Order.gs·Code.gs)를 새로 올린 뒤에 됩니다' : esc(e.message), true); }
  }

  // 현장·종류가 바뀌면 목록·기본 유형 다시
  const oldDraw = draw;
  draw = function () { oldDraw.apply(this, arguments); if (mode === 'buy') { try { paint(); } catch (e) { } } };
  window.산것기록 = {open: () => setMode('buy'), state: () => JSON.parse(JSON.stringify(F))};   // 점검용
})();
