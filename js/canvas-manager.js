'use strict';

class CanvasManager {
  constructor() {
    this.canvas      = null;
    this.currentTool = TOOLS.SELECT;

    this._history    = [];
    this._historyIdx = -1;
    this._isSaving   = false;
    this._isLoading  = false;

    // App callbacks
    this.onNoteAdded    = null;
    this.onNoteRemoved  = null;
    this.onNotesSync    = null;
    this.onStateChanged = null;
    this.onToolChanged  = null;
  }

  // ═══════════════════════════════════════════
  // 초기화
  // ═══════════════════════════════════════════

  init(canvasId, width, height) {
    this.canvas = new fabric.Canvas(canvasId, {
      width,
      height,
      selection:              true,
      preserveObjectStacking: true,
      backgroundColor:        CONFIG.CANVAS_BG,
    });
    this._bindEvents();
    this._saveState();
  }

  // ═══════════════════════════════════════════
  // 이벤트 바인딩
  // ═══════════════════════════════════════════

  _bindEvents() {
    const c = this.canvas;

    c.on('object:modified', () => {
      if (this._isLoading) return;
      this._saveState();
    });

    c.on('object:removed', (e) => {
      if (this._isLoading) return;
      const obj = e.target;
      if (obj?.data?.type === 'note' && this.onNoteRemoved) {
        this.onNoteRemoved(obj.data.noteId);
      }
      this._saveState();
    });

    c.on('mouse:down', (opt) => {
      if (this._isLoading) return;
      if (this.currentTool === TOOLS.NOTE) {
        const p = c.getPointer(opt.e);
        this._placeNoteMarker(p.x, p.y);
      }
      if (this.currentTool === TOOLS.TEXT) {
        const p = c.getPointer(opt.e);
        this._placeText(p.x, p.y);
      }
    });

    // 키보드 단축키
    document.addEventListener('keydown', (e) => {
      const tag = e.target.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        this.removeSelected();
      }
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'z') {
        e.preventDefault(); this.undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
        e.preventDefault(); this.redo();
      }
    });
  }

  // ═══════════════════════════════════════════
  // 줌 버튼 컨트롤 (버튼 전용, 드래그/휠 없음)
  // ═══════════════════════════════════════════

  zoomIn() {
    const zoom = Math.min(this.canvas.getZoom() * 1.25, 6);
    const cx   = this.canvas.width  / 2;
    const cy   = this.canvas.height / 2;
    this.canvas.zoomToPoint({ x: cx, y: cy }, zoom);
    this.canvas.renderAll();
  }

  zoomOut() {
    const zoom = Math.max(this.canvas.getZoom() / 1.25, 0.2);
    const cx   = this.canvas.width  / 2;
    const cy   = this.canvas.height / 2;
    this.canvas.zoomToPoint({ x: cx, y: cy }, zoom);
    this.canvas.renderAll();
  }

  resetZoom() {
    this.canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    this.canvas.renderAll();
  }

  // ═══════════════════════════════════════════
  // 노트 마커
  // ═══════════════════════════════════════════

  _placeNoteMarker(x, y) {
    const existing = this.canvas.getObjects()
      .filter(o => o?.data?.type === 'note');
    const number = existing.length
      ? Math.max(...existing.map(o => o.data.noteNumber)) + 1
      : 1;
    const noteId = `note_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    const circle = new fabric.Circle({
      radius: 9, fill: '#E8400C', stroke: '#FFFFFF', strokeWidth: 1.5,
      originX: 'center', originY: 'center',
    });
    const text = new fabric.Text(String(number), {
      fontSize: 8, fontWeight: 'bold', fill: '#FFFFFF',
      fontFamily: 'Arial, sans-serif',
      originX: 'center', originY: 'center',
    });
    const group = new fabric.Group([circle, text], {
      left: x - 9, top: y - 9,
      data: { type: 'note', noteId, noteNumber: number },
    });
    this.canvas.add(group);
    this.canvas.renderAll();
    this._saveState();
    if (this.onNoteAdded) this.onNoteAdded(noteId, number);
  }

  // ═══════════════════════════════════════════
  // 텍스트 레이블
  // ═══════════════════════════════════════════

  _placeText(x, y) {
    const itext = new fabric.IText('텍스트', {
      left: x, top: y,
      fontSize: 13, fontWeight: '600',
      fill: '#0A0A10',
      fontFamily: 'Apple SD Gothic Neo, Noto Sans KR, Arial, sans-serif',
      backgroundColor: 'rgba(255,255,255,0.88)',
      padding: 3,
      data: { type: 'text' },
    });
    this.canvas.add(itext);
    this.canvas.setActiveObject(itext);
    itext.enterEditing();
    itext.selectAll();
    this.canvas.renderAll();

    itext.on('editing:exited', () => {
      if (!itext.text || itext.text.trim() === '') {
        this.canvas.remove(itext);
      }
      this._saveState();
    });

    this.setTool(TOOLS.SELECT);
    if (this.onToolChanged) this.onToolChanged(TOOLS.SELECT);
  }

  // ═══════════════════════════════════════════
  // 스티커 (투명 배경, 소형)
  // ═══════════════════════════════════════════

  addSticker(stickerConfig) {
    const emoji = new fabric.Text(stickerConfig.emoji || '●', {
      fontSize: 20, originX: 'center', originY: 'center', left: 14, top: 12,
    });
    const label = new fabric.Text(stickerConfig.label, {
      fontSize: 7, fontWeight: 'bold', fill: '#374151',
      fontFamily: 'Apple SD Gothic Neo, Arial, sans-serif',
      originX: 'center', originY: 'center', left: 14, top: 24,
    });
    const group = new fabric.Group([emoji, label], {
      left: this.canvas.width  / 2 - 14,
      top:  this.canvas.height / 2 - 14,
      data: { type: 'sticker', stickerId: stickerConfig.id, label: stickerConfig.label },
    });
    this.canvas.add(group);
    this.canvas.setActiveObject(group);
    this.canvas.renderAll();
    this._saveState();
  }

  // ═══════════════════════════════════════════
  // 공간 명칭 레이블
  // ═══════════════════════════════════════════

  addSpaceLabel(name) {
    const fontSize = 12;
    const px = 8, py = 5;
    const approxW = Math.max(name.length * fontSize * 0.6 + px * 2, 52);
    const approxH = fontSize + py * 2;

    const bg = new fabric.Rect({
      width: approxW, height: approxH,
      fill: 'rgba(255,255,255,0.92)', stroke: '#0A0A10',
      strokeWidth: 1.2, rx: 3, ry: 3,
    });
    const txt = new fabric.Text(name, {
      fontSize, fontWeight: '600', fill: '#0A0A10',
      fontFamily: 'Apple SD Gothic Neo, Arial, sans-serif',
      originX: 'center', originY: 'center',
      left: approxW / 2, top: approxH / 2,
    });
    const group = new fabric.Group([bg, txt], {
      left: this.canvas.width  / 2 - approxW / 2,
      top:  this.canvas.height / 2 - approxH / 2,
      data: { type: 'spaceLabel', name },
    });
    this.canvas.add(group);
    this.canvas.setActiveObject(group);
    this.canvas.renderAll();
    this._saveState();
  }

  // ═══════════════════════════════════════════
  // 도구 전환
  // ═══════════════════════════════════════════

  setTool(toolName) {
    this.currentTool         = toolName;
    this.canvas.isDrawingMode = false;

    if (toolName === TOOLS.SELECT || toolName === TOOLS.ERASER) {
      this.canvas.selection = true;
      this.canvas.forEachObject(o => { o.selectable = true; o.evented = true; });
    } else {
      this.canvas.selection = false;
      this.canvas.discardActiveObject();
      this.canvas.renderAll();
    }
  }

  removeSelected() {
    const active = this.canvas.getActiveObject();
    if (!active) return;
    this.canvas.remove(active);
    this.canvas.discardActiveObject();
    this.canvas.renderAll();
  }

  // ═══════════════════════════════════════════
  // 도면 배경 로드 (캔버스 크기에 맞춤)
  // ═══════════════════════════════════════════

  loadFloorPlan(src) {
    this.canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    fabric.Image.fromURL(src, (img) => {
      if (!img) return;
      const scale = Math.min(
        this.canvas.width  / img.width,
        this.canvas.height / img.height,
      );
      img.set({
        scaleX: scale, scaleY: scale,
        originX: 'center', originY: 'center',
        left: this.canvas.width  / 2,
        top:  this.canvas.height / 2,
      });
      this.canvas.setBackgroundImage(img, this.canvas.renderAll.bind(this.canvas));
    }, { crossOrigin: 'anonymous' });
  }

  fitFloorPlan() {
    const bg = this.canvas.backgroundImage;
    if (!bg) return;
    this.canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    const newScale = Math.min(
      this.canvas.width  / bg.width,
      this.canvas.height / bg.height,
    );
    bg.set({
      scaleX: newScale, scaleY: newScale,
      originX: 'center', originY: 'center',
      left: this.canvas.width  / 2,
      top:  this.canvas.height / 2,
    });
    this.canvas.renderAll();
  }

  // ═══════════════════════════════════════════
  // Undo / Redo
  // ═══════════════════════════════════════════

  undo() {
    if (this._historyIdx <= 0) return;
    this._historyIdx--;
    this._loadHistoryState(this._history[this._historyIdx]);
  }

  redo() {
    if (this._historyIdx >= this._history.length - 1) return;
    this._historyIdx++;
    this._loadHistoryState(this._history[this._historyIdx]);
  }

  _saveState() {
    if (this._isSaving || this._isLoading) return;
    this._isSaving = true;
    const json = this.serialize();
    this._history = this._history.slice(0, this._historyIdx + 1);
    this._history.push(JSON.stringify(json));
    this._historyIdx++;
    if (this._history.length > CONFIG.MAX_HISTORY) {
      this._history.shift();
      this._historyIdx--;
    }
    this._isSaving = false;
    if (this.onStateChanged) this.onStateChanged();
  }

  _loadHistoryState(jsonStr) {
    this._isLoading = true;
    const bgImg = this.canvas.backgroundImage;
    const json  = JSON.parse(jsonStr);

    this.canvas.loadFromJSON(json, () => {
      const finish = () => {
        this.canvas.renderAll();
        this._isLoading = false;
        this._syncNotesFromCanvas();
        if (this.onStateChanged) this.onStateChanged();
      };
      if (bgImg) {
        this.canvas.setBackgroundImage(bgImg, finish);
      } else {
        finish();
      }
    });
  }

  _syncNotesFromCanvas() {
    const markers = this.canvas.getObjects()
      .filter(o => o?.data?.type === 'note')
      .map(o => ({ id: o.data.noteId, number: o.data.noteNumber }));
    if (this.onNotesSync) this.onNotesSync(markers);
  }

  // ═══════════════════════════════════════════
  // 직렬화 / 역직렬화
  // ═══════════════════════════════════════════

  serialize() {
    const json = this.canvas.toJSON(['data']);
    delete json.backgroundImage;
    return json;
  }

  deserialize(json, floorPlanSrc) {
    this._isLoading  = true;
    this._history    = [];
    this._historyIdx = -1;

    // Apply floor plan background AFTER loadFromJSON, because loadFromJSON
    // calls canvas.clear() internally which wipes any previously set background.
    const applyBackground = (callback) => {
      if (floorPlanSrc) {
        this.canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
        fabric.Image.fromURL(floorPlanSrc, (img) => {
          if (!img) { callback(); return; }
          const scale = Math.min(
            this.canvas.width  / img.width,
            this.canvas.height / img.height,
          );
          img.set({
            scaleX: scale, scaleY: scale,
            originX: 'center', originY: 'center',
            left: this.canvas.width  / 2,
            top:  this.canvas.height / 2,
          });
          this.canvas.setBackgroundImage(img, callback);
        }, { crossOrigin: 'anonymous' });
      } else {
        this.canvas.setBackgroundImage(null, () => {});
        callback();
      }
    };

    const finish = () => {
      this.canvas.renderAll();
      this._isLoading = false;
      this._saveState();
      this._syncNotesFromCanvas();
    };

    if (json) {
      this.canvas.loadFromJSON(json, () => applyBackground(finish));
    } else {
      this.canvas.clear();
      this.canvas.backgroundColor = CONFIG.CANVAS_BG;
      applyBackground(finish);
    }
  }
}
