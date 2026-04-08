'use strict';

const Storage = {
  _default() {
    return {
      currentPlanId: 'plan_1',
      projectName:   '',
      spaceNames:    [],
      spaces:        [],
      agenda:        DEFAULT_AGENDA.map((text, i) => ({
        id: `ag_${i + 1}`, text, done: false,
      })),
      decisions:    [],
      actionItems:  [],
      plans: [{
        id: 'plan_1',
        name: '시안 1',
        canvasJSON: null,
        floorPlanSrc: null,
        notes: [],
        memo: '',
      }],
    };
  },

  // ─── 마이그레이션 ─────────────────────────────
  _migrate(state) {
    // spaceNames[] → spaces[] (구버전 호환)
    if (!state.spaces || !state.spaces.length) {
      state.spaces = (state.spaceNames || []).map((name, i) => ({
        id: `sp_legacy_${i}`,
        name,
        status: 'pending',
        dimensions: '',
        notes: '',
      }));
    }
    if (!state.agenda || !state.agenda.length) {
      state.agenda = DEFAULT_AGENDA.map((text, i) => ({
        id: `ag_${i + 1}`, text, done: false,
      }));
    }
    if (!state.decisions)   state.decisions   = [];
    if (!state.actionItems) state.actionItems  = [];
    if (!state.projectName) state.projectName  = state.clientName || '';
    return state;
  },

  load() {
    try {
      const raw = localStorage.getItem(CONFIG.STORAGE_KEY);
      const state = raw ? JSON.parse(raw) : this._default();
      return this._migrate(state);
    } catch {
      return this._default();
    }
  },

  save(state) {
    try {
      const lean = {
        ...state,
        plans: state.plans.map(p => ({ ...p, floorPlanSrc: null })),
      };
      localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(lean));
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        console.warn('[Storage] localStorage 한도 초과 — canvasJSON이 너무 큽니다.');
      }
    }
  },

  // ─── 시안 CRUD ────────────────────────────────
  getCurrentPlan(state) {
    return state.plans.find(p => p.id === state.currentPlanId) ?? state.plans[0];
  },

  updatePlan(state, planId, updates) {
    const plan = state.plans.find(p => p.id === planId);
    if (plan) Object.assign(plan, updates);
  },

  addPlan(state) {
    const num  = state.plans.length + 1;
    const plan = {
      id: `plan_${Date.now()}`,
      name: `시안 ${num}`,
      canvasJSON:   null,
      floorPlanSrc: null,
      notes: [],
      memo:  '',
    };
    state.plans.push(plan);
    return plan;
  },

  deletePlan(state, planId) {
    if (state.plans.length <= 1) return false;
    state.plans = state.plans.filter(p => p.id !== planId);
    if (state.currentPlanId === planId) {
      state.currentPlanId = state.plans[0].id;
    }
    return true;
  },

  // ─── 공간 CRUD ────────────────────────────────
  addSpace(state, name) {
    if (!state.spaces) state.spaces = [];
    if (state.spaces.find(s => s.name === name)) return null;
    const space = {
      id: `sp_${Date.now()}`,
      name,
      status:     'pending',
      dimensions: '',
      notes:      '',
    };
    state.spaces.push(space);
    if (!state.spaceNames) state.spaceNames = [];
    if (!state.spaceNames.includes(name)) state.spaceNames.push(name);
    return space;
  },

  removeSpace(state, name) {
    state.spaces     = (state.spaces     ?? []).filter(s => s.name !== name);
    state.spaceNames = (state.spaceNames ?? []).filter(n => n !== name);
  },

  updateSpace(state, spaceId, updates) {
    const space = (state.spaces ?? []).find(s => s.id === spaceId);
    if (space) Object.assign(space, updates);
  },

  // ─── 어젠다 CRUD ─────────────────────────────
  addAgendaItem(state, text) {
    const item = { id: `ag_${Date.now()}`, text, done: false };
    state.agenda.push(item);
    return item;
  },

  toggleAgenda(state, id) {
    const item = (state.agenda ?? []).find(a => a.id === id);
    if (item) item.done = !item.done;
  },

  deleteAgendaItem(state, id) {
    state.agenda = (state.agenda ?? []).filter(a => a.id !== id);
  },

  // ─── 결정사항 CRUD ───────────────────────────
  addDecision(state, type, text, spaceName) {
    const decision = {
      id:        `dec_${Date.now()}`,
      type,
      text,
      spaceName: spaceName || null,
      createdAt: new Date().toISOString(),
    };
    state.decisions.push(decision);
    return decision;
  },

  deleteDecision(state, id) {
    state.decisions = (state.decisions ?? []).filter(d => d.id !== id);
  },

  // ─── 후속 액션 CRUD ──────────────────────
  addActionItem(state, text) {
    const item = { id: `ai_${Date.now()}`, text, done: false };
    state.actionItems.push(item);
    return item;
  },

  toggleActionItem(state, id) {
    const item = (state.actionItems ?? []).find(a => a.id === id);
    if (item) item.done = !item.done;
  },

  deleteActionItem(state, id) {
    state.actionItems = (state.actionItems ?? []).filter(a => a.id !== id);
  },
};
