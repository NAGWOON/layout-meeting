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
  v6Note.addEventListener('input', () => { setSheetNote(v6Note.value); });

  // ── 오른쪽: 발주서 무대 + 버튼 ──
  const count = el('unifiedCount');
  const acts = document.createElement('div'); acts.className = 'v6-acts';
  const btn = sel => footer.querySelector(sel);
  const sub = document.createElement('div'); sub.className = 'v6-sub';
  [btn('[onclick="openQty()"]'), btn('[onclick="goSettle()"]'), el('unifiedZoom')].forEach(b => b && sub.append(b));
  const noteBtn = btn('[onclick="openNote()"]'); if (noteBtn) noteBtn.hidden = true;   // 특기사항은 위 칸에서 바로
  acts.append(btn('[onclick="copyText()"]'), btn('[onclick="saveImage()"]'), el('submitBtn'));
  const asideTitle = aside.querySelector(':scope > h2'); if (asideTitle) asideTitle.remove();
  aside.prepend(count);
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
    const net = isNet(S.cur);
    netPick.hidden = S.type !== '조명·스위치' && !net;
    netNote.hidden = !net; cartBtn.hidden = !net;
    root.classList.toggle('v6-netsheet', net);
    if (net && !S.shipBy[S.cur]) { S.shipBy[S.cur] = '택배 배송'; if (typeof renderShip === 'function') renderShip(); setTimeout(draw, 0); }   // 한 번만 (다음엔 이미 정해져 있음)
    const structured = ['도기', '도어'].includes(S.type);
    cond.hidden = structured; sub.hidden = structured; acts.hidden = structured; count.hidden = structured; grip.hidden = false;
    root.classList.toggle('v6-structured', structured);
    if (document.activeElement !== v6Note) v6Note.value = noteOf(S.cur);
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
