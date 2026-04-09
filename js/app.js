'use strict';

class LayoutMeetingApp {
  constructor() {
    this.state         = Storage.load();
    this.canvasManager = new CanvasManager();
    this.meetingPanel  = null;  // init 후 생성
    this._suppressSave = false;
    this._init();
  }

  // ═══════════════════════════════════════════
  // 초기화
  // ═══════════════════════════════════════════

  _init() {
    // 헤더
    document.getElementById('todayDate').textContent =
      new Date().toLocaleDateString('ko-KR', {
        year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
      });
    document.getElementById('copyrightText').textContent =
      `© ${new Date().getFullYear()} ${CONFIG.COMPANY_NAME}. All rights reserved.`;
    document.getElementById('projectName').value = this.state.projectName || '';
    this._restoreLogo();

    // 캔버스 초기화 — A3 Landscape 비율, canvasWrapper 중앙 배치
    const wrapper = document.getElementById('canvasWrapper');
    const { w, h } = this._calcA3Dims(wrapper);
    this.canvasManager.init('floorCanvas', w, h);

    // MeetingPanel 초기화
    this.meetingPanel = new MeetingPanel(
      this.state,
      this.canvasManager,
      () => this._autoSave(),
    );

    // 캔버스 콜백 연결
    this.canvasManager.onNoteAdded    = (id, num) => this._onNoteAdded(id, num);
    this.canvasManager.onNoteRemoved  = (id)      => this._onNoteRemoved(id);
    this.canvasManager.onNotesSync    = (markers) => this._onNotesSync(markers);
    this.canvasManager.onStateChanged = ()        => this._autoSave();
    // 텍스트 도구 사용 후 선택 도구로 복귀
    this.canvasManager.onToolChanged  = (tool)    => this._setActiveTool(tool);

    // UI 렌더링
    this._renderTabs();
    this._renderSpaceNames();
    this._renderStickerBtns();

    // 현재 시안 로드 (IndexedDB 비동기)
    this._loadCurrentPlan();

    // 이벤트 바인딩
    this._bindEvents();
  }

  // ═══════════════════════════════════════════
  // 이벤트 바인딩
  // ═══════════════════════════════════════════

  _bindEvents() {
    // ── 도구 버튼 ─────────────────────────────
    document.querySelectorAll('[data-tool]').forEach(btn => {
      btn.addEventListener('click', () => this._setActiveTool(btn.dataset.tool));
    });

    // ── 실행취소 / 다시실행 ─────────────────
    document.getElementById('undoBtn').addEventListener('click', () => this.canvasManager.undo());
    document.getElementById('redoBtn').addEventListener('click', () => this.canvasManager.redo());

    // ── 줌 / 캔버스 유틸 ───────────────────
    document.getElementById('zoomFitBtn').addEventListener('click', () => this.canvasManager.resetZoom());
    document.getElementById('saveImgBtn').addEventListener('click', () => this._saveCanvasAsImage());
    document.getElementById('clearAnnotationsBtn').addEventListener('click', () => this._clearAnnotations());

    // ── 도면 업로드 ─────────────────────────
    document.getElementById('floorPlanUpload').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      let src;
      if (file.type === 'application/pdf') {
        src = await this._pdfToDataUrl(file);
      } else {
        src = await this._fileToDataUrl(file);
      }
      if (!src) { e.target.value = ''; return; }
      const plan = Storage.getCurrentPlan(this.state);
      plan.floorPlanSrc = src;
      await ImageDB.save(plan.id, src);
      Storage.save(this.state);
      this.canvasManager.loadFloorPlan(src);
      e.target.value = '';
    });

    // ── 로고 업로드 ─────────────────────────
    document.getElementById('logoUpload').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        this._applyLogo(ev.target.result);
        try { localStorage.setItem('layout_logo_v1', ev.target.result); } catch {}
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    });

    // ── 탭 추가 ─────────────────────────────
    document.getElementById('addTabBtn').addEventListener('click', () => this._addPlan());

    // ── 내보내기 ────────────────────────────
    document.getElementById('exportBtn').addEventListener('click', () => this._exportData());

    // ── Notion 저장 ─────────────────────────
    document.getElementById('notionBtn').addEventListener('click', () => this._saveToNotion());

    // ── 요약 인쇄 ───────────────────────────
    document.getElementById('printBtn').addEventListener('click', () => this.meetingPanel.printSummary());

    // ── 공간 명칭 추가 ───────────────────────
    document.getElementById('addSpaceBtn').addEventListener('click', () => this._promptAddSpace());

    // ── 메모 자동저장 ────────────────────────
    document.getElementById('memoArea').addEventListener('input', (e) => {
      const plan = Storage.getCurrentPlan(this.state);
      plan.memo = e.target.value;
      Storage.save(this.state);
      this._updateMemoCharCount();
    });

    // ── 프로젝트명 저장 ─────────────────────
    document.getElementById('projectName').addEventListener('input', (e) => {
      this.state.projectName = e.target.value;
      Storage.save(this.state);
    });

    // ── 미팅 패널 탭 전환 ───────────────────
    document.querySelectorAll('.mtab').forEach(btn => {
      btn.addEventListener('click', () => this.meetingPanel.switchTab(btn.dataset.tab));
    });

    // ── 어젠다 항목 추가 ────────────────────
    const agendaAddBtn   = document.getElementById('agendaAddBtn');
    const agendaAddInput = document.getElementById('agendaAddInput');
    agendaAddBtn.addEventListener('click', () => {
      const text = agendaAddInput.value.trim();
      if (!text) return;
      Storage.addAgendaItem(this.state, text);
      Storage.save(this.state);
      agendaAddInput.value = '';
      this.meetingPanel.renderAgenda();
    });
    agendaAddInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') agendaAddBtn.click();
    });

    // ── 후속 액션 아이템 추가 ───────────────
    const actionAddBtn   = document.getElementById('actionItemAddBtn');
    const actionAddInput = document.getElementById('actionItemInput');
    actionAddBtn.addEventListener('click', () => {
      const text = actionAddInput.value.trim();
      if (!text) return;
      Storage.addActionItem(this.state, text);
      Storage.save(this.state);
      actionAddInput.value = '';
      this.meetingPanel.renderActionItems();
    });
    actionAddInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') actionAddBtn.click();
    });

    // ── 결정사항 타입 버튼 ──────────────────
    document.querySelectorAll('.dec-type-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.dec-type-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    // ── 결정사항 Enter 추가 ─────────────────
    document.getElementById('decisionText').addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      const text = e.target.value.trim();
      if (!text) return;
      const typeBtn = document.querySelector('.dec-type-btn.active');
      const type    = typeBtn ? typeBtn.dataset.type : 'confirmed';
      const space   = document.getElementById('decisionSpaceSelect').value;
      Storage.addDecision(this.state, type, text, space || null);
      Storage.save(this.state);
      e.target.value = '';
      this.meetingPanel.renderDecisions();
    });
  }

  // ═══════════════════════════════════════════
  // 시안 탭 관리
  // ═══════════════════════════════════════════

  _renderTabs() {
    const container = document.getElementById('tabContainer');
    container.innerHTML = '';

    this.state.plans.forEach(plan => {
      const isActive = plan.id === this.state.currentPlanId;
      const tab = document.createElement('div');
      tab.className = `plan-tab${isActive ? ' active' : ''}`;
      tab.innerHTML = `
        <span class="tab-label">${escapeHtml(plan.name)}</span>
        ${this.state.plans.length > 1
          ? `<button class="tab-close" title="${escapeHtml(plan.name)} 삭제">×</button>`
          : ''}
      `;
      tab.querySelector('.tab-label').addEventListener('click', () => {
        if (!isActive) this._switchPlan(plan.id);
      });
      const closeBtn = tab.querySelector('.tab-close');
      if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this._deletePlan(plan.id);
        });
      }
      container.appendChild(tab);
    });
  }

  async _switchPlan(planId) {
    const current = Storage.getCurrentPlan(this.state);
    Storage.updatePlan(this.state, current.id, {
      canvasJSON: this.canvasManager.serialize(),
    });
    this.state.currentPlanId = planId;
    Storage.save(this.state);
    this._renderTabs();
    await this._loadCurrentPlan();
  }

  async _addPlan() {
    const current = Storage.getCurrentPlan(this.state);

    // 현재 시안 저장
    const currentJSON = this.canvasManager.serialize();
    Storage.updatePlan(this.state, current.id, { canvasJSON: currentJSON });

    // 현재 도면 이미지 확보 (메모리 or IndexedDB)
    let floorSrc = current.floorPlanSrc;
    if (!floorSrc) floorSrc = await ImageDB.load(current.id);

    // 새 시안 생성 후 현재 시안 내용 복사
    const newPlan = Storage.addPlan(this.state);
    newPlan.canvasJSON = currentJSON ? JSON.parse(JSON.stringify(currentJSON)) : null;
    newPlan.notes      = (current.notes || []).map(n => ({ ...n }));
    newPlan.memo       = current.memo || '';

    // 도면을 새 시안 ID로 IndexedDB에 복사
    if (floorSrc) {
      await ImageDB.save(newPlan.id, floorSrc);
    }

    this.state.currentPlanId = newPlan.id;
    Storage.save(this.state);
    this._renderTabs();
    await this._loadCurrentPlan();
  }

  async _deletePlan(planId) {
    if (this.state.plans.length <= 1) return;
    const plan = this.state.plans.find(p => p.id === planId);
    if (!confirm(`"${plan.name}"을(를) 삭제할까요?`)) return;
    const wasActive = this.state.currentPlanId === planId;
    Storage.deletePlan(this.state, planId);
    await ImageDB.delete(planId);
    Storage.save(this.state);
    if (wasActive) await this._loadCurrentPlan();
    this._renderTabs();
  }

  // ═══════════════════════════════════════════
  // 시안 로드
  // ═══════════════════════════════════════════

  async _loadCurrentPlan() {
    this._suppressSave = true;
    const plan = Storage.getCurrentPlan(this.state);

    if (!plan.floorPlanSrc) {
      plan.floorPlanSrc = await ImageDB.load(plan.id);
    }

    this.canvasManager.deserialize(plan.canvasJSON, plan.floorPlanSrc);

    const memoArea = document.getElementById('memoArea');
    memoArea.value = plan.memo || '';
    this._updateMemoCharCount();

    // 미팅 패널 전체 렌더
    this.meetingPanel.renderAll();
    this._updateDecisionSpaceOptions();

    setTimeout(() => { this._suppressSave = false; }, 400);
  }

  // ═══════════════════════════════════════════
  // 자동 저장
  // ═══════════════════════════════════════════

  _autoSave() {
    if (this._suppressSave) return;
    const plan = Storage.getCurrentPlan(this.state);
    Storage.updatePlan(this.state, plan.id, {
      canvasJSON: this.canvasManager.serialize(),
    });
    Storage.save(this.state);
  }

  // ═══════════════════════════════════════════
  // 노트 연동
  // ═══════════════════════════════════════════

  _onNoteAdded(noteId, number) {
    const plan = Storage.getCurrentPlan(this.state);
    plan.notes.push({ id: noteId, number, text: '' });
    Storage.save(this.state);
    this.meetingPanel.renderNotes();
  }

  _onNoteRemoved(noteId) {
    const plan = Storage.getCurrentPlan(this.state);
    plan.notes = plan.notes.filter(n => n.id !== noteId);
    Storage.save(this.state);
    this.meetingPanel.renderNotes();
  }

  _onNotesSync(markers) {
    const plan = Storage.getCurrentPlan(this.state);
    plan.notes = markers.map(m => {
      const existing = plan.notes.find(n => n.id === m.id);
      return existing ?? { id: m.id, number: m.number, text: '' };
    });
    Storage.save(this.state);
    this.meetingPanel.renderNotes();
  }

  // ═══════════════════════════════════════════
  // 공간 명칭 바
  // ═══════════════════════════════════════════

  _renderSpaceNames() {
    const container = document.getElementById('spaceTagsContainer');
    container.innerHTML = '';
    (this.state.spaces ?? []).forEach(space => {
      const tag = document.createElement('div');
      tag.className = 'space-tag';
      tag.innerHTML = `
        <span class="space-dot dot-${space.status}"></span>
        <span class="space-tag-name" title="클릭하여 도면에 배치">${escapeHtml(space.name)}</span>
        <button class="space-tag-x" title="${escapeHtml(space.name)} 삭제">×</button>
      `;
      tag.querySelector('.space-tag-name').addEventListener('click', () => {
        this.canvasManager.addSpaceLabel(space.name);
      });
      tag.querySelector('.space-tag-x').addEventListener('click', () => this._removeSpaceName(space.name));
      container.appendChild(tag);
    });
  }

  _promptAddSpace() {
    const container = document.getElementById('spaceTagsContainer');
    if (container.querySelector('.space-name-input')) return;
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = '명칭 입력...';
    input.className = 'space-name-input';
    const done = () => {
      const name = input.value.trim();
      if (name) this._addSpaceName(name);
      input.remove();
    };
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') done();
      if (e.key === 'Escape') input.remove();
    });
    input.addEventListener('blur', done);
    container.appendChild(input);
    input.focus();
  }

  _addSpaceName(name) {
    const result = Storage.addSpace(this.state, name);
    if (!result) return;  // 중복
    Storage.save(this.state);
    this._renderSpaceNames();
    if (this.meetingPanel) {
      this.meetingPanel.renderSpaceCards();
      this._updateDecisionSpaceOptions();
    }
  }

  _removeSpaceName(name) {
    Storage.removeSpace(this.state, name);
    Storage.save(this.state);
    this._renderSpaceNames();
    if (this.meetingPanel) {
      this.meetingPanel.renderSpaceCards();
      this._updateDecisionSpaceOptions();
    }
  }

  _updateDecisionSpaceOptions() {
    const select = document.getElementById('decisionSpaceSelect');
    if (!select) return;
    const spaces = this.state.spaces || [];
    select.innerHTML = '<option value="">공간</option>' +
      spaces.map(s => `<option value="${escapeHtml(s.name)}">${escapeHtml(s.name)}</option>`).join('');
  }

  // ═══════════════════════════════════════════
  // 스티커 버튼
  // ═══════════════════════════════════════════

  _renderStickerBtns() {
    const container = document.getElementById('stickerBtns');
    STICKERS.forEach(sticker => {
      const btn = document.createElement('button');
      btn.className = 'sticker-btn';
      btn.title = sticker.label + ' 스티커 추가';
      btn.innerHTML = `
        <span style="font-size:16px;line-height:1;display:block;">${sticker.emoji}</span>
        <span style="font-size:8px;font-weight:700;color:rgba(255,255,255,0.55);display:block;margin-top:2px;">${escapeHtml(sticker.label)}</span>
      `;
      btn.addEventListener('click', () => this.canvasManager.addSticker(sticker));
      container.appendChild(btn);
    });
  }

  // ═══════════════════════════════════════════
  // 도구 활성화
  // ═══════════════════════════════════════════

  _setActiveTool(toolName) {
    this.canvasManager.setTool(toolName);
    document.querySelectorAll('[data-tool]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tool === toolName);
    });
  }

  // ═══════════════════════════════════════════
  // 메모 글자수
  // ═══════════════════════════════════════════

  _updateMemoCharCount() {
    const len = document.getElementById('memoArea').value.length;
    document.getElementById('memoCharCount').textContent = `${len}자`;
  }

  // ═══════════════════════════════════════════
  // 내보내기 (JSON → 노션 첨부 아카이브)
  // ═══════════════════════════════════════════

  _exportData() {
    const json = JSON.stringify(this.state, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const a    = document.createElement('a');
    a.href     = URL.createObjectURL(blob);
    const name = (this.state.projectName || PROJECT_ID).replace(/\s+/g, '_');
    a.download = `layout-meeting-${name}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  // ═══════════════════════════════════════════
  // 로고 업로드
  // ═══════════════════════════════════════════

  _applyLogo(src) {
    const img         = document.getElementById('logoImg');
    const placeholder = document.getElementById('logoPlaceholder');
    img.src           = src;
    img.style.display = 'block';
    placeholder.style.display = 'none';
  }

  _restoreLogo() {
    try {
      const saved = localStorage.getItem('layout_logo_v1');
      if (saved) {
        this._applyLogo(saved);
      } else {
        // 기본 로고 (assets/logo.png)
        this._applyLogo('assets/logo.png');
      }
    } catch {
      this._applyLogo('assets/logo.png');
    }
  }

  // ═══════════════════════════════════════════
  // A3 Landscape 캔버스 크기 계산
  // ═══════════════════════════════════════════

  _calcA3Dims(wrapper) {
    const A3_RATIO = 420 / 297; // Landscape
    const pad      = 20;         // 최소 여백
    const maxW     = wrapper.clientWidth  - pad * 2;
    const maxH     = wrapper.clientHeight - pad * 2;
    let w = maxW;
    let h = Math.round(w / A3_RATIO);
    if (h > maxH) { h = maxH; w = Math.round(h * A3_RATIO); }
    return { w, h };
  }

  // ═══════════════════════════════════════════
  // 캔버스 PNG 저장
  // ═══════════════════════════════════════════

  _saveCanvasAsImage() {
    const dataUrl = this.canvasManager.canvas.toDataURL({ format: 'png', multiplier: 1 });
    const a       = document.createElement('a');
    a.href        = dataUrl;
    const name    = (this.state.projectName || PROJECT_ID).replace(/\s+/g, '_');
    const plan    = Storage.getCurrentPlan(this.state);
    a.download    = `layout-${name}-${plan.name}-${new Date().toISOString().slice(0, 10)}.png`;
    a.click();
  }

  // ═══════════════════════════════════════════
  // 어노테이션(마커·텍스트) 전체 초기화
  // ═══════════════════════════════════════════

  _clearAnnotations() {
    if (!confirm('현재 시안의 모든 마커와 텍스트를 삭제할까요? (도면은 유지됩니다)')) return;
    const objs = this.canvasManager.canvas.getObjects().slice();
    objs.forEach(o => this.canvasManager.canvas.remove(o));
    this.canvasManager.canvas.discardActiveObject();
    this.canvasManager.canvas.renderAll();
    this.canvasManager._saveState();
    const plan  = Storage.getCurrentPlan(this.state);
    plan.notes  = [];
    Storage.save(this.state);
    this.meetingPanel.renderNotes();
  }

  // ═══════════════════════════════════════════
  // Notion 저장 (Make.com 웹훅 경유)
  // ═══════════════════════════════════════════

  async _saveToNotion() {
    if (!NOTION_WEBHOOK_URL) {
      alert('Notion 웹훅 URL이 설정되지 않았습니다.');
      return;
    }
    if (!NOTION_PAGE_ID) {
      this._showToast('노션 링크로 열어주세요 (nid 파라미터 필요)', true);
      return;
    }
    const btn = document.getElementById('notionBtn');
    btn.disabled = true;

    const plan = Storage.getCurrentPlan(this.state);

    const payload = {
      meetingType:  'layout',
      projectId:    PROJECT_ID,
      notionPageId: NOTION_PAGE_ID,
      projectName:  this.state.projectName || PROJECT_ID,
      exportedAt:   new Date().toISOString(),
      agenda:       this.state.agenda.map(a => ({ text: a.text, done: a.done })),
      spaces:       this.state.spaces.map(s => ({
        name: s.name, status: s.status,
        dimensions: s.dimensions || '', notes: s.notes || '',
      })),
      decisions:    this.state.decisions.map(d => ({
        type: d.type, spaceName: d.spaceName || '', text: d.text,
      })),
      actionItems:  this.state.actionItems.map(a => ({ text: a.text, done: a.done })),
      notes:        (plan.notes || []).map(n => ({
        number: n.number ?? n.num ?? '', text: n.text || '',
      })),
      memo:         plan.memo || '',
    };

    try {
      const res = await fetch(NOTION_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      this.state.notionSyncedAt = new Date().toISOString();
      Storage.save(this.state);
      this._showToast('Notion에 저장되었습니다 ✓');
    } catch (err) {
      console.error('[Notion] 저장 실패:', err);
      this._showToast('저장 실패 — 잠시 후 다시 시도해주세요', true);
    } finally {
      btn.disabled = false;
    }
  }

  _showToast(msg, isError = false) {
    const prev = document.getElementById('notionToast');
    if (prev) prev.remove();
    const toast = document.createElement('div');
    toast.id = 'notionToast';
    toast.textContent = msg;
    Object.assign(toast.style, {
      position: 'fixed', bottom: '24px', left: '50%',
      transform: 'translateX(-50%)',
      background: isError ? '#DC2626' : '#059669',
      color: '#fff', padding: '10px 20px', borderRadius: '8px',
      fontSize: '13px', zIndex: '9999', pointerEvents: 'none',
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      fontFamily: 'Jost, sans-serif', letterSpacing: '0.02em',
    });
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  // ═══════════════════════════════════════════
  // 파일 → DataURL 변환
  // ═══════════════════════════════════════════

  _fileToDataUrl(file) {
    return new Promise((resolve) => {
      const reader  = new FileReader();
      reader.onload  = (ev) => resolve(ev.target.result);
      reader.onerror = ()   => resolve(null);
      reader.readAsDataURL(file);
    });
  }

  async _pdfToDataUrl(file) {
    if (typeof pdfjsLib === 'undefined') {
      alert('PDF.js 라이브러리를 로드할 수 없습니다. 인터넷 연결을 확인해주세요.');
      return null;
    }
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf         = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const page        = await pdf.getPage(1);
      const viewport    = page.getViewport({ scale: 2 });
      const tmpCanvas   = document.createElement('canvas');
      tmpCanvas.width   = viewport.width;
      tmpCanvas.height  = viewport.height;
      await page.render({ canvasContext: tmpCanvas.getContext('2d'), viewport }).promise;
      return tmpCanvas.toDataURL('image/png');
    } catch (err) {
      console.error('[PDF] 렌더링 실패:', err);
      alert('PDF 파일을 읽는 데 실패했습니다. 다른 파일을 시도해 주세요.');
      return null;
    }
  }
}

// ─── 앱 시작 ───────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  new LayoutMeetingApp();
});
