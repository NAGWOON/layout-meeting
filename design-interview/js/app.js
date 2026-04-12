/* ============================================
   APP — Orchestration only
   Header, Telegram, Modals, Init
   ============================================ */

(function () {
  'use strict';

  // ==========================================
  // PIN GATE — 접근 보호
  // ==========================================
  //
  // PIN 변경 방법:
  //   브라우저 콘솔에서 실행 →
  //   crypto.subtle.digest('SHA-256', new TextEncoder().encode('새PIN숫자'))
  //     .then(b => console.log([...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')))
  //   출력된 해시를 아래 PIN_HASH 에 붙여넣기.
  //
  //   현재 PIN: 1234
  const PIN_HASH   = '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4';
  const AUTH_KEY   = 'brief_v1_auth';

  let _pinAttempts    = 0;
  let _pinLockedUntil = 0;

  async function _hashPin(pin) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pin));
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  }

  function _showPinError(msg) {
    const el = document.getElementById('pinError');
    if (el) el.textContent = msg;
    const card = document.querySelector('.pin-gate-card');
    if (card) {
      card.classList.remove('shake');
      void card.offsetWidth; // reflow to restart animation
      card.classList.add('shake');
    }
  }

  function _clearPinDigits() {
    document.querySelectorAll('.pin-digit').forEach(d => { d.value = ''; });
    const first = document.querySelector('.pin-digit');
    if (first) first.focus();
  }

  function _unlockGate() {
    sessionStorage.setItem(AUTH_KEY, '1');
    const gate = document.getElementById('pinGate');
    if (gate) {
      gate.classList.add('dissolve');
      setTimeout(() => { gate.style.display = 'none'; }, 360);
    }
    init();
  }

  async function _verifyPin() {
    const now = Date.now();
    if (now < _pinLockedUntil) {
      const secs = Math.ceil((_pinLockedUntil - now) / 1000);
      _showPinError(`${secs}초 후 다시 시도해주세요`);
      return;
    }
    const digits = [...document.querySelectorAll('.pin-digit')].map(d => d.value).join('');
    if (digits.length < 4) return;
    const hash = await _hashPin(digits);
    if (hash === PIN_HASH) {
      _unlockGate();
    } else {
      _pinAttempts++;
      if (_pinAttempts >= 3) {
        _pinLockedUntil = Date.now() + 60_000;
        _pinAttempts = 0;
        _showPinError('잠시 후 다시 시도해주세요 (60초)');
      } else {
        _showPinError('코드가 올바르지 않습니다');
      }
      _clearPinDigits();
    }
  }

  function _initPinGate() {
    const digits = [...document.querySelectorAll('.pin-digit')];
    digits.forEach((digit, i) => {
      digit.addEventListener('input', () => {
        digit.value = digit.value.replace(/\D/g, '').slice(0, 1);
        if (digit.value && i < digits.length - 1) digits[i + 1].focus();
        if (digits.every(d => d.value)) _verifyPin();
      });
      digit.addEventListener('keydown', e => {
        if (e.key === 'Backspace' && !digit.value && i > 0) {
          digits[i - 1].value = '';
          digits[i - 1].focus();
        }
      });
      digit.addEventListener('paste', e => {
        e.preventDefault();
        const pasted = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 4);
        pasted.split('').forEach((ch, j) => { if (digits[j]) digits[j].value = ch; });
        if (pasted.length === 4) _verifyPin();
      });
    });
    if (digits[0]) digits[0].focus();
  }

  function boot() {
    if (sessionStorage.getItem(AUTH_KEY) === '1') {
      // 이미 이 세션에서 인증됨 — 게이트 즉시 숨김
      const gate = document.getElementById('pinGate');
      if (gate) gate.style.display = 'none';
      init();
    } else {
      _initPinGate();
    }
  }

  // ==========================================
  // HEADER — editable meta fields
  // ==========================================

  function initHeader() {
    const state = AppState.state;
    document.querySelectorAll('.meta-field[contenteditable]').forEach(field => {
      const key = field.dataset.field;

      if (state[key]) field.textContent = state[key];

      field.addEventListener('input', () => {
        AppState.setMeta(key, field.textContent.trim());
      });
      field.addEventListener('blur', () => {
        const val = field.textContent.trim();
        if (!val) field.textContent = '';
        AppState.setMeta(key, val);
      });
      field.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); field.blur(); }
      });
    });
  }

  // ==========================================
  // HEADER BUTTONS
  // ==========================================

  function initHeaderButtons() {
    document.getElementById('btnCopy').addEventListener('click', () => {
      SummaryManager.copyToClipboard(SummaryManager.buildMarkdown());
      AppState.showToast('회의록이 복사되었습니다');
    });

    document.getElementById('btnMarkdown').addEventListener('click', () => {
      const name = (AppState.state.projectName || 'interview').replace(/\s+/g, '_');
      SummaryManager.downloadFile(
        SummaryManager.buildMarkdown(),
        `${name}_interview.md`,
        'text/markdown;charset=utf-8'
      );
      AppState.showToast('Markdown 다운로드');
    });

    document.getElementById('btnTelegram').addEventListener('click', sendToTelegram);
    document.getElementById('btnSettings').addEventListener('click', openSettings);
    document.getElementById('btnNewClient').addEventListener('click', openNewClientConfirm);

    updateTelegramBtn();
  }

  function updateTelegramBtn() {
    const cfg = InterviewStorage.loadConfig();
    const btn = document.getElementById('btnTelegram');
    if (!btn) return;
    const configured = !!(cfg.botToken && cfg.chatId);
    btn.disabled     = !configured;
    btn.title        = configured ? '텔레그램으로 전송' : '텔레그램 설정이 필요합니다 (⚙ 클릭)';
    btn.style.opacity = configured ? '' : '0.4';
    btn.style.cursor  = configured ? '' : 'not-allowed';
  }

  // ==========================================
  // COMPLETION OVERLAY
  // ==========================================

  function showCompletionOverlay() {
    const name = AppState.state.projectName || '인터뷰';
    const overlay = document.createElement('div');
    overlay.className = 'completion-overlay';
    overlay.innerHTML = `
      <div class="completion-card">
        <div class="completion-check">✓</div>
        <p class="completion-title">${AppState.escapeHtml(name)}</p>
        <p class="completion-sub">텔레그램으로 전송되었습니다</p>
      </div>`;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => overlay.classList.add('show'));
    });
    setTimeout(() => {
      overlay.classList.remove('show');
      setTimeout(() => overlay.remove(), 350);
    }, 2800);
  }

  // ==========================================
  // TELEGRAM
  // ==========================================

  async function sendToTelegram() {
    const cfg = InterviewStorage.loadConfig();
    if (!cfg.botToken || !cfg.chatId) {
      openSettings();
      AppState.showToast('먼저 텔레그램 설정을 입력해주세요');
      return;
    }

    const btn = document.getElementById('btnTelegram');
    btn.disabled = true;
    btn.classList.add('sending');
    btn.textContent = '전송 중...';

    try {
      await tgSendMessage(cfg, buildTelegramCard());

      const name = (AppState.state.projectName || 'interview').replace(/\s+/g, '_');
      await tgSendDocument(
        cfg,
        SummaryManager.buildMarkdown(),
        `${name}_interview.md`,
        `📎 ${AppState.state.projectName || '고객'} 전체 회의록`
      );
      AppState.showToast('텔레그램 전송 완료 ✓');
      showCompletionOverlay();
    } catch (err) {
      console.error('[Telegram] 전송 실패', err);
      AppState.showToast('전송 실패 — 설정을 확인해주세요');
    } finally {
      btn.disabled = false;
      btn.classList.remove('sending');
      btn.textContent = '전송';
    }
  }

  function buildTelegramCard() {
    const answers = AppState.state.answers;
    const sp = SummaryBuilder.specialSections(answers);
    const kw = SummaryBuilder.collectKeywords(answers);
    const style    = answers['g-style-direction'];
    const color    = answers['g-color-tone'];
    const priority = answers['g-priority-value'];

    const lines = [];
    lines.push(`📋 <b>1차 디자인 인터뷰</b>`);
    lines.push(`👤 고객: <b>${esc(AppState.state.projectName || '(미입력)')}</b>`);
    if (AppState.state.spaceName)   lines.push(`🏠 공간: ${esc(AppState.state.spaceName)}`);
    if (AppState.state.meetingDate) lines.push(`📅 일자: ${esc(AppState.state.meetingDate)}`);
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
    if (sp.painPoints)
      lines.push(`💢 <b>Pain Point:</b> ${esc(sp.painPoints.replace(/\n/g, ' / '))}`);
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
      body: JSON.stringify({ chat_id: cfg.chatId, text: html, parse_mode: 'HTML' })
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
      const token  = document.getElementById('inputBotToken').value.trim();
      const chatId = document.getElementById('inputChatId').value.trim();
      InterviewStorage.saveConfig({ botToken: token, chatId });
      AppState.showToast('설정이 저장되었습니다');
      closeSettings();
      updateTelegramBtn();
    });

    document.getElementById('btnTestTelegram').addEventListener('click', async () => {
      const token  = document.getElementById('inputBotToken').value.trim();
      const chatId = document.getElementById('inputChatId').value.trim();
      if (!token || !chatId) {
        AppState.showToast('Bot Token과 Chat ID를 입력해주세요');
        return;
      }
      const btn = document.getElementById('btnTestTelegram');
      btn.disabled    = true;
      btn.textContent = '테스트 중...';
      try {
        await tgSendMessage({ botToken: token, chatId },
          '✅ <b>DASIFILL 디자인 인터뷰 앱</b>\n연결이 정상 확인되었습니다.');
        AppState.showToast('테스트 메시지 전송 성공 ✓');
      } catch (err) {
        AppState.showToast(`연결 실패: ${err.message}`);
      } finally {
        btn.disabled    = false;
        btn.textContent = '연결 테스트';
      }
    });
  }

  // ==========================================
  // 새 고객 모달
  // ==========================================

  function openNewClientConfirm() {
    const name = AppState.state.projectName || '현재 고객';
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
      const state = AppState.state;
      // Archive current session if it has any content
      if (state.projectName || ProgressManager.getTotalAnswered() > 0) {
        InterviewStorage.archiveClient(state);
      }

      AppState.resetState();
      InterviewStorage.save(AppState.state);

      // Clear header fields
      ['projectName', 'spaceName', 'meetingDate'].forEach(field => {
        const elId = field === 'projectName' ? 'fieldProjectName'
                   : field === 'spaceName'   ? 'fieldSpaceName'
                   : 'fieldMeetingDate';
        const el = document.getElementById(elId);
        if (el) el.textContent = field === 'meetingDate' ? AppState.state.meetingDate : '';
      });

      closeNewClientConfirm();
      UIRender.renderSpaceNav();
      UIRender.renderQuestionCanvas();
      SummaryManager.renderSummaryPanel();
      AppState.showToast('새 고객 인터뷰를 시작합니다');
    });
  }

  // ==========================================
  // INIT
  // ==========================================

  function init() {
    AppState.loadSavedState();
    initHeader();
    initHeaderButtons();
    initSettingsModal();
    initNewClientModal();
    NavigationManager.initKeyboardShortcuts();
    UIRender.renderSpaceNav();
    UIRender.renderQuestionCanvas();
    SummaryManager.renderSummaryPanel();
    setTimeout(NavigationManager.focusFirstUnanswered, 100);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
