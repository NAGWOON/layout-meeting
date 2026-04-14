/* ============================================
   STATE — AppState
   Shared app state + data helpers + mutations
   + branch engine + escape utils + toast
   ============================================ */

const AppState = (function () {
  'use strict';

  const DEFAULT_STATE = {
    projectName: '',
    spaceName: '',
    briefDate: new Date().toLocaleDateString('ko-KR'),
    answers: {},
    currentSpaceId: 'global',
    currentSectionIdx: 0,
    // Space activation: spaceId → false means excluded from this session.
    // Absence (or true) means active. Only optional spaces can be deactivated.
    spaceActivation: {},
    // Space instances: spaceId → number of instances (default 1).
    // Only repeatable spaces use this. Framework ready; UI in next phase.
    spaceInstances: {},
    bathroomMeta: {
      count: 1,
      inputMode: ''
    },
    bathrooms: []
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
    const original = INTERVIEW_DATA.spaces.find(s => s.id === spaceId);
    if (original) return original;
    // Virtual instance space (e.g., 'bathroom_2')
    return _buildActiveSpaces().find(s => s.id === spaceId) || null;
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
    _applyBathroomCountByAnswer(qId);
    _syncBathroomModelFromAnswers();
    purgeHiddenConditionalAnswers();
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
      briefDate: new Date().toLocaleDateString('ko-KR'),
      answers: {},
      spaceActivation: {},
      spaceInstances: {},
      bathroomMeta: { count: 1, inputMode: '' },
      bathrooms: []
    });
    Object.keys(state).forEach(k => delete state[k]);
    Object.assign(state, fresh);
  }

  function loadSavedState() {
    const saved = InterviewStorage.load();
    if (saved) {
      Object.keys(state).forEach(k => delete state[k]);
      Object.assign(state, DEFAULT_STATE, saved);
      _ensureBathroomStateShape();
      _syncBathroomModelFromAnswers();
      if (purgeHiddenConditionalAnswers()) {
        scheduleSave();
      }
    }
  }

  // ── Branch engine ────────────────────────────
  //
  // Condition schema (q.showIf):
  //   null / undefined              → always visible
  //   { qId, hasValue }             → answer === value  (works for arrays too)
  //   { qId, includes }             → answer array includes value
  //   { qId, hasAnyValue: [...] }   → answer matches any of the given values
  //   { qId, notEmpty: true/false } → answer is/isn't empty
  //   { all: [cond, ...] }          → AND — every condition must be true
  //   { any: [cond, ...] }          → OR  — at least one must be true
  //   { not: cond }                 → negation

  function evaluateCondition(cond) {
    if (!cond) return true;

    if (cond.all) return cond.all.every(c => evaluateCondition(c));
    if (cond.any) return cond.any.some(c  => evaluateCondition(c));
    if (cond.not) return !evaluateCondition(cond.not);

    const answer   = state.answers[cond.qId];
    const asArray  = Array.isArray(answer) ? answer : (answer != null ? [answer] : []);

    if ('notEmpty' in cond) {
      const empty = answer === undefined || answer === null ||
                    (typeof answer === 'string' && answer.trim() === '') ||
                    (Array.isArray(answer) && answer.length === 0);
      return cond.notEmpty ? !empty : empty;
    }
    if ('hasValue'    in cond) return asArray.includes(cond.hasValue);
    if ('includes'    in cond) return asArray.includes(cond.includes);
    if ('hasAnyValue' in cond) return cond.hasAnyValue.some(v => asArray.includes(v));

    return true;
  }

  // Returns only questions whose showIf condition is currently true
  function getVisibleQuestions(section) {
    return section.questions.filter(q => evaluateCondition(q.showIf));
  }

  // ── Space activation ──────────────────────────

  // Returns true if a space is active in the current session
  function isSpaceActive(spaceId) {
    return state.spaceActivation[spaceId] !== false;
  }

  // Activate or deactivate an optional space for the current session
  function setSpaceActivation(spaceId, isActive) {
    if (isActive) {
      delete state.spaceActivation[spaceId];  // active = absence from map
    } else {
      state.spaceActivation[spaceId] = false;
    }
    scheduleSave();
    // Lazy cross-module update
    UIRender.renderSpaceNav();
    UIRender.renderQuestionCanvas();
    SummaryManager.renderSummaryPanel();
  }

  // Internal: build flat active-space list with virtual instances expanded.
  // Instance 1 uses the original space object (unchanged IDs).
  // Instance N>1 gets a virtual clone with prefixed question IDs.
  function _buildActiveSpaces() {
    const result = [];
    getAllSpaces().forEach(sp => {
      if (!isSpaceActive(sp.id)) return;
      const count = sp.repeatable ? (state.spaceInstances[sp.id] || 1) : 1;
      for (let i = 1; i <= count; i++) {
        if (i === 1) {
          if (sp.id === 'bathroom') {
            result.push({
              ...sp,
              label: _resolveBathroomLabel(1) || sp.label
            });
          } else {
            result.push(sp);                  // original — unchanged
          }
        } else {
          const prefix = `${sp.id}_${i}`;
          const label = sp.id === 'bathroom'
            ? (_resolveBathroomLabel(i) || `${sp.label} ${i}`)
            : `${sp.label} ${i}`;
          result.push({
            ...sp,
            id:    prefix,
            label,
            _instanceOf:  sp.id,
            _instanceNum: i,
            sections: sp.sections
              .filter(sec => !(sp.id === 'bathroom' && sec.id === 'bathroom-setup'))
              .map(sec => ({
              ...sec,
              id: `${prefix}:${sec.id}`,
              questions: sec.questions.map(q => ({
                ...q,
                id: `${prefix}::${q.id}`,
                showIf: _prefixConditionQIds(q.showIf, prefix)
              }))
            }))
          });
        }
      }
    });
    return result;
  }

  // Public: all active spaces (including virtual instances)
  function getActiveSpaces() {
    return _buildActiveSpaces();
  }

  // Remove answers for conditional questions whose showIf is currently false
  // so summary / export / storage do not retain stale branch values.
  function purgeHiddenConditionalAnswers() {
    let removed = false;
    getActiveSpaces().forEach(sp => {
      sp.sections.forEach(sec => {
        sec.questions.forEach(q => {
          if (!q.showIf) return;
          if (evaluateCondition(q.showIf)) return;
          if (!Object.prototype.hasOwnProperty.call(state.answers, q.id)) return;
          delete state.answers[q.id];
          if (_baseQId(q.id) === 'bath-q6-counter-sink-style') {
            _syncBathroomModelFromAnswers();
          }
          removed = true;
        });
      });
    });
    return removed;
  }

  // ── Repeatable instance management ───────────

  function addSpaceInstance(spaceId) {
    const spaceData = INTERVIEW_DATA.spaces.find(s => s.id === spaceId);
    if (!spaceData || !spaceData.repeatable) return false;
    const current = state.spaceInstances[spaceId] || 1;
    if (current >= (spaceData.maxRepeat || 2)) return false;
    state.spaceInstances[spaceId] = current + 1;
    if (spaceId === 'bathroom') {
      state.bathroomMeta.count = current + 1;
      _syncBathroomModelFromAnswers();
    }
    scheduleSave();
    UIRender.renderSpaceNav();
    UIRender.renderQuestionCanvas();
    SummaryManager.renderSummaryPanel();
    return true;
  }

  function removeSpaceInstance(spaceId, instanceNum) {
    if (instanceNum <= 1) return false;
    const current = state.spaceInstances[spaceId] || 1;
    if (current < instanceNum) return false;
    // Clear answers belonging to this instance
    const prefix = `${spaceId}_${instanceNum}::`;
    Object.keys(state.answers).forEach(key => {
      if (key.startsWith(prefix)) delete state.answers[key];
    });
    state.spaceInstances[spaceId] = current - 1;
    if (spaceId === 'bathroom') {
      state.bathroomMeta.count = current - 1;
      _syncBathroomModelFromAnswers();
    }
    // If currently viewing the removed instance, navigate to previous
    const removedId = `${spaceId}_${instanceNum}`;
    if (state.currentSpaceId === removedId) {
      setCurrentSpace(instanceNum === 2 ? spaceId : `${spaceId}_${instanceNum - 1}`);
    }
    scheduleSave();
    UIRender.renderSpaceNav();
    UIRender.renderQuestionCanvas();
    SummaryManager.renderSummaryPanel();
    return true;
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

  // ── Bathroom model helpers ────────────────────

  function _ensureBathroomStateShape() {
    if (!state.bathroomMeta || typeof state.bathroomMeta !== 'object') {
      state.bathroomMeta = { count: 1, inputMode: '' };
    }
    if (!Array.isArray(state.bathrooms)) state.bathrooms = [];
    if (!state.spaceInstances || typeof state.spaceInstances !== 'object') state.spaceInstances = {};
    if (!state.spaceInstances.bathroom) state.spaceInstances.bathroom = 1;
  }

  function _countFromBathQ0(value) {
    if (value === '1개') return 1;
    if (value === '2개') return 2;
    if (value === '3개 이상') return 3;
    return null;
  }

  function _applyBathroomCountByAnswer(qId) {
    if (_baseQId(qId) !== 'bath-q0-count') return;
    const target = _countFromBathQ0(state.answers[qId]);
    if (!target) return;
    const spaceData = INTERVIEW_DATA.spaces.find(s => s.id === 'bathroom');
    const max = (spaceData && spaceData.maxRepeat) || 3;
    const finalCount = Math.max(1, Math.min(target, max));
    const current = state.spaceInstances.bathroom || 1;
    if (current === finalCount) {
      state.bathroomMeta.count = finalCount;
      return;
    }
    if (current < finalCount) {
      for (let i = current + 1; i <= finalCount; i++) {
        state.spaceInstances.bathroom = i;
      }
    } else {
      for (let i = current; i > finalCount; i--) {
        const prefix = `bathroom_${i}::`;
        Object.keys(state.answers).forEach(key => {
          if (key.startsWith(prefix)) delete state.answers[key];
        });
      }
      state.spaceInstances.bathroom = finalCount;
      if (state.currentSpaceId.startsWith('bathroom_')) {
        const curNum = parseInt(state.currentSpaceId.split('_')[1] || '1', 10);
        if (curNum > finalCount) state.currentSpaceId = finalCount === 1 ? 'bathroom' : `bathroom_${finalCount}`;
      }
    }
    state.bathroomMeta.count = finalCount;
  }

  function _bathroomQId(instanceNum, baseId) {
    return instanceNum === 1 ? baseId : `bathroom_${instanceNum}::${baseId}`;
  }

  function _resolveBathroomLabel(instanceNum) {
    const qid = _bathroomQId(instanceNum, 'bath-label');
    const label = state.answers[qid];
    return (typeof label === 'string' && label.trim()) ? label.trim() : null;
  }

  function _syncBathroomModelFromAnswers() {
    _ensureBathroomStateShape();
    const countFromAnswer = _countFromBathQ0(state.answers['bath-q0-count']);
    const count = countFromAnswer || state.spaceInstances.bathroom || 1;
    state.spaceInstances.bathroom = count;
    state.bathroomMeta = {
      count,
      inputMode: state.answers['bath-input-mode'] || ''
    };
    const baseIds = [
      'bath-q1-mood',
      'bath-q2-use-type',
      'bath-q3-bathtub-plan',
      'bath-q4-shower-type',
      'bath-q5-vanity-plan',
      'bath-q6-counter-sink-style',
      'bath-q7-detail-options',
      'bath-q8-toilet-type'
    ];
    state.bathrooms = [];
    for (let i = 1; i <= count; i++) {
      const answersBucket = {};
      baseIds.forEach(baseId => {
        const qid = _bathroomQId(i, baseId);
        const v = state.answers[qid];
        answersBucket[baseId] = v === undefined ? (baseId === 'bath-q7-detail-options' ? [] : '') : v;
      });
      const label = _resolveBathroomLabel(i) || `욕실 ${i}`;
      state.bathrooms.push({
        instanceId: `bathroom_${i}`,
        label,
        answers: answersBucket
      });
    }
  }

  function _prefixConditionQIds(cond, prefix) {
    if (!cond) return cond;
    if (cond.all) return { ...cond, all: cond.all.map(c => _prefixConditionQIds(c, prefix)) };
    if (cond.any) return { ...cond, any: cond.any.map(c => _prefixConditionQIds(c, prefix)) };
    if (cond.not) return { ...cond, not: _prefixConditionQIds(cond.not, prefix) };
    if (!cond.qId) return { ...cond };
    return { ...cond, qId: `${prefix}::${cond.qId}` };
  }

  function _baseQId(qId) {
    const idx = qId.indexOf('::');
    return idx >= 0 ? qId.slice(idx + 2) : qId;
  }

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
    escapeAttr,
    // Branch engine
    evaluateCondition,
    getVisibleQuestions,
    // Space activation
    isSpaceActive,
    setSpaceActivation,
    getActiveSpaces,
    purgeHiddenConditionalAnswers,
    // Repeatable instances
    addSpaceInstance,
    removeSpaceInstance
  };
})();
