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
  saveConfig(config) {
    try {
      localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    } catch (e) {}
  },

  loadConfig() {
    try {
      const raw = localStorage.getItem(CONFIG_KEY);
      return raw ? JSON.parse(raw) : { botToken: '8637144574:AAFdtNo3E80R-Teb9rmfMjYarXvRg7pGckc', chatId: '-5030536383' };
    } catch (e) { return { botToken: '8637144574:AAFdtNo3E80R-Teb9rmfMjYarXvRg7pGckc', chatId: '-5030536383' }; }
  }
};
