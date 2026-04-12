/* ============================================
   STORAGE — design_interview_v1_* namespace
   기존 layout_meeting_v2_* / layout_logo_v1 과 완전 분리
   ============================================ */

const STORAGE_KEY    = 'design_interview_v1_session';   // 진행 중 세션
const CONFIG_KEY     = 'design_interview_v1_config';    // 텔레그램 설정
const CLIENT_INDEX   = 'design_interview_v1_index';     // 고객 목록
const CLIENT_PREFIX  = 'design_interview_v1_client_';   // 고객별 저장

const InterviewStorage = {

  // ── 현재 진행 세션 ──────────────────────────
  save(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, savedAt: Date.now() }));
      return true;
    } catch (e) {
      console.warn('[design-interview] save failed', e);
      return false;
    }
  },

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  },

  clear() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
  },

  // ── 고객별 영구 보관 ────────────────────────
  // 현재 세션을 고객 레코드로 저장하고 고유 ID 반환
  archiveClient(state) {
    try {
      const clientId = String(Date.now());
      const key = CLIENT_PREFIX + clientId;
      localStorage.setItem(key, JSON.stringify({ ...state, clientId, archivedAt: Date.now() }));

      // 인덱스 갱신 (최신 순, 최대 30개)
      const index = this.loadIndex();
      index.unshift({
        clientId,
        projectName:  state.projectName  || '(이름 없음)',
        spaceName:    state.spaceName    || '',
        meetingDate:  state.meetingDate  || '',
        archivedAt:   Date.now()
      });
      localStorage.setItem(CLIENT_INDEX, JSON.stringify(index.slice(0, 30)));
      return clientId;
    } catch (e) {
      console.warn('[design-interview] archiveClient failed', e);
      return null;
    }
  },

  loadClient(clientId) {
    try {
      const raw = localStorage.getItem(CLIENT_PREFIX + clientId);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  },

  loadIndex() {
    try {
      const raw = localStorage.getItem(CLIENT_INDEX);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  },

  // ── 텔레그램 설정 ───────────────────────────
  // sessionStorage 사용: 탭을 닫으면 토큰이 메모리에서 소멸됨.
  // 기존 localStorage 저장값은 첫 로드 시 자동 마이그레이션 후 삭제.
  saveConfig(config) {
    try {
      sessionStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    } catch (e) {}
  },

  loadConfig() {
    try {
      const session = sessionStorage.getItem(CONFIG_KEY);
      if (session) return JSON.parse(session);
      // 구버전 localStorage 마이그레이션 (1회)
      const legacy = localStorage.getItem(CONFIG_KEY);
      if (legacy) {
        sessionStorage.setItem(CONFIG_KEY, legacy);
        localStorage.removeItem(CONFIG_KEY);
        return JSON.parse(legacy);
      }
      return { botToken: '', chatId: '' };
    } catch (e) { return { botToken: '', chatId: '' }; }
  }
};
