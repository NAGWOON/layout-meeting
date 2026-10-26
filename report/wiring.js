'use strict';
// 발주 실측 · 스위치·콘센트 (현장 폰) — 2026-10-25 Claude · 10/26 실물 그림·색·구성 상세로 다시 짬
// 방을 열고, 벽의 콘센트·스위치를 보이는 대로 누릅니다. 구성이 같은 것은 한 번만 넣고 개수로 셉니다.
// 10/26 대표: 색을 처음부터 고르게 · 융은 프레임에 섞어 넣기(스위치+보일러 등) · 스위치는 구마다 단로/3로/일괄 · 비브랜드는 「기타」+제품 이름
// 그림·목록·말: wiring-kit.js (발주앱과 같은 파일) · 서버: dasifill-opensite/Wiring.gs (wiringGet · wiringSave)
const API = 'https://script.google.com/macros/s/AKfycbym4-GzQSpHY9yEK7nm6NGbXRf1AIZve1-TmeiZsL7PPbU6qllWhdDzGphpLROHsw/exec';
const VERSIONS = ['wiring1', 'wiring2'];   // wiring1 = 옛 서버(색·구성 상세를 아직 안 받음)
const LINK_VER = '20261027a';   // 화면 사이 이동 링크에 붙임 — 폰이 옛 화면을 붙잡지 않게 (배포마다 바꿈)
const K = window.WiringKit;
const $ = id => document.getElementById(id);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const clone = x => JSON.parse(JSON.stringify(x));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'w' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10));
const BRAND = {jung: '융', apella: '르그랑', other: '기타'};
const BRAND_SUB = {jung: '융 · 가로 프레임', apella: '르그랑 · 세로', other: '제품 이름 직접'};
const NUM = ['①', '②', '③', '④', '⑤'];
const FIELD_MODES = ['단로', '3로', '일괄'];

let site = '', rows = [], view = 'rooms', roomId = '', cur = null, undo = [], busy = false, dirty = false, newWork = 'replace', askDel = '', siteBrand = '', siteColor = {}, cat = K.catalog(null), serverVer = '', picking = false;
const draftKey = id => 'dsf_wiring_draft:' + site + ':' + id;
const brandKey = () => 'dsf_wiring_brand:' + site;
const colorKey = () => 'dsf_wiring_color:' + site;

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

// ── 자료 ──
const rooms = () => rows.filter(r => r.kind === 'room');
const platesOf = id => rows.filter(r => r.kind === 'plate' && r.roomKey === id);
const roomOf = id => rows.find(r => r.kind === 'room' && r.id === id);
const brandOf = p => (BRAND[p.brand] ? p.brand : siteBrand) || 'apella';
// 구성: 서버가 준 구성 상세 → 없으면 옛 칸 목록에서 읽음 → 그래도 없으면 「기타」(사람이 다시 고름)
const gangsOf = p => p.gangs && p.gangs.length ? K.normalize(brandOf(p), p.gangs) : (K.fromLegacy(brandOf(p), p.modules, p.wet) || [{k: '기타', n: 1}]);
const fieldPart = p => ({location: p.location || '', gangs: clone(p.gangs || []), qty: p.qty || 1, memo: p.memo || '', brand: p.brand || '', color: p.color || '', name: p.name || ''});
const what = p => K.summary(brandOf(p), gangsOf(p), p.color || '', p.name || '');
function sentence(p) { return [p.room + ' ' + (p.location || '(위치 없음)'), (BRAND[brandOf(p)] || '') + ' ' + what(p), (p.color ? '' : '색 미정'), '이 방에 ' + p.qty + '개'].filter(Boolean).join(' / '); }
const pic = (p, o) => K.draw(cat, {brand: brandOf(p), gangs: gangsOf(p), color: p.color || ''}, o);

async function load() {
  if (!site) return;
  freeze(true); msg('기록을 불러옵니다…');
  try {
    const r = await api('wiringGet', {sitePageId: site});
    if (!VERSIONS.includes(r.version)) throw Error('스위치·콘센트 실측 서버가 아직 반영되지 않았습니다. 사무실에 알려주세요');
    serverVer = r.version; cat = K.catalog(r.catalog);
    rows = r.rows; $('siteTitle').textContent = r.siteName.replace(/\s*PROJECT\s*$/, '');
    try { siteBrand = localStorage.getItem(brandKey()) || ''; siteColor = JSON.parse(localStorage.getItem(colorKey()) || '{}'); } catch (e) { siteBrand = ''; siteColor = {}; }
    if (!BRAND[siteBrand]) { const c = {}; rows.forEach(x => { if (BRAND[x.brand]) c[x.brand] = (c[x.brand] || 0) + 1; }); siteBrand = Object.keys(c).sort((a, b) => c[b] - c[a])[0] || ''; }
    $('screen').hidden = false;
    if (view === 'room' && !roomOf(roomId)) view = 'rooms';
    if (view === 'editor') view = 'room';
    render(); msg(view === 'rooms' ? '방을 골라 콘센트·스위치를 넣으세요' : '');
  } catch (e) { msg(e.message, true); $('screen').hidden = true; }
  finally { freeze(false); }
}

// ── 화면 ──
function render() { if (view === 'rooms') renderRooms(); else if (view === 'room') renderRoom(); else renderEditor(); }
const workPill = r => r.work === 'new' ? '<span class="pill new">신규</span>' : r.work === 'replace' ? '<span class="pill rep">교체</span>' : '';
function roomLine(r) {
  const ps = platesOf(r.id).filter(p => p.status !== 'removed'), unk = ps.filter(p => p.status === 'unknown').length, pend = ps.filter(p => p.status === 'pending').length, noColor = ps.filter(p => !p.color).length;
  if (r.status === 'done') return ['확인 완료 · ' + ps.length + '개' + (unk ? ' · 모름 ' + unk : '') + (noColor ? ' · 색 미정 ' + noColor : ''), unk ? 'warn' : 'ok'];
  if (r.status === 'none') return ['바꿀 것 없음', 'ok'];
  return [(ps.length ? ps.length + '개 등록' : '아직 넣은 것 없음') + (pend ? ' · 확인할 것 ' + pend : '') + (unk ? ' · 모름 ' + unk : ''), ''];
}
const swatches = (b, current, attr) => `<div class="sw">${cat.colors(b).map(c => `<button data-${attr}="${esc(c.name)}" class="${current === c.name ? 'on' : ''}" aria-label="${esc(c.name)}"><i style="background:${K.swatch(c)}"></i>${esc(c.name)}</button>`).join('')}<button data-${attr}="" class="${current ? '' : 'on'}"><i class="none"></i>모름</button></div>`;
function renderRooms() {
  const rs = rooms(), left = rs.filter(r => r.status === 'pending').length, b = siteBrand || 'apella';
  $('screen').innerHTML = (serverVer === 'wiring1' ? '<p class="banner">서버 업데이트 전입니다 — 색·구성 상세는 사무실이 서버를 올린 뒤부터 저장됩니다</p>' : '')
    + `<div class="card brandCard"><b>이 현장 기본</b><small>새로 넣는 콘센트·스위치가 이걸로 시작합니다 · 하나씩 바꿀 수도 있음</small>`
    + `<div class="seg brandSeg">${Object.keys(BRAND).map(k => `<button data-site-brand="${k}" class="${siteBrand === k ? 'on' : ''}">${BRAND[k]}</button>`).join('')}</div>`
    + (siteBrand ? `<label>기본 색 · ${esc(K.BRANDS[b])}</label>${swatches(b, siteColor[b] || '', 'site-color')}` : '') + `</div>`
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
    const sub = draft ? '저장 안 함 — 눌러서 이어서' : p.status === 'pending' ? '사무실이 적어둔 것 — 눌러서 확인' : p.status === 'unknown' ? '모름 — 사무실이 사진 보고 확인' : '';
    const del = askDel === p.id
      ? `<span class="delAsk"><button data-del-yes="${esc(p.id)}"${draft ? ' data-draft="1"' : ''} class="dangerBtn">삭제</button><button data-del-no="1">취소</button></span>`
      : `<button class="delBtn" data-del="${esc(p.id)}" aria-label="${esc(p.location)} 삭제">삭제</button>`;
    return `<div class="plate ${draft ? 'unknown' : p.status}"><button class="plateMain" data-plate="${esc(p.id)}"><span class="pic">${pic(p, {maxW: 92, maxH: 66})}</span>`
      + `<span class="txt"><b>${esc(p.location || '위치 없음')}</b><small>${esc(BRAND[brandOf(p)])} · ${esc(what(p))}</small><small><b class="qty">×${p.qty}</b>${p.color ? '' : ' <i class="flag">색 미정</i>'}${p.photos?.length ? ' · 사진' : ''}</small>${sub ? `<small>${sub}</small>` : ''}</span></button>${del}</div>`;
  };
  $('screen').innerHTML = `<div class="roomTop"><button id="toRooms">‹ 방 목록</button>${workPill(r)}</div><h2 class="roomName">${esc(r.room)}</h2>`
    + live.map(p => card(p)).join('') + drafts.map(d => card(d, true)).join('')
    + `<button id="addPlate" class="dash">＋ 콘센트·스위치 추가</button>`
    + `<div class="bottom">` + (r.status === 'pending'
      ? (live.length ? `<button id="roomDone" class="primary">이 방 확인 완료</button><small>빠진 콘센트·스위치가 없을 때 누르세요</small>` : `<button id="roomNone">이 방은 바꿀 것 없음</button>`)
      : `<small>${r.status === 'done' ? '이 방은 확인 완료' : '이 방은 바꿀 것 없음'}</small><button id="roomReopen">다시 열기</button>`) + `</div>`;
}
// 같은 모양(종류+구 수)은 하나만 — 3로·일괄은 아래 「구마다 방식」에서 고릅니다
const uniqParts = b => { const seen = {}; return cat.parts(b).filter(p => { const k = p.draw + '|' + p.n; if (seen[k]) return false; seen[k] = 1; return true; }); };
// 아펠라·기타: 완제품 하나를 고름 (목록 「구성」에서)
function presetGrid(b, g) {
  const parts = uniqParts(b);
  return `<div class="pgrid">${parts.map(p => { const on = g.k === p.draw && g.n === Number(p.n);
    return `<button class="pb ${on ? 'on' : ''}" data-preset="${esc(p.draw)}|${p.n}">${K.draw(cat, {brand: b, gangs: [{k: p.draw, n: Number(p.n)}], color: cur.color}, {maxW: 40, maxH: 52})}<span>${esc(p.name.replace(/ \(1로\)$/, ''))}</span></button>`; }).join('')}
    <button class="pb ${g.k === '기타' ? 'on' : ''}" data-preset="기타|1">${K.draw(cat, {brand: b, gangs: [{k: '기타', n: 1}], color: cur.color}, {maxW: 40, maxH: 52})}<span>다른 모양 · 모르겠음</span></button></div>`;
}
const modeRows = (g, gi) => g.modes ? `<div class="modes">${g.modes.map((m, mi) => `<div class="mode"><b>${g.n > 1 ? NUM[mi] : '방식'}</b><div class="seg">${FIELD_MODES.map(x => `<button data-mode="${gi}:${mi}:${x}" class="${m === x ? 'on' : ''}">${x}</button>`).join('')}</div></div>`).join('')}</div>` : '';
// 융: 프레임에 기능을 하나씩 (최대 5구)
function jungSlots(g) {
  return g.map((x, i) => `<div class="slot"><span class="no">${NUM[i]}</span><span class="mini">${K.draw(cat, {brand: 'jung', gangs: [x], color: cur.color}, {maxW: 40, maxH: 40})}</span><b>${esc(K.partName('jung', x))}</b>${g.length > 1 ? `<button class="x" data-delgang="${i}" aria-label="이 구 빼기">빼기</button>` : ''}</div>${modeRows(x, i)}`).join('')
    + (g.length < 5 ? `<button class="dash" data-pick="1">${picking ? '닫기' : '＋ 기능 추가 (프레임 ' + (g.length + 1) + '구로)'}</button>` : '<p class="sum">LS990 프레임은 5구까지</p>')
    + (picking ? `<div class="pgrid">${uniqParts('jung').map(p => `<button class="pb" data-addgang="${esc(p.draw)}|${p.n}">${K.draw(cat, {brand: 'jung', gangs: [{k: p.draw, n: Number(p.n)}], color: cur.color}, {maxW: 44, maxH: 44})}<span>${esc(p.name)}</span></button>`).join('')}<button class="pb" data-addgang="기타|1">${K.draw(cat, {brand: 'jung', gangs: [{k: '기타', n: 1}], color: cur.color}, {maxW: 44, maxH: 44})}<span>다른 것 · 모르겠음</span></button></div>` : '');
}
function renderEditor() {
  const p = cur, r = roomOf(p.roomKey), b = brandOf(p), g = gangsOf(p), sz = K.size(b, g);
  const photo = p.photo ? p.photo : p.photo === null ? '' : (p.photos?.[0]?.url || '');
  $('screen').innerHTML = `<div class="roomTop"><button id="edBack">‹ ${esc(r ? r.room : '방')}</button><small style="color:var(--mute)">${p.revision ? '등록됨' : '새로 추가'}</small></div>`
    + `<div class="stage">${pic(p, {maxW: 300, maxH: 150, dim: 1, flag: 1})}<small>${esc(K.BRANDS[b])} · ${esc(p.color || '색 미정')} · ${b === 'jung' ? g.length + '구 프레임 · ' : ''}${sz[0]} × ${sz[1]} mm${b === 'jung' ? '' : ' (비율 참고)'}</small></div>`
    + `<div class="blk"><h4><em>01</em>브랜드</h4><div class="brands">${Object.keys(BRAND).map(k => `<button data-brand="${k}" class="${b === k ? 'on' : ''}"><b>${k === 'apella' ? '아펠라' : k === 'jung' ? 'LS990' : '기타'}</b><small>${BRAND_SUB[k]}</small></button>`).join('')}</div>`
    + (b === 'other' ? `<label for="pname">제품 이름</label><input id="pname" maxlength="60" value="${esc(p.name)}" placeholder="예: 스텐 토글 스위치">` : '') + `</div>`
    + `<div class="blk"><h4><em>02</em>색 · 마감<span>${esc(p.color || '고르세요')}</span></h4>${swatches(b, p.color || '', 'color')}</div>`
    + `<div class="blk"><h4><em>03</em>구성${b === 'jung' ? `<span>${g.length} / 5구</span>` : ''}</h4>`
    + (b === 'jung' ? jungSlots(g) : presetGrid(b, g[0]) + modeRows(g[0], 0)) + `</div>`
    + `<div class="blk"><h4><em>04</em>위치 · 개수</h4><label for="loc">위치 <small style="color:var(--mute)">(대충 적어도 됨)</small></label><input id="loc" maxlength="60" value="${esc(p.location)}" placeholder="예: 현관문 옆 / 신발장 옆 외 2곳">`
    + `<div class="row2"><span>이 구성이 이 방에 몇 개?<br><small style="color:var(--mute);font-size:12px">똑같은 건 한 번만, 개수로</small></span><span class="step"><button data-qty="-1" aria-label="하나 빼기">−</button><b>${p.qty}</b><button data-qty="1" aria-label="하나 더">＋</button></span></div></div>`
    + `<div class="photoRow">${photo ? `<img src="${esc(photo)}" alt="콘센트·스위치 사진"><button data-photo="del">사진 지우기</button>` : ''}<button data-photo="take">📷 ${photo ? '다시 찍기' : '사진'}</button>${undo.length ? '<button id="undo">되돌리기</button>' : ''}</div>`
    + `<details ${p.memo ? 'open' : ''}><summary>메모 ${p.memo ? '' : '(필요할 때만)'}</summary><textarea id="memo" maxlength="400" placeholder="예: 타공 안 되어 있음 · 가로형">${esc(p.memo)}</textarea></details>`
    + `<div class="say">${esc(sentence(p))}</div>`
    + `<div class="bottom editBar">${p.revision ? `<button id="remove" class="${askDel === p.id ? 'dangerBtn' : 'delWide'}">${askDel === p.id ? '정말 삭제' : '삭제'}</button>` : '<button id="edCancel" class="delWide">취소</button>'}<button id="save" class="primary">저장</button></div>`;
}

// ── 편집 ──
function openPlate(p) {
  const latest = rows.find(x => x.id === p.id);
  cur = clone(latest || p); cur.gangs = gangsOf(cur); cur.base = fieldPart(Object.assign({}, latest || p, {gangs: gangsOf(latest || p)})); undo = []; dirty = false; askDel = ''; picking = false;
  let d = null; try { d = JSON.parse(localStorage.getItem(draftKey(p.id)) || 'null'); } catch (e) { }
  if (d) {
    // 저장 안 한 입력은 최신 기록 위에, 현장에서 바꾼 칸만 다시 얹습니다 (옛 변경표시로 충돌하지 않게)
    const mine = fieldPart(d), base = d.base || null, theirs = fieldPart(cur);
    Object.keys(mine).forEach(k => { if (!base || !same(mine[k], base[k])) cur[k] = clone(mine[k]); });
    if (d.photo !== undefined) cur.photo = d.photo;
    cur.pendingRequest = d.pendingRequest; cur.base = theirs; dirty = true;
    if (latest && d.pendingRequest && latest.requestId === d.pendingRequest.id && same(fieldPart(Object.assign({}, latest, {gangs: gangsOf(latest)})), mine)) { localStorage.removeItem(draftKey(p.id)); cur = clone(latest); cur.gangs = gangsOf(cur); cur.base = theirs; dirty = false; }
    else msg('저장 안 한 입력을 이어서 엽니다');
  }
  view = 'editor'; render(); scrollTo(0, 0);
}
function keep() {
  dirty = true;
  try { localStorage.setItem(draftKey(cur.id), JSON.stringify(cur)); }
  catch (e) { try { localStorage.setItem(draftKey(cur.id), JSON.stringify({...cur, photo: undefined})); msg('사진은 폰 공간이 모자라 초안에 못 넣었습니다 — 저장 전에 화면을 닫지 마세요', true); } catch (e2) { } }
}
function change(fn) { if ($('message').classList.contains('error')) msg(''); askDel = ''; undo.push(clone({gangs: cur.gangs, qty: cur.qty, brand: cur.brand, color: cur.color, name: cur.name})); if (undo.length > 30) undo.shift(); fn(); cur.gangs = K.normalize(brandOf(cur), cur.gangs); keep(); render(); }

async function savePlate(removing) {
  if (busy || !cur) return;
  cur.location = $('loc').value.trim(); cur.memo = ($('memo')?.value || '').trim(); if ($('pname')) cur.name = $('pname').value.trim();
  const b = brandOf(cur), g = K.normalize(b, cur.gangs);
  if (!removing) {
    if (!cur.location) { msg('위치를 적어주세요 (예: 현관문 옆)', true); $('loc').focus(); return; }
    if (g.some(x => x.k === '기타') && !cur.memo && !cur.photo && !cur.photos?.length) { msg('「다른 모양 · 모르겠음」은 사진을 찍거나 메모를 남겨주세요', true); return; }
    if (b === 'other' && !cur.name) { msg('기타 제품은 이름을 적어주세요 (예: 스텐 토글 스위치)', true); $('pname')?.focus(); return; }
  }
  // 옛 서버도 받을 수 있게 옛 칸 목록을 같이 보냅니다. 새 서버는 spec 으로 저장하고 칸 목록은 스스로 다시 만듭니다
  const lg = K.toLegacy(b, g);
  const row = {id: cur.id, kind: 'plate', room: cur.room, roomKey: cur.roomKey, location: cur.location || '(위치 없음)', modules: lg.modules, qty: cur.qty, wet: lg.wet === 'na' ? 'na' : lg.wet,
    memo: removing ? (cur.memo || '현장에서 삭제') : cur.memo, status: removing ? 'removed' : 'auto', fieldToken: cur.fieldToken, photo: cur.photo, brand: b,
    spec: {gangs: g, color: cur.color || '', name: b === 'other' ? cur.name || '' : ''}};
  if (lg.modules[0] === '다른모양' && !row.memo && !cur.photo && !cur.photos?.length) row.memo = what(cur);   // 옛 서버의 「다른 모양은 메모」 조건 — 구성 글을 메모로
  await send(row, cur.revision || 0, removing ? '삭제했습니다' : '저장 · ' + cur.room + ' ' + cur.location);
}
async function deleteSaved(id) {
  const p = rows.find(x => x.id === id); if (!p) return;
  cur = clone(p); cur.gangs = gangsOf(p); cur.base = fieldPart(cur);
  const b = brandOf(p), g = gangsOf(p), lg = K.toLegacy(b, g);
  const row = {id: p.id, kind: 'plate', room: p.room, roomKey: p.roomKey, location: p.location || '(위치 없음)', modules: p.modules && p.modules.length ? p.modules : lg.modules, qty: p.qty, wet: p.wet || lg.wet,
    memo: p.memo || '현장에서 삭제', status: 'removed', fieldToken: p.fieldToken, brand: b, spec: {gangs: g, color: p.color || '', name: p.name || ''}};
  await send(row, p.revision || 0, (p.location || '') + ' 삭제했습니다');
}
async function send(row, expectedRevision, done) {
  const fp = JSON.stringify(row), holder = row.kind === 'plate' ? cur : (rows.find(x => x.id === row.id) || {});
  const req = holder.pendingRequest?.fp === fp ? holder.pendingRequest.id : uid();
  holder.pendingRequest = {id: req, fp}; if (row.kind === 'plate' && view === 'editor') keep();
  freeze(true); msg('노션에 저장 중…');
  try {
    const r = await api('wiringSave', {sitePageId: site, row, expectedRevision, requestId: req});
    // 옛 서버는 색·구성 상세를 돌려주지 않습니다 — 화면에서 방금 고른 것이 사라지지 않게 이어 붙임(다음 새로고침에서 서버 값으로)
    if (row.spec && !r.row.gangs && serverVer === 'wiring1') Object.assign(r.row, {gangs: row.spec.gangs, color: row.spec.color, name: row.spec.name});
    const at = rows.findIndex(x => x.id === r.row.id); if (at < 0) rows.push(r.row); else rows[at] = r.row;
    if (row.kind === 'plate') { localStorage.removeItem(draftKey(row.id)); dirty = false; cur = null; view = 'room'; askDel = ''; }
    freeze(false); render(); if (view !== 'room') scrollTo(0, 0); msg(done + (serverVer === 'wiring1' && row.spec ? ' (색·구성 상세는 서버 업데이트 뒤 저장됨)' : ''));
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
  if (b.dataset.siteColor !== undefined) { siteColor[siteBrand] = b.dataset.siteColor; try { localStorage.setItem(colorKey(), JSON.stringify(siteColor)); } catch (err) { } render(); msg(b.dataset.siteColor ? '새로 넣는 ' + BRAND[siteBrand] + '은 「' + b.dataset.siteColor + '」로 시작합니다' : '기본 색을 비웠습니다'); return; }
  if (b.dataset.room) { roomId = b.dataset.room; view = 'room'; askDel = ''; render(); scrollTo(0, 0); msg(''); return; }
  if (b.dataset.work) { newWork = b.dataset.work; render(); return; }
  if (b.id === 'addRoom') {
    const name = $('newRoom').value.trim(); if (!name) { msg('방 이름을 적어주세요', true); return; }
    if (rooms().some(r => r.room === name)) { msg('같은 이름의 방이 이미 있습니다', true); return; }
    return send({id: uid(), kind: 'room', room: name, location: name + ' 전체', work: newWork, status: 'pending'}, 0, name + ' 추가했습니다');
  }
  if (b.id === 'toRooms') { view = 'rooms'; askDel = ''; render(); msg(''); return; }
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
  // 새로 넣을 때: 현장 기본 브랜드·색 + 가장 흔한 것(아펠라 콘센트 2구 · 융 콘센트 1구)
  if (b.id === 'addPlate') { const r = roomOf(roomId), br = siteBrand || 'apella';
    return openPlate({id: uid(), kind: 'plate', room: r.room, roomKey: r.id, location: '', gangs: br === 'other' ? [{k: '토글', n: 1, modes: ['단로']}] : [{k: '콘센트', n: br === 'apella' ? 2 : 1}], qty: 1, memo: '', revision: 0, photos: [], brand: br, color: siteColor[br] || '', name: ''}); }
  const r = roomOf(roomId);
  if (b.id === 'roomDone' || b.id === 'roomNone' || b.id === 'roomReopen') {
    const status = b.id === 'roomDone' ? 'done' : b.id === 'roomNone' ? 'none' : 'pending';
    return send({id: r.id, kind: 'room', room: r.room, location: r.location, work: r.work, status, fieldToken: r.fieldToken}, r.revision, status === 'done' ? r.room + ' — 확인 완료' : status === 'none' ? r.room + ' — 바꿀 것 없음' : r.room + ' — 다시 열었습니다');
  }
  if (!cur) return;
  cur.location = $('loc')?.value.trim() ?? cur.location; cur.memo = ($('memo')?.value ?? cur.memo).trim(); if ($('pname')) cur.name = $('pname').value.trim();
  if (b.id === 'edBack') { view = 'room'; cur = null; askDel = ''; render(); scrollTo(0, 0); msg(dirty ? '입력은 이 폰에 보관했습니다 — 다시 열면 이어집니다' : ''); return; }
  if (b.id === 'edCancel') { localStorage.removeItem(draftKey(cur.id)); view = 'room'; cur = null; dirty = false; render(); scrollTo(0, 0); msg(''); return; }
  if (b.id === 'remove') { if (askDel !== cur.id) { askDel = cur.id; render(); document.getElementById('remove').scrollIntoView({block: 'center'}); msg('한 번 더 누르면 삭제됩니다'); return; } return savePlate(true); }
  if (b.dataset.brand) return change(() => {
    const nb = b.dataset.brand, old = brandOf(cur); if (nb === old) return;
    cur.brand = nb; cur.color = cat.colors(nb).some(c => c.name === cur.color) ? cur.color : (siteColor[nb] || '');
    // 브랜드를 바꾸면 모양이 다릅니다 — 첫 구의 종류만 이어 갑니다 (융 → 아펠라는 첫 구만)
    const first = cur.gangs[0] || {k: '콘센트', n: 1};
    cur.gangs = nb === 'jung' ? [Object.assign({}, first, {n: first.k === '스위치' ? Math.min(first.n, 3) : 1})] : nb === 'other' ? [{k: first.k === '스위치' ? '토글' : first.k, n: first.n, modes: first.modes}] : [Object.assign({}, first, {k: first.k === '토글' ? '스위치' : first.k})];
  });
  if (b.dataset.color !== undefined) return change(() => { cur.color = b.dataset.color; });
  if (b.dataset.preset) return change(() => { const [k, n] = b.dataset.preset.split('|'); const keepModes = cur.gangs[0] && cur.gangs[0].k === k ? cur.gangs[0].modes : null; cur.gangs = [{k, n: +n, modes: keepModes}]; });
  if (b.dataset.mode) return change(() => { const [gi, mi, m] = b.dataset.mode.split(':'); cur.gangs[+gi].modes[+mi] = m; });
  if (b.dataset.pick) { picking = !picking; render(); return; }
  if (b.dataset.addgang) return change(() => { const [k, n] = b.dataset.addgang.split('|'); cur.gangs.push({k, n: +n}); picking = false; });
  if (b.dataset.delgang) return change(() => { cur.gangs.splice(+b.dataset.delgang, 1); });
  if (b.dataset.qty) return change(() => { cur.qty = Math.max(1, Math.min(50, cur.qty + Number(b.dataset.qty))); });
  if (b.id === 'undo') { const u = undo.pop(); if (u) { Object.assign(cur, u); keep(); render(); } return; }
  if (b.dataset.photo === 'take') { $('photoInput').value = ''; $('photoInput').click(); return; }
  if (b.dataset.photo === 'del') { cur.photo = null; keep(); render(); return; }
  if (b.id === 'save') return savePlate(false);
});
$('screen').addEventListener('input', e => { if (!cur) return; if (e.target.id === 'loc') cur.location = e.target.value; if (e.target.id === 'memo') cur.memo = e.target.value; if (e.target.id === 'pname') cur.name = e.target.value; keep(); const s = document.querySelector('.say'); if (s) s.textContent = sentence({...cur, location: cur.location.trim()}); });
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
  if (!K) { msg('화면 도구를 불러오지 못했습니다 — 새로고침 해주세요', true); return; }
  if (!localStorage.getItem('dsf_key')) { $('login').hidden = false; msg('현장관리와 같은 접속키로 접속해주세요'); return; }
  $('login').hidden = true; await load(); if ($('screen').hidden) $('login').hidden = false;
}
start();
