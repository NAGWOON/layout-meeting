/* ============================================
   STATE — AppState
   Shared app state + data helpers + mutations
   + escape utils + toast
   ============================================ */

const AppState = (function () {
  'use strict';

  const DEFAULT_STATE = {
    projectName: '',
    spaceName: '',
    meetingDate: new Date().toLocaleDateString('ko-KR'),
    answers: {},
    currentSpaceId: 'global',
    currentSectionIdx: 0
  };

  // Single mutable object — never reassigned so external references stay valid
  const state = Object.assign({}, DEFAULT_STATE);
  let saveTimer  = null;
  let focusedQId = null;

  // ── Data helpers ─────────────────────────────

  function getAllSpaces() {
    return [INTERVIEW_DATA.globalPreferences, ...INTERVIEW_DATA.spaces];
  }

  function getSpaceData(spaceId) {
    if (spaceId === 'global') return INTERVIEW_DATA.globalPreferences;
    return INTERVIEW_DATA.spaces.find(s => s.id === spaceId) || null;
  }

  function getCurrentSpace() {
    return getSpaceData(state.currentSpaceId);
  }

  function getCurrentSection() {
    const space = getCurrentSpace();
    if (!space) return null;
    return space.sections[state.currentSectionIdx] || null;
  }

  function getAnswer(qId) {
    return state.answers[qId];
  }

  function hasAnswer(qId) {
    const a = state.answers[qId];
    if (a === undefined || a === null) return false;
    if (typeof a === 'string') return a.trim() !== '';
    if (Array.isArray(a)) return a.length > 0;
    return false;
  }

  // ── State mutations ───────────────────────────

  function setAnswer(qId, value) {
    state.answers[qId] = value;
    scheduleSave();
    // Lazy cross-module calls — resolved at call time (all scripts loaded by then)
    SummaryManager.renderSummaryPanel();
    UIRender.renderSpaceNav();
    UIRender.updateSectionTabs();
  }

  function setMeta(field, value) {
    state[field] = value;
    scheduleSave();
  }

  function setCurrentSpace(spaceId) {
    state.currentSpaceId = spaceId;
    state.currentSectionIdx = 0;
  }

  function setCurrentSection(idx) {
    state.currentSectionIdx = idx;
  }

  function scheduleSave() {
    const indicator = document.getElementById('saveIndicator');
    if (indicator) {
      indicator.textContent = '저장 중...';
      indicator.className = 'save-indicator saving';
    }
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      InterviewStorage.save(state);
      if (indicator) {
        indicator.textContent = '저장됨';
        indicator.className = 'save-indicator saved';
        setTimeout(() => {
          indicator.textContent = '저장됨';
          indicator.className = 'save-indicator';
        }, 1500);
      }
    }, 400);
  }

  // Mutates in place so external references remain valid
  function resetState() {
    const fresh = Object.assign({}, DEFAULT_STATE, {
      meetingDate: new Date().toLocaleDateString('ko-KR'),
      answers: {}
    });
    Object.keys(state).forEach(k => delete state[k]);
    Object.assign(state, fresh);
  }

  function loadSavedState() {
    const saved = InterviewStorage.load();
    if (saved) {
      Object.keys(state).forEach(k => delete state[k]);
      Object.assign(state, DEFAULT_STATE, saved);
    }
  }

  // ── Focus (keyboard UX) ───────────────────────

  function getFocusedQId()  { return focusedQId; }
  function setFocusedQId(id) { focusedQId = id; }

  // ── Utils ─────────────────────────────────────

  function showToast(msg) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2000);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeAttr(str) { return escapeHtml(str); }

  // ── Public API ────────────────────────────────

  return {
    state,                // direct reference — always live
    getAllSpaces,
    getSpaceData,
    getCurrentSpace,
    getCurrentSection,
    getAnswer,
    hasAnswer,
    setAnswer,
    setMeta,
    setCurrentSpace,
    setCurrentSection,
    scheduleSave,
    resetState,
    loadSavedState,
    getFocusedQId,
    setFocusedQId,
    showToast,
    escapeHtml,
    escapeAttr
  };
})();
