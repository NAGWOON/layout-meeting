/* ============================================
   SUMMARY BUILDER — 문장형 요약 생성기
   회의록 수준의 Markdown 출력 담당
   ============================================ */

// ──────────────────────────────────────────
// 문장 템플릿 (questionId → 자연어 문장)
// a = 원본 answer 값, v = 포맷된 문자열
// ──────────────────────────────────────────
const SENTENCE_TEMPLATES = {
  // 현관
  'ent-storage-scale': (a, v) => `신발 수납은 **${v}** 규모로 계획합니다`,
  'ent-storage-items': (a, v) => `현관 추가 수납 품목: ${v}`,
  'ent-bench':         (a, v) => `착화 벤치/의자: **${v}**`,
  'ent-style':         (a, v) => `현관 분위기는 **${v}** 방향으로 합니다`,
  'ent-floor':         (a, v) => `현관 바닥은 **${v}**로 시공합니다`,

  // 거실
  'lr-main-use':       (a, v) => `거실은 **${v}** 중심으로 사용합니다`,
  'lr-tv':             (a, v) => `TV는 **${v}** 방식으로 설치합니다`,
  'lr-floor':          (a, v) => `거실 바닥재는 **${v}**로 시공합니다`,
  'lr-sofa':           (a, v) => `소파는 **${v}** 스타일을 선호합니다`,
  'lr-wall':           (a, v) => `TV 뒤 포인트 월은 **${v}**로 처리합니다`,
  'lr-lighting':       (a, v) => `거실 조명은 **${v}** 방향으로 구성합니다`,
  'lr-storage-need':   (a, v) => `거실 수납 규모는 **${v}**으로 계획합니다`,
  'lr-special-item':   (a, v) => `배치 예정 특별 아이템: ${v}`,

  // 주방
  'kitch-island':           (a, v) => `주방 아일랜드/식탁 구성: **${v}**`,
  'kitch-dining-size':      (a, v) => `**${v}** 기준으로 식탁을 배치합니다`,
  'kitch-style':            (a, v) => `주방 스타일은 **${v}**으로 합니다`,
  'kitch-counter':          (a, v) => `카운터 상판은 **${v}**로 시공합니다`,
  'kitch-floor':            (a, v) => `주방 바닥은 **${v}**로 처리합니다`,
  'kitch-cook-freq':        (a, v) => `요리 빈도: ${v} → 작업 동선·수납 계획에 반영합니다`,
  'kitch-storage-priority': (a, v) => `주방 수납 우선 항목: ${v}`,

  // 안방
  'mb-bed-size': (a, v) => `침대 사이즈는 **${v}**로 결정합니다`,
  'mb-tv':       (a, v) => `안방 TV: **${v}**`,
  'mb-working':  (a, v) => `작업 공간(책상): **${v}**`,
  'mb-style':    (a, v) => `안방 분위기는 **${v}**으로 합니다`,
  'mb-lighting': (a, v) => `안방 조명: **${v}**`,

  // 드레스룸
  'dr-type':     (a, v) => `드레스룸은 **${v}**으로 구성합니다`,
  'dr-category': (a, v) => `수납 대상 의류/소품: ${v}`,
  'dr-mirror':   (a, v) => `전신 거울 위치: **${v}**`,
  'dr-lighting': (a, v) => `드레스룸 조명: **${v}**`,

  // 자녀방/서재
  'ks-purpose':   (a, v) => `이 방의 용도는 **${v}**입니다`,
  'ks-child-age': (a, v) => `자녀 나이대: ${v} → 가구 높이·안전 기준 적용`,
  'ks-desk':      (a, v) => `학습 공간 필요도: **${v}**`,
  'ks-bed':       (a, v) => `침대 구성: **${v}**`,

  // 공용욕실
  'sb-bath':     (a, v) => `욕조: **${v}**`,
  'sb-style':    (a, v) => `공용욕실 스타일: **${v}**`,
  'sb-priority': (a, v) => `욕실 개선 우선 항목: ${v}`,

  // 안방욕실
  'mab-bath':        (a, v) => `안방욕실 욕조: **${v}**`,
  'mab-style':       (a, v) => `안방욕실 분위기: **${v}**`,
  'mab-double-sink': (a, v) => `세면대 구성: **${v}**`,

  // 세탁실
  'lau-washer':  (a, v) => `세탁기/건조기 구성: **${v}**`,
  'lau-sink':    (a, v) => `세탁실 싱크(개수대): **${v}**`,
  'lau-storage': (a, v) => `다용도 수납 품목: ${v}`,

  // 기타
  'oth-wishlist': (a, v) => `"${v}"`,
};

// ──────────────────────────────────────────
// 분류 규칙
// ──────────────────────────────────────────
// must  : required:true → 반드시 반영해야 할 결정사항
// nice  : required:false, 선택형 → 선호도/방향
// note  : short-text / memo 필드 → 직접 기재 메모
const SPECIAL_IDS = new Set([
  'oth-concerns', 'oth-absolute-no', 'oth-followup',
  'g-allergy', 'g-must-keep', 'oth-wishlist', 'oth-space'
]);

// ──────────────────────────────────────────
// SummaryBuilder
// ──────────────────────────────────────────
const SummaryBuilder = {

  classify(q) {
    if (SPECIAL_IDS.has(q.id)) return 'special';
    if (q.required) return 'must';
    if (q.type === 'short-text') return 'note';
    return 'nice';
  },

  // 표시용 값 문자열
  formatValue(q, answer) {
    if (answer === null || answer === undefined) return '';
    if (Array.isArray(answer)) {
      if (!answer.length) return '';
      if (q.type === 'priority') return answer.join(' → ');
      return answer.join(', ');
    }
    return String(answer).trim();
  },

  // 마크다운용 완전 문장
  toSentence(q, answer) {
    const val = this.formatValue(q, answer);
    if (!val) return null;
    const tmpl = SENTENCE_TEMPLATES[q.id];
    if (tmpl) return tmpl(answer, val);
    return `${q.summary.label}: **${val}**`;
  },

  // 공간 하나의 답변을 must/nice/notes 로 분류
  groupSpaceAnswers(space, answers) {
    const must = [], nice = [], notes = [];
    space.sections.forEach(sec => {
      sec.questions.forEach(q => {
        const a = answers[q.id];
        if (!this._hasValue(a)) return;
        const cls = this.classify(q);
        if (cls === 'special') return; // special 섹션에서 따로 처리
        const sentence = this.toSentence(q, a);
        if (!sentence) return;
        if (cls === 'must') must.push(sentence);
        else if (cls === 'nice') nice.push(sentence);
        else notes.push(String(a).trim());
      });
    });
    return { must, nice, notes };
  },

  // 패널용 컴팩트 rows
  panelRows(space, answers) {
    const must = [], nice = [], notes = [];
    space.sections.forEach(sec => {
      sec.questions.forEach(q => {
        const a = answers[q.id];
        if (!this._hasValue(a)) return;
        const cls = this.classify(q);
        if (cls === 'special') return;
        const val = this.formatValue(q, a);
        if (!val) return;
        const row = { qid: q.id, spaceId: space.id, label: q.summary.label, val };
        if (cls === 'must') must.push(row);
        else if (cls === 'nice') nice.push(row);
        else notes.push(row);
      });
    });
    return { must, nice, notes };
  },

  // 특별 섹션 추출
  specialSections(answers) {
    return {
      painPoints: this._text(answers['oth-concerns']),
      absoluteNo: this._text(answers['oth-absolute-no']),
      followUp:   this._text(answers['oth-followup']),
      allergy:    this._text(answers['g-allergy']),
      mustKeep:   this._text(answers['g-must-keep']),
      wishlist:   this._text(answers['oth-wishlist']),
      extraSpace: this._text(answers['oth-space']),
    };
  },

  // 전체 키워드 수집
  collectKeywords(answers) {
    const kw = [];
    const push = (v) => { if (v && !kw.includes(v)) kw.push(v); };
    [INTERVIEW_DATA.globalPreferences, ...INTERVIEW_DATA.spaces].forEach(sp => {
      sp.sections.forEach(sec => {
        sec.questions.forEach(q => {
          if (!q.summary.keyword || !this._hasValue(answers[q.id])) return;
          const a = answers[q.id];
          if (Array.isArray(a)) a.forEach(push);
          else push(String(a).trim());
        });
      });
    });
    return kw.slice(0, 18);
  },

  // ────────────────────────────────────────
  // 전체 Markdown 생성 (노션 바로 붙여넣기용)
  // ────────────────────────────────────────
  buildMarkdown(state) {
    const { projectName, spaceName, meetingDate, answers } = state;
    const L = []; // lines
    const push = (...lines) => lines.forEach(l => L.push(l));

    // ── 헤더
    push(`# 1차 디자인 인터뷰 회의록`, '');
    push(`> 고객: ${projectName || '(미입력)'}`);
    if (spaceName) push(`> 공간: ${spaceName}`);
    push(`> 일자: ${meetingDate || new Date().toLocaleDateString('ko-KR')}`);
    push('', '---', '');

    // ── 전체 선호도 요약
    const globalLines = this._buildGlobalSection(answers);
    if (globalLines.length) {
      push('## 전체 선호도', '');
      globalLines.forEach(l => push(l));
      push('');
    }

    // ── 공간별 요구사항
    const hasAnySpace = INTERVIEW_DATA.spaces.some(sp => {
      const { must, nice, notes } = this.groupSpaceAnswers(sp, answers);
      return must.length || nice.length || notes.length;
    });

    if (hasAnySpace) {
      push('---', '', '## 공간별 요구사항', '');
      INTERVIEW_DATA.spaces.forEach(sp => {
        const { must, nice, notes } = this.groupSpaceAnswers(sp, answers);
        if (!must.length && !nice.length && !notes.length) return;

        push(`### ${sp.icon} ${sp.label}`, '');

        if (must.length) {
          push('#### ✅ MUST');
          must.forEach(s => push(`- ${s}`));
          push('');
        }
        if (nice.length) {
          push('#### 🔸 NICE TO HAVE');
          nice.forEach(s => push(`- ${s}`));
          push('');
        }
        if (notes.length) {
          push('#### 📝 메모');
          notes.forEach(n => push(`> ${n}`));
          push('');
        }
      });
    }

    // ── 주의사항 & 후속 처리
    const sp = this.specialSections(answers);
    const hasSpecial = sp.painPoints || sp.absoluteNo || sp.followUp || sp.allergy || sp.mustKeep || sp.extraSpace;
    if (hasSpecial) {
      push('---', '', '## ⚠️ 주의사항 및 후속 처리', '');

      if (sp.allergy) {
        push('#### 🚫 알레르기/민감 소재');
        push(`- ${sp.allergy}`);
        push('');
      }
      if (sp.absoluteNo) {
        push('#### 🚫 절대 하지 말 것 (Absolute No)');
        this._splitLines(sp.absoluteNo).forEach(l => push(`- ${l}`));
        push('');
      }
      if (sp.painPoints) {
        push('#### 💢 현재 Pain Point');
        this._splitLines(sp.painPoints).forEach(l => push(`- ${l}`));
        push('');
      }
      if (sp.mustKeep) {
        push('#### 📦 기존 유지 아이템');
        push(`- ${sp.mustKeep}`);
        push('');
      }
      if (sp.extraSpace) {
        push('#### 🏠 추가 논의 공간');
        push(`- ${sp.extraSpace}`);
        push('');
      }
      if (sp.followUp) {
        push('#### 🔍 후속 검토 항목');
        this._splitLines(sp.followUp).forEach(l => push(`- [ ] ${l}`));
        push('');
      }
    }

    // ── 위시리스트
    if (sp.wishlist) {
      push('---', '');
      push('## 💫 위시리스트');
      push(`> ${sp.wishlist}`);
      push('');
    }

    // ── 키워드
    const kw = this.collectKeywords(answers);
    if (kw.length) {
      push('---', '');
      push('## 🏷️ 키워드', '');
      push(kw.map(k => `#${k}`).join('  '));
    }

    return L.join('\n');
  },

  // ────────────────────────────────────────
  // JSON export (구조화)
  // ────────────────────────────────────────
  buildJSON(state) {
    const out = {
      meta: {
        projectName: state.projectName,
        spaceName: state.spaceName,
        meetingDate: state.meetingDate,
        exportedAt: new Date().toISOString()
      },
      global: {},
      spaces: {},
      special: this.specialSections(state.answers)
    };

    [INTERVIEW_DATA.globalPreferences, ...INTERVIEW_DATA.spaces].forEach(sp => {
      const bucket = sp.id === 'global' ? out.global : (out.spaces[sp.label] = {});
      sp.sections.forEach(sec => {
        sec.questions.forEach(q => {
          const a = state.answers[q.id];
          if (!this._hasValue(a)) return;
          bucket[q.summary.label] = a;
        });
      });
    });

    return JSON.stringify(out, null, 2);
  },

  // ────────────────────────────────────────
  // 전체 선호도 섹션 (마크다운 줄 배열)
  // ────────────────────────────────────────
  _buildGlobalSection(answers) {
    const lines = [];

    const household = answers['g-household'];
    const style     = answers['g-style-direction'];
    const color     = answers['g-color-tone'];
    const material  = answers['g-material-pref'];
    const priority  = answers['g-priority-value'];
    const tempo     = answers['g-lifestyle-tempo'];
    const hosting   = answers['g-hosting'];
    const budgetP   = answers['g-budget-priority'];
    const ref       = answers['g-reference'];

    if (household && household.length)
      lines.push(`거주 구성원은 **${[].concat(household).join(', ')}**입니다.`);
    if (tempo) lines.push(`생활 패턴: ${tempo}`);
    if (hosting) lines.push(`손님 초대 빈도: ${hosting}`);

    if (style && style.length) {
      lines.push('');
      lines.push(`전체 스타일 방향은 **${[].concat(style).join(', ')}** 으로 결정했습니다.`);
    }
    if (color)     lines.push(`색감은 **${color}** 을 선호합니다.`);
    if (material && material.length) lines.push(`선호 소재: ${[].concat(material).join(', ')}`);

    if (priority && priority.length) {
      const rankStr = priority.map((v, i) => `**${i+1}위 ${v}**`).join(' → ');
      lines.push(`핵심 가치 우선순위: ${rankStr}`);
    }

    if (ref) {
      lines.push('');
      lines.push(`> 📌 레퍼런스 키워드: "${ref}"`);
    }
    if (budgetP && budgetP.length) {
      lines.push(`💰 예산 집중 공간: ${budgetP.map((v, i) => `${i+1}위 ${v}`).join(' → ')}`);
    }

    return lines;
  },

  // ────────────────────────────────────────
  // Private helpers
  // ────────────────────────────────────────
  _hasValue(a) {
    if (a === null || a === undefined) return false;
    if (typeof a === 'string') return a.trim() !== '';
    if (Array.isArray(a)) return a.length > 0;
    return false;
  },

  _text(v) {
    if (!v) return null;
    const s = String(v).trim();
    return s || null;
  },

  _splitLines(str) {
    // 줄바꿈만 구분자로 사용 (콤마는 문장 내 쉼표일 수 있으므로 분리 안 함)
    return str.split(/\n+/).map(s => s.trim()).filter(Boolean);
  }
};
