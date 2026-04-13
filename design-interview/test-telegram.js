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
  briefDate: '2026-04-11',
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
    'ent-middle-door':          '필요합니다',
    'ent-shoe-rack-width':      '1200~1800mm',
    'ent-shoe-inventory':       '10~20켤레',
    'ent-storage-satisfaction': '적당함',

    /* ── 거실 / 공용부 ── */
    'liv-space-form':       '두 요소가 함께 있는 복합형 공간',
    'liv-center-element':   'TV / 영상 시청 중심',
    'liv-tv-direction':     ['벽걸이/심플한 구성', '하부장/수납장 필요'],
    'liv-dining-table-size': '1600~2000mm',
    'liv-atmosphere':       '가구/기능이 채워진 안정감 있는 공간',
    'liv-priority-focus':   '개방감 / 공간감',

    /* ── 주방 ── */
    'kitch-use-pattern':        '일반적인 가정식 조리를 자주 합니다',
    'kitch-priority-factors':   ['조리 동선의 효율성', '충분한 수납과 정리'],
    'kitch-island-plan':        '바체어가 결합된 아일랜드 구조를 원합니다',
    'kitch-island-priorities':  ['전/후면 모두 수납이 가능했으면 합니다', '간단한 식사/티타임이 가능했으면 합니다'],
    'kitch-dining-scale':       '4인 규모',
    'kitch-storage-appliance':  ['자주 사용하는 가전은 쉽게 꺼내 쓸 수 있길 원합니다'],

    /* ── 침실 ── */
    'bed-atmosphere':      '호텔처럼 정돈되고 안정감 있는 분위기',
    'bed-size':            'K / 킹',
    'bed-side-furniture':  ['화장대가 필요합니다 (기성 제품 예정)', '별도 협탁이 필요합니다 (기성 제품 예정)'],
    'bed-frame-plan':      '기성 침대 프레임 사용 예정',
    'bed-headwall-plan':   '디자인 포인트가 되는 헤드월 제작 희망',

    /* ── 드레스룸 ── */
    'dr-storage-approach':           '맞춤 제작 가구를 희망합니다',
    'dr-current-wardrobe-length':    '2400~3600mm',
    'dr-clothing-volume':            '적당한 수준입니다',
    'dr-clothing-characteristics':   ['긴 옷/코트류가 많습니다', '가방/잡화류가 많습니다'],
    'dr-layout-priorities':          ['행거 중심 구성을 선호합니다', '전신거울/피팅 공간 필요'],
    'dr-finish-style':               '가구 도어형으로 깔끔하게 정리되는 구조',

    /* ── 서재 / 작업실 ── */
    'study-purpose':       ['재택근무 / 업무 공간', '개인 공부 / 독서 공간'],
    'study-users':         '1인 사용',
    'study-desk-plan':     '맞춤 제작 데스크 희망',
    'study-priorities':    ['넓은 작업/데스크 공간', '수납/정리 효율'],
    'study-storage-needs': ['서류/문서 정리', '책/서적 수납'],
    'study-atmosphere':    '차분하고 집중되는 분위기',

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

    /* ── 기타 공간 ── */
    'es-areas':  ['세탁실 / 유틸리티룸', '펫 공간'],
    'es-detail': '반려견 목욕 공간과 건조 존을 유틸 쪽에 두고 싶음',

    /* ── 최종 요청사항 ── */
    'fr-must-haves':
      '아침에 눈 떴을 때 빛이 자연스럽게 들어오는 거실, 퇴근 후 호텔 느낌의 안방욕실',
    'fr-notes': '안방욕실 방수 상태 현장 확인 필요. 거실 창 쪽 바닥 단차 여부 확인.',
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
  if (state.briefDate) lines.push(`📅 일자: ${esc(state.briefDate)}`);
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
