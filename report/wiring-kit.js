/* 배선기구 공용 도구 — 보고앱(현장)과 발주앱(사무실)이 같은 파일을 씁니다 · 2026-10-26 Claude
 *
 *  ① 목록(색·구성)  — 노션 「배선기구 목록 · 색과 구성」을 서버가 읽어 줍니다. 못 받으면 아래 기본 목록으로 그립니다.
 *  ② 구성(gangs)    — 한 판(벽 박스 한 곳)의 구마다 무엇이 들었는지. 융은 프레임에 섞어 넣고, 아펠라·기타는 완제품 하나.
 *  ③ 그림(draw)     — 실제 치수 비율(융 1구 81×81mm, 한 구 늘 때 +71mm · 아펠라 세로판)과 재질(유광·무광·금속)
 *  ④ 발주(order)    — 구성 + 색 → 업체에 보낼 줄. 목록에서 못 찾으면 지어내지 않고 「확인 필요」로 남깁니다.
 *
 *  이 파일은 dasifill-report-webapp/ 과 dasifill-order-webapp/ 에 똑같이 들어갑니다 (한쪽을 고치면 복사).
 *  시험: 협업/2026-10-25_간접조명_Claude인계/재현검증/work/lighting/test-wiring-kit.js
 */
(function (root) {
  'use strict';

  const BRANDS = {jung: '융 LS990', apella: '르그랑 아펠라', other: '기타'};
  const KINDS = ['스위치', '콘센트', '방우 콘센트', '랜', 'TV', 'TV+랜', '전화', 'USB', '보일러', '막음', '토글', '기타'];
  const MODES = ['단로', '3로', '4로', '일괄'];
  const KEEP = {jung: 5, apella: 1, other: 1};          // 한 판에 들어가는 구 수 (융 LS990 프레임 최대 5구)

  // ── ① 기본 목록 — 노션 표와 같은 내용. 서버가 노션에서 읽어 주면 그걸 씁니다 ──
  // 색: [브랜드, 이름, 견본색, 마감, 주문 이름]
  const C = (brand, name, hex, finish, order, memo) => ({kind: '색', brand, name, hex, finish, order: order || '', memo: memo || ''});
  // 구성: [브랜드, 이름, 그림, 구 수, 스위치 방식, 주문 이름]
  const P = (brand, name, draw, n, modes, order, memo) => ({kind: '구성', brand, name, draw, n, modes: modes || [], order: order || name, memo: memo || ''});
  const DEFAULT = [
    C('jung', '화이트', '#f6f6f3', '유광', 'LS990 화이트'), C('jung', '아이보리', '#efe6d0', '유광', 'LS990 아이보리'),
    C('jung', '라이트그레이', '#d6d7d4', '유광', 'LS990 라이트그레이'), C('jung', '블랙', '#1d1d1d', '유광', 'LS990 블랙'),
    C('jung', '매트 화이트', '#f0f0ec', '무광', 'LS990 매트 화이트'), C('jung', '매트 블랙', '#262626', '무광', 'LS990 매트 블랙'),
    C('jung', '스테인리스', '#eceeef,#a6abaf', '메탈', 'LS990 Metal 스테인리스'), C('jung', '알루미늄', '#e4e5e4,#b2b4b5', '메탈', 'LS990 Metal 알루미늄'),
    C('jung', '앤트러사이트', '#5a5d60,#2f3134', '메탈', 'LS990 Metal 앤트러사이트'), C('jung', '다크 알루미늄', '#7a7c7e,#4a4c4f', '메탈', 'LS990 Metal 다크 알루미늄'),
    C('jung', '클래식 브라스', '#e0c88a,#a5853f', '메탈', 'LS990 Metal 클래식 브라스'), C('jung', '앤틱 브라스', '#a58a66,#6a5235', '메탈', 'LS990 Metal 앤틱 브라스'),
    C('apella', '화이트', '#f7f7f4', '유광', '아펠라 화이트'), C('apella', '매트 크림', '#ebe2cf', '무광', '아펠라 매트크림', '「아이보리」라고 하면 이것 — 아펠라엔 아이보리가 없음'),
    C('apella', '실버', '#d3d5d7,#a9acaf', '무광', '아펠라 실버'), C('apella', '마그네슘', '#8a8d90,#65686b', '무광', '아펠라 마그네슘'),
    C('apella', '블랙', '#262626', '무광', '아펠라 블랙'),
    C('other', '스테인리스', '#eceeef,#a6abaf', '메탈', '스테인리스'), C('other', '화이트', '#f6f6f3', '유광', '화이트'), C('other', '블랙', '#1d1d1d', '무광', '블랙'),

    P('jung', '1회로 스위치', '스위치', 1, ['단로', '3로'], '1회로 스위치 (단로/3로)'),
    P('jung', '2회로 스위치', '스위치', 2, ['단로'], '2회로 스위치 (단로)'),
    P('jung', '2회로 스위치 (3로)', '스위치', 2, ['단로', '3로'], '2회로 스위치 (3로)'),
    P('jung', '3회로 스위치', '스위치', 3, ['단로', '3로'], '3회로 스위치 (단로/3로)'),
    P('jung', '1회로 스위치 (4로)', '스위치', 1, ['4로'], '1회로 스위치 (4로)'),
    P('jung', '1회로 스위치 (일괄소등)', '스위치', 1, ['일괄'], '1회로 스위치 (일괄소등)'),
    P('jung', '2회로 스위치 (일괄소등)', '스위치', 2, ['일괄', '단로'], '2회로 스위치 (일괄소등)', '일괄 + 3로 섞인 것은 네오에 확인'),
    P('jung', '콘센트', '콘센트', 1, [], '220V 콘센트'),
    P('jung', '방우 콘센트', '방우 콘센트', 1, [], '220V 방우형 콘센트'),
    P('jung', 'USB 콘센트', 'USB', 1, [], '220V 콘센트 (USB 결합형 A+C)'),
    P('jung', 'TV 1방', 'TV', 1, [], 'TV 소켓 (1방)'), P('jung', 'TV 2방', 'TV', 2, [], 'TV 소켓 (2방)'),
    P('jung', '랜 1구', '랜', 1, [], 'TEL/LAN (1구) 소켓'), P('jung', '랜 2구', '랜', 2, [], 'TEL/LAN (2구) 소켓'),
    P('jung', '막음', '막음', 1, [], '블랭크 커버'),
    P('jung', '보일러 조절기 자리', '보일러', 1, [], '보일러 조절기 자리', '네오 목록에 없음 — 보일러 조절기를 LS990 프레임에 넣는 방법 확인'),
    P('apella', '스위치 1구 (1로)', '스위치', 1, ['단로'], '아펠라 스위치 1구 1로'), P('apella', '스위치 1구 (3로)', '스위치', 1, ['단로', '3로'], '아펠라 스위치 1구 3로'),
    P('apella', '스위치 2구 (1로)', '스위치', 2, ['단로'], '아펠라 스위치 2구 1로'), P('apella', '스위치 2구 (3로)', '스위치', 2, ['단로', '3로'], '아펠라 스위치 2구 3로'),
    P('apella', '스위치 3구 (1로)', '스위치', 3, ['단로'], '아펠라 스위치 3구 1로'), P('apella', '스위치 3구 (3로)', '스위치', 3, ['단로', '3로'], '아펠라 스위치 3구 3로'),
    P('apella', '콘센트 1구', '콘센트', 1, [], '아펠라 콘센트 1구'), P('apella', '콘센트 2구', '콘센트', 2, [], '아펠라 콘센트 2구'),
    P('apella', '콘센트 4구', '콘센트', 4, [], '아펠라 콘센트 4구'),
    P('apella', '방우 콘센트 1구', '방우 콘센트', 1, [], '아펠라 방우 콘센트 1구'), P('apella', '방우 콘센트 2구', '방우 콘센트', 2, [], '아펠라 방우 콘센트 2구'),
    P('apella', '랜 1구', '랜', 1, [], '아펠라 데이터 RJ45 1구'), P('apella', '랜 2구', '랜', 2, [], '아펠라 데이터 RJ45 2구'),
    P('apella', 'TV 1구', 'TV', 1, [], '아펠라 CATV 1구'), P('apella', 'TV + 랜', 'TV+랜', 2, [], '아펠라 CATV + RJ45'),
    P('apella', 'USB 콘센트', 'USB', 1, [], '아펠라 USB 충전 콘센트'), P('apella', '막음', '막음', 1, [], '아펠라 맹1구'),
    P('other', '토글 1구', '토글', 1, ['단로'], '토글 스위치 1구'), P('other', '토글 2구', '토글', 2, ['단로'], '토글 스위치 2구'),
    P('other', '토글 3구', '토글', 3, ['단로'], '토글 스위치 3구'), P('other', '콘센트 2구', '콘센트', 2, [], '콘센트 2구'),
  ];
  DEFAULT.forEach((x, i) => { x.sort = i + 1; x.use = true; });

  // 서버가 준 목록(노션)을 씁니다. 비었거나 형식이 이상하면 기본 목록 — 그 사실은 화면이 알 수 있게 source 로 남깁니다
  function catalog(fromServer) {
    const ok = Array.isArray(fromServer) && fromServer.some(x => x && x.kind === '색') && fromServer.some(x => x && x.kind === '구성');
    const list = (ok ? fromServer : DEFAULT).filter(x => x && x.use !== false && BRANDS[x.brand]).slice().sort((a, b) => (a.sort || 0) - (b.sort || 0));
    return {source: ok ? 'notion' : 'default', colors: b => list.filter(x => x.kind === '색' && x.brand === b), parts: b => list.filter(x => x.kind === '구성' && x.brand === b), all: list};
  }
  const colorOf = (cat, brand, name) => cat.colors(brand).find(x => x.name === name) || null;

  // ── ② 구성 ──
  const clean = g => {
    const k = KINDS.includes(g && g.k) ? g.k : '기타', n = Math.max(1, Math.min(4, Math.round(Number(g && g.n) || 1)));
    const out = {k, n};
    if (k === '스위치' || k === '토글') out.modes = Array.from({length: n}, (_, i) => MODES.includes(g.modes && g.modes[i]) ? g.modes[i] : '단로');
    return out;
  };
  function normalize(brand, gangs) {
    const list = (Array.isArray(gangs) ? gangs : []).slice(0, KEEP[brand] || 1).map(clean);
    return list.length ? list : [clean({k: '콘센트', n: brand === 'apella' ? 2 : 1})];
  }
  // 옛 기록(구성 원본 = ['콘센트','콘센트'] 같은 칸 목록)을 새 구성으로 — 10/26 이전 입력과 구성 상세가 빈 줄
  function fromLegacy(brand, modules, wet) {
    const m = Array.isArray(modules) ? modules.filter(Boolean) : [];
    if (!m.length) return null;
    const sw = /^스위치([123])$/.exec(m[0]);
    if (sw) return [{k: brand === 'other' ? '토글' : '스위치', n: +sw[1], modes: Array(+sw[1]).fill('단로')}];
    if (m[0] === '다른모양' || m.includes('모름')) return null;          // 사람이 봐야 하는 것 — 지어내지 않음
    const map = {콘센트: wet === 'yes' ? '방우 콘센트' : '콘센트', UTP: '랜', 동축: 'TV', 전화: '전화', USB: 'USB', 빈칸: '막음'};
    if (brand === 'jung') return m.map(x => map[x] ? {k: map[x], n: 1} : {k: '기타', n: 1});
    // 아펠라·기타는 완제품 하나 — 같은 것만 모였으면 그 구 수, TV+랜은 그 제품
    const kinds = [...new Set(m.map(x => map[x] || '기타'))];
    if (kinds.length === 1) return [{k: kinds[0], n: m.length}];
    if (kinds.length === 2 && kinds.includes('TV') && kinds.includes('랜') && m.length === 2) return [{k: 'TV+랜', n: 2}];
    return [{k: '기타', n: m.length}];
  }
  // 새 구성 → 옛 칸 목록 (노션 「구성 원본」·옛 서버와 맞추기 위해)
  function toLegacy(brand, gangs) {
    const g = normalize(brand, gangs);
    if (g.length === 1 && (g[0].k === '스위치' || g[0].k === '토글') && g[0].n <= 3) return {modules: ['스위치' + g[0].n], wet: 'na'};
    if (g.some(x => x.k === '스위치' || x.k === '토글' || x.k === '보일러' || x.k === '기타')) return {modules: ['다른모양'], wet: 'na'};
    const one = {콘센트: '콘센트', '방우 콘센트': '콘센트', 랜: 'UTP', TV: '동축', 전화: '전화', USB: 'USB', 막음: '빈칸'};
    const mods = [];
    g.forEach(x => { if (x.k === 'TV+랜') mods.push('동축', 'UTP'); else for (let i = 0; i < (brand === 'jung' ? 1 : x.n); i++) mods.push(one[x.k]); });
    return {modules: mods.slice(0, 6), wet: g.some(x => x.k === '방우 콘센트') ? 'yes' : 'no'};
  }
  const isWet = gangs => (gangs || []).some(x => x.k === '방우 콘센트');
  const partName = (brand, g) => {
    if (g.k === '스위치') return brand === 'jung' ? g.n + '회로 스위치' : '스위치 ' + g.n + '구';
    if (g.k === '토글') return '토글 ' + g.n + '구';
    if (g.k === '보일러') return '보일러 조절기';
    if (g.k === 'TV+랜') return 'TV + 랜';
    if (g.k === '막음') return '막음';
    return g.k + (brand === 'jung' && g.n === 1 ? '' : ' ' + g.n + '구');
  };
  const modeText = g => g.modes && g.modes.some(m => m !== '단로') ? ' (' + g.modes.join('·') + ')' : '';
  // 사람이 읽는 한 줄 — 노션 「현장 구성」, 목록 카드, 발주 미리보기가 같은 말을 씁니다
  function summary(brand, gangs, color, name) {
    const g = normalize(brand, gangs);
    const parts = g.map(x => partName(brand, x) + modeText(x));
    const grouped = [];
    parts.forEach(p => { const l = grouped[grouped.length - 1]; if (l && l.p === p) l.c++; else grouped.push({p, c: 1}); });
    const body = grouped.map(x => x.p + (x.c > 1 ? ' ×' + x.c : '')).join(' + ');
    const head = brand === 'jung' ? (g.length + '구 프레임' + (g.length > 1 || g[0].k !== '스위치' ? ' — ' : ' · ')) : '';
    const tail = [color || '', brand === 'other' && name ? '「' + name + '」' : ''].filter(Boolean).join(' ');
    return (head + body) + (tail ? ' · ' + tail : '');
  }

  // ── ④ 발주: 한 줄(현장 기록) → 업체에 보낼 줄 ──
  // 스위치는 고른 방식을 모두 할 수 있는 제품 중 방식이 가장 적은(=가장 흔한) 것. 없으면 확인 필요.
  function findPart(cat, brand, g) {
    const need = new Set(g.modes || []);
    const cands = cat.parts(brand).filter(p => p.draw === g.k && Number(p.n) === g.n && [...need].every(m => (p.modes || []).includes(m)));
    cands.sort((a, b) => (a.modes || []).length - (b.modes || []).length || (a.sort || 0) - (b.sort || 0));
    return cands[0] || null;
  }
  // row: {brand, color, name, gangs, qty, room, location, id, site} → {vendor, lines, issues}
  function order(cat, row) {
    const brand = BRANDS[row.brand] ? row.brand : '', issues = [];
    if (!brand) return {vendor: '', lines: [], issues: ['브랜드를 골라주세요']};
    const gangs = row.gangs && row.gangs.length ? normalize(brand, row.gangs) : null;
    if (!gangs) return {vendor: brand, lines: [], issues: ['구성을 정해주세요 (현장에서 「다른 모양」·「모름」으로 적음)']};
    const col = row.color ? colorOf(cat, brand, row.color) : null;
    if (!row.color) issues.push('색 미정');
    else if (!col) issues.push('목록에 없는 색: ' + row.color);
    const where = (row.room || '') + ' ' + (row.location || '');
    const qty = Math.max(1, Number(row.qty) || 1), src = row.id ? [{kind: 'wiring', id: row.id, site: row.site || '', revision: row.revision || 0}] : [];
    const colorName = col ? (col.order || col.name) : (row.color || '색 미정');
    if (brand === 'jung') {
      const parts = gangs.map(g => { const p = findPart(cat, brand, g); if (!p) issues.push(partName(brand, g) + modeText(g) + ' — 목록에 맞는 제품 없음'); else if (p.memo) issues.push(p.name + ': ' + p.memo); return p ? p.order + (g.modes && g.modes.some(m => m === '3로') && !/3로/.test(p.order) ? ' · 3로' : '') : '확인 필요: ' + partName(brand, g) + modeText(g); });
      const grouped = []; parts.forEach(p => { const l = grouped[grouped.length - 1]; if (l && l.p === p) l.c++; else grouped.push({p, c: 1}); });
      return {vendor: 'jung', issues, lines: [{name: where.trim(), spec: colorName + ' · ' + gangs.length + '구 프레임 — ' + grouped.map(x => x.p + (x.c > 1 ? ' ×' + x.c : '')).join(' + '), qty, unit: '조합', sources: src, combo: true}]};
    }
    const g = gangs[0], p = findPart(cat, brand, g);
    if (!p) issues.push(partName(brand, g) + modeText(g) + ' — 목록에 맞는 제품 없음');
    else if (p.memo) issues.push(p.name + ': ' + p.memo);
    // 기타는 대표가 적은 제품 이름이 곧 주문 이름 — 구 수만 붙입니다 (「스텐 토글 스위치 3구」)
    const nm = brand === 'other' ? (row.name ? row.name + ' ' + g.n + '구' : (p ? p.order : partName(brand, g))) : (p ? p.order : '확인 필요: ' + partName(brand, g));
    if (brand === 'other' && !row.name) issues.push('제품 이름을 적어주세요');
    return {vendor: brand, issues, lines: [{name: nm, spec: (col ? col.name : (row.color || '색 미정')) + modeText(g), qty, unit: '개', sources: src}]};
  }
  // 아펠라·기타는 같은 제품·같은 색을 한 줄로 합칩니다 (대리점은 「콘센트 2구 화이트 23개」로 받음). 출처는 모두 남김
  function merge(lines) {
    const out = [], at = {};
    lines.forEach(l => {
      if (l.combo) { out.push(Object.assign({}, l)); return; }
      const k = l.name + '|' + l.spec;
      if (at[k] === undefined) { at[k] = out.length; out.push(Object.assign({}, l, {sources: (l.sources || []).slice(), where: []})); }
      else { out[at[k]].qty += l.qty; out[at[k]].sources = out[at[k]].sources.concat(l.sources || []); }
      if (l.where) out[at[k]].where.push(l.where);
    });
    return out;
  }

  // ── ③ 그림 ──
  const hex2 = h => { const m = /^#?([0-9a-f]{6})$/i.exec(String(h || '').trim()); if (!m) return null; const v = parseInt(m[1], 16); return [v >> 16, (v >> 8) & 255, v & 255]; };
  const toHex = c => '#' + c.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  const shade = (c, k) => c.map(v => k >= 0 ? v + (255 - v) * k : v * (1 + k));
  const lum = c => (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255;
  // 견본색 + 마감 → 그릴 재질. 금속은 두 색 사이를 비스듬히 오가는 헤어라인
  function material(col) {
    const parts = String(col && col.hex || '#f6f6f3').split(',').map(hex2).filter(Boolean);
    const a = parts[0] || [246, 246, 243], b = parts[1] || null, finish = col && col.finish || '유광';
    const dark = lum(a) < 0.42;
    if (b || finish === '메탈') {
      const b2 = b || shade(a, -0.25);
      return {metal: [toHex(shade(a, 0.08)), toHex(b2), toHex(shade(a, 0.18)), toHex(shade(b2, -0.08)), toHex(shade(a, -0.04))], e: toHex(shade(b2, -0.2)), g: toHex(shade(b2, -0.35)), h: dark ? ['#2b2e31', '#0f1113'] : ['#2b2e31', '#0f1113'], dark: lum(b2) < 0.5, br: true};
    }
    const gloss = finish === '유광';
    return {f: [toHex(shade(a, gloss ? 0.35 : 0.12)), toHex(shade(a, gloss ? -0.07 : -0.04))], r: [toHex(shade(a, gloss ? 0.6 : 0.18)), toHex(shade(a, -0.05))],
      e: toHex(shade(a, dark ? -0.6 : -0.17)), g: toHex(shade(a, dark ? -0.7 : -0.25)), h: dark ? [toHex(shade(a, 0.05)), toHex(shade(a, -0.7))] : [toHex(shade(a, -0.04)), toHex(shade(a, -0.22))], dark, gloss};
  }
  let UID = 0;
  function defs(id, m) {
    const lin = (nm, st, x2, y2) => `<linearGradient id="${id}${nm}" x1="0" y1="0" x2="${x2}" y2="${y2}">${st.map((c, i) => `<stop offset="${i / (st.length - 1)}" stop-color="${c}"/>`).join('')}</linearGradient>`;
    return `<defs>${m.metal ? lin('f', m.metal, 1, 1) + lin('r', m.metal.slice().reverse(), 1, 1) : lin('f', m.f, 0, 1) + lin('r', m.r, 0, 1)}`
      + `<radialGradient id="${id}h" cx=".5" cy=".36" r=".7"><stop offset="0" stop-color="${m.h[0]}"/><stop offset="1" stop-color="${m.h[1]}"/></radialGradient>`
      + `<linearGradient id="${id}p" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f0f1f2"/><stop offset=".5" stop-color="#b9bdc1"/><stop offset="1" stop-color="#83878c"/></linearGradient>`
      + `<pattern id="${id}b" width="4" height=".6" patternUnits="userSpaceOnUse"><rect width="4" height=".22" fill="#fff" opacity=".28"/></pattern>`
      + `<filter id="${id}s" x="-15%" y="-15%" width="130%" height="140%"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000" flood-opacity=".24"/><feDropShadow dx="0" dy=".3" stdDeviation=".3" flood-color="#000" flood-opacity=".22"/></filter></defs>`;
  }
  function surf(id, m, x, y, w, h, rx, fill) {
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="url(#${id}${fill || 'f'})"/>`
      + (m.br ? `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="url(#${id}b)"/>` : '')
      + (m.gloss && m.dark ? `<path d="M${x} ${y + h * .62}L${x + w * .5} ${y}L${x + w * .72} ${y}L${x} ${y + h * .9}Z" fill="#fff" opacity=".05"/>` : '')
      + `<rect x="${x + .3}" y="${y + .3}" width="${w - .6}" height="${h - .6}" rx="${Math.max(rx - .3, 0)}" fill="none" stroke="#fff" stroke-opacity="${m.dark ? .12 : .75}" stroke-width=".55"/>`
      + `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="none" stroke="${m.e}" stroke-opacity=".55" stroke-width=".35"/>`;
  }
  function rock(id, m, x, y, w, h, n, modes) {
    let s = `<rect x="${x - .6}" y="${y - .6}" width="${w + 1.2}" height="${h + 1.2}" rx="1.3" fill="${m.g}" opacity=".85"/>`; const gap = .8, rw = (w - gap * (n - 1)) / n;
    for (let i = 0; i < n; i++) {
      const X = x + i * (rw + gap);
      s += surf(id, m, X, y, rw, h, .9, 'r') + `<rect x="${X + .8}" y="${y + h - 1.1}" width="${rw - 1.6}" height=".5" fill="#000" opacity="${m.dark ? .4 : .13}"/><rect x="${X + .6}" y="${y + .5}" width="${rw - 1.2}" height=".45" fill="#fff" opacity="${m.dark ? .12 : .9}"/>`;
      const md = modes && modes[i];
      if (md && md !== '단로') s += `<text x="${X + rw / 2}" y="${y + h - 4}" font-size="5" font-family="Pretendard,sans-serif" font-weight="700" text-anchor="middle" fill="${m.dark ? '#d9dadc' : '#7a7d82'}">${md}</text>`;
    }
    return s;
  }
  function socket(id, m, cx, cy, r) {
    return `<circle cx="${cx}" cy="${cy}" r="${r + 1}" fill="none" stroke="${m.g}" stroke-opacity=".45" stroke-width=".6"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${id}h)"/><circle cx="${cx}" cy="${cy - .4}" r="${r - .4}" fill="none" stroke="#000" stroke-opacity=".14" stroke-width=".8"/>`
      + `<circle cx="${cx - r * .5}" cy="${cy}" r="${r * .13}" fill="#0d0d0d" opacity=".88"/><circle cx="${cx + r * .5}" cy="${cy}" r="${r * .13}" fill="#0d0d0d" opacity=".88"/>`
      + `<rect x="${cx - r * .16}" y="${cy - r + .7}" width="${r * .32}" height="${r * .13}" rx=".5" fill="url(#${id}p)"/><rect x="${cx - r * .16}" y="${cy + r - .7 - r * .13}" width="${r * .32}" height="${r * .13}" rx=".5" fill="url(#${id}p)"/>`;
  }
  const rj = (cx, cy) => `<rect x="${cx - 6.2}" y="${cy - 5.6}" width="12.4" height="11.2" rx="1.2" fill="#161616"/><rect x="${cx - 4.6}" y="${cy - 3.2}" width="9.2" height="7.2" rx=".6" fill="#2d2d2d"/><rect x="${cx - 2}" y="${cy + 3.4}" width="4" height="1.6" fill="#2d2d2d"/><g stroke="#b89b4e" stroke-width=".45">${[0, 1, 2, 3, 4, 5, 6, 7].map(i => `<line x1="${cx - 3.6 + i * 1.03}" x2="${cx - 3.6 + i * 1.03}" y1="${cy - 3}" y2="${cy - 1.3}"/>`).join('')}</g>`;
  const coax = (id, cx, cy) => `<circle cx="${cx}" cy="${cy}" r="6" fill="url(#${id}p)"/><circle cx="${cx}" cy="${cy}" r="6" fill="none" stroke="#6d7175" stroke-width=".4"/><circle cx="${cx}" cy="${cy}" r="3" fill="#1b1b1b"/><circle cx="${cx}" cy="${cy}" r=".8" fill="#d9dcdf"/>`;
  const tel = (cx, cy) => `<rect x="${cx - 4.6}" y="${cy - 4}" width="9.2" height="8" rx=".8" fill="#161616"/><rect x="${cx - 3}" y="${cy - 2.2}" width="6" height="4.6" fill="#2d2d2d"/>`;
  const usb = (cx, cy) => `<rect x="${cx - 9}" y="${cy - 2.4}" width="7.6" height="4.6" rx=".6" fill="#161616"/><rect x="${cx + 1.6}" y="${cy - 2.2}" width="7.2" height="4.2" rx="2.1" fill="#161616"/>`;
  const boiler = (cx, cy) => `<rect x="${cx - 26}" y="${cy - 24}" width="52" height="48" rx="2.4" fill="#f4f4f2" stroke="#cfcec8" stroke-width=".4"/><rect x="${cx - 20}" y="${cy - 17}" width="40" height="19" rx="1.4" fill="#2f3a39"/><text x="${cx + 15}" y="${cy - 3.6}" text-anchor="end" font-family="Pretendard,sans-serif" font-size="10" font-weight="600" fill="#cfe2de">23.5</text>${[-12, 0, 12].map(d => `<circle cx="${cx + d}" cy="${cy + 12}" r="3.1" fill="#e6e5e1" stroke="#b9b8b1" stroke-width=".4"/>`).join('')}`;
  const toggle = (id, cx, cy) => `<circle cx="${cx}" cy="${cy}" r="5.6" fill="url(#${id}p)" stroke="#7d8288" stroke-width=".4"/><circle cx="${cx}" cy="${cy}" r="3" fill="#9ea3a8"/><path d="M${cx - 1.9} ${cy}L${cx - 2.3} ${cy - 11}Q${cx} ${cy - 13.4} ${cx + 2.3} ${cy - 11}L${cx + 1.9} ${cy}Z" fill="url(#${id}p)" stroke="#7d8288" stroke-width=".35"/>`;
  const unknown = (cx, cy) => `<rect x="${cx - 20}" y="${cy - 20}" width="40" height="40" rx="4" fill="none" stroke="#b0442c" stroke-dasharray="3 2"/><text x="${cx}" y="${cy + 5}" font-size="14" font-weight="700" text-anchor="middle" font-family="Pretendard,sans-serif" fill="#b0442c">?</text>`;
  const cover = (x, y, w, h) => `<rect x="${x - 2}" y="${y - 2}" width="${w + 4}" height="${h + 4}" rx="5" fill="#fff" opacity=".22" stroke="#ffffff" stroke-opacity=".95" stroke-width=".8"/><rect x="${x - 2}" y="${y - 2}" width="${w + 4}" height="${h + 4}" rx="5" fill="none" stroke="#000" stroke-opacity=".12" stroke-width=".3"/><rect x="${x + w * .3}" y="${y - 3}" width="${w * .4}" height="2.4" rx="1" fill="#e9e9e6" stroke="#bbb" stroke-width=".3"/><path d="M${x + 2} ${y + 3} L${x + w * .45} ${y + 3}" stroke="#fff" stroke-width="1.2" opacity=".7" stroke-linecap="round"/>`;

  // 융 한 구(55×55 자리) 안에 기능 하나
  function jungGang(id, m, g, cx, cy) {
    const x = cx - 27.5, y = cy - 27.5;
    if (g.k === '스위치' || g.k === '토글') return rock(id, m, x, y, 55, 55, g.n, g.modes);
    let s = `<rect x="${x - .5}" y="${y - .5}" width="56" height="56" rx="1.3" fill="${m.g}" opacity=".35"/>` + surf(id, m, x, y, 55, 55, 1, 'f');
    if (g.k === '콘센트' || g.k === '방우 콘센트') s += socket(id, m, cx, cy, 19.5) + (g.k === '방우 콘센트' ? cover(x + 2, y + 2, 51, 51) : '');
    else if (g.k === '랜') s += g.n > 1 ? rj(cx - 8.5, cy) + rj(cx + 8.5, cy) : rj(cx, cy);
    else if (g.k === 'TV') s += g.n > 1 ? coax(id, cx - 9, cy) + coax(id, cx + 9, cy) : coax(id, cx, cy);
    else if (g.k === 'TV+랜') s += coax(id, cx - 9, cy) + rj(cx + 9, cy);
    else if (g.k === '전화') s += tel(cx, cy);
    else if (g.k === 'USB') s += usb(cx, cy);
    else if (g.k === '보일러') s += boiler(cx, cy);
    else if (g.k === '기타') s += unknown(cx, cy);
    return s;
  }
  function body(brand, gangs, id, m) {
    if (brand === 'jung') {
      const n = gangs.length, W = 81 + 71 * (n - 1), H = 81;
      return {W, H, s: `<g filter="url(#${id}s)">${surf(id, m, 0, 0, W, H, 1.8)}</g>` + gangs.map((g, i) => jungGang(id, m, g, 40.5 + 71 * i, 40.5)).join('')};
    }
    const W = 72, H = 118, g = gangs[0]; let s = `<g filter="url(#${id}s)">${surf(id, m, 0, 0, W, H, brand === 'apella' ? 3.2 : 2.4)}</g>`;
    if (brand === 'apella') s += `<rect x="5" y="5" width="62" height="108" rx="2" fill="none" stroke="${m.dark ? '#000' : '#fff'}" stroke-opacity="${m.dark ? .25 : .6}" stroke-width=".5"/>`;
    const n = g.n;
    if (g.k === '스위치') s += rock(id, m, 11, 19, 50, 80, n, g.modes);
    else if (g.k === '토글') { for (let i = 0; i < n; i++) s += toggle(id, 72 / (n + 1) * (i + 1), 66); s += `<circle cx="36" cy="10" r="1.3" fill="url(#${id}p)"/><circle cx="36" cy="108" r="1.3" fill="url(#${id}p)"/>`; }
    else if (g.k === '콘센트' || g.k === '방우 콘센트') {
      if (n === 1) s += socket(id, m, 36, 59, 17); else if (n === 2) s += socket(id, m, 36, 33.5, 16.5) + socket(id, m, 36, 84.5, 16.5);
      else s += [0, 1, 2, 3].slice(0, n).map(i => socket(id, m, 36, 18 + i * 27.5, 11.5)).join('');
      if (g.k === '방우 콘센트') s += cover(4, 4, 64, 110);
    }
    else if (g.k === '랜') s += n > 1 ? rj(36, 45) + rj(36, 73) : rj(36, 59);
    else if (g.k === 'TV') s += n > 1 ? coax(id, 36, 45) + coax(id, 36, 73) : coax(id, 36, 59);
    else if (g.k === 'TV+랜') s += coax(id, 36, 45) + rj(36, 73);
    else if (g.k === '전화') s += tel(36, 59);
    else if (g.k === 'USB') s += usb(36, 59);
    else if (g.k === '막음') s += '';
    else s += unknown(36, 59);
    return {W, H, s};
  }
  // spec: {brand, gangs, color(이름)}, cat: catalog(...) · o: {px, maxW, maxH, dim, flag}
  function draw(cat, spec, o) {
    o = o || {};
    const brand = BRANDS[spec.brand] ? spec.brand : 'jung', id = 'wk' + (UID++);
    const col = spec.color ? colorOf(cat, brand, spec.color) : null, m = material(col || cat.colors(brand)[0]);
    const g = spec.gangs && spec.gangs.length ? normalize(brand, spec.gangs) : [{k: '기타', n: 1}];
    const b = body(brand, g, id, m);
    const pad = 4, dh = o.dim ? 10 : 0, VW = b.W + pad * 2, VH = b.H + pad * 2 + dh; let k = o.px || 1;
    if (o.maxW) k = Math.min(k, o.maxW / VW); if (o.maxH) k = Math.min(k, o.maxH / VH);
    const dim = o.dim ? `<g stroke="#b8b7b0" stroke-width=".3"><line x1="${pad}" x2="${pad + b.W}" y1="${pad + b.H + 6}" y2="${pad + b.H + 6}"/><line x1="${pad}" x2="${pad}" y1="${pad + b.H + 4}" y2="${pad + b.H + 8}"/><line x1="${pad + b.W}" x2="${pad + b.W}" y1="${pad + b.H + 4}" y2="${pad + b.H + 8}"/></g>` : '';
    const unk = !spec.color && o.flag ? `<g><rect x="${pad + b.W - 26}" y="${pad + 1}" width="25" height="8" rx="2" fill="#b0442c"/><text x="${pad + b.W - 13.5}" y="${pad + 6.6}" font-size="4.6" font-family="Pretendard,sans-serif" text-anchor="middle" fill="#fff">색 미정</text></g>` : '';
    return `<svg width="${Math.round(VW * k)}" height="${Math.round(VH * k)}" viewBox="0 0 ${VW} ${VH}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${summary(brand, g, spec.color || '색 미정').replace(/"/g, '')}">${defs(id, m)}<g transform="translate(${pad} ${pad})">${b.s}</g>${dim}${unk}</svg>`;
  }
  const size = (brand, gangs) => brand === 'jung' ? [81 + 71 * (Math.max(1, (gangs || []).length) - 1), 81] : [72, 118];
  const swatch = col => { const m = material(col); return m.metal ? `linear-gradient(135deg,${m.metal.join(',')})` : `linear-gradient(${m.f[0]},${m.f[1]})`; };

  const api = {BRANDS, KINDS, MODES, KEEP, DEFAULT, catalog, colorOf, normalize, fromLegacy, toLegacy, isWet, summary, partName, findPart, order, merge, material, draw, size, swatch};
  if (typeof module !== 'undefined') module.exports = api;
  root.WiringKit = api;
})(typeof window !== 'undefined' ? window : globalThis);
