'use strict';
// 발주 실측 · 스위치·콘센트 (현장 폰) — 2026-10-25 Claude
// 방을 열고, 벽의 콘센트·스위치를 보이는 대로 누릅니다. 구성이 같은 것은 한 번만 넣고 개수로 셉니다.
// 서버: dasifill-opensite/Wiring.gs (wiringGet · wiringSave). 설계: 시안/발주실측_흐름표.html
// 10/25 저녁 대표 사용 점검 반영: 삭제 버튼, 콘센트 1구·방우 아님 기본값, 브랜드(융/르그랑) 선택과 그 모양의 그림, 화면 말 정리
const API = 'https://script.google.com/macros/s/AKfycbym4-GzQSpHY9yEK7nm6NGbXRf1AIZve1-TmeiZsL7PPbU6qllWhdDzGphpLROHsw/exec';
const VERSION = 'wiring1';
const LINK_VER = '20261025c';   // 화면 사이 이동 링크에 붙임 — 폰이 옛 화면을 붙잡지 않게 (배포마다 바꿈)
const $ = id => document.getElementById(id);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const clone = x => JSON.parse(JSON.stringify(x));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'w' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10));

const NAME = {콘센트: '콘센트', UTP: 'UTP', 동축: '동축(TV)', 전화: '전화', USB: 'USB', 빈칸: '막음', 모름: '모름', 스위치1: '스위치 1구', 스위치2: '스위치 2구', 스위치3: '스위치 3구', 다른모양: '다른 모양'};
const OUTLET = ['콘센트', 'UTP', '동축', '전화', 'USB', '빈칸', '모름'];
const SWITCH = ['스위치1', '스위치2', '스위치3', '다른모양'];
const WET = {yes: '방우', no: '방우 아님', unknown: '방우 모름', na: ''};
const BRAND = {jung: '융', apella: '르그랑', other: '기타'};
const NUM = ['①', '②', '③', '④', '⑤', '⑥'];

let site = '', rows = [], view = 'rooms', roomId = '', cur = null, slot = 0, undo = [], busy = false, dirty = false, newWork = 'replace', askDel = '', siteBrand = '';
const draftKey = id => 'dsf_wiring_draft:' + site + ':' + id;
const brandKey = () => 'dsf_wiring_brand:' + site;

function msg(text, error = false) { $('message').textContent = text; $('message').classList.toggle('error', error); }
function freeze(on) { busy = on; document.querySelectorAll('#screen button, #screen input, #screen textarea, #refresh').forEach(e => e.disabled = on); }
async function api(action, data = {}) {
  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 90000);
  try {
    const res = await fetch(API, {method: 'POST', body: JSON.stringify({action, key: localStorage.getItem('dsf_key') || '', data}), signal: ctl.signal});
    if (!res.ok) throw Error('서버 연결에 실패했습니다');
    const r = await res.json();
    if (!r.ok) { const e = Error(r.error || '처리하지 못했습니다'); e.result = r; throw e; }
    return r;
  } catch (e) {
    if (e.name === 'AbortError') throw Error('저장 응답을 확인하지 못했습니다. 입력은 이 폰에 남아 있습니다 — 다시 저장하면 중복 없이 이어집니다');
    throw e;
  } finally { clearTimeout(timer); }
}

// ── 그림: 융은 가로 판, 르그랑 아펠라는 세로 판 (모양을 단순화한 것 · 실제 치수 아님) ──
const C = {plate: '#fbfbf9', edge: '#dedcd6', part: '#f3f2ee', line: '#b9b6ad', hole: '#55534d'};
function mod(kind, x, wet, L) {
  const cx = x + 34, cy = 34;
  const face = r => L ? `<rect x="${cx - r}" y="${cy - r}" width="${2 * r}" height="${2 * r}" rx="${r * .28}" fill="${C.part}" stroke="${C.line}"/>` : `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${C.part}" stroke="${C.line}"/>`;
  switch (kind) {
    case '콘센트': return face(L ? 25 : 23) + (L ? `<circle cx="${cx}" cy="${cy}" r="18" fill="none" stroke="${C.line}" stroke-width=".9"/>` : '')
      + `<circle cx="${cx - 8}" cy="${cy}" r="3.2" fill="${C.hole}"/><circle cx="${cx + 8}" cy="${cy}" r="3.2" fill="${C.hole}"/>`
      + (wet ? `<path d="M${x + 8} ${cy - 6} h52 v-18 a4 4 0 0 0 -4 -4 h-44 a4 4 0 0 0 -4 4z" fill="${C.part}" stroke="${C.line}" opacity=".95"/>` : '');
    case '스위치1': case '스위치2': case '스위치3': { const n = +kind.slice(-1), w = (50 - (n - 1) * 1.5) / n;
      return Array.from({length: n}, (_, i) => `<rect x="${x + 9 + i * (w + 1.5)}" y="9" width="${w}" height="50" rx="${L ? 4 : 3}" fill="${C.part}" stroke="${C.line}"/>`).join(''); }
    case 'UTP': return (L ? face(17) : `<rect x="${x + 20}" y="22" width="28" height="22" rx="2" fill="${C.part}" stroke="${C.line}"/>`) + `<rect x="${cx - 7}" y="${cy - 6}" width="14" height="10" fill="${C.hole}"/><rect x="${cx - 3}" y="${cy + 4}" width="6" height="4" fill="${C.hole}"/>`;
    case '동축': return face(L ? 17 : 13) + `<circle cx="${cx}" cy="${cy}" r="6" fill="none" stroke="${C.hole}" stroke-width="2"/><circle cx="${cx}" cy="${cy}" r="1.6" fill="${C.hole}"/>`;
    case '전화': return (L ? face(15) : `<rect x="${x + 23}" y="25" width="22" height="18" rx="2" fill="${C.part}" stroke="${C.line}"/>`) + `<rect x="${cx - 6}" y="${cy - 4}" width="12" height="8" fill="${C.hole}"/>`;
    case 'USB': return (L ? face(17) : `<rect x="${x + 18}" y="20" width="32" height="28" rx="3" fill="${C.part}" stroke="${C.line}"/>`) + `<rect x="${cx - 11}" y="${cy - 7}" width="10" height="4" fill="${C.hole}"/><rect x="${cx + 2}" y="${cy - 7}" width="9" height="4" rx="2" fill="${C.hole}"/>`;
    case '다른모양': return `<rect x="${x + 9}" y="9" width="50" height="50" rx="6" fill="none" stroke="${C.line}" stroke-dasharray="4 3"/><text x="${cx}" y="${cy + 6}" font-size="15" font-weight="700" text-anchor="middle" fill="#a0561a">특수</text>`;
    case '모름': return `<text x="${cx}" y="${cy + 9}" font-size="26" font-weight="700" text-anchor="middle" fill="#d08a2a">?</text>`;
    case null: case undefined: return `<rect x="${x + 10}" y="10" width="48" height="48" rx="6" fill="none" stroke="#c4c4c0" stroke-dasharray="4 3"/>`;
    default: return '';
  }
}
// maxH: 그림 높이 상한(세로 판이 카드를 넘지 않게)
function plateSvg(mods, scale = 1, wet = false, hi = -1, brand = 'jung', maxH = 0) {
  const L = brand === 'apella', n = Math.max(1, mods.length), sw = /^스위치/.test(mods[0] || '');
  let w, h, body;
  if (L) {
    w = 84; h = n === 1 ? 128 : n * 68 + 26;
    body = sw ? (() => { const k = +mods[0].slice(-1), bw = (w - 24 - (k - 1) * 2) / k; return Array.from({length: k}, (_, i) => `<rect x="${12 + i * (bw + 2)}" y="12" width="${bw}" height="${h - 24}" rx="5" fill="${C.part}" stroke="${C.line}"/>`).join(''); })()
      : mods.map((m, i) => `<g transform="translate(8,${n === 1 ? 30 : 13 + i * 68})">${mod(m, 0, wet && m === '콘센트', true)}${i === hi ? `<rect x="2" y="2" width="64" height="64" rx="8" fill="none" stroke="#16181d" stroke-width="2.5"/>` : ''}</g>`).join('');
  } else {
    w = n * 68 + 14; h = 82;
    body = '<g transform="translate(7,7)">' + mods.map((m, i) => (i ? `<line x1="${i * 68}" y1="6" x2="${i * 68}" y2="62" stroke="${C.edge}" stroke-width=".8"/>` : '') + mod(m, i * 68, wet && m === '콘센트', false)
      + (i === hi ? `<rect x="${i * 68 + 2}" y="2" width="64" height="64" rx="8" fill="none" stroke="#16181d" stroke-width="2.5"/>` : '')).join('') + '</g>';
  }
  if (maxH && h * scale > maxH) scale = maxH / h;
  return `<svg width="${Math.round(w * scale)}" height="${Math.round(h * scale)}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(mods.map(m => NAME[m] || '빈 칸').join(' + '))}"><rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="${L ? 10 : 7}" fill="${C.plate}" stroke="${C.edge}"/>`
    + (L ? `<rect x="4.5" y="4.5" width="${w - 9}" height="${h - 9}" rx="7" fill="none" stroke="${C.edge}" stroke-width=".7"/>` : '') + body + '</svg>';
}
const isSwitch = m => SWITCH.includes(m[0]);
const what = p => isSwitch(p.modules) ? NAME[p.modules[0]] : p.modules.length + '구 · ' + p.modules.map(m => m ? NAME[m] : '비어 있음').join(' + ');
function sentence(p) {
  if (!p.modules.length) return '';
  return [p.room + ' ' + (p.location || '(위치 없음)'), what(p), '이 방에 ' + p.qty + '개', isSwitch(p.modules) ? '' : (WET[p.wet] || '방우 여부 안 고름'), BRAND[p.brand] || ''].filter(Boolean).join(' / ');
}

// ── 자료 ──
const rooms = () => rows.filter(r => r.kind === 'room');
const platesOf = id => rows.filter(r => r.kind === 'plate' && r.roomKey === id);
const roomOf = id => rows.find(r => r.kind === 'room' && r.id === id);
const fieldPart = p => ({location: p.location || '', modules: clone(p.modules || []), qty: p.qty || 1, wet: p.wet ?? null, memo: p.memo || '', brand: p.brand || ''});
const brandOf = p => (BRAND[p.brand] ? p.brand : siteBrand) || 'jung';

async function load() {
  if (!site) return;
  freeze(true); msg('기록을 불러옵니다…');
  try {
    const r = await api('wiringGet', {sitePageId: site});
    if (r.version !== VERSION) throw Error('스위치·콘센트 실측 서버가 아직 반영되지 않았습니다. 사무실에 알려주세요');
    rows = r.rows; $('siteTitle').textContent = r.siteName.replace(/\s*PROJECT\s*$/, '');
    // 이 현장 브랜드: 폰에 고른 것 → 없으면 이미 저장된 것 중 많이 쓴 것
    try { siteBrand = localStorage.getItem(brandKey()) || ''; } catch (e) { siteBrand = ''; }
    if (!BRAND[siteBrand]) { const c = {}; rows.forEach(x => { if (BRAND[x.brand]) c[x.brand] = (c[x.brand] || 0) + 1; }); siteBrand = Object.keys(c).sort((a, b) => c[b] - c[a])[0] || ''; }
    $('screen').hidden = false;
    if (view === 'room' && !roomOf(roomId)) view = 'rooms';
    if (view === 'editor') view = 'room';
    render(); msg(view === 'rooms' ? '방을 골라 콘센트·스위치를 넣으세요' : '');
  } catch (e) { msg(e.message, true); $('screen').hidden = true; }
  finally { freeze(false); }
}

// ── 화면 ──
function render() {
  if (view === 'rooms') renderRooms(); else if (view === 'room') renderRoom(); else renderEditor();
}
const workPill = r => r.work === 'new' ? '<span class="pill new">신규</span>' : r.work === 'replace' ? '<span class="pill rep">교체</span>' : '';
function roomLine(r) {
  const ps = platesOf(r.id).filter(p => p.status !== 'removed'), unk = ps.filter(p => p.status === 'unknown').length, pend = ps.filter(p => p.status === 'pending').length;
  if (r.status === 'done') return ['확인 완료 · ' + ps.length + '개' + (unk ? ' · 모름 ' + unk : ''), unk ? 'warn' : 'ok'];
  if (r.status === 'none') return ['바꿀 것 없음', 'ok'];
  return [(ps.length ? ps.length + '개 등록' : '아직 넣은 것 없음') + (pend ? ' · 확인할 것 ' + pend : '') + (unk ? ' · 모름 ' + unk : ''), ''];
}
function renderRooms() {
  const rs = rooms(), left = rs.filter(r => r.status === 'pending').length;
  $('screen').innerHTML = `<div class="card brandCard"><b>이 현장 브랜드</b><div class="seg">${Object.keys(BRAND).map(k => `<button data-site-brand="${k}" class="${siteBrand === k ? 'on' : ''}">${BRAND[k]}</button>`).join('')}</div><small>새로 넣는 콘센트·스위치의 기본값 · 하나씩 바꿀 수도 있음</small></div>`
    + `<p class="sum">방 ${rs.length} · 확인 남은 방 ${left}</p>`
    + (rs.map(r => { const [t, c] = roomLine(r);
      return `<button class="roomItem" data-room="${esc(r.id)}"><span><b>${esc(r.room)}</b><small>${esc(t)}</small></span>${r.status !== 'pending' ? `<span class="pill ${c}">${r.status === 'done' ? '확인 완료' : '바꿀 것 없음'}</span>` : workPill(r)}</button>`; }).join('')
      || '<div class="card"><b>아직 등록된 방이 없습니다</b><p class="sum" style="margin:6px 0 0">아래 「방 추가」로 바꿀 콘센트·스위치가 있는 방을 넣으세요.</p></div>')
    + `<div class="card"><label for="newRoom">방 추가 — 목록에 없는 방</label><div class="seg"><button data-work="replace" class="${newWork === 'replace' ? 'on' : ''}">있는 것 교체</button><button data-work="new" class="${newWork === 'new' ? 'on' : ''}">새로 만듦</button></div>`
    + `<div class="addRoom"><input id="newRoom" maxlength="40" placeholder="예: 작은방, 드레스룸"><button id="addRoom" class="primary">추가</button></div></div>`;
}
function renderRoom() {
  const r = roomOf(roomId); if (!r) { view = 'rooms'; return render(); }
  const ps = platesOf(r.id), live = ps.filter(p => p.status !== 'removed');
  const drafts = []; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (!k.startsWith('dsf_wiring_draft:' + site + ':')) continue;
    try { const d = JSON.parse(localStorage.getItem(k)); if (d.roomKey === r.id && !rows.some(x => x.id === d.id)) drafts.push(d); } catch (e) { } }
  const card = (p, draft) => {
    const sub = draft ? '저장 안 함 — 눌러서 이어서' : p.status === 'pending' ? '사무실이 적어둔 것 — 눌러서 확인' : p.status === 'unknown' ? '모름 — 사무실이 사진 보고 확인' : p.photos?.length ? '사진 있음' : '';
    const del = askDel === p.id
      ? `<span class="delAsk"><button data-del-yes="${esc(p.id)}"${draft ? ' data-draft="1"' : ''} class="dangerBtn">삭제</button><button data-del-no="1">취소</button></span>`
      : `<button class="delBtn" data-del="${esc(p.id)}" aria-label="${esc(p.location)} 삭제">삭제</button>`;
    return `<div class="plate ${draft ? 'unknown' : p.status}"><button class="plateMain" data-plate="${esc(p.id)}"><span class="pic">${plateSvg(p.modules.length ? p.modules : [null], .6, p.wet === 'yes', -1, brandOf(p), 62)}</span>`
      + `<span class="txt"><b>${esc(p.location || '위치 없음')}</b><small>${esc(what(p))} · <b class="qty">${p.qty}개</b>${p.wet === 'yes' ? ' · 방우' : ''}</small>${sub ? `<small>${sub}</small>` : ''}</span></button>${del}</div>`;
  };
  $('screen').innerHTML = `<div class="roomTop"><button id="toRooms">‹ 방 목록</button>${workPill(r)}</div><h2 class="roomName">${esc(r.room)}</h2>`
    + live.map(p => card(p)).join('') + drafts.map(d => card(d, true)).join('')
    + `<button id="addPlate" class="dash">＋ 콘센트·스위치 추가</button>`
    + `<div class="bottom">` + (r.status === 'pending'
      ? (live.length ? `<button id="roomDone" class="primary">이 방 확인 완료</button><small>빠진 콘센트·스위치가 없을 때 누르세요</small>` : `<button id="roomNone">이 방은 바꿀 것 없음</button>`)
      : `<small>${r.status === 'done' ? '이 방은 확인 완료' : '이 방은 바꿀 것 없음'}</small><button id="roomReopen">다시 열기</button>`) + `</div>`;
}
function renderEditor() {
  const p = cur, sw = isSwitch(p.modules), r = roomOf(p.roomKey), b = brandOf(p);
  const photo = p.photo ? p.photo : p.photo === null ? '' : (p.photos?.[0]?.url || '');
  $('screen').innerHTML = `<div class="roomTop"><button id="edBack">‹ ${esc(r ? r.room : '방')}</button><small style="color:var(--mute)">${p.revision ? '등록됨' : '새로 추가'}</small></div>`
    + `<div class="seg"><button data-kind="outlet" class="${sw ? '' : 'on'}">콘센트</button><button data-kind="switch" class="${sw ? 'on' : ''}">스위치</button></div>`
    + `<div class="seg brandSeg">${Object.keys(BRAND).map(k => `<button data-brand="${k}" class="${b === k ? 'on' : ''}">${BRAND[k]}</button>`).join('')}</div>`
    + `<div class="big">${plateSvg(p.modules.length ? p.modules : [null], 1.45, p.wet === 'yes', sw ? -1 : slot, b, 230)}</div>`
    + (sw
      ? `<div class="mgrid">${SWITCH.map(m => `<button class="mb ${p.modules[0] === m ? 'on' : ''}" data-sw="${m}">${plateSvg([m], .5, false, -1, b, 40)}${NAME[m]}</button>`).join('')}</div><p class="sum" style="margin-top:8px">4로·일괄소등·디밍·4구 이상은 「다른 모양」 + 사진</p>`
      : `<div class="slots">${p.modules.map((m, i) => `<button data-slot="${i}" class="${i === slot ? 'on' : ''}">${NUM[i]} ${m ? NAME[m] : '비어 있음'}</button>`).join('')}${p.modules.length < 6 ? '<button data-addslot="1">＋ 구 추가</button>' : ''}</div>`
        + `<p class="sum" style="margin:-4px 2px 6px">${p.modules.length > 1 ? (NUM[slot] || '') + '에 넣을 것' : '2구 이상이면 「＋ 구 추가」'}</p>`
        + `<div class="mgrid">${OUTLET.map(m => `<button class="mb ${p.modules[slot] === m ? 'on' : ''}" data-mod="${m}">${plateSvg([m], .5, false, -1, b, 40)}${NAME[m]}</button>`).join('')}<button class="mb" data-delslot="1" ${p.modules.length > 1 ? '' : 'disabled'}>고른 구<br>지우기</button></div>`
        + `<div class="seg" style="margin-top:12px"><button data-wet="no" class="${p.wet === 'no' ? 'on' : ''}">방우 아님</button><button data-wet="yes" class="${p.wet === 'yes' ? 'on' : ''}">방우 맞음</button><button data-wet="unknown" class="${p.wet === 'unknown' ? 'on' : ''}">모르겠음</button></div>`)
    + `<div class="row2"><span>이 구성이 이 방에 몇 개?<br><small style="color:var(--mute);font-size:12px">똑같은 건 한 번만, 개수로</small></span><span class="step"><button data-qty="-1" aria-label="하나 빼기">−</button><b>${p.qty}</b><button data-qty="1" aria-label="하나 더">＋</button></span></div>`
    + `<label for="loc">위치 <small style="color:var(--mute)">(대충 적어도 됨)</small></label><input id="loc" maxlength="60" value="${esc(p.location)}" placeholder="예: 현관문 옆 / 신발장 옆 외 2곳">`
    + `<div class="photoRow">${photo ? `<img src="${esc(photo)}" alt="콘센트·스위치 사진"><button data-photo="del">사진 지우기</button>` : ''}<button data-photo="take">📷 ${photo ? '다시 찍기' : '사진'}</button>${undo.length ? '<button id="undo">되돌리기</button>' : ''}</div>`
    + `<details ${p.memo ? 'open' : ''}><summary>메모 ${p.memo ? '' : '(필요할 때만)'}</summary><textarea id="memo" maxlength="400" placeholder="예: 기존 통합수구 · 가로형">${esc(p.memo)}</textarea></details>`
    + `<div class="say">${esc(sentence(p))}</div>`
    + `<div class="bottom editBar">${p.revision ? `<button id="remove" class="${askDel === p.id ? 'dangerBtn' : 'delWide'}">${askDel === p.id ? '정말 삭제' : '삭제'}</button>` : '<button id="edCancel" class="delWide">취소</button>'}<button id="save" class="primary">저장</button></div>`;
}

// ── 편집 ──
function openPlate(p) {
  const latest = rows.find(x => x.id === p.id);
  cur = clone(latest || p); cur.base = fieldPart(latest || p); slot = 0; undo = []; dirty = false; askDel = '';
  let d = null; try { d = JSON.parse(localStorage.getItem(draftKey(p.id)) || 'null'); } catch (e) { }
  if (d) {
    // 저장 안 한 입력은 최신 기록 위에, 현장에서 바꾼 칸만 다시 얹습니다 (옛 변경표시로 충돌하지 않게)
    const mine = fieldPart(d), base = d.base || null, theirs = fieldPart(cur);
    Object.keys(mine).forEach(k => { if (!base || !same(mine[k], base[k])) cur[k] = clone(mine[k]); });
    if (d.photo !== undefined) cur.photo = d.photo;
    cur.pendingRequest = d.pendingRequest; cur.base = theirs; dirty = true;
    if (latest && d.pendingRequest && latest.requestId === d.pendingRequest.id && same(fieldPart(latest), mine)) { localStorage.removeItem(draftKey(p.id)); cur = clone(latest); cur.base = theirs; dirty = false; }
    else msg('저장 안 한 입력을 이어서 엽니다');
  }
  view = 'editor'; render(); scrollTo(0, 0);
}
function keep() {
  dirty = true;
  try { localStorage.setItem(draftKey(cur.id), JSON.stringify(cur)); }
  catch (e) { try { localStorage.setItem(draftKey(cur.id), JSON.stringify({...cur, photo: undefined})); msg('사진은 폰 공간이 모자라 초안에 못 넣었습니다 — 저장 전에 화면을 닫지 마세요', true); } catch (e2) { } }
}
function change(fn) { if ($('message').classList.contains('error')) msg(''); askDel = ''; undo.push(clone({modules: cur.modules, wet: cur.wet, qty: cur.qty, brand: cur.brand})); if (undo.length > 30) undo.shift(); fn(); keep(); render(); }

async function savePlate(removing) {
  if (busy || !cur) return;
  cur.location = $('loc').value.trim(); cur.memo = ($('memo')?.value || '').trim();
  if (!removing) {
    if (!cur.location) { msg('위치를 적어주세요 (예: 현관문 옆)', true); $('loc').focus(); return; }
    if (cur.modules.some(m => !m)) { msg('비어 있는 구가 있습니다. 채우거나 「고른 구 지우기」를 눌러주세요', true); return; }
    if (!isSwitch(cur.modules) && !cur.wet) { msg('방우인지 골라주세요 (모르면 「모르겠음」)', true); return; }
    if (cur.modules[0] === '다른모양' && !cur.memo && !cur.photo && !cur.photos?.length) { msg('다른 모양은 사진을 찍거나 메모를 남겨주세요', true); return; }
  }
  // 삭제: 노션 줄은 지우지 않고 「뺌」으로 남깁니다(사무실이 무엇을 뺐는지 볼 수 있게). 이유는 묻지 않습니다
  const row = {id: cur.id, kind: 'plate', room: cur.room, roomKey: cur.roomKey, location: cur.location || '(위치 없음)', modules: cur.modules.map(m => m || '빈칸'), qty: cur.qty,
    wet: isSwitch(cur.modules) ? 'na' : (cur.wet || 'unknown'), memo: removing ? (cur.memo || '현장에서 삭제') : cur.memo, status: removing ? 'removed' : 'auto', fieldToken: cur.fieldToken, photo: cur.photo, brand: brandOf(cur)};
  await send(row, cur.revision || 0, removing ? '삭제했습니다' : '저장 · ' + cur.room + ' ' + cur.location);
}
async function deleteSaved(id) {
  const p = rows.find(x => x.id === id); if (!p) return;
  cur = clone(p); cur.base = fieldPart(p);
  const row = {id: p.id, kind: 'plate', room: p.room, roomKey: p.roomKey, location: p.location || '(위치 없음)', modules: p.modules, qty: p.qty, wet: p.wet || 'unknown', memo: p.memo || '현장에서 삭제', status: 'removed', fieldToken: p.fieldToken, brand: brandOf(p)};
  await send(row, p.revision || 0, (p.location || '') + ' 삭제했습니다');
}
async function send(row, expectedRevision, done) {
  const fp = JSON.stringify(row), holder = row.kind === 'plate' ? cur : (rows.find(x => x.id === row.id) || {});
  const req = holder.pendingRequest?.fp === fp ? holder.pendingRequest.id : uid();
  holder.pendingRequest = {id: req, fp}; if (row.kind === 'plate' && view === 'editor') keep();
  freeze(true); msg('노션에 저장 중…');
  try {
    const r = await api('wiringSave', {sitePageId: site, row, expectedRevision, requestId: req});
    const at = rows.findIndex(x => x.id === r.row.id); if (at < 0) rows.push(r.row); else rows[at] = r.row;
    if (row.kind === 'plate') { localStorage.removeItem(draftKey(row.id)); dirty = false; cur = null; view = 'room'; askDel = ''; }
    freeze(false); render(); if (view !== 'room') scrollTo(0, 0); msg(done);
  } catch (e) {
    freeze(false);
    if (e.result?.conflict) return recover(row);
    msg(e.message, true);
  }
}
// 먼저 바뀐 경우: 최신을 받아 다시 얹고, 사람이 한 번 더 보고 저장합니다
async function recover(row) {
  try { const r = await api('wiringGet', {sitePageId: site}); rows = r.rows; } catch (e) { msg('먼저 바뀐 내용이 있어 저장하지 않았습니다. 새로고침 후 다시 열어주세요. 입력은 폰에 남아 있습니다', true); return; }
  if (row.kind === 'plate' && cur) { const latest = rows.find(x => x.id === row.id); openPlate(latest || cur); }
  else { view = roomId ? 'room' : 'rooms'; render(); }
  msg('다른 폰이나 사무실에서 먼저 바꿨습니다. 최신 기록을 불러왔으니 확인 후 다시 눌러주세요', true);
}

// 사진은 폰에서 줄여서 보냅니다 (긴 변 1280px · JPEG)
async function shrink(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(Error('사진을 읽지 못했습니다')); i.src = url; });
    for (const [max, q] of [[1280, .72], [1024, .6], [800, .5]]) {
      const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight)), c = document.createElement('canvas');
      c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      const d = c.toDataURL('image/jpeg', q); if (d.length < 650000) return d;
    }
    throw Error('사진이 너무 큽니다. 조금 멀리서 다시 찍어주세요');
  } finally { URL.revokeObjectURL(url); }
}

// ── 누르기 ──
$('screen').addEventListener('click', async e => {
  const b = e.target.closest('button'); if (!b || busy) return;
  if (b.dataset.siteBrand) { siteBrand = b.dataset.siteBrand; try { localStorage.setItem(brandKey(), siteBrand); } catch (err) { } render(); msg('새로 넣는 것은 「' + BRAND[siteBrand] + '」로 시작합니다'); return; }
  if (b.dataset.room) { roomId = b.dataset.room; view = 'room'; askDel = ''; render(); scrollTo(0, 0); msg(''); return; }
  if (b.dataset.work) { newWork = b.dataset.work; render(); return; }
  if (b.id === 'addRoom') {
    const name = $('newRoom').value.trim(); if (!name) { msg('방 이름을 적어주세요', true); return; }
    if (rooms().some(r => r.room === name)) { msg('같은 이름의 방이 이미 있습니다', true); return; }
    return send({id: uid(), kind: 'room', room: name, location: name + ' 전체', work: newWork, status: 'pending'}, 0, name + ' 추가했습니다');
  }
  if (b.id === 'toRooms') { view = 'rooms'; askDel = ''; render(); msg(''); return; }
  // 목록에서 삭제: 한 번 더 묻고 지움
  if (b.dataset.del) { askDel = b.dataset.del; render(); return; }
  if (b.dataset.delNo) { askDel = ''; render(); return; }
  if (b.dataset.delYes) {
    const id = b.dataset.delYes; askDel = '';
    if (b.dataset.draft) { localStorage.removeItem(draftKey(id)); render(); msg('저장 안 한 입력을 지웠습니다'); return; }
    return deleteSaved(id);
  }
  if (b.dataset.plate) {
    const p = rows.find(x => x.id === b.dataset.plate); if (p) return openPlate(p);
    try { const d = JSON.parse(localStorage.getItem(draftKey(b.dataset.plate))); if (d) return openPlate(d); } catch (err) { }
    return;
  }
  // 새로 넣을 때는 가장 흔한 것(콘센트 1구 · 방우 아님 · 1개)으로 시작 — 대부분 개수만 바꾸고 저장
  if (b.id === 'addPlate') { const r = roomOf(roomId); return openPlate({id: uid(), kind: 'plate', room: r.room, roomKey: r.id, location: '', modules: ['콘센트'], qty: 1, wet: 'no', memo: '', revision: 0, photos: [], brand: siteBrand || ''}); }
  const r = roomOf(roomId);
  if (b.id === 'roomDone' || b.id === 'roomNone' || b.id === 'roomReopen') {
    const status = b.id === 'roomDone' ? 'done' : b.id === 'roomNone' ? 'none' : 'pending';
    return send({id: r.id, kind: 'room', room: r.room, location: r.location, work: r.work, status, fieldToken: r.fieldToken}, r.revision, status === 'done' ? r.room + ' — 확인 완료' : status === 'none' ? r.room + ' — 바꿀 것 없음' : r.room + ' — 다시 열었습니다');
  }
  if (!cur) return;
  cur.location = $('loc')?.value.trim() ?? cur.location; cur.memo = ($('memo')?.value ?? cur.memo).trim();
  if (b.id === 'edBack') { view = 'room'; cur = null; askDel = ''; render(); scrollTo(0, 0); msg(dirty ? '입력은 이 폰에 보관했습니다 — 다시 열면 이어집니다' : ''); return; }
  if (b.id === 'edCancel') { localStorage.removeItem(draftKey(cur.id)); view = 'room'; cur = null; dirty = false; render(); scrollTo(0, 0); msg(''); return; }
  if (b.id === 'remove') { if (askDel !== cur.id) { askDel = cur.id; render(); document.getElementById('remove').scrollIntoView({block: 'center'}); msg('한 번 더 누르면 삭제됩니다'); return; } return savePlate(true); }
  if (b.dataset.kind) return change(() => { if (b.dataset.kind === 'switch') { cur.modules = ['스위치1']; cur.wet = 'na'; } else { cur.modules = ['콘센트']; cur.wet = 'no'; slot = 0; } });
  if (b.dataset.brand) return change(() => { cur.brand = b.dataset.brand; });
  if (b.dataset.sw) return change(() => { cur.modules = [b.dataset.sw]; });
  if (b.dataset.slot) { slot = +b.dataset.slot; render(); return; }
  if (b.dataset.addslot) return change(() => { cur.modules.push(null); slot = cur.modules.length - 1; });
  if (b.dataset.mod) return change(() => { cur.modules[slot] = b.dataset.mod; if (slot < cur.modules.length - 1) slot++; });
  if (b.dataset.delslot) return change(() => { cur.modules.splice(slot, 1); slot = Math.max(0, Math.min(slot, cur.modules.length - 1)); });
  if (b.dataset.wet) return change(() => { cur.wet = b.dataset.wet; });
  if (b.dataset.qty) return change(() => { cur.qty = Math.max(1, Math.min(50, cur.qty + Number(b.dataset.qty))); });
  if (b.id === 'undo') { const u = undo.pop(); if (u) { Object.assign(cur, u); slot = Math.min(slot, cur.modules.length - 1); keep(); render(); } return; }
  if (b.dataset.photo === 'take') { $('photoInput').value = ''; $('photoInput').click(); return; }
  if (b.dataset.photo === 'del') { cur.photo = null; keep(); render(); return; }
  if (b.id === 'save') return savePlate(false);
});
$('screen').addEventListener('input', e => { if (!cur) return; if (e.target.id === 'loc') cur.location = e.target.value; if (e.target.id === 'memo') cur.memo = e.target.value; keep(); const s = document.querySelector('.say'); if (s) s.textContent = sentence({...cur, location: cur.location.trim()}); });
$('photoInput').addEventListener('change', async e => {
  const f = e.target.files?.[0]; if (!f || !cur) return;
  try { msg('사진을 줄이는 중…'); cur.photo = await shrink(f); keep(); render(); msg('사진은 「저장」을 눌러야 올라갑니다'); }
  catch (err) { msg(err.message, true); }
});
$('refresh').onclick = () => { if (view === 'editor' && dirty) msg('입력은 이 폰에 보관했습니다 — 다시 열면 이어집니다'); cur = null; load(); };
$('loginBtn').onclick = async () => { const k = $('accessKey').value.trim(); if (!k) return; localStorage.setItem('dsf_key', k); $('accessKey').value = ''; await start(); };
addEventListener('beforeunload', e => { if (busy || (view === 'editor' && dirty)) { e.preventDefault(); e.returnValue = ''; } });

async function start() {
  site = new URLSearchParams(location.search).get('site') || '';
  if (!/^[a-f0-9-]{32,36}$/i.test(site)) { msg('현장관리에서 현장을 선택한 뒤 들어와주세요.', true); return; }
  $('toLighting').href = 'lighting.html?v=' + LINK_VER + '&site=' + encodeURIComponent(site);
  if (!localStorage.getItem('dsf_key')) { $('login').hidden = false; msg('현장관리와 같은 접속키로 접속해주세요'); return; }
  $('login').hidden = true; await load(); if ($('screen').hidden) $('login').hidden = false;
}
start();
