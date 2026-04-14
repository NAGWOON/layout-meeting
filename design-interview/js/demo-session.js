/* ============================================
   DEMO SESSION — ?demo=1 전용
   30평대(전용 ~99㎡) 일반적인 부부+자녀 가정 시나리오로 답변 자동 채움 후
   텔레그램 전송(설정이 있을 때만).
   운영 URL에 demo=1을 붙이지 마세요(내부 검증용).
   ============================================ */

(function () {
  'use strict';

  const DEMO_DELAY_MS = 2200;

  const META = {
    projectName: '데모 30평 김씨네',
    spaceName: '전용 99㎡ (약 30평) 아파트',
    briefDate: ''
  };

  const SHORT_TEXT = {
    'ga-must-keep': '기존 3인 소파·식탁 세트는 유지하고 싶습니다.',
    'fr-must-haves': '거실 수납, 주방 동선, 자녀 방 책상 조명이 최우선입니다.',
    'fr-notes': '발코니 확장은 예산 검토 후 결정 예정입니다.',
    'es-detail': '세탁실과 팬트리 동선을 가깝게 두고 싶습니다.',
    'lau-memo': '세탁기+건조기 상하 스택, 싱크는 있으면 좋겠습니다.'
  };

  /** 단일 선택: 분기가 단순해지도록 일부 ID만 지정, 나머지는 options[0] */
  const SINGLE = {
    'p1-q2-home-time': '주로 저녁/주말에 머뭅니다',
    'liv-space-form': '소파 / TV 중심의 거실형 공간',
    'liv-center-element': 'TV / 영상 시청 중심',
    'kitch-island-plan': '아일랜드는 필요하지 않습니다',
    'bath-input-mode': '자세히 입력하고 싶습니다 (권장)',
    'bath-q0-count': '1개',
    'bath-label': '공용욕실',
    'bath-q5-vanity-plan': '롱젠다이 + 상부 복합장 구성'
  };

  function defaultShortText(qid) {
    if (SHORT_TEXT[qid]) return SHORT_TEXT[qid];
    return '데모 자동 입력 (30평대 전용 99㎡, 부부+초등 자녀 1인 가정 시나리오).';
  }

  function pickSingle(q) {
    if (SINGLE[q.id] !== undefined) {
      const v = SINGLE[q.id];
      if (q.options.indexOf(v) === -1) return q.options[0];
      return v;
    }
    return q.options[0];
  }

  function pickMulti(q) {
    const opts = q.options;
    if (q.id === 'p1-q1-household') return ['부부', '자녀 1명'];
    if (q.id === 'es-areas') return ['세탁실 / 유틸리티룸', '아이방 / 놀이방'];
    if (opts.length >= 2) return [opts[0], opts[1]];
    return [opts[0]];
  }

  function fillQuestion(q) {
    if (q.showIf && !AppState.evaluateCondition(q.showIf)) return;

    switch (q.type) {
      case 'single-choice':
        AppState.setAnswer(q.id, pickSingle(q));
        break;
      case 'multi-choice':
        AppState.setAnswer(q.id, pickMulti(q));
        break;
      case 'tag':
        AppState.setAnswer(q.id, [q.options[0]]);
        break;
      case 'short-text':
        AppState.setAnswer(q.id, defaultShortText(q.id));
        break;
      default:
        break;
    }
  }

  function applyMeta() {
    const d = new Date();
    META.briefDate = META.briefDate || d.toLocaleDateString('ko-KR');
    AppState.setMeta('projectName', META.projectName);
    AppState.setMeta('spaceName', META.spaceName);
    AppState.setMeta('briefDate', META.briefDate);
    const map = {
      projectName: 'fieldProjectName',
      spaceName: 'fieldSpaceName',
      briefDate: 'fieldBriefDate'
    };
    Object.keys(map).forEach(key => {
      const el = document.getElementById(map[key]);
      if (el) el.textContent = AppState.state[key] || '';
    });
  }

  function runDemoFill() {
    applyMeta();
    let passes = 5;
    while (passes-- > 0) {
      AppState.getActiveSpaces().forEach(space => {
        space.sections.forEach(sec => {
          sec.questions.forEach(fillQuestion);
        });
      });
    }
    InterviewStorage.save(AppState.state);
    UIRender.renderSpaceNav();
    UIRender.renderQuestionCanvas();
    SummaryManager.renderSummaryPanel();
  }

  function runDemoAndSend() {
    if (typeof AppState === 'undefined' || typeof InterviewStorage === 'undefined') {
      return;
    }
    // 인라인 style만 보면 dissolve 직후 display가 아직 ''인 경우가 있어 오판됨 → 세션 또는 computed style
    const AUTH_KEY = 'brief_v1_auth';
    const gate = document.getElementById('pinGate');
    const gateBlocking =
      gate &&
      sessionStorage.getItem(AUTH_KEY) !== '1' &&
      getComputedStyle(gate).display !== 'none';
    if (gateBlocking) {
      AppState.showToast('데모: 먼저 PIN으로 앱에 진입한 뒤 ?demo=1 로 새로고침하세요');
      return;
    }
    runDemoFill();
    AppState.showToast('데모 입력 완료 — 곧 텔레그램 전송을 시도합니다');
    setTimeout(() => {
      const cfg = InterviewStorage.loadConfig();
      if (!cfg.botToken || !cfg.chatId) {
        AppState.showToast('데모: 텔레그램 토큰·Chat ID가 없어 전송을 건너뜁니다 (⚙ 저장 후 재시도)');
        return;
      }
      if (typeof window.__DASIFILL_sendBriefToTelegram === 'function') {
        window.__DASIFILL_sendBriefToTelegram({ fromFinish: false });
      }
    }, 1800);
  }

  window.__DASIFILL_runDemoSession = function () {
    runDemoAndSend();
  };

  const params = new URLSearchParams(window.location.search);
  if (params.get('demo') === '1') {
    const start = () => setTimeout(runDemoAndSend, DEMO_DELAY_MS);
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', start);
    } else {
      start();
    }
  }
})();
