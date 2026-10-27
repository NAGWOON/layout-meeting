/* 발주앱 · 화면 틀 v6 — 2026-10-27 Claude (대표 승인 시안 「다」 · 목자재부터)
 * 기존 한 화면(#unifiedOrder)의 요소를 그대로 옮겨 배치만 바꿉니다. 계산·저장·발주 기록 동작은 손대지 않습니다.
 *  · 위: 현장 한 줄 + 현장 칩(엘리베이터·하차·목공 착수)
 *  · 왼쪽: 주문표(넓게) · 아래: 참고 카드
 *  · 가운데 손잡이: 오른쪽 폭 조절 (이 컴퓨터에 기억)
 *  · 오른쪽: 장 탭 → 그 장의 발주처·납품일·배송·양중·특기사항 → 발주서 → 「○○ 발주 기록」
 * 도기·도어(구조화 화면)는 자기 틀을 쓰므로 오른쪽 조건 카드를 숨깁니다. 타일은 별도 화면.
 */
(function () {
  'use strict';
  const root = document.getElementById('unifiedOrder');
  if (!root || typeof el !== 'function') return;
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const KEY = 'dsf_shell_right';
  root.classList.add('v6');

  const ctx = el('unifiedContext'), aside = el('unifiedAside'), main = el('unifiedMain'), bench = root.querySelector('.to-workbench');
  const footer = root.querySelector('.to-footer:not(#structuredFooter)');

  // ── 위: 현장 + 칩 ──
  const chips = document.createElement('div'); chips.id = 'v6Chips'; chips.className = 'v6-chips';
  ctx.append(chips);

  // ── 오른쪽: 장 조건 카드 ──
  const cond = document.createElement('div'); cond.id = 'v6Cond'; cond.className = 'v6-cond';
  const lab = id => el(id).closest('label');
  cond.append(lab('vendorSel'), el('vendorFreeRow'), lab('dueIn'), lab('shipChips'));
  const note = document.createElement('label'); note.className = 'v6-w';
  note.innerHTML = '특기사항 — 이 장에만 <textarea id="v6Note" rows="2"></textarea>';
  cond.append(note, el('dueWarn'), el('shipInfo'));
  const v6Note = note.querySelector('textarea');
  // 특기사항 칸은 글 길이만큼 늘어남 — 조명 담기가 넣은 긴 안내도 내리며 읽지 않게 (10/27 대표 「너무 어거지」)
  const grow = () => { v6Note.style.height = 'auto'; v6Note.style.height = Math.min(320, Math.max(64, v6Note.scrollHeight + 2)) + 'px'; };
  v6Note.addEventListener('input', () => { setSheetNote(v6Note.value); grow(); });

  // ── 오른쪽: 발주서 무대 + 버튼 ──
  const count = el('unifiedCount');
  const acts = document.createElement('div'); acts.className = 'v6-acts';
  const btn = sel => footer.querySelector(sel);
  const sub = document.createElement('div'); sub.className = 'v6-sub';
  [btn('[onclick="openQty()"]'), btn('[onclick="goSettle()"]'), el('unifiedZoom')].forEach(b => b && sub.append(b));
  const noteBtn = btn('[onclick="openNote()"]'); if (noteBtn) noteBtn.hidden = true;   // 특기사항은 위 칸에서 바로
  acts.append(btn('[onclick="copyText()"]'), btn('[onclick="saveImage()"]'), el('submitBtn'));
  const asideTitle = aside.querySelector(':scope > h2'); if (asideTitle) asideTitle.remove();
  // 오른쪽 맨 위 한 줄: 「n품목 · n장」 + 장 탭(수량·나누기) — 따로 떠 있던 것을 한 줄로 (10/27 대표 「어수선」)
  const ahead = document.createElement('div'); ahead.className = 'v6-ahead';
  aside.prepend(ahead); ahead.append(count, el('sheetTabs'));
  // 아래 참고 카드는 셋만: 현장 정보 · 지난 발주 · 지난 현장 참고 (+ 반입 점검이 뜰 때)
  //  · 「담은 것」은 오른쪽 발주서와 같은 내용 · 「알아두기」는 팁 · 공통 특기사항은 오른쪽 「이 장에만」 칸과 겹쳐 헷갈림 → 숨김
  //    (공통 특기사항 값은 그대로 살아 있어, 장 칸이 비면 발주서에 들어갑니다)
  [el('sumBox'), el('noteIn')].forEach(x => { const c = x && x.closest('.card'); if (c) c.classList.add('v6-gone'); });
  const tip = document.querySelector('#unifiedReferences .tipcard'); if (tip) tip.classList.add('v6-gone');
  aside.insertBefore(cond, el('unifiedPreview'));
  el('unifiedPreview').after(sub, acts);
  aside.append(el('resultNote'));
  footer.classList.add('v6-gone');

  // 도기·도어: 기록 버튼 줄을 오른쪽 발주서 아래로 · 타일 화면도 같은 옷
  const sf = el('structuredFooter'); if (sf) { aside.append(sf); sf.classList.add('v6-sacts'); }
  const tileRoot = document.getElementById('tileOrderApp'); if (tileRoot) tileRoot.classList.add('v6');

  // 반입 치수 경고는 주문표 아래로 (시안: 표 → 막히는 것 → 참고) — 제목과 표가 한 카드로 붙게
  const lift = el('v5LiftWarnings'); if (lift) el('unifiedItems').after(lift);

  // ── 가운데 손잡이 ──
  const grip = document.createElement('div'); grip.className = 'v6-grip'; grip.title = '끌어서 발주서 폭 조절'; grip.innerHTML = '<i></i>';
  bench.insertBefore(grip, aside);
  const setRight = w => { root.style.setProperty('--v6-right', w + 'px'); };
  try { const w = Number(localStorage.getItem(KEY)); if (w >= 360 && w <= 900) setRight(w); } catch (e) { }
  grip.addEventListener('mousedown', e => {
    const x0 = e.clientX, w0 = aside.getBoundingClientRect().width; e.preventDefault();
    const mv = ev => setRight(Math.max(360, Math.min(900, w0 - (ev.clientX - x0))));
    const up = () => { removeEventListener('mousemove', mv); removeEventListener('mouseup', up); window.dispatchEvent(new Event('resize'));
      try { localStorage.setItem(KEY, Math.round(aside.getBoundingClientRect().width)); } catch (e) { } };
    addEventListener('mousemove', mv); addEventListener('mouseup', up);
  });
  grip.addEventListener('dblclick', () => { root.style.removeProperty('--v6-right'); try { localStorage.removeItem(KEY); } catch (e) { } window.dispatchEvent(new Event('resize')); });

  // ── 인터넷 주문 (대표 10/27: 다운라이트는 네오·칸트 사이트에서 주문 — 그래도 검수가 돼야 하니 같은 「발주 기록」으로 남김) ──
  // 발주처 이름에 「인터넷」이 들어가면: 장바구니에 옮길 목록 복사 · 버튼 이름 「주문 기록」 · 배송은 택배로
  const NET = ['네오라이팅 (인터넷)', '칸트라이팅 (인터넷)'];
  const isNet = n => /인터넷|온라인/.test(venOf(n) || '');
  const netPick = document.createElement('div'); netPick.className = 'v6-net';
  netPick.innerHTML = '<span>인터넷 주문</span>' + NET.map(v => '<button type="button" data-net="' + esc(v) + '">' + esc(v.replace(' (인터넷)', '')) + '</button>').join('');
  netPick.addEventListener('click', e => {
    const b = e.target.closest('[data-net]'); if (!b) return;
    el('vendorSel').value = '__free'; el('vendorFree').value = b.dataset.net;
    el('vendorFreeRow').classList.remove('hide'); el('vendorFree').oninput();
  });
  cond.insertBefore(netPick, el('vendorFreeRow').nextSibling);
  const netNote = document.createElement('p'); netNote.className = 'v6-netnote';
  netNote.innerHTML = '🛒 <b>인터넷 주문 장</b> — 업체에 발주서를 보낼 필요는 없습니다. 「장바구니 목록 복사」로 사이트에서 주문하고, 주문한 뒤 「주문 기록」을 눌러 남겨 두세요. 현장 검수와 카드 결제 대조가 이 기록으로 됩니다.';
  cond.append(netNote);
  const cartBtn = document.createElement('button'); cartBtn.type = 'button'; cartBtn.className = 'v6-cart'; cartBtn.textContent = '🛒 장바구니 목록 복사';
  acts.prepend(cartBtn);   // 인터넷 장에서는 늘 보이는 아래 줄에
  cartBtn.addEventListener('click', () => {
    const lines = 합치기(pickedOf(S.cur)); if (!lines.length) return toast('이 장에 담은 품목이 없습니다');
    const d = S.detail || {};
    const t = '[인터넷 주문] ' + venOf(S.cur).replace(' (인터넷)', '') + ' · ' + (d.name || '').replace(/\s*PROJECT\s*$/, '') + '\n'
      + lines.map((x, i) => (i + 1) + '. ' + x.name + (x.spec ? ' · ' + x.spec : '') + ' × ' + x.qty + (x.unit || '')).join('\n')
      + '\n\n받는 곳: ' + (d.address || '(현장 주소)') + (el('dueIn').value ? '\n도착 희망: ' + el('dueIn').value : '');
    const done = () => toast('장바구니 목록을 복사했습니다 — 주문한 뒤 「주문 기록」을 눌러주세요');
    if (navigator.clipboard) navigator.clipboard.writeText(t).then(done, () => toast('복사하지 못했습니다')); else toast('이 브라우저는 복사를 못 합니다');
  });

  // ── 그릴 때마다: 칩 · 이 장 특기사항 · 구조화 화면이면 숨김 ──
  function paint() {
    document.body.classList.toggle('v6-nocalc', !['목자재', '설비·방수'].includes(S.type));   // 「계산기 열기」 알약은 산출기가 있는 탭에서만
    const net = isNet(S.cur);
    netPick.hidden = S.type !== '조명·스위치' && !net;
    netNote.hidden = !net; cartBtn.hidden = !net;
    root.classList.toggle('v6-netsheet', net);
    // 인터넷 주문 장의 종이는 「발주서」가 아니라 「주문 기록」 — 나중에 이 그림을 업체에 또 보내 이중 발주가 나지 않게 (10/27 대표)
    if (net) {
      el('sheet').querySelectorAll('.nhead .ttl h2').forEach(h => { h.textContent = '주문 기록'; });
      el('sheet').querySelectorAll('.nto').forEach(n => {
        const w = n.querySelector('.who'), s = n.querySelector('.sub');
        if (w) w.textContent = venOf(S.cur).replace(' (인터넷)', '') + ' · 인터넷 주문';
        if (s) s.textContent = '사이트에서 카드로 결제한 주문입니다.';
        if (!n.querySelector('.v6-stamp')) n.insertAdjacentHTML('beforeend', '<div class="v6-stamp">검수용 기록 · 업체에 보내는 발주서가 아닙니다</div>');
      });
      // 택배로 오는 주문이라 엘리베이터·재단 안내는 필요 없음 — 이 장에 적은 말만 (없으면 검수 안내)
      el('sheet').querySelectorAll('.sfoot p').forEach(p => { p.textContent = noteOf(S.cur).trim() || '택배로 받으면 현장에서 품목·수량을 하나씩 확인해 주세요.'; });
    }
    if (net && !S.shipBy[S.cur]) { S.shipBy[S.cur] = '택배 배송'; if (typeof renderShip === 'function') renderShip(); setTimeout(draw, 0); }   // 한 번만 (다음엔 이미 정해져 있음)
    const structured = ['도기', '도어'].includes(S.type);
    cond.hidden = structured; sub.hidden = structured; acts.hidden = structured; count.hidden = structured; grip.hidden = false;
    root.classList.toggle('v6-structured', structured);
    if (document.activeElement !== v6Note) { v6Note.value = noteOf(S.cur); grow(); }
    root.classList.toggle('v6-light', S.type === '조명·스위치');   // 조명 탭: 아래 참고 카드·재단 칸 숨김 (대표 「굳이?」)
    const common = (el('noteIn').value || '').trim();
    v6Note.placeholder = common ? '비우면 공통 특기사항: ' + common.split('\n')[0] : '예) 오전 도착 부탁드립니다';
    const d = S.detail, out = [];
    if (d) {
      if (d.woodStart) out.push('<span>목공 착수 ' + esc(d.woodStart.slice(5).replace('-', '/')) + '</span>');
      const ev = (typeof elevText === 'function' && elevText()) || d.elevator || '';
      if (ev) out.push('<span>🛗 ' + esc(ev) + '</span>');
      const un = typeof unloadNow === 'function' ? unloadNow() : '';
      if (un) out.push('<span title="' + esc(un) + '">하차 · ' + esc(un.length > 28 ? un.slice(0, 28) + '…' : un) + '</span>');
    }
    chips.innerHTML = out.join('');
  }
  const oldDraw = draw;
  draw = function () { oldDraw.apply(this, arguments); try { paint(); } catch (e) { console.warn('v6 틀', e); } };
  const oldType = setType;
  setType = function () { oldType.apply(this, arguments); try { paint(); } catch (e) { } };
  paint();
  window.dispatchEvent(new Event('resize'));
})();
