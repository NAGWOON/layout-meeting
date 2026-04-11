/* ============================================
   SUMMARY MANAGER — SummaryManager
   Summary panel rendering + markdown/JSON export
   + clipboard + file download
   ============================================ */

const SummaryManager = (function () {
  'use strict';

  // ── Summary panel ─────────────────────────────

  function renderSummaryPanel() {
    const panel = document.getElementById('summaryPanel');
    if (!panel) return;

    const answers = AppState.state.answers;
    let bodyHtml = '';

    // Global preferences block
    const gRows = SummaryBuilder.panelRows(INTERVIEW_DATA.globalPreferences, answers);
    if (gRows.must.length || gRows.nice.length || gRows.notes.length) {
      const isCurrent = AppState.state.currentSpaceId === 'global';
      bodyHtml += buildPanelSpaceBlock(INTERVIEW_DATA.globalPreferences, gRows, isCurrent);
    }

    // Per-space blocks (only spaces with answers)
    INTERVIEW_DATA.spaces.forEach(space => {
      const rows = SummaryBuilder.panelRows(space, answers);
      if (!rows.must.length && !rows.nice.length && !rows.notes.length) return;
      const isCurrent = AppState.state.currentSpaceId === space.id;
      bodyHtml += buildPanelSpaceBlock(space, rows, isCurrent);
    });

    if (!bodyHtml) {
      bodyHtml = `<div class="summary-empty-state">답변을 입력하면<br>여기에 요약됩니다</div>`;
    }

    // Special sections (pain / no / follow-up)
    const sp = SummaryBuilder.specialSections(answers);
    const hasSpecial = sp.painPoints || sp.absoluteNo || sp.followUp || sp.allergy;
    if (hasSpecial) bodyHtml += buildPanelSpecialBlock(sp);

    // Keywords
    const kw = SummaryBuilder.collectKeywords(answers);
    if (kw.length) {
      bodyHtml += `
        <div class="summary-keywords-block">
          <div class="summary-keywords-title">전체 키워드</div>
          <div class="keyword-tags">
            ${kw.map(k => `<span class="keyword-tag">#${AppState.escapeHtml(k)}</span>`).join('')}
          </div>
        </div>`;
    }

    panel.innerHTML = `
      <div class="summary-header">
        실시간 요약
        <span class="summary-total-count">${ProgressManager.getTotalAnswered()}개</span>
      </div>
      <div class="summary-body">${bodyHtml}</div>
      <div class="summary-footer">
        <button class="summary-copy-btn" id="btnSummaryCopy">📋 회의록 복사</button>
      </div>`;

    panel.querySelectorAll('[data-goto-space]').forEach(el => {
      el.addEventListener('click', () => NavigationManager.selectSpace(el.dataset.gotoSpace));
    });
    panel.querySelector('#btnSummaryCopy').addEventListener('click', () => {
      copyToClipboard(buildMarkdown());
      AppState.showToast('회의록이 복사되었습니다');
    });
  }

  function buildPanelSpaceBlock(space, rows, isCurrent) {
    const { badge } = SummaryBuilder.spaceStatus(space, AppState.state.answers);
    const titleCls = `summary-space-title${isCurrent ? ' current' : ''}`;

    let html = `<div class="summary-space-block">
      <div class="${titleCls}" data-goto-space="${space.id}">
        ${space.icon} ${space.label}
        <span class="space-status-badge">${AppState.escapeHtml(badge)}</span>
      </div>`;

    if (rows.must.length) {
      html += `<div class="summary-tier-label must">MUST</div>`;
      rows.must.forEach(r => {
        const valHtml = r.isPriority
          ? r.val.split('  ').map(v => `<span class="rank-item">${AppState.escapeHtml(v)}</span>`).join('')
          : AppState.escapeHtml(r.val);
        html += `<div class="summary-row must" data-goto-space="${space.id}">
          <span class="summary-key">${AppState.escapeHtml(r.label)}</span>
          <span class="summary-value must-val${r.isPriority ? ' priority-val' : ''}">${valHtml}</span>
        </div>`;
      });
    }
    if (rows.nice.length) {
      html += `<div class="summary-tier-label nice">NICE</div>`;
      rows.nice.forEach(r => {
        const valHtml = r.isPriority
          ? r.val.split('  ').map(v => `<span class="rank-item">${AppState.escapeHtml(v)}</span>`).join('')
          : AppState.escapeHtml(r.val);
        html += `<div class="summary-row" data-goto-space="${space.id}">
          <span class="summary-key">${AppState.escapeHtml(r.label)}</span>
          <span class="summary-value${r.isPriority ? ' priority-val' : ''}">${valHtml}</span>
        </div>`;
      });
    }
    if (rows.notes.length) {
      rows.notes.forEach(n => {
        html += `<div class="summary-note-text">${AppState.escapeHtml(typeof n === 'string' ? n : n.val)}</div>`;
      });
    }
    if (rows.reason) {
      html += `<div class="summary-reason-tag">💬 ${AppState.escapeHtml(rows.reason)}</div>`;
    }

    html += `</div>`;
    return html;
  }

  function buildPanelSpecialBlock(sp) {
    let html = `<div class="summary-special-block">
      <div class="summary-special-title">⚠️ 주의사항</div>`;

    if (sp.allergy) {
      html += `<div class="summary-special-row danger">🚫 알레르기: ${AppState.escapeHtml(sp.allergy)}</div>`;
    }
    if (sp.absoluteNo) {
      SummaryBuilder._splitLines(sp.absoluteNo).forEach(l => {
        html += `<div class="summary-special-row danger">🚫 ${AppState.escapeHtml(l)}</div>`;
      });
    }
    if (sp.painPoints) {
      SummaryBuilder._splitLines(sp.painPoints).forEach(l => {
        html += `<div class="summary-special-row warn">💢 ${AppState.escapeHtml(l)}</div>`;
      });
    }
    if (sp.followUp) {
      html += `<div class="summary-special-row followup-header">🔍 후속 확인</div>`;
      SummaryBuilder._splitLines(sp.followUp).forEach((l, i) => {
        html += `<div class="summary-special-row followup-item">
          <span class="followup-num">#${String(i + 1).padStart(2, '0')}</span>
          ${AppState.escapeHtml(l)}
        </div>`;
      });
    }

    html += `</div>`;
    return html;
  }

  // ── Export helpers ────────────────────────────

  function buildMarkdown() {
    return SummaryBuilder.buildMarkdown(AppState.state);
  }

  function buildJSONExport() {
    return SummaryBuilder.buildJSON(AppState.state);
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
      navigator.clipboard.writeText(text).catch(() => _fallbackCopy(text));
    } else {
      _fallbackCopy(text);
    }
  }

  function _fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity  = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }

  return {
    renderSummaryPanel,
    buildMarkdown,
    buildJSONExport,
    downloadFile,
    copyToClipboard
  };
})();
