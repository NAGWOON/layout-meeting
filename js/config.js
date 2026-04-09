'use strict';

// ─── 프로젝트 분리 (노션 연동) ────────────────
// URL: ?p=PROJECT_ID 로 각 프로젝트의 데이터를 완전 분리
// 노션 템플릿 링크 예시: https://your-host/?p=honggildong_apt_2026
const PROJECT_ID      = new URLSearchParams(location.search).get('p')   || 'default';
const NOTION_PAGE_ID  = new URLSearchParams(location.search).get('nid') || '';

// ─── 앱 설정 ──────────────────────────────────
const CONFIG = {
  COMPANY_NAME:  'DASIFILL',
  STORAGE_KEY:   `layout_meeting_v2_${PROJECT_ID}`,
  CANVAS_BG:     '#FAFAF8',  // A3 paper white
  NAVY:          '#1A1A2E',
  MAX_HISTORY:   30,
  PDFJS_WORKER:  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
};

// PDF.js 워커 설정
if (typeof pdfjsLib !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = CONFIG.PDFJS_WORKER;
}

// ─── 스티커 정의 (창문 제외 6종) ─────────────
const STICKERS = [
  { id: 'telecom',    label: '통신함', emoji: '📡', color: '#2563EB' },
  { id: 'breaker',    label: '차단기', emoji: '⚡', color: '#DC2626' },
  { id: 'ac_outdoor', label: '실외기', emoji: '❄️', color: '#0891B2' },
  { id: 'outlet',     label: '콘센트', emoji: '🔌', color: '#7C3AED' },
  { id: 'sw_btn',     label: '스위치', emoji: '💡', color: '#059669' },
  { id: 'door',       label: '문',    emoji: '🚪', color: '#D97706' },
];

// ─── 기본 미팅 어젠다 ─────────────────────────
const DEFAULT_AGENDA = [
  '도면 확인 및 공간 파악',
  '공간별 사용 목적 / 동선',
  '가구 배치 방향',
  '수납 계획',
  '조명 / 전기 위치',
  '마감재 방향 (바닥·벽·천장)',
  '예산 및 일정 확인',
  '다음 단계 정리',
];

// ─── 결정사항 타입 ────────────────────────────
const DECISION_TYPES = {
  confirmed: { label: '확정',   emoji: '✅', color: '#059669' },
  pending:   { label: '보류',   emoji: '⏸',  color: '#D97706' },
  research:  { label: '검토필요', emoji: '🔍', color: '#2563EB' },
};

// ─── 도구 이름 상수 ────────────────────────
const TOOLS = {
  SELECT: 'select',
  NOTE:   'note',
  ERASER: 'eraser',
  TEXT:   'text',
};

// ─── Notion 연동 웹훅 ─────────────────────────
// Make.com 웹훅 URL — 미팅 결과를 노션으로 자동 전송
const NOTION_WEBHOOK_URL = 'https://hook.eu1.make.com/sv44gn93x4u2qmazje75n6blp25k6y45';

// ─── XSS 방지 유틸리티 ────────────────────────
function escapeHtml(str) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(String(str ?? '')));
  return d.innerHTML;
}
