/* ============================================
   DESIGN INTERVIEW APP — app.js
   ============================================ */

(function () {
  'use strict';

  // ==========================================
  // STATE
  // ==========================================
  const DEFAULT_STATE = {
    projectName: '',
    spaceName: '',
    meetingDate: new Date().toLocaleDateString('ko-KR'),
    answers: {},          // { questionId: value }
    currentSpaceId: 'global',
    currentSectionIdx: 0
  };

  let state = Object.assign({}, DEFAULT_STATE);
  let saveTimer = null;

  // ==========================================
  // HELPERS — DATA ACCESS
  // ==========================================

  function getAllSpaces() {
    // global 먼저, 그다음 spaces
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

  // answered required / total required
  function getSpaceProgress(spaceId) {
    const space = getSpaceData(spaceId);
    if (!space) return { answered: 0, total: 0 };
    let total = 0, answered = 0;
    space.sections.forEach(sec => {
      sec.questions.forEach(q => {
        if (q.required) {
          total++;
          if (hasAnswer(q.id)) answered++;
        }
      });
    });
    return { answered, total };
  }

  function isSpaceComplete(spaceId) {
    const { answered, total } = getSpaceProgress(spaceId);
    return total > 0 && answered >= total;
  }

  function getSectionAnswerCount(section) {
    return section.questions.filter(q => hasAnswer(q.id)).length;
  }

  function getTotalAnswered() {
    let count = 0;
    const allQ = [];
    getAllSpaces().forEach(sp => sp.sections.forEach(sec => sec.questions.forEach(q => allQ.push(q))));
    allQ.forEach(q => { if (hasAnswer(q.id)) count++; });
    return count;
  }

  // ==========================================
  // STATE MUTATIONS
  // ==========================================

  function setAnswer(qId, value) {
    state.answers[qId] = value;
    scheduleSave();
    renderSummaryPanel();
    renderSpaceNav();
    // update section tabs (answered indicator)
    updateSectionTabs();
  }

  function setMeta(field, value) {
    state[field] = value;
    scheduleSave();
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

  // ==========================================
  // NAVIGATION
  // ==========================================

  function selectSpace(spaceId) {
    state.currentSpaceId = spaceId;
    state.currentSectionIdx = 0;
    renderSpaceNav();
    renderQuestionCanvas();
    // scroll canvas to top
    const canvas = document.getElementById('questionCanvas');
    if (canvas) canvas.scrollTop = 0;
  }

  function selectSection(idx) {
    state.currentSectionIdx = idx;
    renderQuestionCanvas();
    const canvas = document.getElementById('questionCanvas');
    if (canvas) canvas.scrollTop = 0;
  }

  function goNextSection() {
    const space = getCurrentSpace();
    if (!space) return;
    if (state.currentSectionIdx < space.sections.length - 1) {
      selectSection(state.currentSectionIdx + 1);
    } else {
      // move to next space
      const allSpaces = getAllSpaces();
      const idx = allSpaces.findIndex(s => s.id === state.currentSpaceId);
      if (idx < allSpaces.length - 1) {
        selectSpace(allSpaces[idx + 1].id);
      }
    }
  }

  function goPrevSection() {
    if (state.currentSectionIdx > 0) {
      selectSection(state.currentSectionIdx - 1);
    } else {
      const allSpaces = getAllSpaces();
      const idx = allSpaces.findIndex(s => s.id === state.currentSpaceId);
      if (idx > 0) {
        const prevSpace = allSpaces[idx - 1];
        state.currentSpaceId = prevSpace.id;
        state.currentSectionIdx = prevSpace.sections.length - 1;
        renderSpaceNav();
        renderQuestionCanvas();
      }
    }
  }

  // ==========================================
  // RENDER — SPACE NAV
  // ==========================================

  function renderSpaceNav() {
    const nav = document.getElementById('spaceNav');
    if (!nav) return;

    const allSpaces = getAllSpaces();
    let html = `<div class="nav-header">공간 선택</div><div class="space-list">`;

    allSpaces.forEach((space, i) => {
      const isActive = space.id === state.currentSpaceId;
      const complete = isSpaceComplete(space.id);
      const { answered, total } = getSpaceProgress(space.id);
      const progressText = total > 0 ? `${answered}/${total}` : '';

      let cls = 'space-item';
      if (isActive) cls += ' active';
      if (complete) cls += ' complete';

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
      el.addEventListener('click', () => selectSpace(el.dataset.space));
    });
  }

  // ==========================================
  // RENDER — SECTION TABS (UPDATE ONLY)
  // ==========================================

  function updateSectionTabs() {
    const space = getCurrentSpace();
    if (!space) return;
    document.querySelectorAll('.section-tab').forEach((tab, i) => {
      const sec = space.sections[i];
      if (!sec) return;
      const cnt = getSectionAnswerCount(sec);
      tab.classList.toggle('has-answers', cnt > 0);
    });
  }

  // ==========================================
  // RENDER — QUESTION CANVAS
  // ==========================================

  function renderQuestionCanvas() {
    const canvas = document.getElementById('questionCanvas');
    if (!canvas) return;

    const space = getCurrentSpace();
    if (!space) {
      canvas.innerHTML = `<div class="empty-state">공간을 선택해주세요</div>`;
      return;
    }

    const sections = space.sections;
    const curSec = sections[state.currentSectionIdx];
    const isLastSection = state.currentSectionIdx === sections.length - 1;
    const allSpaces = getAllSpaces();
    const spaceIdx = allSpaces.findIndex(s => s.id === state.currentSpaceId);
    const isLastSpace = spaceIdx === allSpaces.length - 1;

    // Section tabs
    let tabsHtml = sections.map((sec, i) => {
      const isActive = i === state.currentSectionIdx;
      const cnt = getSectionAnswerCount(sec);
      let cls = 'section-tab';
      if (isActive) cls += ' active';
      if (cnt > 0) cls += ' has-answers';
      return `<div class="${cls}" data-sec-idx="${i}">${sec.title}</div>`;
    }).join('');

    // Questions
    let questionsHtml = curSec.questions.map(q => renderQuestion(q)).join('');

    // Footer nav
    const prevLabel = '← 이전';
    let nextLabel = (isLastSection && isLastSpace) ? '완료' : (isLastSection ? `다음 공간 →` : '다음 →');

    canvas.innerHTML = `
      <div class="canvas-section-header">${tabsHtml}</div>
      <div class="canvas-body">${questionsHtml}</div>
      <div class="canvas-footer">
        <button class="nav-btn" id="btnPrev" ${state.currentSectionIdx === 0 && spaceIdx === 0 ? 'disabled' : ''}>${prevLabel}</button>
        <button class="nav-btn primary" id="btnNext">${nextLabel}</button>
        <span class="canvas-progress-text">${getTotalAnswered()}개 답변 완료</span>
      </div>`;

    // Section tab events
    canvas.querySelectorAll('.section-tab').forEach(tab => {
      tab.addEventListener('click', () => selectSection(parseInt(tab.dataset.secIdx)));
    });

    // Nav button events
    const btnPrev = canvas.querySelector('#btnPrev');
    const btnNext = canvas.querySelector('#btnNext');
    if (btnPrev) btnPrev.addEventListener('click', goPrevSection);
    if (btnNext) btnNext.addEventListener('click', goNextSection);

    // Option button events
    bindQuestionEvents(canvas);
  }

  // ==========================================
  // RENDER — INDIVIDUAL QUESTION
  // ==========================================

  function renderQuestion(q) {
    const answered = hasAnswer(q.id);
    const unansweredClass = q.required && !answered ? ' question-unanswered' : '';
    const requiredDot = q.required ? `<span class="question-required">●</span>` : '';

    let inputHtml = '';
    switch (q.type) {
      case 'single-choice':
        inputHtml = renderSingleChoice(q);
        break;
      case 'multi-choice':
        inputHtml = renderMultiChoice(q);
        break;
      case 'tag':
        inputHtml = renderTag(q);
        break;
      case 'short-text':
        inputHtml = renderShortText(q);
        break;
      case 'priority':
        inputHtml = renderPriority(q);
        break;
      default:
        inputHtml = `<div style="color:#444;font-size:12px">알 수 없는 타입: ${q.type}</div>`;
    }

    return `
      <div class="question-block${unansweredClass}" data-qid="${q.id}">
        <div class="question-label">${requiredDot}${escapeHtml(q.label)}</div>
        ${inputHtml}
      </div>`;
  }

  function renderSingleChoice(q) {
    const current = getAnswer(q.id);
    const btns = q.options.map(opt => {
      const sel = current === opt ? ' selected' : '';
      return `<button class="opt-btn${sel}" data-qid="${q.id}" data-type="single" data-val="${escapeAttr(opt)}">${escapeHtml(opt)}</button>`;
    }).join('');
    return `<div class="options-wrap">${btns}</div>`;
  }

  function renderMultiChoice(q) {
    const current = getAnswer(q.id) || [];
    const btns = q.options.map(opt => {
      const sel = current.includes(opt) ? ' selected' : '';
      return `<button class="opt-btn${sel}" data-qid="${q.id}" data-type="multi" data-val="${escapeAttr(opt)}">${escapeHtml(opt)}</button>`;
    }).join('');
    return `<div class="options-wrap">${btns}</div>`;
  }

  function renderTag(q) {
    const current = getAnswer(q.id) || [];
    const btns = q.options.map(opt => {
      const sel = current.includes(opt) ? ' selected' : '';
      return `<button class="opt-btn${sel}" data-qid="${q.id}" data-type="tag" data-val="${escapeAttr(opt)}">${escapeHtml(opt)}</button>`;
    }).join('');
    return `<div class="options-wrap tag-type">${btns}</div>`;
  }

  function renderShortText(q) {
    const current = getAnswer(q.id) || '';
    const placeholder = q.placeholder || '자유 입력...';
    return `<textarea
      class="short-text-input"
      data-qid="${q.id}"
      rows="2"
      placeholder="${escapeAttr(placeholder)}"
    >${escapeHtml(current)}</textarea>`;
  }

  function renderPriority(q) {
    const current = getAnswer(q.id) || [];   // ordered array
    const maxSelect = q.maxSelect || q.options.length;
    const btns = q.options.map(opt => {
      const rankIdx = current.indexOf(opt);
      const isRanked = rankIdx !== -1;
      const rankNum = rankIdx + 1;
      const rankedClass = isRanked ? ' ranked' : '';
      const badge = isRanked ? `<span class="rank-badge">${rankNum}</span>` : '';
      return `<button class="priority-btn${rankedClass}" data-qid="${q.id}" data-type="priority" data-val="${escapeAttr(opt)}" data-max="${maxSelect}">${badge}${escapeHtml(opt)}</button>`;
    }).join('');
    return `<div class="priority-wrap">${btns}</div>`;
  }

  // ==========================================
  // BIND QUESTION EVENTS
  // ==========================================

  function bindQuestionEvents(container) {
    // Single / multi / tag — click handlers
    container.querySelectorAll('.opt-btn, .priority-btn').forEach(btn => {
      btn.addEventListener('click', handleOptionClick);
    });

    // Short text — blur to save
    container.querySelectorAll('.short-text-input').forEach(input => {
      input.addEventListener('input', () => {
        // live save with debounce
        clearTimeout(input._timer);
        input._timer = setTimeout(() => {
          setAnswer(input.dataset.qid, input.value);
        }, 600);
      });
      input.addEventListener('blur', () => {
        clearTimeout(input._timer);
        setAnswer(input.dataset.qid, input.value);
      });
    });
  }

  function handleOptionClick(e) {
    const btn = e.currentTarget;
    const { qid, type, val } = btn.dataset;

    if (type === 'single') {
      const current = getAnswer(qid);
      // toggle off if same
      setAnswer(qid, current === val ? null : val);
      // re-render only this question block
      rerenderQuestion(qid);

    } else if (type === 'multi' || type === 'tag') {
      const current = (getAnswer(qid) || []).slice();
      const idx = current.indexOf(val);
      if (idx === -1) current.push(val);
      else current.splice(idx, 1);
      setAnswer(qid, current);
      rerenderQuestion(qid);

    } else if (type === 'priority') {
      const max = parseInt(btn.dataset.max) || 99;
      const current = (getAnswer(qid) || []).slice();
      const idx = current.indexOf(val);
      if (idx !== -1) {
        current.splice(idx, 1);  // remove → derank
      } else if (current.length < max) {
        current.push(val);       // add to end of rank list
      }
      setAnswer(qid, current);
      rerenderQuestion(qid);
    }
  }

  function rerenderQuestion(qid) {
    const block = document.querySelector(`.question-block[data-qid="${qid}"]`);
    if (!block) return;

    // find question data
    let qData = null;
    getAllSpaces().forEach(sp => sp.sections.forEach(sec => {
      sec.questions.forEach(q => { if (q.id === qid) qData = q; });
    }));
    if (!qData) return;

    const newHtml = renderQuestion(qData);
    const tmp = document.createElement('div');
    tmp.innerHTML = newHtml;
    const newBlock = tmp.firstElementChild;
    block.replaceWith(newBlock);

    // re-bind events on the new block
    bindQuestionEvents(newBlock.closest('.canvas-body') || document.getElementById('questionCanvas'));

    // update footer progress
    const progEl = document.querySelector('.canvas-progress-text');
    if (progEl) progEl.textContent = `${getTotalAnswered()}개 답변 완료`;
  }

  // ==========================================
  // RENDER — SUMMARY PANEL (개선판)
  // ==========================================

  function renderSummaryPanel() {
    const panel = document.getElementById('summaryPanel');
    if (!panel) return;

    const answers = state.answers;
    let bodyHtml = '';

    // ── 전체 선호도 (global) compact block
    const gRows = SummaryBuilder.panelRows(INTERVIEW_DATA.globalPreferences, answers);
    if (gRows.must.length || gRows.nice.length || gRows.notes.length) {
      const isCurrent = state.currentSpaceId === 'global';
      bodyHtml += buildPanelSpaceBlock(INTERVIEW_DATA.globalPreferences, gRows, isCurrent);
    }

    // ── 공간별 blocks (답변 있는 공간만)
    INTERVIEW_DATA.spaces.forEach(space => {
      const rows = SummaryBuilder.panelRows(space, answers);
      if (!rows.must.length && !rows.nice.length && !rows.notes.length) return;
      const isCurrent = state.currentSpaceId === space.id;
      bodyHtml += buildPanelSpaceBlock(space, rows, isCurrent);
    });

    if (!bodyHtml) {
      bodyHtml = `<div class="summary-empty-state">답변을 입력하면<br>여기에 요약됩니다</div>`;
    }

    // ── 특별 섹션 (pain / no / follow-up)
    const sp = SummaryBuilder.specialSections(answers);
    const hasSpecial = sp.painPoints || sp.absoluteNo || sp.followUp || sp.allergy;
    if (hasSpecial) {
      bodyHtml += buildPanelSpecialBlock(sp);
    }

    // ── 키워드
    const kw = SummaryBuilder.collectKeywords(answers);
    if (kw.length) {
      bodyHtml += `
        <div class="summary-keywords-block">
          <div class="summary-keywords-title">전체 키워드</div>
          <div class="keyword-tags">
            ${kw.map(k => `<span class="keyword-tag">#${escapeHtml(k)}</span>`).join('')}
          </div>
        </div>`;
    }

    panel.innerHTML = `
      <div class="summary-header">
        실시간 요약
        <span class="summary-total-count">${getTotalAnswered()}개</span>
      </div>
      <div class="summary-body">${bodyHtml}</div>
      <div class="summary-footer">
        <button class="summary-copy-btn" id="btnSummaryCopy">📋 회의록 복사</button>
      </div>`;

    panel.querySelectorAll('[data-goto-space]').forEach(el => {
      el.addEventListener('click', () => selectSpace(el.dataset.gotoSpace));
    });
    panel.querySelector('#btnSummaryCopy').addEventListener('click', () => {
      copyToClipboard(buildMarkdown());
      showToast('회의록이 복사되었습니다');
    });
  }

  function buildPanelSpaceBlock(space, rows, isCurrent) {
    const titleCls = `summary-space-title${isCurrent ? ' current' : ''}`;
    let html = `<div class="summary-space-block">
      <div class="${titleCls}" data-goto-space="${space.id}">${space.icon} ${space.label}</div>`;

    if (rows.must.length) {
      html += `<div class="summary-tier-label must">MUST</div>`;
      rows.must.forEach(r => {
        html += `<div class="summary-row must" data-goto-space="${space.id}">
          <span class="summary-key">${escapeHtml(r.label)}</span>
          <span class="summary-value must-val">${escapeHtml(r.val)}</span>
        </div>`;
      });
    }
    if (rows.nice.length) {
      html += `<div class="summary-tier-label nice">NICE</div>`;
      rows.nice.forEach(r => {
        html += `<div class="summary-row" data-goto-space="${space.id}">
          <span class="summary-key">${escapeHtml(r.label)}</span>
          <span class="summary-value">${escapeHtml(r.val)}</span>
        </div>`;
      });
    }
    if (rows.notes.length) {
      rows.notes.forEach(r => {
        html += `<div class="summary-note-text">${escapeHtml(r.val)}</div>`;
      });
    }

    html += `</div>`;
    return html;
  }

  function buildPanelSpecialBlock(sp) {
    let html = `<div class="summary-special-block">
      <div class="summary-special-title">⚠️ 주의사항</div>`;

    if (sp.allergy)     html += `<div class="summary-special-row danger">🚫 알레르기: ${escapeHtml(sp.allergy)}</div>`;
    if (sp.absoluteNo)  html += `<div class="summary-special-row danger">🚫 절대 No: ${escapeHtml(sp.absoluteNo)}</div>`;
    if (sp.painPoints)  html += `<div class="summary-special-row warn">💢 Pain: ${escapeHtml(sp.painPoints)}</div>`;
    if (sp.followUp)    html += `<div class="summary-special-row">🔍 검토: ${escapeHtml(sp.followUp)}</div>`;

    html += `</div>`;
    return html;
  }

  // ==========================================
  // EXPORT  (SummaryBuilder 위임)
  // ==========================================

  function buildMarkdown() {
    return SummaryBuilder.buildMarkdown(state);
  }

  function buildJSONExport() {
    return SummaryBuilder.buildJSON(state);
  }

  function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function copyToClipboard(text) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }

  // ==========================================
  // TOAST
  // ==========================================

  function showToast(msg) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2000);
  }

  // ==========================================
  // ESCAPE HELPERS
  // ==========================================

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeAttr(str) {
    return escapeHtml(str);
  }

  // ==========================================
  // HEADER — EDITABLE FIELDS
  // ==========================================

  function initHeader() {
    const fields = document.querySelectorAll('.meta-field[contenteditable]');
    fields.forEach(field => {
      const key = field.dataset.field;

      // Set initial value
      if (state[key]) {
        field.textContent = state[key];
      }

      field.addEventListener('input', () => {
        setMeta(key, field.textContent.trim());
      });

      field.addEventListener('blur', () => {
        const val = field.textContent.trim();
        if (!val) {
          field.textContent = '';  // show placeholder via CSS
        }
        setMeta(key, val);
      });

      // Prevent newlines in contenteditable
      field.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          field.blur();
        }
      });
    });
  }

  // ==========================================
  // HEADER BUTTON EVENTS
  // ==========================================

  function initHeaderButtons() {
    document.getElementById('btnCopy').addEventListener('click', () => {
      copyToClipboard(buildMarkdown());
      showToast('회의록이 복사되었습니다');
    });

    document.getElementById('btnMarkdown').addEventListener('click', () => {
      const name = (state.projectName || 'interview').replace(/\s+/g, '_');
      downloadFile(buildMarkdown(), `${name}_interview.md`, 'text/markdown;charset=utf-8');
      showToast('Markdown 다운로드');
    });

    document.getElementById('btnTelegram').addEventListener('click', sendToTelegram);
    document.getElementById('btnSettings').addEventListener('click', openSettings);
    document.getElementById('btnNewClient').addEventListener('click', openNewClientConfirm);
  }

  // ==========================================
  // TELEGRAM
  // ==========================================

  async function sendToTelegram() {
    const cfg = InterviewStorage.loadConfig();
    if (!cfg.botToken || !cfg.chatId) {
      openSettings();
      showToast('먼저 텔레그램 설정을 입력해주세요');
      return;
    }

    const btn = document.getElementById('btnTelegram');
    btn.disabled = true;
    btn.classList.add('sending');
    btn.textContent = '전송 중...';

    try {
      // ① 요약 텍스트 메시지 (HTML 포맷)
      await tgSendMessage(cfg, buildTelegramCard());

      // ② 전체 회의록 .md 파일 첨부
      const name = (state.projectName || 'interview').replace(/\s+/g, '_');
      const md   = buildMarkdown();
      await tgSendDocument(cfg, md, `${name}_interview.md`,
        `📎 ${state.projectName || '고객'} 전체 회의록`);

      showToast('텔레그램 전송 완료 ✓');
    } catch (err) {
      console.error('[Telegram] 전송 실패', err);
      showToast('전송 실패 — 설정을 확인해주세요');
    } finally {
      btn.disabled = false;
      btn.classList.remove('sending');
      btn.textContent = '전송';
    }
  }

  // 텔레그램 알림 카드 (HTML 포맷, 핵심만)
  function buildTelegramCard() {
    const answers = state.answers;
    const sp = SummaryBuilder.specialSections(answers);
    const kw = SummaryBuilder.collectKeywords(answers);

    const style    = answers['g-style-direction'];
    const color    = answers['g-color-tone'];
    const priority = answers['g-priority-value'];

    const lines = [];
    lines.push(`📋 <b>1차 디자인 인터뷰</b>`);
    lines.push(`👤 고객: <b>${esc(state.projectName || '(미입력)')}</b>`);
    if (state.spaceName)   lines.push(`🏠 공간: ${esc(state.spaceName)}`);
    if (state.meetingDate) lines.push(`📅 일자: ${esc(state.meetingDate)}`);
    lines.push('');

    if (style && style.length)
      lines.push(`<b>스타일:</b> ${esc([].concat(style).join(', '))}`);
    if (color)
      lines.push(`<b>색감:</b> ${esc(color)}`);
    if (priority && priority.length)
      lines.push(`<b>핵심 가치:</b> ${esc(priority.join(' → '))}`);

    if (sp.absoluteNo) {
      lines.push('');
      lines.push(`🚫 <b>Absolute No:</b> ${esc(sp.absoluteNo.replace(/\n/g, ' / '))}`);
    }
    if (sp.painPoints) {
      lines.push(`💢 <b>Pain Point:</b> ${esc(sp.painPoints.replace(/\n/g, ' / '))}`);
    }
    if (sp.followUp) {
      lines.push('');
      lines.push(`🔍 <b>후속 검토:</b>`);
      sp.followUp.split('\n').filter(Boolean).forEach(l => lines.push(`  • ${esc(l)}`));
    }

    lines.push('');
    lines.push(`🏷 ${kw.slice(0, 8).map(k => '#' + k.replace(/\s/g, '_')).join(' ')}`);
    lines.push('');
    lines.push(`📎 전체 회의록 파일 첨부`);

    return lines.join('\n');
  }

  function esc(str) {
    // HTML 엔티티 이스케이프 (텔레그램 HTML 모드용)
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  async function tgSendMessage(cfg, html) {
    const res = await fetch(
      `https://api.telegram.org/bot${cfg.botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id:    cfg.chatId,
        text:       html,
        parse_mode: 'HTML'
      })
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.description || `HTTP ${res.status}`);
    }
    return res.json();
  }

  async function tgSendDocument(cfg, content, filename, caption) {
    const blob = new Blob([content], { type: 'text/plain' });
    const form = new FormData();
    form.append('chat_id', cfg.chatId);
    form.append('document', blob, filename);
    if (caption) form.append('caption', caption);

    const res = await fetch(
      `https://api.telegram.org/bot${cfg.botToken}/sendDocument`, {
      method: 'POST',
      body: form
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.description || `HTTP ${res.status}`);
    }
    return res.json();
  }

  // ==========================================
  // SETTINGS MODAL
  // ==========================================

  function openSettings() {
    const cfg = InterviewStorage.loadConfig();
    document.getElementById('inputBotToken').value = cfg.botToken || '';
    document.getElementById('inputChatId').value   = cfg.chatId  || '';
    document.getElementById('settingsOverlay').classList.add('open');
  }

  function closeSettings() {
    document.getElementById('settingsOverlay').classList.remove('open');
  }

  function initSettingsModal() {
    document.getElementById('btnCloseSettings').addEventListener('click', closeSettings);
    document.getElementById('settingsOverlay').addEventListener('click', e => {
      if (e.target === e.currentTarget) closeSettings();
    });

    document.getElementById('btnSaveSettings').addEventListener('click', () => {
      const token = document.getElementById('inputBotToken').value.trim();
      const chatId = document.getElementById('inputChatId').value.trim();
      InterviewStorage.saveConfig({ botToken: token, chatId });
      showToast('설정이 저장되었습니다');
      closeSettings();
    });

    document.getElementById('btnTestTelegram').addEventListener('click', async () => {
      const token  = document.getElementById('inputBotToken').value.trim();
      const chatId = document.getElementById('inputChatId').value.trim();
      if (!token || !chatId) {
        showToast('Bot Token과 Chat ID를 입력해주세요');
        return;
      }
      const btn = document.getElementById('btnTestTelegram');
      btn.disabled = true;
      btn.textContent = '테스트 중...';
      try {
        await tgSendMessage({ botToken: token, chatId },
          '✅ <b>DASIFILL 디자인 인터뷰 앱</b>\n연결이 정상 확인되었습니다.');
        showToast('테스트 메시지 전송 성공 ✓');
      } catch (err) {
        showToast(`연결 실패: ${err.message}`);
      } finally {
        btn.disabled = false;
        btn.textContent = '연결 테스트';
      }
    });
  }

  // ==========================================
  // 새 고객 시작
  // ==========================================

  function openNewClientConfirm() {
    const name = state.projectName || '현재 고객';
    document.getElementById('currentClientName').textContent = name;
    document.getElementById('newClientOverlay').classList.add('open');
  }

  function closeNewClientConfirm() {
    document.getElementById('newClientOverlay').classList.remove('open');
  }

  function initNewClientModal() {
    document.getElementById('btnCloseNewClient').addEventListener('click', closeNewClientConfirm);
    document.getElementById('btnCancelNewClient').addEventListener('click', closeNewClientConfirm);
    document.getElementById('newClientOverlay').addEventListener('click', e => {
      if (e.target === e.currentTarget) closeNewClientConfirm();
    });

    document.getElementById('btnConfirmNewClient').addEventListener('click', () => {
      // 현재 세션이 있으면 영구 보관
      if (state.projectName || getTotalAnswered() > 0) {
        InterviewStorage.archiveClient(state);
      }

      // 상태 초기화
      state = Object.assign({}, DEFAULT_STATE, {
        meetingDate: new Date().toLocaleDateString('ko-KR')
      });
      InterviewStorage.save(state);

      // 헤더 필드 초기화
      ['projectName', 'spaceName', 'meetingDate'].forEach(field => {
        const el = document.getElementById(
          field === 'projectName' ? 'fieldProjectName'
          : field === 'spaceName' ? 'fieldSpaceName'
          : 'fieldMeetingDate'
        );
        if (el) el.textContent = field === 'meetingDate' ? state.meetingDate : '';
      });

      closeNewClientConfirm();
      renderSpaceNav();
      renderQuestionCanvas();
      renderSummaryPanel();
      showToast('새 고객 인터뷰를 시작합니다');
    });
  }

  // ==========================================
  // INIT
  // ==========================================

  function init() {
    const saved = InterviewStorage.load();
    if (saved) {
      state = Object.assign({}, DEFAULT_STATE, saved);
    }

    initHeader();
    initHeaderButtons();
    initSettingsModal();
    initNewClientModal();
    renderSpaceNav();
    renderQuestionCanvas();
    renderSummaryPanel();
  }

  // Boot on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
