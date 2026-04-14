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
  //   현재 PIN: 1004
  const PIN_HASH   = '75992a5ac67ff644d3063976c2effd10bdd93fcc109798e3d5c1acf2e530d01a';
  const AUTH_KEY   = 'brief_v1_auth';
  const FORCE_GATE_PREVIEW = new URLSearchParams(window.location.search).get('previewGate') === '1';
  /** 복사·MD·헤더 즉시 전송 등 스태프 도구: `?staff=1` */
  const STAFF_TOOLS = new URLSearchParams(window.location.search).get('staff') === '1';

  let _pinAttempts    = 0;
  let _pinLockedUntil = 0;
  let _settingsPinAttempts    = 0;
  let _settingsPinLockedUntil = 0;

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
    const startBtn = document.getElementById('pinGateStartBtn');

    if (startBtn) {
      startBtn.addEventListener('click', () => {
        if (digits[0]) digits[0].focus();
      });
    }

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

  function applyStaffToolsMode() {
    document.body.dataset.staffTools = STAFF_TOOLS ? '1' : '0';
  }

  function boot() {
    if (FORCE_GATE_PREVIEW) {
      const gate = document.getElementById('pinGate');
      if (gate) gate.style.display = '';
      _initPinGate();
      return;
    }
    if (sessionStorage.getItem(AUTH_KEY) === '1') {
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
    document.getElementById('btnCopy')?.addEventListener('click', () => {
      SummaryManager.copyToClipboard(SummaryManager.buildMarkdown());
      AppState.showToast('브리프가 복사되었습니다');
    });

    document.getElementById('btnMarkdown')?.addEventListener('click', () => {
      const name = (AppState.state.projectName || 'interview').replace(/\s+/g, '_');
      SummaryManager.downloadFile(
        SummaryManager.buildMarkdown(),
        `${name}_interview.md`,
        'text/markdown;charset=utf-8'
      );
      AppState.showToast('Markdown 다운로드');
    });

    document.getElementById('btnTelegram')?.addEventListener('click', sendToTelegram);
    document.getElementById('btnSettings').addEventListener('click', openSettings);
    document.getElementById('btnNewClient').addEventListener('click', openNewClientConfirm);
    document.getElementById('btnResetSession')?.addEventListener('click', openResetSessionModal);

    updateTelegramBtn();
  }

  function briefProxyBase() {
    const u = window.__BRIEF_PROXY_URL__;
    return u && String(u).trim() ? String(u).trim().replace(/\/$/, '') : '';
  }

  function useBriefProxy() {
    return !!briefProxyBase();
  }

  /** 프록시 URL + API 키가 있으면 어떤 기기에서도 전송 가능 */
  function briefProxyReady() {
    return useBriefProxy() && String(window.__BRIEF_PROXY_KEY__ || '').trim().length > 0;
  }

  function updateTelegramBtn() {
    const cfg = InterviewStorage.loadConfig();
    const btn = document.getElementById('btnTelegram');
    if (!btn) return;
    const localOk = !!(cfg.botToken && cfg.chatId);
    const configured = briefProxyReady() || localOk;
    btn.disabled     = !configured;
    btn.title        = configured
      ? (briefProxyReady() ? '디자이너에게 브리프 전송 (프록시)' : '텔레그램으로 전송')
      : (useBriefProxy() ? '프록시 API 키를 brief-proxy-config.js에 설정해 주세요' : '텔레그램 설정이 필요합니다 (⚙ 클릭)');
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
        <p class="completion-sub">브리프가 전송되었습니다</p>
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

  async function sendBriefViaProxy() {
    const base = briefProxyBase();
    const key = String(window.__BRIEF_PROXY_KEY__ || '').trim();
    const name = (AppState.state.projectName || 'interview').replace(/\s+/g, '_');
    const res = await fetch(`${base}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey: key,
        cardHtml: buildTelegramCard(),
        markdown: SummaryManager.buildMarkdown(),
        markdownFilename: `DASIFILL_Brief_${name}.md`,
        caption: `📎 ${AppState.state.projectName || '고객'} 전체 브리프 파일 첨부`
      })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.ok === false) {
      throw new Error(data.error || data.description || `HTTP ${res.status}`);
    }
  }

  async function briefProxyTestConnection() {
    const base = briefProxyBase();
    const key = String(window.__BRIEF_PROXY_KEY__ || '').trim();
    const res = await fetch(`${base}/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: key })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.ok === false) {
      throw new Error(data.error || data.description || `HTTP ${res.status}`);
    }
  }

  function openFinishSendModal() {
    const ov = document.getElementById('finishSendOverlay');
    if (ov) ov.classList.add('open');
  }

  function closeFinishSendModal() {
    const ov = document.getElementById('finishSendOverlay');
    if (ov) ov.classList.remove('open');
  }

  window.DASIFILL_openFinishSendModal = openFinishSendModal;

  function initFinishSendModal() {
    const ov = document.getElementById('finishSendOverlay');
    if (!ov) return;
    const close = () => closeFinishSendModal();
    document.getElementById('btnCloseFinishSend')?.addEventListener('click', close);
    document.getElementById('btnFinishSendCancel')?.addEventListener('click', close);
    ov.addEventListener('click', e => { if (e.target === ov) close(); });
    document.getElementById('btnFinishSendConfirm')?.addEventListener('click', () => {
      sendBriefToTelegram({ fromFinish: true });
    });
  }

  async function sendBriefToTelegram(options) {
    const fromFinish = !!(options && options.fromFinish);
    const cfg = InterviewStorage.loadConfig();

    if (briefProxyReady()) {
      /* 프록시만으로 전송 — 기기에 토큰 불필요 */
    } else if (!cfg.botToken || !cfg.chatId) {
      closeFinishSendModal();
      if (useBriefProxy() && !briefProxyReady()) {
        AppState.showToast('프록시 API 키가 필요합니다. js/brief-proxy-config.js(__BRIEF_PROXY_KEY__)를 확인해 주세요.');
      } else {
        openSettings();
        AppState.showToast('연결 설정이 필요합니다. ⚙에서 액세스 코드 후 Bot Token·Chat ID를 입력해 주세요.');
      }
      return;
    }

    const btn = document.getElementById('btnTelegram');
    const confirmBtn = document.getElementById('btnFinishSendConfirm');
    const cancelBtn = document.getElementById('btnFinishSendCancel');

    function setSending(on) {
      if (!fromFinish && btn) {
        btn.disabled = on;
        btn.classList.toggle('sending', on);
        btn.textContent = on ? '전송 중...' : '전송';
      }
      if (fromFinish && confirmBtn) {
        confirmBtn.disabled = on;
        if (cancelBtn) cancelBtn.disabled = on;
        confirmBtn.textContent = on ? '보내는 중...' : '보내기';
      }
    }

    setSending(true);
    try {
      if (briefProxyReady()) {
        await sendBriefViaProxy();
      } else {
        await tgSendMessage(cfg, buildTelegramCard());

        const name = (AppState.state.projectName || 'interview').replace(/\s+/g, '_');
        await tgSendDocument(
          cfg,
          SummaryManager.buildMarkdown(),
          `DASIFILL_Brief_${name}.md`,
          `📎 ${AppState.state.projectName || '고객'} 전체 브리프 파일 첨부`
        );
      }
      AppState.showToast('전송이 완료되었습니다 ✓');
      closeFinishSendModal();
      showCompletionOverlay();
    } catch (err) {
      console.error('[Telegram] 전송 실패', err);
      AppState.showToast(
        briefProxyReady()
          ? '전송 실패 — 프록시(Worker) 설정·네트워크를 확인해 주세요'
          : '전송 실패 — 연결 설정의 토큰·Chat ID를 확인한 뒤 다시 시도해 주세요'
      );
    } finally {
      setSending(false);
    }
  }

  function sendToTelegram() {
    sendBriefToTelegram({ fromFinish: false });
  }

  // ── 처음부터 (세션 초기화, 아카이브 없음) ───

  function openResetSessionModal() {
    document.getElementById('resetSessionOverlay')?.classList.add('open');
  }

  function closeResetSessionModal() {
    document.getElementById('resetSessionOverlay')?.classList.remove('open');
  }

  function initResetSessionModal() {
    const ov = document.getElementById('resetSessionOverlay');
    if (!ov) return;
    const close = () => closeResetSessionModal();
    document.getElementById('btnCloseResetSession')?.addEventListener('click', close);
    document.getElementById('btnResetSessionCancel')?.addEventListener('click', close);
    ov.addEventListener('click', e => { if (e.target === ov) close(); });
    document.getElementById('btnResetSessionConfirm')?.addEventListener('click', () => {
      AppState.resetState();
      InterviewStorage.save(AppState.state);
      ['projectName', 'spaceName', 'briefDate'].forEach(field => {
        const elId = field === 'projectName' ? 'fieldProjectName'
                   : field === 'spaceName'   ? 'fieldSpaceName'
                   : 'fieldBriefDate';
        const el = document.getElementById(elId);
        if (el) el.textContent = field === 'briefDate' ? AppState.state.briefDate : '';
      });
      closeResetSessionModal();
      UIRender.renderSpaceNav();
      UIRender.renderQuestionCanvas();
      SummaryManager.renderSummaryPanel();
      setTimeout(NavigationManager.focusFirstUnanswered, 100);
      AppState.showToast('처음부터 다시 시작합니다');
    });
  }

  function buildTelegramCard() {
    const answers = AppState.state.answers;
    const sp = SummaryBuilder.specialSections(answers);
    const kw = SummaryBuilder.collectKeywords(answers);
    const household = answers['p1-q1-household'];
    const planningPriority = answers['p2-q1-planning-priority'];
    const balance = answers['p2-q2-design-vs-practical'];
    const tenure = answers['p3-q3-tenure-plan'];

    const lines = [];
    lines.push(`📋 <b>DASIFILL 디자인 브리프</b>`);
    lines.push(`👤 고객: <b>${esc(AppState.state.projectName || '(미입력)')}</b>`);
    if (AppState.state.spaceName)   lines.push(`🏠 공간: ${esc(AppState.state.spaceName)}`);
    if (AppState.state.briefDate) lines.push(`📅 일자: ${esc(AppState.state.briefDate)}`);
    lines.push('');

    if (household && household.length)
      lines.push(`<b>가족 구성:</b> ${esc(household.join(', '))}`);
    if (planningPriority)
      lines.push(`<b>공간 계획 최우선:</b> ${esc(planningPriority)}`);
    if (balance)
      lines.push(`<b>디자인·실용 비중:</b> ${esc(balance)}`);
    if (tenure)
      lines.push(`<b>예상 사용 기간:</b> ${esc(tenure)}`);

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
    lines.push(`📎 전체 브리프 파일 첨부`);

    return lines.join('\n');
  }

  function esc(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function normalizeBotToken(raw) {
    return String(raw || '').trim();
  }

  /** Chat ID는 문자열로 유지(큰 정수 정밀도·@채널명 유지). 보이지 않는 공백 제거 */
  function normalizeTelegramChatId(raw) {
    return String(raw || '')
      .trim()
      .replace(/[\u200B-\u200D\uFEFF]/g, '');
  }

  async function tgGetMe(botToken) {
    const token = normalizeBotToken(botToken);
    const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const data = await res.json().catch(() => ({}));
    if (!data.ok) {
      throw new Error(data.description || `HTTP ${res.status}`);
    }
    return data;
  }

  /**
   * @param {object} cfg
   * @param {string} text
   * @param {{ parseMode?: 'HTML'|'plain' }} [opts]  연결 테스트는 plain 권장(HTML 엔티티 오류 방지)
   */
  async function tgSendMessage(cfg, text, opts) {
    const token = normalizeBotToken(cfg.botToken);
    const chatId = normalizeTelegramChatId(cfg.chatId);
    if (!token || !chatId) {
      throw new Error('Bot Token 또는 Chat ID가 비어 있습니다');
    }
    const mode = opts && opts.parseMode === 'plain' ? 'plain' : 'HTML';
    const payload = { chat_id: chatId, text };
    if (mode === 'HTML') payload.parse_mode = 'HTML';

    const res = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json().catch(() => ({}));
    if (!data.ok) {
      throw new Error(data.description || `HTTP ${res.status}`);
    }
    return data;
  }

  async function tgSendDocument(cfg, content, filename, caption) {
    const token = normalizeBotToken(cfg.botToken);
    const chatId = normalizeTelegramChatId(cfg.chatId);
    if (!token || !chatId) {
      throw new Error('Bot Token 또는 Chat ID가 비어 있습니다');
    }
    const blob = new Blob([content], { type: 'text/plain' });
    const form = new FormData();
    form.append('chat_id', chatId);
    form.append('document', blob, filename);
    if (caption) form.append('caption', caption);

    const res = await fetch(
      `https://api.telegram.org/bot${token}/sendDocument`, {
      method: 'POST',
      body: form
    });
    const data = await res.json().catch(() => ({}));
    if (!data.ok) {
      throw new Error(data.description || `HTTP ${res.status}`);
    }
    return data;
  }

  // ==========================================
  // SETTINGS — PIN 게이트 후 텔레그램 폼
  // ==========================================

  function _showSettingsPinError(msg) {
    const el = document.getElementById('settingsPinError');
    if (el) el.textContent = msg;
    const modal = document.querySelector('#settingsPinOverlay .settings-modal');
    if (modal) {
      modal.classList.remove('shake');
      void modal.offsetWidth;
      modal.classList.add('shake');
    }
  }

  function _clearSettingsPinDigits() {
    document.querySelectorAll('.settings-pin-digit').forEach(d => { d.value = ''; });
    const first = document.querySelector('.settings-pin-digit');
    if (first) first.focus();
  }

  async function _verifySettingsPin() {
    const now = Date.now();
    if (now < _settingsPinLockedUntil) {
      const secs = Math.ceil((_settingsPinLockedUntil - now) / 1000);
      _showSettingsPinError(`${secs}초 후 다시 시도해주세요`);
      return;
    }
    const digits = [...document.querySelectorAll('.settings-pin-digit')].map(d => d.value).join('');
    if (digits.length < 4) return;
    const hash = await _hashPin(digits);
    if (hash === PIN_HASH) {
      document.getElementById('settingsPinError').textContent = '';
      closeSettingsPinOverlay();
      _clearSettingsPinDigits();
      showSettingsModal();
    } else {
      _settingsPinAttempts++;
      if (_settingsPinAttempts >= 3) {
        _settingsPinLockedUntil = Date.now() + 60_000;
        _settingsPinAttempts = 0;
        _showSettingsPinError('잠시 후 다시 시도해주세요 (60초)');
      } else {
        _showSettingsPinError('코드가 올바르지 않습니다');
      }
      _clearSettingsPinDigits();
    }
  }

  function initSettingsPinModal() {
    const ov = document.getElementById('settingsPinOverlay');
    if (!ov) return;
    const digits = [...document.querySelectorAll('.settings-pin-digit')];
    const close = () => {
      closeSettingsPinOverlay();
      _clearSettingsPinDigits();
      const err = document.getElementById('settingsPinError');
      if (err) err.textContent = '';
    };

    document.getElementById('btnCloseSettingsPin')?.addEventListener('click', close);
    document.getElementById('btnCancelSettingsPin')?.addEventListener('click', close);
    ov.addEventListener('click', e => { if (e.target === ov) close(); });

    digits.forEach((digit, i) => {
      digit.addEventListener('input', () => {
        digit.value = digit.value.replace(/\D/g, '').slice(0, 1);
        if (digit.value && i < digits.length - 1) digits[i + 1].focus();
        if (digits.every(d => d.value)) _verifySettingsPin();
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
        if (pasted.length === 4) _verifySettingsPin();
      });
    });
  }

  function openSettingsPinOverlay() {
    const ov = document.getElementById('settingsPinOverlay');
    if (ov) {
      _clearSettingsPinDigits();
      const err = document.getElementById('settingsPinError');
      if (err) err.textContent = '';
      ov.classList.add('open');
      setTimeout(() => {
        const first = document.querySelector('.settings-pin-digit');
        if (first) first.focus();
      }, 50);
    }
  }

  function closeSettingsPinOverlay() {
    document.getElementById('settingsPinOverlay')?.classList.remove('open');
  }

  /** ⚙ 또는 설정 필요 시 — 먼저 액세스 코드(PIN) 확인 */
  function openSettings() {
    openSettingsPinOverlay();
  }

  function updateSettingsProxyHint() {
    const el = document.getElementById('settingsProxyHint');
    if (!el) return;
    el.hidden = !useBriefProxy();
  }

  function showSettingsModal() {
    const cfg = InterviewStorage.loadConfig();
    document.getElementById('inputBotToken').value = normalizeBotToken(cfg.botToken || '');
    document.getElementById('inputChatId').value   = normalizeTelegramChatId(cfg.chatId || '');
    updateSettingsProxyHint();
    document.getElementById('settingsOverlay').classList.add('open');
  }

  let _settingsInputSaveTimer = null;

  /** 입력값을 즉시 localStorage에 반영 (자동 저장). showToast: 명시적 저장 버튼일 때만 true 권장 */
  function persistTelegramSettingsFromInputs(showToast) {
    const token  = normalizeBotToken(document.getElementById('inputBotToken').value);
    const chatId = normalizeTelegramChatId(document.getElementById('inputChatId').value);
    const ok = InterviewStorage.saveConfig({ botToken: token, chatId });
    updateTelegramBtn();
    if (showToast) {
      if (ok) AppState.showToast('설정이 저장되었습니다');
      else AppState.showToast('저장에 실패했습니다. 브라우저 저장 공간을 확인해 주세요');
    }
    return ok;
  }

  function schedulePersistTelegramSettings() {
    clearTimeout(_settingsInputSaveTimer);
    _settingsInputSaveTimer = setTimeout(() => persistTelegramSettingsFromInputs(false), 450);
  }

  function closeSettings() {
    clearTimeout(_settingsInputSaveTimer);
    persistTelegramSettingsFromInputs(false);
    document.getElementById('settingsOverlay').classList.remove('open');
  }

  function closeSettingsWithoutPersist() {
    clearTimeout(_settingsInputSaveTimer);
    document.getElementById('settingsOverlay').classList.remove('open');
  }

  function initSettingsModal() {
    document.getElementById('btnCloseSettings').addEventListener('click', closeSettings);
    document.getElementById('settingsOverlay').addEventListener('click', e => {
      if (e.target === e.currentTarget) closeSettings();
    });

    ['inputBotToken', 'inputChatId'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('input', schedulePersistTelegramSettings);
      el.addEventListener('blur', () => {
        clearTimeout(_settingsInputSaveTimer);
        persistTelegramSettingsFromInputs(false);
      });
    });

    document.getElementById('btnSaveSettings').addEventListener('click', () => {
      persistTelegramSettingsFromInputs(true);
      closeSettingsWithoutPersist();
    });

    document.getElementById('btnTestTelegram').addEventListener('click', async () => {
      const btn = document.getElementById('btnTestTelegram');
      btn.disabled    = true;
      btn.textContent = '테스트 중...';
      try {
        if (useBriefProxy()) {
          if (!String(window.__BRIEF_PROXY_KEY__ || '').trim()) {
            AppState.showToast('brief-proxy-config.js에 __BRIEF_PROXY_KEY__를 입력해 주세요');
            return;
          }
          await briefProxyTestConnection();
          AppState.showToast('프록시 연결 확인됨 ✓');
        } else {
          const token  = normalizeBotToken(document.getElementById('inputBotToken').value);
          const chatId = normalizeTelegramChatId(document.getElementById('inputChatId').value);
          if (!token || !chatId) {
            AppState.showToast('Bot Token과 Chat ID를 입력해주세요');
            return;
          }
          await tgGetMe(token);
          await tgSendMessage(
            { botToken: token, chatId },
            '✅ DASIFILL 디자인 인터뷰 앱 — 연결이 정상 확인되었습니다.',
            { parseMode: 'plain' }
          );
          persistTelegramSettingsFromInputs(false);
          AppState.showToast('연결 확인됨 · 설정이 저장되었습니다');
        }
      } catch (err) {
        const raw = (err && err.message) ? err.message : String(err);
        let detail = raw;
        if (/Failed to fetch|NetworkError|Load failed|fetch/i.test(raw)) {
          detail = useBriefProxy()
            ? '프록시 URL에 연결하지 못했습니다. Worker 배포 주소·CORS·네트워크를 확인해 주세요.'
            : '네트워크에서 api.telegram.org에 연결하지 못했습니다. HTTPS로 배포했는지, 방화벽/확장 프로그램을 확인해 주세요.';
        } else if (/unauthorized|401/i.test(raw) && useBriefProxy()) {
          detail = '프록시 API 키가 Worker 시크릿 BRIEF_API_KEY와 일치하는지 확인해 주세요.';
        } else if (/Unauthorized|401/i.test(raw)) {
          detail = 'Bot Token이 잘못되었거나 만료되었습니다. BotFather에서 토큰을 확인해 주세요.';
        } else if (/chat not found|PEER_ID|400/i.test(raw)) {
          detail = 'Chat ID가 잘못되었거나, 이 채팅에 봇이 맞지 않습니다. 개인 DM이면 봇에게 /start 했는지 확인해 주세요.';
        }
        AppState.showToast(`연결 실패: ${detail}`);
      } finally {
        btn.disabled    = false;
        btn.textContent = '연결 테스트';
      }
    });

    updateSettingsProxyHint();
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
      ['projectName', 'spaceName', 'briefDate'].forEach(field => {
        const elId = field === 'projectName' ? 'fieldProjectName'
                   : field === 'spaceName'   ? 'fieldSpaceName'
                   : 'fieldBriefDate';
        const el = document.getElementById(elId);
        if (el) el.textContent = field === 'briefDate' ? AppState.state.briefDate : '';
      });

      closeNewClientConfirm();
      UIRender.renderSpaceNav();
      UIRender.renderQuestionCanvas();
      SummaryManager.renderSummaryPanel();
      AppState.showToast('새 브리프를 시작합니다');
    });
  }

  // ==========================================
  // INIT
  // ==========================================

  function init() {
    applyStaffToolsMode();
    AppState.loadSavedState();
    initHeader();
    initHeaderButtons();
    initSettingsPinModal();
    initSettingsModal();
    initFinishSendModal();
    initResetSessionModal();
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

  // 데모 스크립트(js/demo-session.js) 또는 콘솔에서 전송 검증용
  window.__DASIFILL_sendBriefToTelegram = function (opts) {
    return sendBriefToTelegram(opts || { fromFinish: false });
  };

})();
