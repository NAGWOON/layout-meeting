/* ============================================
   STORAGE — design_interview_v2_* namespace
   v1 is kept read-only for backward compatibility.
   New sessions always write to v2.
   ============================================ */

// ── v2 keys (active namespace) ───────────────
const STORAGE_KEY_V2   = 'design_interview_v2_session';
const CLIENT_INDEX_V2  = 'design_interview_v2_index';
const CLIENT_PREFIX_V2 = 'design_interview_v2_client_';

// ── v1 keys (legacy, read-only) ──────────────
const STORAGE_KEY_V1   = 'design_interview_v1_session';
const CLIENT_INDEX_V1  = 'design_interview_v1_index';
const CLIENT_PREFIX_V1 = 'design_interview_v1_client_';

/** Renamed space ids (questions-data MASTER 정렬) — 세션 복원 시 한 번 정규화 */
function _migrateSpaceIdsV2(state) {
  if (!state || typeof state !== 'object') return;
  const map = {
    entryway: 'entrance',
    'living-room': 'living',
    'master-bedroom': 'bedroom',
    'kids-study': 'study',
    'shared-bathroom': 'bathroom',
    'master-bathroom': 'bathroom'
  };
  if (map[state.currentSpaceId]) state.currentSpaceId = map[state.currentSpaceId];
  if (state.currentSpaceId === 'other') state.currentSpaceId = 'extra-space';

  if (state.spaceActivation && typeof state.spaceActivation === 'object') {
    if (Object.prototype.hasOwnProperty.call(state.spaceActivation, 'other')) {
      const v = state.spaceActivation.other;
      delete state.spaceActivation.other;
      state.spaceActivation['extra-space'] = v;
      state.spaceActivation['final-request'] = v;
    }
    Object.keys(map).forEach(oldId => {
      if (!Object.prototype.hasOwnProperty.call(state.spaceActivation, oldId)) return;
      const v = state.spaceActivation[oldId];
      delete state.spaceActivation[oldId];
      state.spaceActivation[map[oldId]] = v;
    });
  }

  if (!state.spaceInstances || typeof state.spaceInstances !== 'object') {
    state.spaceInstances = {};
  }
  if (!state.spaceInstances.bathroom) {
    const legacySharedCount = state.spaceInstances['shared-bathroom'] || 1;
    state.spaceInstances.bathroom = legacySharedCount;
  }
  delete state.spaceInstances['shared-bathroom'];
  delete state.spaceInstances['master-bathroom'];

  if (!state.bathroomMeta || typeof state.bathroomMeta !== 'object') {
    state.bathroomMeta = { count: state.spaceInstances.bathroom || 1, inputMode: '' };
  }
  if (!Array.isArray(state.bathrooms)) state.bathrooms = [];
}

// ── Shared keys (no versioning needed) ───────
const CONFIG_KEY = 'design_interview_v1_config';   // sessionStorage — no migrate needed

const InterviewStorage = {

  // ── 현재 진행 세션 (v2) ──────────────────────
  save(state) {
    try {
      localStorage.setItem(STORAGE_KEY_V2, JSON.stringify({ ...state, savedAt: Date.now() }));
      return true;
    } catch (e) {
      console.warn('[design-interview] save failed', e);
      return false;
    }
  },

  // Load: try v2 first, then fall back to v1 (read-only migration).
  load() {
    try {
      const v2 = localStorage.getItem(STORAGE_KEY_V2);
      if (v2) {
        const state = JSON.parse(v2);
        _migrateSpaceIdsV2(state);
        return state;
      }

      // v1 fallback: read legacy session and normalise field names
      const v1raw = localStorage.getItem(STORAGE_KEY_V1);
      if (!v1raw) return null;
      const v1 = JSON.parse(v1raw);
      // Normalise: meetingDate → briefDate (v1 used meetingDate)
      if (v1.meetingDate !== undefined && v1.briefDate === undefined) {
        v1.briefDate = v1.meetingDate;
        delete v1.meetingDate;
      }
      // Ensure new fields present with defaults
      if (!v1.spaceActivation) v1.spaceActivation = {};
      if (!v1.spaceInstances)  v1.spaceInstances  = {};
      _migrateSpaceIdsV2(v1);
      return v1;
    } catch (e) { return null; }
  },

  clear() {
    try {
      localStorage.removeItem(STORAGE_KEY_V2);
      localStorage.removeItem(STORAGE_KEY_V1);
    } catch (e) {}
  },

  // ── 고객별 영구 보관 (v2) ────────────────────
  archiveClient(state) {
    try {
      const clientId = String(Date.now());
      const key = CLIENT_PREFIX_V2 + clientId;
      localStorage.setItem(key, JSON.stringify({ ...state, clientId, archivedAt: Date.now() }));

      const index = this.loadIndex();
      index.unshift({
        clientId,
        projectName: state.projectName || '(이름 없음)',
        spaceName:   state.spaceName   || '',
        briefDate:   state.briefDate   || '',
        archivedAt:  Date.now(),
        _v: 2
      });
      localStorage.setItem(CLIENT_INDEX_V2, JSON.stringify(index.slice(0, 30)));
      return clientId;
    } catch (e) {
      console.warn('[design-interview] archiveClient failed', e);
      return null;
    }
  },

  // Load a specific archived client (checks v2 then v1)
  loadClient(clientId) {
    try {
      const v2 = localStorage.getItem(CLIENT_PREFIX_V2 + clientId);
      if (v2) return JSON.parse(v2);
      const v1 = localStorage.getItem(CLIENT_PREFIX_V1 + clientId);
      return v1 ? JSON.parse(v1) : null;
    } catch (e) { return null; }
  },

  // Returns merged v2 + v1 index (v2 first, then legacy)
  loadIndex() {
    try {
      const v2raw = localStorage.getItem(CLIENT_INDEX_V2);
      const v2    = v2raw ? JSON.parse(v2raw) : [];
      return v2;
    } catch (e) { return []; }
  },

  // Legacy v1 index (read-only access for historical records)
  loadLegacyIndex() {
    try {
      const raw = localStorage.getItem(CLIENT_INDEX_V1);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  },

  // ── 텔레그램 설정 (sessionStorage) ──────────
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
