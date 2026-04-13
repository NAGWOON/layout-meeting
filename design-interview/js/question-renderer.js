/* ============================================
   QUESTION RENDERER — QuestionRenderer
   Individual question HTML rendering +
   event binding + option click handling
   ============================================ */

const QuestionRenderer = (function () {
  'use strict';

  // ── Render question block ─────────────────────

  function renderQuestion(q) {
    // Branch logic: if showIf condition is false, render a hidden placeholder.
    // The element is kept in the DOM so re-evaluation on answer change works.
    if (q.showIf && !AppState.evaluateCondition(q.showIf)) {
      return `<div class="question-block question-conditional-hidden" data-qid="${AppState.escapeAttr(q.id)}" aria-hidden="true"></div>`;
    }

    const answered = AppState.hasAnswer(q.id);
    const unansweredClass = q.required && !answered ? ' question-unanswered' : '';
    const requiredDot = q.required ? `<span class="question-required">●</span>` : '';

    let inputHtml = '';
    switch (q.type) {
      case 'single-choice':  inputHtml = renderSingleChoice(q); break;
      case 'multi-choice':   inputHtml = renderMultiChoice(q);  break;
      case 'tag':            inputHtml = renderTag(q);           break;
      case 'short-text':     inputHtml = renderShortText(q);     break;
      case 'priority':       inputHtml = renderPriority(q);      break;
      default:
        inputHtml = `<div style="color:#444;font-size:12px">알 수 없는 타입: ${q.type}</div>`;
    }

    return `
      <div class="question-block${unansweredClass}" data-qid="${q.id}">
        <div class="question-label">${requiredDot}${AppState.escapeHtml(q.label)}</div>
        ${inputHtml}
      </div>`;
  }

  function renderSingleChoice(q) {
    const current = AppState.getAnswer(q.id);
    const btns = q.options.map((opt, i) => {
      const sel = current === opt ? ' selected' : '';
      const num = i < 9 ? ` data-num="${i + 1}"` : '';
      return `<button class="opt-btn${sel}" data-qid="${q.id}" data-type="single" data-val="${AppState.escapeAttr(opt)}"${num}>${AppState.escapeHtml(opt)}</button>`;
    }).join('');
    return `<div class="options-wrap">${btns}</div>`;
  }

  function renderMultiChoice(q) {
    const current = AppState.getAnswer(q.id) || [];
    const btns = q.options.map((opt, i) => {
      const sel = current.includes(opt) ? ' selected' : '';
      const num = i < 9 ? ` data-num="${i + 1}"` : '';
      return `<button class="opt-btn${sel}" data-qid="${q.id}" data-type="multi" data-val="${AppState.escapeAttr(opt)}"${num}>${AppState.escapeHtml(opt)}</button>`;
    }).join('');
    return `<div class="options-wrap">${btns}</div>`;
  }

  function renderTag(q) {
    const current = AppState.getAnswer(q.id) || [];
    const btns = q.options.map((opt, i) => {
      const sel = current.includes(opt) ? ' selected' : '';
      const num = i < 9 ? ` data-num="${i + 1}"` : '';
      return `<button class="opt-btn${sel}" data-qid="${q.id}" data-type="tag" data-val="${AppState.escapeAttr(opt)}"${num}>${AppState.escapeHtml(opt)}</button>`;
    }).join('');
    return `<div class="options-wrap tag-type">${btns}</div>`;
  }

  function renderShortText(q) {
    const current = AppState.getAnswer(q.id) || '';
    const placeholder = q.placeholder || '자유 입력...';
    return `<textarea
      class="short-text-input"
      data-qid="${q.id}"
      rows="2"
      placeholder="${AppState.escapeAttr(placeholder)}"
    >${AppState.escapeHtml(current)}</textarea>`;
  }

  function renderPriority(q) {
    const current = AppState.getAnswer(q.id) || [];
    const maxSelect = q.maxSelect || q.options.length;
    const btns = q.options.map(opt => {
      const rankIdx = current.indexOf(opt);
      const isRanked  = rankIdx !== -1;
      const rankedClass = isRanked ? ' ranked' : '';
      const badge = isRanked ? `<span class="rank-badge">${rankIdx + 1}</span>` : '';
      return `<button class="priority-btn${rankedClass}" data-qid="${q.id}" data-type="priority" data-val="${AppState.escapeAttr(opt)}" data-max="${maxSelect}">${badge}${AppState.escapeHtml(opt)}</button>`;
    }).join('');
    return `<div class="priority-wrap">${btns}</div>`;
  }

  // ── Event binding ─────────────────────────────

  function bindQuestionEvents(container) {
    // Question block click → focus
    container.querySelectorAll('.question-block').forEach(block => {
      block.addEventListener('mousedown', () =>
        NavigationManager.setFocusedQuestion(block.dataset.qid)
      );
    });

    // Option / priority buttons
    container.querySelectorAll('.opt-btn, .priority-btn').forEach(btn => {
      btn.addEventListener('click', handleOptionClick);
    });

    // Short text — debounced live save + blur save
    container.querySelectorAll('.short-text-input').forEach(input => {
      input.addEventListener('input', () => {
        clearTimeout(input._timer);
        input._timer = setTimeout(() => {
          AppState.setAnswer(input.dataset.qid, input.value);
        }, 600);
      });
      input.addEventListener('blur', () => {
        clearTimeout(input._timer);
        AppState.setAnswer(input.dataset.qid, input.value);
      });
    });
  }

  function handleOptionClick(e) {
    const btn = e.currentTarget;
    const { qid, type, val } = btn.dataset;

    if (type === 'single') {
      const current = AppState.getAnswer(qid);
      AppState.setAnswer(qid, current === val ? null : val);
      rerenderQuestion(qid);
      rerenderConditionalSiblings(qid);   // update showIf-dependent questions
      NavigationManager.flashAnswered(qid);
      if (current !== val) setTimeout(() => NavigationManager.focusNextQuestion(qid, 1), 220);
      else setTimeout(() => NavigationManager.setFocusedQuestion(qid), 10);

    } else if (type === 'multi' || type === 'tag') {
      const current = (AppState.getAnswer(qid) || []).slice();
      const idx = current.indexOf(val);
      if (idx === -1) current.push(val);
      else current.splice(idx, 1);
      AppState.setAnswer(qid, current);
      rerenderQuestion(qid);
      rerenderConditionalSiblings(qid);   // update showIf-dependent questions
      NavigationManager.flashAnswered(qid);

    } else if (type === 'priority') {
      const max = parseInt(btn.dataset.max) || 99;
      const current = (AppState.getAnswer(qid) || []).slice();
      const idx = current.indexOf(val);
      if (idx !== -1) current.splice(idx, 1);
      else if (current.length < max) current.push(val);
      AppState.setAnswer(qid, current);
      rerenderQuestion(qid);
    }
  }

  function rerenderQuestion(qid) {
    const block = document.querySelector(`.question-block[data-qid="${qid}"]`);
    if (!block) return;

    let qData = null;
    AppState.getActiveSpaces().forEach(sp =>
      sp.sections.forEach(sec =>
        sec.questions.forEach(q => { if (q.id === qid) qData = q; })
      )
    );
    if (!qData) return;

    const newHtml = renderQuestion(qData);
    const tmp = document.createElement('div');
    tmp.innerHTML = newHtml;
    const newBlock = tmp.firstElementChild;
    block.replaceWith(newBlock);

    // Re-bind events
    bindQuestionEvents(newBlock.closest('.canvas-body') || document.getElementById('questionCanvas'));

    // Restore focus class
    if (AppState.getFocusedQId() === qid) newBlock.classList.add('focused');

    // Update footer progress counter
    const progEl = document.querySelector('.canvas-progress-text');
    if (progEl) progEl.textContent = `${ProgressManager.getTotalAnswered()}개 답변 완료`;
  }

  // Re-render any questions in the current section whose showIf references the changed qId.
  // This makes conditional questions appear/disappear immediately on answer change.
  function rerenderConditionalSiblings(changedQId) {
    const section = AppState.getCurrentSection();
    if (!section) return;
    section.questions.forEach(q => {
      if (!q.showIf) return;
      if (q.id === changedQId) return;
      if (_conditionReferencesQId(q.showIf, changedQId)) rerenderQuestion(q.id);
    });
  }

  // Recursively checks if a condition tree references a specific question ID
  function _conditionReferencesQId(cond, qId) {
    if (!cond) return false;
    if (cond.all) return cond.all.some(c => _conditionReferencesQId(c, qId));
    if (cond.any) return cond.any.some(c => _conditionReferencesQId(c, qId));
    if (cond.not) return _conditionReferencesQId(cond.not, qId);
    return cond.qId === qId;
  }

  return {
    renderQuestion,
    bindQuestionEvents,
    handleOptionClick,
    rerenderQuestion,
    rerenderConditionalSiblings
  };
})();
