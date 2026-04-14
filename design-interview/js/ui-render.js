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

    const rawSpaces    = AppState.getAllSpaces();
    const activeSpaces = AppState.getActiveSpaces();  // includes virtual instances
    let html = `<div class="nav-header">공간 구성</div><div class="space-list">`;

    rawSpaces.forEach((space, i) => {
      const isEnabled = AppState.isSpaceActive(space.id);

      if (i === 0) {
        // ── Global space (never optional) ──────────
        html += _buildSpaceItem(space, false, false, false);
        html += `<div class="nav-divider"></div>`;
        return;
      }

      if (!isEnabled) {
        // Excluded optional space — show greyed out with "+" toggle
        html += _buildSpaceItem(space, false, true, false);
        return;
      }

      if (!space.repeatable) {
        // Normal active space
        html += _buildSpaceItem(space, false, false, space.optional);
        return;
      }

      // ── Repeatable space: show all instances ───
      const count  = AppState.state.spaceInstances[space.id] || 1;
      const maxRep = space.maxRepeat || 2;
      const isBathroom = space.id === 'bathroom';

      // Instance 1 uses original id
      html += _buildSpaceItem(space, false, false, space.optional);

      // Instance 2+ (virtual) — with × remove button
      for (let n = 2; n <= count; n++) {
        const vId    = `${space.id}_${n}`;
        const vSpace = activeSpaces.find(s => s.id === vId);
        if (vSpace) html += _buildSpaceItem(vSpace, !isBathroom, false, false);
      }

      // "+ 추가" row if not at max (bathroom은 Q0 개수로만 관리)
      if (!isBathroom && count < maxRep) {
        html += `<div class="space-add-btn" data-add-space="${space.id}">
          <span class="space-add-icon">+</span>
          <span class="space-add-label">${space.label} 추가</span>
        </div>`;
      }
    });

    html += `</div>`;
    nav.innerHTML = html;

    // Navigation click (only active, non-excluded spaces navigate)
    nav.querySelectorAll('.space-item').forEach(el => {
      el.addEventListener('click', e => {
        if (e.target.closest('.space-toggle-btn, .space-remove-btn')) return;
        if (!el.classList.contains('space-excluded')) {
          NavigationManager.selectSpace(el.dataset.space);
        }
      });
    });

    // Toggle space activation (optional spaces)
    nav.querySelectorAll('.space-toggle-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const spaceId   = btn.dataset.toggleSpace;
        const nowActive = AppState.isSpaceActive(spaceId);
        AppState.setSpaceActivation(spaceId, !nowActive);
        if (nowActive && AppState.state.currentSpaceId === spaceId) {
          const first = AppState.getActiveSpaces()[0];
          if (first) NavigationManager.selectSpace(first.id);
        }
      });
    });

    // Remove instance button (instance 2+)
    nav.querySelectorAll('.space-remove-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const spaceId = btn.dataset.removeSpace;
        const num     = parseInt(btn.dataset.removeNum);
        AppState.removeSpaceInstance(spaceId, num);
      });
    });

    // Add instance button
    nav.querySelectorAll('.space-add-btn').forEach(el => {
      el.addEventListener('click', () => {
        const spaceId = el.dataset.addSpace;
        const added   = AppState.addSpaceInstance(spaceId);
        if (added) {
          const count = AppState.state.spaceInstances[spaceId] || 1;
          NavigationManager.selectSpace(`${spaceId}_${count}`);
        }
      });
    });

    updateGlobalProgress();
  }

  // Build one space nav row
  function _buildSpaceItem(space, isVirtualInstance, isExcluded, isOptionalActive) {
    const currentSpaceId = AppState.state.currentSpaceId;
    const isActive       = space.id === currentSpaceId && !isExcluded;
    const complete       = !isExcluded && ProgressManager.isSpaceComplete(space.id);
    const { answered, total } = ProgressManager.getSpaceProgress(space.id);
    const progressText   = !isExcluded && total > 0 ? `${answered}/${total}` : '';

    let cls = 'space-item';
    if (isActive)           cls += ' active';
    if (complete)           cls += ' complete';
    if (isExcluded)         cls += ' space-excluded';
    if (isOptionalActive || space.optional) cls += ' space-optional';

    // Controls
    let controlBtn = '';
    if (isVirtualInstance) {
      // × remove button for instances 2+
      controlBtn = `<button class="space-remove-btn" data-remove-space="${space._instanceOf}" data-remove-num="${space._instanceNum}" title="이 공간 제거">×</button>`;
    } else if (isExcluded || isOptionalActive || space.optional) {
      // toggle button for optional spaces
      const nowActive = !isExcluded;
      controlBtn = `<button class="space-toggle-btn" data-toggle-space="${space.id}" title="${nowActive ? '이 공간 제외' : '이 공간 포함'}">${nowActive ? '−' : '+'}</button>`;
    }

    return `
      <div class="${cls}" data-space="${space.id}">
        <span class="space-icon">${space.icon}</span>
        <span class="space-label">${AppState.escapeHtml(space.label)}</span>
        ${progressText ? `<span class="space-progress">${progressText}</span>` : ''}
        ${controlBtn}
      </div>`;
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
    const isLastSection  = state.currentSectionIdx === sections.length - 1;
    const activeSpaces   = AppState.getActiveSpaces();
    const spaceIdx       = activeSpaces.findIndex(s => s.id === state.currentSpaceId);
    const isLastSpace    = spaceIdx === activeSpaces.length - 1;

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

    // Section progress (visible questions only)
    const secAnswered = ProgressManager.getSectionAnswerCount(curSec);
    const secTotal    = AppState.getVisibleQuestions(curSec).length;
    const secPct      = secTotal > 0 ? Math.round(secAnswered / secTotal * 100) : 0;

    // Footer nav labels
    const prevLabel = 'Prev';
    const nextLabel = (isLastSection && isLastSpace) ? 'Finish' : 'Next';
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
    updateGlobalProgress();
  }

  function updateGlobalProgress() {
    const fill = document.getElementById('globalProgressFill');
    const text = document.getElementById('globalProgressText');
    const count = document.getElementById('globalProgressCount');
    if (!fill || !text || !count) return;
    const { answered, total, pct } = ProgressManager.getOverallProgress();
    fill.style.width = `${pct}%`;
    text.textContent = `${pct}%`;
    count.textContent = `${answered} / ${total}`;
  }

  return {
    renderSpaceNav,
    updateSectionTabs,
    renderQuestionCanvas,
    updateGlobalProgress
  };
})();
