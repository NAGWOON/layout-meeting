/* ============================================
   NAVIGATION MANAGER — NavigationManager
   Space/section navigation + question focus +
   keyboard shortcuts
   ============================================ */

const NavigationManager = (function () {
  'use strict';

  // ── Space / section navigation ────────────────

  function selectSpace(spaceId) {
    AppState.setCurrentSpace(spaceId);
    AppState.setFocusedQId(null);
    UIRender.renderSpaceNav();
    UIRender.renderQuestionCanvas();
    const canvas = document.getElementById('questionCanvas');
    if (canvas) canvas.scrollTop = 0;
    setTimeout(focusFirstUnanswered, 60);
  }

  function selectSection(idx) {
    AppState.setCurrentSection(idx);
    AppState.setFocusedQId(null);
    UIRender.renderQuestionCanvas();
    const canvas = document.getElementById('questionCanvas');
    if (canvas) canvas.scrollTop = 0;
    setTimeout(focusFirstUnanswered, 60);
  }

  function goNextSection() {
    const space = AppState.getCurrentSpace();
    if (!space) return;
    const state = AppState.state;
    if (state.currentSectionIdx < space.sections.length - 1) {
      selectSection(state.currentSectionIdx + 1);
    } else {
      // Use active spaces only for next navigation
      const activeSpaces = AppState.getActiveSpaces();
      const idx = activeSpaces.findIndex(s => s.id === state.currentSpaceId);
      if (idx < activeSpaces.length - 1) selectSpace(activeSpaces[idx + 1].id);
    }
  }

  function goPrevSection() {
    const state = AppState.state;
    if (state.currentSectionIdx > 0) {
      selectSection(state.currentSectionIdx - 1);
    } else {
      // Use active spaces only for prev navigation
      const activeSpaces = AppState.getActiveSpaces();
      const idx = activeSpaces.findIndex(s => s.id === state.currentSpaceId);
      if (idx > 0) {
        const prevSpace = activeSpaces[idx - 1];
        AppState.setCurrentSpace(prevSpace.id);
        AppState.setCurrentSection(prevSpace.sections.length - 1);
        UIRender.renderSpaceNav();
        UIRender.renderQuestionCanvas();
      }
    }
  }

  // ── Focus helpers ─────────────────────────────

  function setFocusedQuestion(qId) {
    AppState.setFocusedQId(qId);
    document.querySelectorAll('.question-block.focused').forEach(b => b.classList.remove('focused'));
    if (!qId) return;
    const block = document.querySelector(`.question-block[data-qid="${qId}"]`);
    if (block) {
      block.classList.add('focused');
      block.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  function focusNextQuestion(fromQId, direction) {
    const section = AppState.getCurrentSection();
    if (!section) return;
    // Only navigate to visible (showIf-passing) questions
    const qs = AppState.getVisibleQuestions(section);
    const currentIdx = fromQId ? qs.findIndex(q => q.id === fromQId) : -1;
    const nextIdx = currentIdx + direction;
    if (nextIdx >= 0 && nextIdx < qs.length) {
      setFocusedQuestion(qs[nextIdx].id);
    } else if (direction === 1 && nextIdx >= qs.length) {
      const btn = document.getElementById('btnNext');
      if (btn) { btn.classList.add('pulse'); setTimeout(() => btn.classList.remove('pulse'), 700); }
    }
  }

  function focusFirstUnanswered() {
    const section = AppState.getCurrentSection();
    if (!section) return;
    const visible   = AppState.getVisibleQuestions(section);
    const unanswered = visible.find(q => !AppState.hasAnswer(q.id));
    setFocusedQuestion(unanswered ? unanswered.id : (visible[0] || {}).id || null);
  }

  function flashAnswered(qId) {
    const block = document.querySelector(`.question-block[data-qid="${qId}"]`);
    if (block) {
      block.classList.add('just-answered');
      setTimeout(() => block.classList.remove('just-answered'), 700);
    }
  }

  // ── Number key selection ──────────────────────

  function selectOptionByNumber(qId, num) {
    let qData = null;
    AppState.getActiveSpaces().forEach(sp =>
      sp.sections.forEach(sec =>
        sec.questions.forEach(q => { if (q.id === qId && AppState.evaluateCondition(q.showIf)) qData = q; })
      )
    );
    if (!qData || !qData.options) return;
    const optionVal = qData.options[num - 1];
    if (!optionVal) return;

    if (qData.type === 'single-choice') {
      const cur = AppState.getAnswer(qId);
      AppState.setAnswer(qId, cur === optionVal ? null : optionVal);
      QuestionRenderer.rerenderQuestion(qId);
      if (cur !== optionVal) { flashAnswered(qId); setTimeout(() => focusNextQuestion(qId, 1), 220); }
      else setTimeout(() => setFocusedQuestion(qId), 10);

    } else if (qData.type === 'multi-choice' || qData.type === 'tag' || qData.type === 'priority') {
      const cur = (AppState.getAnswer(qId) || []).slice();
      const idx = cur.indexOf(optionVal);
      const max = qData.maxSelect || (qData.type === 'priority' ? qData.options.length : 99);
      if (idx !== -1) cur.splice(idx, 1);
      else if (cur.length < max) cur.push(optionVal);
      AppState.setAnswer(qId, cur);
      QuestionRenderer.rerenderQuestion(qId);
      flashAnswered(qId);
      setTimeout(() => setFocusedQuestion(qId), 10);
    }
  }

  // ── Keyboard shortcuts ────────────────────────

  function initKeyboardShortcuts() {
    document.addEventListener('keydown', e => {
      const inText = ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName) ||
        document.activeElement.contentEditable === 'true';

      if (inText) {
        if (e.key === 'ArrowRight' && e.ctrlKey) { e.preventDefault(); goNextSection(); }
        if (e.key === 'ArrowLeft'  && e.ctrlKey) { e.preventDefault(); goPrevSection(); }
        return;
      }

      if (e.key === ']') { e.preventDefault(); goNextSection(); return; }
      if (e.key === '[') { e.preventDefault(); goPrevSection(); return; }

      if (e.key === 'Tab') {
        e.preventDefault();
        focusNextQuestion(AppState.getFocusedQId(), e.shiftKey ? -1 : 1);
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        const section = AppState.getCurrentSection();
        if (!section) return;
        const qs  = section.questions;
        const fqId = AppState.getFocusedQId();
        const idx  = fqId ? qs.findIndex(q => q.id === fqId) : -1;
        if (idx === qs.length - 1 || idx === -1) goNextSection();
        else focusNextQuestion(fqId, 1);
        return;
      }

      if (AppState.getFocusedQId() && /^[1-9]$/.test(e.key)) {
        e.preventDefault();
        selectOptionByNumber(AppState.getFocusedQId(), parseInt(e.key));
      }
    });
  }

  return {
    selectSpace,
    selectSection,
    goNextSection,
    goPrevSection,
    setFocusedQuestion,
    focusNextQuestion,
    focusFirstUnanswered,
    flashAnswered,
    selectOptionByNumber,
    initKeyboardShortcuts
  };
})();
