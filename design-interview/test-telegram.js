/**
 * 텔레그램 전송 테스트 스크립트
 * 가상 고객 "김지은" 세션 데이터로 텔레그램 전송 검증
 *
 * 실행: node design-interview/test-telegram.js
 */

'use strict';

const vm      = require('vm');
const fs      = require('fs');
const https   = require('https');
const path    = require('path');

const BASE = path.join(__dirname, 'js');

// ── 1. 파일 로드 (const → var 치환으로 sandbox에 노출)
function loadFile(filename) {
  return fs.readFileSync(path.join(BASE, filename), 'utf8')
    .replace(/\bconst\b/g, 'var')
    .replace(/\blet\b/g, 'var');
}

const sandbox = {};
vm.runInNewContext(loadFile('questions-data.js'), sandbox);
vm.runInNewContext(loadFile('summary-builder.js'), sandbox);

const INTERVIEW_DATA = sandbox.INTERVIEW_DATA;
const SummaryBuilder = sandbox.SummaryBuilder;

// ── 2. 모의 세션 상태 (고객: 김지은, 84㎡ 아파트)
const state = {
  projectName: '김지은',
  spaceName:   '84㎡ 아파트 (판교)',
  meetingDate: '2026-04-11',
  answers: {

    /* ── 전체 선호도 ── */
    'g-household':        ['부부 둘', '자녀 1명'],
    'g-lifestyle-tempo':  '출퇴근 중심 (저녁/주말만)',
    'g-hosting':          '가끔 (월 1-2회)',
    'g-style-direction':  ['모던/미니멀', '내추럴/우드'],
    'g-color-tone':       '웜톤 (베이지/브라운/크림)',
    'g-material-pref':    ['원목', '대리석', '패브릭'],
    'g-priority-value':   ['수납/정리', '심미성/디자인', '채광/밝기'],
    'g-reference':        '무지 호텔 (Muji Hotel), 핀터레스트 "japandi interior"',
    'g-allergy':          null,
    'g-must-keep':        '이케아 PAX 드레스룸 유닛 (안방) — 재사용 희망',
    'g-budget-priority':  ['거실', '주방', '안방'],

    /* ── 현관 ── */
    'ent-storage-scale':  '중간 (20-40켤레)',
    'ent-storage-items':  ['우산', '택배 보관'],
    'ent-bench':          '공간 여유 있으면 원함',
    'ent-style':          '깔끔하고 미니멀하게',
    'ent-floor':          '타일 (포세린/대리석)',
    'ent-memo':           null,

    /* ── 거실 ── */
    'lr-main-use':        ['TV 시청 중심', '가족 모임/대화'],
    'lr-tv':              '벽걸이 (벽 매립)',
    'lr-floor':           '원목마루',
    'lr-sofa':            '패브릭 (린넨/벨벳)',
    'lr-wall':            '우드 패널',
    'lr-lighting':        ['간접조명 중심', '매립등 심플하게'],
    'lr-storage-need':    '중간 (붙박이장 일부)',
    'lr-special-item':    ['갤러리 월'],
    'lr-memo':            '창가 쪽에 독서 코너 희망',

    /* ── 주방 ── */
    'kitch-island':           '아일랜드+별도 식탁',
    'kitch-dining-size':      '4인',
    'kitch-style':            '모던/미니멀 (무광/무손잡이)',
    'kitch-counter':          '세라믹 상판',
    'kitch-floor':            '거실 바닥과 동일하게',
    'kitch-cook-freq':        '보통 (주 3-4회)',
    'kitch-storage-priority': ['식재료 팬트리', '식기세척기', '커피머신 전용 공간'],
    'kitch-memo':             null,

    /* ── 안방 ── */
    'mb-bed-size': '킹 (1800mm)',
    'mb-tv':       '없어도 됨',
    'mb-working':  '작은 화장대 정도',
    'mb-style':    '호텔식 고급스러움',
    'mb-lighting': ['간접조명 (수면 배려)', '블라인드/암막 중요'],
    'mb-memo':     '헤드보드 뒤 간접조명 필수',

    /* ── 드레스룸 ── */
    'dr-type':     '혼합형 (일부 오픈+일부 닫힘)',
    'dr-category': ['정장/수트', '캐주얼 행거', '가방 컬렉션', '액세서리'],
    'dr-mirror':   '드레스룸 내부',
    'dr-lighting': '밝고 균일하게 (색 확인 중요)',
    'dr-memo':     null,

    /* ── 자녀방 ── */
    'ks-purpose':   ['아이 침실', '아이 놀이/공부방'],
    'ks-child-age': '유아 (4-7세)',
    'ks-desk':      '보조 공간 (작은 책상)',
    'ks-bed':       '싱글 1개',
    'ks-memo':      '바닥재 안전 최우선, 코너 마감 라운딩 처리',

    /* ── 공용욕실 ── */
    'sb-bath':     '욕조 제거 (샤워부스만)',
    'sb-style':    '내추럴 타일 (테라코타/석재)',
    'sb-priority': ['수납 추가', '방수/곰팡이 방지'],
    'sb-memo':     null,

    /* ── 안방욕실 ── */
    'mab-bath':        '프리스탠딩 욕조 원함',
    'mab-style':       '호텔/스파 느낌',
    'mab-double-sink': '2구 더블 세면대',
    'mab-memo':        '욕실 히팅 타월 바 설치 원함',

    /* ── 세탁실 ── */
    'lau-washer':  '세탁기+건조기 (상하 스택)',
    'lau-sink':    '필요함',
    'lau-storage': ['청소도구', '세제류', '계절가전'],
    'lau-memo':    null,

    /* ── 기타 ── */
    'oth-space':       null,
    'oth-concerns':    '주방 환기가 안 좋아 음식 냄새가 거실까지 퍼짐\n현관 수납공간이 너무 좁아 항상 물건이 넘침',
    'oth-absolute-no': '싸구려 느낌의 마감재 (저가형 강화마루, 페이퍼 타일 등)\n주방 오픈선반 — 먼지 쌓이는 구조 싫어함',
    'oth-followup':    '안방욕실 방수 상태 현장 확인 필요\n거실 창 쪽 바닥 단차 여부 확인\n자녀방 콘센트 위치 재배치 검토',
    'oth-wishlist':    '아침에 눈 떴을 때 빛이 자연스럽게 들어오는 거실, 퇴근 후 호텔 느낌의 안방욕실',
  }
};

// ── 3. 요약 생성
const sp  = SummaryBuilder.specialSections(state.answers);
const kw  = SummaryBuilder.collectKeywords(state.answers);
const md  = SummaryBuilder.buildMarkdown(state);

// ── 4. 텔레그램 카드 생성
function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function buildTelegramCard() {
  const answers  = state.answers;
  const style    = answers['g-style-direction'];
  const color    = answers['g-color-tone'];
  const priority = answers['g-priority-value'];
  const lines    = [];

  lines.push(`📋 <b>1차 디자인 인터뷰</b>`);
  lines.push(`👤 고객: <b>${esc(state.projectName)}</b>`);
  if (state.spaceName)   lines.push(`🏠 공간: ${esc(state.spaceName)}`);
  if (state.meetingDate) lines.push(`📅 일자: ${esc(state.meetingDate)}`);
  lines.push('');

  if (style  && style.length)    lines.push(`<b>스타일:</b> ${esc([].concat(style).join(', '))}`);
  if (color)                     lines.push(`<b>색감:</b> ${esc(color)}`);
  if (priority && priority.length)
    lines.push(`<b>핵심 가치:</b> ${esc(priority.join(' → '))}`);

  if (sp.absoluteNo) {
    lines.push('');
    lines.push(`🚫 <b>Absolute No:</b> ${esc(sp.absoluteNo.replace(/\n/g, ' / '))}`);
  }
  if (sp.painPoints) {
    lines.push(`💢 <b>Pain Point:</b> ${esc(sp.painPoints.replace(/\n/g, ' / '))}`);
  }
  if (sp.followUp) {
    lines.push('');
    lines.push(`🔍 <b>후속 검토:</b>`);
    sp.followUp.split('\n').filter(Boolean).forEach(l => lines.push(`  • ${esc(l)}`));
  }

  lines.push('');
  lines.push(`🏷 ${kw.slice(0, 8).map(k => '#' + k.replace(/\s/g, '_')).join(' ')}`);
  lines.push('');
  lines.push(`📎 전체 회의록 파일 첨부`);

  return lines.join('\n');
}

// ── 5. Telegram API 호출 헬퍼
// 실행 시 환경변수로 주입: TG_TOKEN=xxx TG_CHAT=yyy node test-telegram.js
const BOT_TOKEN = process.env.TG_TOKEN;
const CHAT_ID   = process.env.TG_CHAT;

if (!BOT_TOKEN || !CHAT_ID) {
  console.error('❌ 환경변수를 설정해주세요:');
  console.error('   TG_TOKEN=<bot-token> TG_CHAT=<chat-id> node design-interview/test-telegram.js');
  process.exit(1);
}

function tgRequest(endpoint, body, isFormData = false) {
  return new Promise((resolve, reject) => {
    const postData = isFormData ? body : JSON.stringify(body);
    const options = {
      hostname: 'api.telegram.org',
      path:     `/bot${BOT_TOKEN}/${endpoint}`,
      method:   'POST',
      headers:  isFormData
        ? body.getHeaders()
        : { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) }
    };

    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (!json.ok) reject(new Error(json.description || `HTTP ${res.statusCode}`));
          else resolve(json);
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function tgSendMessage(text) {
  return tgRequest('sendMessage', {
    chat_id:    CHAT_ID,
    text,
    parse_mode: 'HTML'
  });
}

// multipart/form-data 없이 Buffer로 직접 전송
function tgSendDocument(content, filename, caption) {
  return new Promise((resolve, reject) => {
    const fileBuffer   = Buffer.from(content, 'utf8');
    const boundary     = '----TelegramBoundary' + Date.now();
    const CRLF         = '\r\n';

    const buildPart = (name, val) =>
      `--${boundary}${CRLF}Content-Disposition: form-data; name="${name}"${CRLF}${CRLF}${val}${CRLF}`;

    const filePart =
      `--${boundary}${CRLF}` +
      `Content-Disposition: form-data; name="document"; filename="${filename}"${CRLF}` +
      `Content-Type: text/markdown; charset=utf-8${CRLF}${CRLF}`;

    const body = Buffer.concat([
      Buffer.from(buildPart('chat_id', CHAT_ID)),
      caption ? Buffer.from(buildPart('caption', caption)) : Buffer.alloc(0),
      Buffer.from(filePart),
      fileBuffer,
      Buffer.from(`${CRLF}--${boundary}--${CRLF}`)
    ]);

    const options = {
      hostname: 'api.telegram.org',
      path:     `/bot${BOT_TOKEN}/sendDocument`,
      method:   'POST',
      headers:  {
        'Content-Type':   `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length
      }
    };

    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (!json.ok) reject(new Error(json.description || `HTTP ${res.statusCode}`));
          else resolve(json);
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── 6. 실행
(async () => {
  console.log('━'.repeat(50));
  console.log('DASIFILL 디자인 인터뷰 — 텔레그램 전송 테스트');
  console.log('━'.repeat(50));
  console.log(`고객: ${state.projectName} / ${state.spaceName}`);
  console.log(`키워드: ${kw.join(', ')}`);
  console.log('');

  try {
    // ① 요약 카드 전송
    process.stdout.write('① 요약 카드 전송 중...');
    const card = buildTelegramCard();
    await tgSendMessage(card);
    console.log(' ✓');

    // ② 회의록 .md 파일 전송
    process.stdout.write('② 회의록 파일 전송 중...');
    const name = state.projectName.replace(/\s+/g, '_');
    await tgSendDocument(
      md,
      `${name}_interview.md`,
      `📎 ${state.projectName} 전체 회의록`
    );
    console.log(' ✓');

    console.log('');
    console.log('✅ 텔레그램 전송 완료 — 그룹챗을 확인해주세요');
  } catch (err) {
    console.error('\n❌ 전송 실패:', err.message);
    process.exit(1);
  }
})();
