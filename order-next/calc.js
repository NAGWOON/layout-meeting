/*
 * 다시필 발주앱 — 계산 엔진 (calc.js)
 * =================================
 * 주인: Claude · 화면(index.html)은 GPT. 화면은 여기 함수만 부르고 계산을 다시 짜지 않습니다.
 * 설계: dasifill-code/협업/2026-10-06_발주앱개편/12_계산기구조_연구_Claude.md
 *
 * 2026-09-28 운영 앱(order/index.html)의 calc · expCalc · tileCalc · liftMax 를 화면과 떼어 옮긴 것입니다.
 * 같은 입력이면 운영 앱과 같은 수를 냅니다(calc.test.js 가 옛 코드와 맞대 봅니다).
 * 일부러 바꾼 것은 「바꾼 것」 표시가 있는 곳뿐입니다.
 *
 * 모든 계산기는 같은 모양을 돌려줍니다:
 *   { 줄: [{ name, qty, type, 근거, film? }], 단면: [{ 이름, 글 }], 경고: [문장], 면적 }
 *   type = 그 품목이 담길 탭(발주 유형). 화면은 이것만 보고 제 탭으로 담습니다.
 *
 * 품목(items)은 품목마스터 그대로: [{ id, name, type, group, spec, unit }]
 */
(function (root) {
  'use strict';

  // ───────── 회사 기준값 (운영 앱 기본값 그대로) ─────────
  var 기준 = {
    목공: { loss: 10, 상자재: '합판 다루끼 (LVL) 8자', 폼당: 5 },
    확장부: { 모르타르최소: 45, 수평: 20, 편차: 0, 폼여유: 3, 수평포당: 14, 레미포당: 21, 폼당: 5, 로스: 10 },
    욕실바닥: { 액방: 20, 시멘계수: 0.35, 도막: 5, 타일: 10, 레미포당: 21 },
    타일: { loss: 20 },
    반입: { 여유: 5 }
  };

  var PITCH = { '@300': 0.472, '@450': 0.389 };   // 벽 1m 당 다루끼 단수
  var CEIL_D = 0.0757;                            // 천장 상 @800 — ㎡당 다루끼 단수
  var 벽높이 = 2.4;                               // 다루끼 계수의 바탕 높이(8자)
  var JA = { 3: 900, 4: 1220, 6: 1800, 8: 2440, 10: 3050, 12: 3600 };
  var LONG_GROUPS = { '각재': 1, '몰딩': 1, '철물·레일': 1 };
  var XSIZE = [50, 30, 20, 10];
  var XN = { i: '아이소핑크 ', iz: ' (특호)', f: '우레탄 폼본드 (폼건용)', m: '레미탈 40kg',
             l: '수평몰탈 (셀프레벨링)', p: '프라이머 AC2000K 4L' };
  var TN = { c: '포틀랜드 시멘트', m: '레미탈 40kg', s: '액체방수제' };
  var 목공폼본드 = '폼본드';

  function 수(v) { var n = Number(v); return isFinite(n) ? n : 0; }
  function 맞춤(x) { return Math.round(x * 1e6) / 1e6; }   // 0.1+0.2 같은 꼬리를 떼고 올림합니다

  // ───────── 규격 읽기 ─────────
  // 「3×6×9.5T」 자 · 「1000×1800」 mm · 「1M×450×28장」 묶음
  function 치수m(tok) {
    var m = String(tok).match(/^([0-9.]+)/);
    if (!m) return null;
    var v = Number(m[1]);
    if (!isFinite(v) || v <= 0) return null;
    if (/^[0-9.]+M$/i.test(tok)) return v;
    if (v >= 100) return v / 1000;
    if (v <= 12) return v * 0.3;
    return null;
  }
  function 장당면적(spec) {
    if (!spec) return null;
    var s = String(spec).replace(/\s/g, '').toUpperCase();
    var 묶음 = s.match(/[×X*](\d+)장/);
    var 배수 = 묶음 ? Number(묶음[1]) : 1;
    var 몸 = s.replace(/[×X*]\d+장/, '');
    var 변 = [];
    몸.split(/[×X*]/).forEach(function (t) {
      if (/T$/.test(t)) return;
      var v = 치수m(t);
      if (v != null) 변.push(v);
    });
    if (변.length < 2) return null;
    return 변[0] * 변[1] * 배수;
  }
  function 몰딩길이m(spec) {
    if (!spec) return null;
    var 첫 = String(spec).replace(/\s/g, '').split(/[×X*]/)[0];
    var v = 치수m(첫);
    return (v && v > 0.5) ? v : null;
  }
  // 가장 긴 변(mm) — 반입 점검
  function 긴변mm(spec) {
    if (!spec) return null;
    var s = String(spec).replace(/\s/g, '');
    var mm = s.match(/\d{3,4}/g);
    if (mm) { var big = Math.max.apply(null, mm.map(Number)); if (big >= 300) return big; }
    var ja = s.match(/^(\d+)[×x*](\d+)/);
    if (ja) { var m = Math.max(+ja[1], +ja[2]); return JA[m] || m * 305; }
    var j2 = s.match(/(\d+)자/);
    if (j2) return JA[+j2[1]] || (+j2[1]) * 305;
    return null;
  }
  // 짧은 변(mm) — 문 폭에 걸리는 쪽
  function 짧은변mm(spec) {
    if (!spec) return null;
    var s = String(spec).replace(/\s/g, '');
    var mm = s.match(/\d{3,4}/g);
    if (mm && mm.length >= 2) {
      var two = mm.map(Number).filter(function (v) { return v >= 300; }).sort(function (a, b) { return a - b; });
      if (two.length >= 2) return two[0];
    }
    var ja = s.match(/^(\d+)[×x*](\d+)/);
    if (ja) { var m = Math.min(+ja[1], +ja[2]); return JA[m] || m * 305; }
    return null;
  }

  // 이름이 같은 품목이 유형을 넘어 있습니다(아이소핑크 10T — 목자재에도 설비에도). 제 유형 먼저
  function 품목찾기(items, 이름, 제유형) {
    var 후보 = (items || []).filter(function (i) { return i.name === 이름; });
    return 후보.filter(function (i) { return i.type === 제유형; })[0] || 후보[0] || null;
  }
  function 줄만들기(items, acc, 근거, 제유형, 올림) {
    return Object.keys(acc).map(function (k) {
      var a = acc[k], it = 품목찾기(items, a.name, 제유형);
      var q = 올림(a);
      return { name: a.name, qty: q, type: it ? it.type : 제유형, unit: it ? it.unit : '',
               itemId: it ? it.id : null, film: a.film || '', 근거: 근거[k] || '' };
    }).filter(function (x) { return x.qty > 0; });
  }

  // ───────── ① 벽·천장 목공 ─────────
  // 입력 { loss, 상자재, 폼당,
  //        walls: [{ name, m, h, pitch: '@300'|'@450', plies: [{ n: 자재명, s: 1|2 }] }],
  //        ceil:  { m2, plies: [자재명] }  또는 ceils: [{ name, m2, plies }],
  //        ins:   [{ mode: '벽'|'면적', v, mat }],
  //        mold:  [{ m, mat, film }] }
  function 목공(입력, items) {
    var p = 입력 || {}, 기 = 기준.목공;
    var loss = (p.loss != null ? 수(p.loss) : 기.loss), f = 1 + loss / 100;
    var 상 = p.상자재 || 기.상자재;
    var acc = {}, 근거 = {}, 경고 = [];
    function add(name, q, film) {
      if (!name || !q) return;
      var k = name + (film ? '\u0000' + film : '');
      (acc[k] = acc[k] || { name: name, film: film || '', q: 0 }).q += q;
    }
    function 면적of(name) { var it = 품목찾기(items, name, '목자재'); return it ? 장당면적(it.spec) : null; }
    function 겹(name, 면적) {
      var a = 면적of(name);
      if (a) add(name, 면적 / a);
      else if (name) 경고.push(name + ' — 규격에서 장당 면적을 못 읽어 계산에서 빠졌습니다');
    }

    (p.walls || []).forEach(function (w, i) {
      var m = 수(w.m);
      if (!m) return;
      // 바꾼 것: 벽 높이를 받습니다. 면재는 그 높이로, 다루끼 계수는 8자 기준 그대로(높이 무관)
      var h = 수(w.h) || 벽높이;
      if (Math.abs(h - 벽높이) > 0.001) 경고.push((w.name || ('벽 ' + (i + 1))) + ' — 높이 ' + h + 'm: 다루끼는 2.4m 기준 계수라 따로 확인하세요');
      var d = PITCH[w.pitch];
      if (d) add(상, m * d);
      (w.plies || []).forEach(function (pl) { 겹(pl.n, m * h * (Number(pl.s) === 1 ? 1 : 2)); });
    });

    var 천장들 = p.ceils || (p.ceil ? [p.ceil] : []);
    천장들.forEach(function (c) {
      var c2 = 수(c.m2);
      if (!c2) return;
      add(상, c2 * CEIL_D);
      (c.plies || []).forEach(function (nm) { 겹(nm, c2); });
    });

    var 단열면적 = 0;
    (p.ins || []).forEach(function (x) {
      var v = 수(x.v);
      if (!v || !x.mat) return;
      var a = 면적of(x.mat);
      if (!a) { 경고.push(x.mat + ' — 규격에서 장당 면적을 못 읽어 계산에서 빠졌습니다'); return; }
      var 면 = (x.mode === '벽' ? v * 벽높이 : v);
      add(x.mat, 면 / a);
      단열면적 += 면;
    });
    // 바꾼 것: 폼본드 = 실제로 붙이는 면적 ÷ 1개당 면적.
    // 옛 코드는 「장수 × 1.62」(900×1800 한 장)로 셌습니다 — 900×1800 이면 같고, 다른 규격이면 틀렸습니다.
    // 폼본드에는 일반 로스를 안 붙입니다(옛 코드와 같음).
    if (단열면적) {
      var 폼당 = 수(p.폼당) || 기.폼당;
      add(목공폼본드, 단열면적 / 폼당 / f);
      근거[목공폼본드] = '붙이는 면적 ' + (Math.round(단열면적 * 10) / 10) + '㎡ ÷ ' + 폼당 + '㎡/개';
    }

    (p.mold || []).forEach(function (x) {
      var v = 수(x.m);
      if (!v || !x.mat) return;
      var it = 품목찾기(items, x.mat, '목자재');
      var L = 몰딩길이m(it && it.spec);
      if (L) add(x.mat, v / L, x.film);
      else 경고.push(x.mat + ' — 규격에서 길이를 못 읽어 계산에서 빠졌습니다');
    });

    var 줄 = 줄만들기(items, acc, 근거, '목자재', function (a) { return Math.ceil(맞춤(a.q * f)); });
    return { 줄: 줄, 단면: [], 경고: 경고, 면적: null };
  }

  // ───────── ② 확장부 바닥 (설비·방수) ─────────
  // 입력 { 구간: [{ name, a: ㎡, d: 깊이mm }], 기준: { …위 확장부 기준 중 바꿀 것 } }
  function xcombo(T) {
    var rest = T, out = [];
    XSIZE.forEach(function (s) { while (rest >= s) { out.push(s); rest -= s; } });
    return out;
  }
  function 확장부(입력, items) {
    var p = 입력 || {}, k = Object.assign({}, 기준.확장부, p.기준 || {});
    var 로스 = 수(k.로스) / 100, 포당 = 수(k.수평포당) || 14, 레미포당 = 수(k.레미포당) || 21, 폼당 = 수(k.폼당) || 5;
    var 면적 = 0, 시트 = {}, 접착 = 0, 부피 = 0, 단면 = [], 경고 = [];
    // 아이소핑크 장수는 규격(900×1800)으로 나눕니다
    var XSHEET = 1.62;

    (p.구간 || []).forEach(function (x, i) {
      var A = 수(x.a), D = 수(x.d);
      if (!A || !D) return;
      var 이름 = String(x.name || '').trim() || ('구간 ' + (i + 1));
      var c = xcombo(Math.max(0, D - 수(k.모르타르최소) - 수(k.수평) - 수(k.폼여유)));
      var 단열 = c.reduce(function (s, q) { return s + q; }, 0);
      if (!단열) { 경고.push(이름 + ' — 깊이가 얕아 단열재가 안 들어갑니다'); return; }
      var 실모르타르 = D - 단열 - 수(k.수평);
      if (실모르타르 < 40) 경고.push(이름 + ' — 모르타르가 ' + 실모르타르 + 'mm 로 얇습니다. 배관 피복을 확인하세요');
      면적 += A; 접착 += A * c.length; 부피 += A * 실모르타르;
      c.forEach(function (s) { 시트[s] = (시트[s] || 0) + A; });
      단면.push({ 이름: 이름, 글: D + ' = ' + (c.length > 1 ? 단열 + 'T (' + c.join('+') + ')' : 단열 + 'T')
                               + ' + 모르타르 ' + 실모르타르 + ' + 수평몰탈 ' + 수(k.수평) });
    });

    var out = [];
    XSIZE.forEach(function (s) {
      if (시트[s]) out.push([XN.i + s + 'T' + XN.iz, Math.ceil(맞춤(시트[s] * (1 + 로스) / XSHEET)), '']);
    });
    if (접착) out.push([XN.f, Math.ceil(맞춤(접착 / 폼당)), '붙이는 면적 ' + (Math.round(접착 * 10) / 10) + '㎡']);
    if (부피) out.push([XN.m, Math.ceil(맞춤(부피 / 레미포당)),
      '평균 ' + (Math.round(부피 / 면적 * 10) / 10) + 'mm · ' + (Math.round(면적 * 10) / 10) + '㎡']);
    var 평균 = 수(k.수평) + 수(k.편차) / 2;
    if (면적) out.push([XN.l, Math.ceil(맞춤(면적 * 평균 / 포당)),
      '평균 ' + (Math.round(평균 * 10) / 10) + 'mm · ' + (Math.round(면적 * 10) / 10) + '㎡']);
    if (면적) out.push([XN.p, Math.max(1, Math.ceil(면적 / 100)), '']);

    return { 줄: 배열줄(items, out, '설비·방수'), 단면: 단면, 경고: 경고, 면적: Math.round(면적 * 10) / 10 };
  }
  function 배열줄(items, out, 제유형) {
    return out.map(function (o) {
      var it = 품목찾기(items, o[0], 제유형);
      return { name: o[0], qty: o[1], type: it ? it.type : 제유형, unit: it ? it.unit : '',
               itemId: it ? it.id : null, film: '', 근거: o[2] || '' };
    });
  }

  // ───────── ③ 욕실 바닥 방수 (설비·방수) ─────────
  //   원바닥 ─ 액방 ─ 도막 ─ 쭈꾸미(나머지) ─ 타일 ─ 완성면
  // 입력 { 구간: [{ name, a, d, 방수: true|false }], 기준: {…} }
  function 욕실바닥(입력, items) {
    var p = 입력 || {}, k = Object.assign({}, 기준.욕실바닥, p.기준 || {});
    var 액방 = 수(k.액방), 시멘계수 = 수(k.시멘계수), 도막 = 수(k.도막), 타일 = 수(k.타일), 레미포당 = 수(k.레미포당) || 21;
    var 면적 = 0, 방수면적 = 0, 액방부피 = 0, 쭈부피 = 0, 단면 = [], 경고 = [];
    (p.구간 || []).forEach(function (x, i) {
      var A = 수(x.a), D = 수(x.d);
      if (!A || !D) return;
      var 이름 = String(x.name || '').trim() || ('구간 ' + (i + 1));
      var 방수 = x.방수 !== false;
      var a1 = 방수 ? 액방 : 0, m1 = 방수 ? 도막 : 0;
      var 쭈 = D - a1 - m1 - 타일;
      if (쭈 <= 0) { 경고.push(이름 + ' — 깊이가 얕아 쭈꾸미 자리가 없습니다 (' + 쭈 + 'mm)'); return; }
      if (쭈 < 20) 경고.push(이름 + ' — 쭈꾸미가 ' + 쭈 + 'mm 로 얇습니다');
      면적 += A; 쭈부피 += A * 쭈;
      if (방수) { 방수면적 += A; 액방부피 += A * 액방; }
      단면.push({ 이름: 이름, 글: D + ' = ' + (방수 ? '액방 ' + 액방 + ' + 도막 ' + 도막 + ' + ' : '') + '쭈꾸미 ' + 쭈 + ' + 타일 ' + 타일 });
    });
    var 시멘포 = Math.ceil(맞춤(방수면적 * 시멘계수));
    var 방수레미 = Math.max(0, Math.ceil(맞춤(액방부피 / 레미포당 - 시멘포)));
    var 타일레미 = Math.ceil(맞춤(쭈부피 / 레미포당));
    var out = [];
    if (시멘포) out.push([TN.c, 시멘포, '']);
    if (방수레미 + 타일레미) out.push([TN.m, 방수레미 + 타일레미,
      (방수레미 && 타일레미) ? ('방수용 ' + 방수레미 + ' · 타일용 ' + 타일레미) : '']);
    if (방수면적) out.push([TN.s, 1, '']);
    return { 줄: 배열줄(items, out, '설비·방수'), 단면: 단면, 경고: 경고, 면적: Math.round(면적 * 10) / 10 };
  }

  // ───────── ④ 타일 물량 (실측 → 제안 ㎡, 줄눈 합계) ─────────
  // 제안은 ㎡ 로만, 소수 둘째 자리 올림. 박스 환산은 하지 않습니다(대표 결정 10/6)
  function 타일제안(실측, loss) {
    var m = 수(실측); if (!m) return null;
    var l = (loss != null && loss !== '') ? 수(loss) : 기준.타일.loss;
    return Math.ceil(맞춤(m * (1 + l / 100)) * 100) / 100;
  }
  // 줄눈 합계 — 같은 제품·색끼리 실측 면적을 합칩니다(소요량은 안 셈)
  function 줄눈합계(lines) {
    var 묶 = {}, 차례 = [];
    (lines || []).forEach(function (x, i) {
      var g = x.grout || {};
      if (!g.name) return;
      var k = g.name + '\u0000' + (g.color || '');
      if (!묶[k]) { 묶[k] = { name: g.name, color: g.color || '', 면적: 0, 공간: [], 면적빠짐: 0 }; 차례.push(k); }
      묶[k].공간.push(x.space || ((i + 1) + '번 줄'));
      if (수(x.measured)) 묶[k].면적 += 수(x.measured); else 묶[k].면적빠짐++;
    });
    return 차례.map(function (k) { var o = 묶[k]; o.면적 = Math.round(o.면적 * 100) / 100; return o; });
  }

  // ───────── ⑤ 반입 점검 (엘리베이터) ─────────
  // 입력 { w, d, h, dw, dh (mm), 여유: % } · 품목: 주문표에 담긴 [{ name, spec, group }]
  function 반입(입력, 담은것) {
    var n = 입력 || {}, w = 수(n.w), d = 수(n.d), h = 수(n.h), dw = 수(n.dw), dh = 수(n.dh);
    var 여유 = (n.여유 != null ? 수(n.여유) : 기준.반입.여유);
    if (!d) return null;
    var box = (w && h) ? Math.sqrt(w * w + d * d + h * h) : null;
    var thru = dh ? Math.sqrt(dh * dh + d * d) : null;
    if (!box && !thru) return null;
    var panelRaw = Math.min.apply(null, [box, thru].filter(Boolean));
    var longRaw = box || thru, f = 1 - 여유 / 100;
    var m = { panelRaw: Math.floor(panelRaw), panel: Math.floor(panelRaw * f),
              longRaw: Math.floor(longRaw), long: Math.floor(longRaw * f),
              doorW: dw || null, bind: (thru && thru <= (box || Infinity)) ? '문으로 진입' : '카 대각선' };
    var 판재초과 = [], 장척초과 = [], 폭초과 = [];
    (담은것 || []).forEach(function (x) {
      var L = 긴변mm(x.spec), 장척 = !!LONG_GROUPS[x.group];
      if (L && L > (장척 ? m.long : m.panel)) (장척 ? 장척초과 : 판재초과).push({ name: x.name, len: L });
      if (!장척 && m.doorW) { var W = 짧은변mm(x.spec); if (W && W > m.doorW) 폭초과.push({ name: x.name, w: W }); }
    });
    m.판재초과 = 판재초과; m.장척초과 = 장척초과; m.폭초과 = 폭초과;
    // 판재는 거래처가 잘라 보냅니다. 장척은 자르지 않습니다(계단 양중·사다리차를 정할 일)
    m.재단글 = 판재초과.length ? '엘리베이터 반입 한계 — 판재 ' + m.panel.toLocaleString('ko-KR') + 'mm 이하로 재단 부탁드립니다' : '';
    return m;
  }

  // ───────── 담기 계획 ─────────
  // 계산 결과를 주문표에 넣기 전에, 줄마다 무엇이 될지 보여줍니다.
  //   지금수량: { [itemId]: 수량 }  ·  전에담은: { [itemId]: 같은 계산기가 지난번 넣은 수량 }
  // 기본: 같은 계산기에서 담은 적 있으면 「바꾸기」, 주문표에 이미 다른 수량이 있으면 「더하기」, 비었으면 「넣기」
  function 담기계획(결과, 지금수량, 전에담은) {
    지금수량 = 지금수량 || {}; 전에담은 = 전에담은 || {};
    return ((결과 || {}).줄 || []).map(function (x) {
      var 지금 = x.itemId ? 수(지금수량[x.itemId]) : 0;
      var 방법 = !x.itemId ? '목록에 없음' : !지금 ? '넣기' : (x.itemId in 전에담은) ? '바꾸기' : '더하기';
      var 뒤 = 방법 === '더하기' ? 지금 + x.qty : 방법 === '목록에 없음' ? null : x.qty;
      return Object.assign({}, x, { 지금: 지금, 방법: 방법, 뒤: 뒤 });
    });
  }

  // 지난 현장 범위를 벗어났나 — 최소의 절반보다 적거나 최대의 1.5배보다 많으면
  function 범위밖(qty, rg) { return !!rg && (qty < rg.min * 0.5 || qty > rg.max * 1.5); }

  var DFCalc = {
    버전: '2026-10-06',
    기준: 기준,
    목공: 목공, 확장부: 확장부, 욕실바닥: 욕실바닥,
    타일제안: 타일제안, 줄눈합계: 줄눈합계, 반입: 반입,
    담기계획: 담기계획, 범위밖: 범위밖,
    규격: { 장당면적: 장당면적, 몰딩길이m: 몰딩길이m, 긴변mm: 긴변mm, 짧은변mm: 짧은변mm, 치수m: 치수m },
    계산기목록: [
      { id: '목공', 이름: '벽·천장 목공', 담는탭: ['목자재'] },
      { id: '확장부', 이름: '확장부 바닥', 담는탭: ['설비·방수'] },
      { id: '욕실바닥', 이름: '욕실 바닥 방수', 담는탭: ['설비·방수'] },
      { id: '타일', 이름: '타일 물량', 담는탭: ['타일'] },
      { id: '반입', 이름: '반입 점검', 담는탭: [] }
    ]
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = DFCalc;
  else root.DFCalc = DFCalc;
})(this);
