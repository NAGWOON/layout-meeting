'use strict';

// ── MeetingPanel ───────────────────────────────────────────
// 우측 4탭 미팅 진행 패널을 관리
// 탭: 어젠다 | 공간별 | 결정사항 | 노트
// ─────────────────────────────────────────────────────────

class MeetingPanel {
  constructor(state, canvasManager, onSave) {
    this.state   = state;
    this.canvas  = canvasManager;
    this.onSave  = onSave;
    this._activeTab = 'agenda';
  }

  // ═══════════════════════════════════════════
  // 탭 전환
  // ═══════════════════════════════════════════

  switchTab(tabName) {
    this._activeTab = tabName;
    document.querySelectorAll('.mtab').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    document.querySelectorAll('.mtab-content').forEach(el => {
      const isActive = el.dataset.tab === tabName;
      el.classList.toggle('active', isActive);
      el.classList.toggle('hidden',  !isActive);
    });
    // 활성 탭 렌더
    switch (tabName) {
      case 'agenda':    this.renderAgenda();    break;
      case 'spaces':    this.renderSpaceCards(); break;
      case 'decisions': this.renderDecisions();  break;
      case 'notes':     this.renderNotes();      break;
    }
  }

  // 전체 재렌더 (앱 초기화 / 플랜 전환 시)
  renderAll() {
    this.renderAgenda();
    this.renderSpaceCards();
    this.renderDecisions();
    this.renderNotes();
    this.renderActionItems();
  }

  // ═══════════════════════════════════════════
  // 어젠다 탭
  // ═══════════════════════════════════════════

  renderAgenda() {
    const agenda = this.state.agenda || [];
    const done   = agenda.filter(a => a.done).length;
    const total  = agenda.length;
    const pct    = total ? Math.round(done / total * 100) : 0;

    const bar = document.getElementById('agendaProgress');
    if (bar) {
      bar.innerHTML = `
        <div class="agenda-progress-track">
          <div class="agenda-progress-fill" style="width:${pct}%"></div>
        </div>
        <span class="agenda-progress-label">${done} / ${total} 완료</span>
      `;
    }

    const list = document.getElementById('agendaList');
    if (!list) return;
    list.innerHTML = '';

    agenda.forEach(item => {
      const div = document.createElement('div');
      div.className = `agenda-item${item.done ? ' done' : ''}`;
      div.innerHTML = `
        <label class="agenda-check-label">
          <input type="checkbox" class="agenda-cb"${item.done ? ' checked' : ''}>
          <span class="agenda-text">${escapeHtml(item.text)}</span>
        </label>
        <button class="agenda-del" title="항목 삭제">×</button>
      `;
      div.querySelector('.agenda-cb').addEventListener('change', () => {
        Storage.toggleAgenda(this.state, item.id);
        this.onSave();
        this.renderAgenda();
      });
      div.querySelector('.agenda-del').addEventListener('click', () => {
        Storage.deleteAgendaItem(this.state, item.id);
        this.onSave();
        this.renderAgenda();
      });
      list.appendChild(div);
    });
  }

  // ═══════════════════════════════════════════
  // 후속 액션 아이템 (어젠다 탭 하단)
  // ═══════════════════════════════════════════

  renderActionItems() {
    const container = document.getElementById('actionItemsList');
    if (!container) return;
    container.innerHTML = '';

    const items = this.state.actionItems || [];
    if (!items.length) {
      container.innerHTML = `<p class="action-empty">미팅 후 할 일을 추가하세요</p>`;
      return;
    }

    items.forEach(item => {
      const div = document.createElement('div');
      div.className = `action-item${item.done ? ' done' : ''}`;
      div.innerHTML = `
        <label class="action-check-label">
          <input type="checkbox" class="action-cb"${item.done ? ' checked' : ''}>
          <span class="action-text">${escapeHtml(item.text)}</span>
        </label>
        <button class="action-del" title="삭제">×</button>
      `;
      div.querySelector('.action-cb').addEventListener('change', () => {
        Storage.toggleActionItem(this.state, item.id);
        this.onSave();
        this.renderActionItems();
      });
      div.querySelector('.action-del').addEventListener('click', () => {
        Storage.deleteActionItem(this.state, item.id);
        this.onSave();
        this.renderActionItems();
      });
      container.appendChild(div);
    });
  }

  // ═══════════════════════════════════════════
  // 공간별 탭
  // ═══════════════════════════════════════════

  renderSpaceCards() {
    const container = document.getElementById('spaceCardsList');
    if (!container) return;
    container.innerHTML = '';

    const spaces = this.state.spaces || [];
    if (!spaces.length) {
      container.innerHTML = `
        <div class="empty-spaces">
          아래 공간명칭 바에서 공간을 추가하면<br>여기에 요구사항 카드가 생성됩니다.
        </div>`;
      return;
    }

    spaces.forEach(space => {
      const statusMap = {
        pending:     { label: '미논의', cls: 'status-pending'  },
        in_progress: { label: '진행중', cls: 'status-progress' },
        done:        { label: '완료',   cls: 'status-done'     },
      };
      const sc = statusMap[space.status] || statusMap.pending;

      const div = document.createElement('div');
      div.className = 'space-card';
      div.dataset.spaceId = space.id;
      div.innerHTML = `
        <div class="space-card-header">
          <span class="space-card-name">${escapeHtml(space.name)}</span>
          <button class="space-status-btn ${sc.cls}">${sc.label}</button>
        </div>
        <input type="text" class="space-dimensions" placeholder="치수 (예: 5.2 × 4.1m)"
          value="${escapeHtml(space.dimensions || '')}">
        <textarea class="space-notes" placeholder="요구사항, 특이사항...">${escapeHtml(space.notes || '')}</textarea>
      `;

      // 상태 토글 (미논의 → 진행중 → 완료 → 미논의)
      const statusOrder = ['pending', 'in_progress', 'done'];
      div.querySelector('.space-status-btn').addEventListener('click', () => {
        const next = (statusOrder.indexOf(space.status) + 1) % statusOrder.length;
        space.status = statusOrder[next];
        this.onSave();
        this.renderSpaceCards();
        this._updateSpaceTagDots();

        // 완료 시: 공간 요구사항 → 결정사항 자동 추가 + 탭 이동
        if (space.status === 'done') {
          // 노트 내용이 있으면 그대로, 없으면 기본 텍스트
          const text = space.notes?.trim()
            ? space.notes.trim()
            : `${space.name} 요구사항 논의 완료`;
          Storage.addDecision(this.state, 'confirmed', text, space.name);
          this.onSave();
          setTimeout(() => {
            this.switchTab('decisions');
          }, 350);
        }
      });

      div.querySelector('.space-dimensions').addEventListener('input', (e) => {
        Storage.updateSpace(this.state, space.id, { dimensions: e.target.value });
        this.onSave();
      });

      div.querySelector('.space-notes').addEventListener('input', (e) => {
        Storage.updateSpace(this.state, space.id, { notes: e.target.value });
        this.onSave();
      });

      container.appendChild(div);
    });
  }

  // 하단 공간 태그의 상태 도트 갱신
  _updateSpaceTagDots() {
    const spaces = this.state.spaces || [];
    document.querySelectorAll('.space-tag').forEach(tag => {
      const nameEl = tag.querySelector('.space-tag-name');
      const dotEl  = tag.querySelector('.space-dot');
      if (!nameEl || !dotEl) return;
      const space = spaces.find(s => s.name === nameEl.textContent);
      if (space) dotEl.className = `space-dot dot-${space.status}`;
    });
  }

  // 공간별 탭으로 전환 + 해당 카드 하이라이트
  openSpaceCard(spaceName) {
    this.switchTab('spaces');
    setTimeout(() => {
      document.querySelectorAll('.space-card').forEach(card => {
        const nameEl = card.querySelector('.space-card-name');
        if (nameEl && nameEl.textContent === spaceName) {
          card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          card.classList.add('highlight');
          setTimeout(() => card.classList.remove('highlight'), 1400);
        }
      });
    }, 50);
  }

  // ═══════════════════════════════════════════
  // 결정사항 탭
  // ═══════════════════════════════════════════

  renderDecisions() {
    const container = document.getElementById('decisionList');
    if (!container) return;
    container.innerHTML = '';

    const decisions = this.state.decisions || [];
    if (!decisions.length) {
      container.innerHTML = `
        <div class="empty-decisions">
          위 버튼으로 결정사항을 기록하세요.
        </div>`;
      return;
    }

    ['confirmed', 'pending', 'research'].forEach(type => {
      const items = decisions.filter(d => d.type === type);
      if (!items.length) return;
      const dt = DECISION_TYPES[type];

      const group = document.createElement('div');
      group.className = 'decision-group';
      group.innerHTML = `<div class="decision-group-header">${dt.emoji} ${dt.label}</div>`;

      items.forEach(dec => {
        const item = document.createElement('div');
        item.className = 'decision-item';
        const spaceTag = dec.spaceName
          ? `<span class="decision-space">${escapeHtml(dec.spaceName)}</span>` : '';
        item.innerHTML = `
          <div class="decision-item-body">
            ${spaceTag}
            <span class="decision-text">${escapeHtml(dec.text)}</span>
          </div>
          <button class="decision-del" title="삭제">×</button>
        `;
        item.querySelector('.decision-del').addEventListener('click', () => {
          Storage.deleteDecision(this.state, dec.id);
          this.onSave();
          this.renderDecisions();
        });
        group.appendChild(item);
      });
      container.appendChild(group);
    });
  }

  // ═══════════════════════════════════════════
  // 노트 탭 (캔버스 마커 연동)
  // ═══════════════════════════════════════════

  renderNotes() {
    const plan  = Storage.getCurrentPlan(this.state);
    const notes = plan.notes || [];

    const list = document.getElementById('notesList');
    if (!list) return;
    list.innerHTML = '';

    if (!notes.length) {
      list.innerHTML = `
        <div class="empty-notes">
          <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#D1D5DB" stroke-width="1.5" style="margin:0 auto 8px">
            <circle cx="12" cy="12" r="9"/>
            <path stroke-linecap="round" d="M12 8v4m0 4h.01"/>
          </svg>
          <p>도면 위에 노트 마커(①)를<br>배치하면 여기에 표시됩니다.</p>
        </div>`;
    } else {
      [...notes].sort((a, b) => a.number - b.number).forEach(note => {
        const div = document.createElement('div');
        div.className = 'note-item';
        div.innerHTML = `
          <div class="note-badge">${note.number}</div>
          <textarea class="note-textarea" placeholder="특이사항, 요청사항...">${escapeHtml(note.text)}</textarea>
        `;
        const ta = div.querySelector('.note-textarea');
        ta.addEventListener('input', () => {
          note.text = ta.value;
          this.onSave();
        });
        list.appendChild(div);
      });
    }

    this.updateNotesBadge(notes.length);
  }

  updateNotesBadge(count) {
    const badge = document.getElementById('notesTabBadge');
    if (badge) badge.textContent = count > 0 ? ` (${count})` : '';
  }

  // ═══════════════════════════════════════════
  // 미팅 요약 인쇄
  // ═══════════════════════════════════════════

  printSummary() {
    const state       = this.state;
    const plan        = Storage.getCurrentPlan(state);
    const canvasImg   = this.canvas.canvas.toDataURL('image/png', 0.85);

    const agendaHtml = (state.agenda || []).map(a => `
      <li class="${a.done ? 'ps-done' : ''}">
        ${a.done ? '☑' : '☐'} ${escapeHtml(a.text)}
      </li>`).join('');

    const spacesHtml = (state.spaces || [])
      .filter(s => s.notes || s.dimensions)
      .map(s => `
        <div class="ps-space">
          <h4>${escapeHtml(s.name)}${s.dimensions ? ` <small>(${escapeHtml(s.dimensions)})</small>` : ''}</h4>
          <p>${escapeHtml(s.notes || '').replace(/\n/g, '<br>')}</p>
        </div>`).join('');

    const decisionsHtml = ['confirmed', 'pending', 'research'].map(type => {
      const items = (state.decisions || []).filter(d => d.type === type);
      if (!items.length) return '';
      const dt = DECISION_TYPES[type];
      return `
        <div class="ps-dec-group">
          <h4>${dt.emoji} ${dt.label}</h4>
          <ul>${items.map(d =>
            `<li>${d.spaceName ? `<b>[${escapeHtml(d.spaceName)}]</b> ` : ''}${escapeHtml(d.text)}</li>`
          ).join('')}</ul>
        </div>`;
    }).join('');

    const notesHtml = (plan.notes || [])
      .filter(n => n.text)
      .sort((a, b) => a.number - b.number)
      .map(n => `<li><span class="ps-note-num">${n.number}</span> ${escapeHtml(n.text)}</li>`)
      .join('');

    const actionItemsHtml = (state.actionItems || [])
      .map(a => `<li class="${a.done ? 'ps-done' : ''}">${a.done ? '☑' : '☐'} ${escapeHtml(a.text)}</li>`)
      .join('');

    const printDiv = document.createElement('div');
    printDiv.id = 'printView';
    printDiv.innerHTML = `
      <style>
        #printView{font-family:'Apple SD Gothic Neo','Noto Sans KR',sans-serif;color:#1A1A2E;padding:20mm 22mm;max-width:900px;margin:0 auto}
        .ps-hd{border-bottom:2px solid #1A1A2E;padding-bottom:10px;margin-bottom:18px;display:flex;justify-content:space-between;align-items:flex-end}
        .ps-hd h1{font-size:18px;letter-spacing:5px;margin:0 0 2px}
        .ps-hd p{font-size:11px;color:#6B7280;margin:0}
        .ps-hd-r{text-align:right;font-size:11px;color:#6B7280}
        .ps-sec{margin-bottom:18px}
        .ps-sec h3{font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#9CA3AF;border-bottom:1px solid #E5E7EB;padding-bottom:4px;margin:0 0 10px}
        .ps-floor img{max-width:100%;border:1px solid #E5E7EB;border-radius:4px}
        .ps-agenda ul{list-style:none;padding:0;column-count:2;column-gap:24px}
        .ps-agenda li{padding:3px 0;font-size:12px}
        .ps-agenda li.ps-done{color:#9CA3AF;text-decoration:line-through}
        .ps-space{margin-bottom:10px}
        .ps-space h4{font-size:12px;font-weight:700;margin:0 0 2px}
        .ps-space small{font-weight:400;color:#6B7280}
        .ps-space p{font-size:11px;color:#374151;margin:0;padding-left:10px}
        .ps-dec-group{margin-bottom:8px}
        .ps-dec-group h4{font-size:11px;font-weight:700;margin:0 0 3px}
        .ps-dec-group ul{list-style:disc;padding-left:16px;margin:0}
        .ps-dec-group li{font-size:11px;margin-bottom:2px}
        .ps-notes ul{list-style:none;padding:0}
        .ps-notes li{font-size:11px;padding:2px 0;display:flex;gap:8px;align-items:flex-start}
        .ps-note-num{display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;background:#E8400C;color:#fff;font-size:9px;font-weight:700;flex-shrink:0}
        .ps-next{background:#F9FAFB;border:1px solid #E5E7EB;border-radius:5px;padding:8px 12px;font-size:12px}
        .ps-sign{margin-top:28px;padding-top:14px;border-top:1px solid #E5E7EB}
        .ps-sign p{font-size:11px;color:#6B7280;margin:0 0 20px}
        .ps-sign-boxes{display:flex;gap:32px}
        .ps-sign-box{flex:1;border-bottom:1px solid #1A1A2E;padding-bottom:3px;font-size:10px;color:#9CA3AF}
      </style>

      <div class="ps-hd">
        <div>
          <h1>DASIFILL</h1>
          <p>Layout - Meeting &nbsp;|&nbsp; ${escapeHtml(state.projectName || '─')}</p>
        </div>
        <div class="ps-hd-r">${new Date().toLocaleDateString('ko-KR', {year:'numeric',month:'long',day:'numeric'})}</div>
      </div>

      <div class="ps-sec ps-floor">
        <h3>도면</h3>
        <img src="${canvasImg}" alt="floor plan">
      </div>

      <div class="ps-sec ps-agenda">
        <h3>미팅 어젠다</h3>
        <ul>${agendaHtml}</ul>
      </div>

      ${spacesHtml ? `<div class="ps-sec"><h3>공간별 요구사항</h3>${spacesHtml}</div>` : ''}

      ${decisionsHtml ? `<div class="ps-sec"><h3>결정사항</h3>${decisionsHtml}</div>` : ''}

      ${notesHtml ? `<div class="ps-sec ps-notes"><h3>현장 노트</h3><ul>${notesHtml}</ul></div>` : ''}

      ${actionItemsHtml ? `
        <div class="ps-sec">
          <h3>후속 액션</h3>
          <ul class="ps-agenda">${actionItemsHtml}</ul>
        </div>` : ''}

      <div class="ps-sign">
        <p>위 미팅 내용을 확인하였습니다.</p>
        <div class="ps-sign-boxes">
          <div class="ps-sign-box">날짜: _______________</div>
          <div class="ps-sign-box">고객 서명: _______________</div>
          <div class="ps-sign-box">디자이너: _______________</div>
        </div>
      </div>
    `;

    document.body.appendChild(printDiv);
    window.print();
    document.body.removeChild(printDiv);
  }
}
