/* ============================================
   UI RENDER — UIRender
   Space nav + section tabs + question canvas
   ============================================ */

const UIRender = (function () {
  'use strict';

  // ── Space nav (left panel) ────────────────────

  function renderSpaceNav() {
    const nav = document.getElementById('spaceNav');
    if (!nav) return;

    const allSpaces = AppState.getAllSpaces();
    let html = `<div class="nav-header">공간 선택</div><div class="space-list">`;

    allSpaces.forEach((space, i) => {
      const isActive  = space.id === AppState.state.currentSpaceId;
      const complete  = ProgressManager.isSpaceComplete(space.id);
      const { answered, total } = ProgressManager.getSpaceProgress(space.id);
      const progressText = total > 0 ? `${answered}/${total}` : '';

      let cls = 'space-item';
      if (isActive)  cls += ' active';
      if (complete)  cls += ' complete';

      html += `
        <div class="${cls}" data-space="${space.id}">
          <span class="space-icon">${space.icon}</span>
          <span class="space-label">${space.label}</span>
          ${progressText ? `<span class="space-progress">${progressText}</span>` : ''}
        </div>`;

      if (i === 0) html += `<div class="nav-divider"></div>`;
    });

    html += `</div>`;
    nav.innerHTML = html;

    nav.querySelectorAll('.space-item').forEach(el => {
      el.addEventListener('click', () => NavigationManager.selectSpace(el.dataset.space));
    });
  }

  // ── Section tabs (update only, no full re-render) ─

  function updateSectionTabs() {
    const space = AppState.getCurrentSpace();
    if (!space) return;
    document.querySelectorAll('.section-tab').forEach((tab, i) => {
      const sec = space.sections[i];
      if (!sec) return;
      const cnt = ProgressManager.getSectionAnswerCount(sec);
      tab.classList.toggle('has-answers', cnt > 0);
    });
  }

  // ── Question canvas (center panel) ───────────

  function renderQuestionCanvas() {
    const canvas = document.getElementById('questionCanvas');
    if (!canvas) return;

    const space = AppState.getCurrentSpace();
    if (!space) {
      canvas.innerHTML = `<div class="empty-state">공간을 선택해주세요</div>`;
      return;
    }

    const state       = AppState.state;
    const sections    = space.sections;
    const curSec      = sections[state.currentSectionIdx];
    const isLastSection = state.currentSectionIdx === sections.length - 1;
    const allSpaces   = AppState.getAllSpaces();
    const spaceIdx    = allSpaces.findIndex(s => s.id === state.currentSpaceId);
    const isLastSpace = spaceIdx === allSpaces.length - 1;

    // Section tabs
    const tabsHtml = sections.map((sec, i) => {
      const isActive = i === state.currentSectionIdx;
      const cnt = ProgressManager.getSectionAnswerCount(sec);
      let cls = 'section-tab';
      if (isActive) cls += ' active';
      if (cnt > 0)  cls += ' has-answers';
      return `<div class="${cls}" data-sec-idx="${i}">${sec.title}</div>`;
    }).join('');

    // Questions
    const questionsHtml = curSec.questions.map(q => QuestionRenderer.renderQuestion(q)).join('');

    // Section progress
    const secAnswered = ProgressManager.getSectionAnswerCount(curSec);
    const secTotal    = curSec.questions.length;
    const secPct      = secTotal > 0 ? Math.round(secAnswered / secTotal * 100) : 0;

    // Footer nav labels
    const prevLabel = '← 이전';
    const nextLabel = (isLastSection && isLastSpace) ? '완료' : (isLastSection ? '다음 공간 →' : '다음 →');
    const isPrevDisabled = state.currentSectionIdx === 0 && spaceIdx === 0;

    canvas.innerHTML = `
      <div class="canvas-space-title">
        <span class="canvas-space-icon-lg">${space.icon}</span>
        <span class="canvas-space-label-lg">${AppState.escapeHtml(space.label)}</span>
      </div>
      <div class="canvas-section-header">
        ${tabsHtml}
        <div class="section-progress-wrap">
          <div class="section-progress-bar"><div class="section-progress-fill" style="width:${secPct}%"></div></div>
          <span class="section-progress-label">${secAnswered}/${secTotal}</span>
        </div>
      </div>
      <div class="canvas-body">${questionsHtml}</div>
      <div class="canvas-footer">
        <button class="nav-btn" id="btnPrev" ${isPrevDisabled ? 'disabled' : ''}>${prevLabel}</button>
        <button class="nav-btn primary" id="btnNext">${nextLabel}</button>
        <span class="canvas-progress-text">${ProgressManager.getTotalAnswered()}개 완료 &nbsp;·&nbsp; <span class="shortcut-hint">[ ] 섹션이동 &nbsp; 1-9 선택</span></span>
      </div>`;

    // Section tab events
    canvas.querySelectorAll('.section-tab').forEach(tab => {
      tab.addEventListener('click', () => NavigationManager.selectSection(parseInt(tab.dataset.secIdx)));
    });

    // Nav button events
    canvas.querySelector('#btnPrev').addEventListener('click', NavigationManager.goPrevSection);
    canvas.querySelector('#btnNext').addEventListener('click', NavigationManager.goNextSection);

    // Question events
    QuestionRenderer.bindQuestionEvents(canvas);

    // Restore focus
    const fqId = AppState.getFocusedQId();
    if (fqId) setTimeout(() => NavigationManager.setFocusedQuestion(fqId), 10);
  }

  return {
    renderSpaceNav,
    updateSectionTabs,
    renderQuestionCanvas
  };
})();
