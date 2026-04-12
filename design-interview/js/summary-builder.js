/* ============================================
   SUMMARY BUILDER — 설계 참고용 회의록 생성기
   ============================================ */

// ──────────────────────────────────────────
// 문장 템플릿 (questionId → 설계 결정문)
// a = 원본 answer 값, v = 포맷된 문자열
// ──────────────────────────────────────────
const SENTENCE_TEMPLATES = {

  // ── 현관 ──────────────────────────────
  'ent-storage-scale': (a, v) =>
    `신발 수납 **${v}** 기준으로 신발장 규모를 확정합니다`,
  'ent-storage-items': (a, v) =>
    `현관 수납 대상 품목: ${v} — 별도 수납 공간 확보 필요`,
  'ent-bench': (a, v) =>
    `착화 벤치/의자 **${v}** — 현관 동선 계획 시 반영`,
  'ent-style': (a, v) =>
    `현관 전체 분위기 **${v}** 방향으로 마감재 및 조명 계획`,
  'ent-floor': (a, v) =>
    `현관 바닥 **${v}** 시공 — 거실 바닥과의 경계 처리 방식 확인`,

  // ── 거실 ──────────────────────────────
  'lr-main-use': (a, v) =>
    `거실을 **${v}** 공간으로 활용 — 가구 배치 및 동선 계획 기준`,
  'lr-tv': (a, v) =>
    `TV **${v}** 설치 — 전기/배관 설계 및 벽체 보강 계획 반영`,
  'lr-floor': (a, v) =>
    `거실 바닥재 **${v}** 확정 — 현관/주방 경계 처리 방식 검토`,
  'lr-sofa': (a, v) =>
    `소파 **${v}** 스타일 선호 — 패브릭/마감재 컬러 제안 시 참고`,
  'lr-wall': (a, v) =>
    `TV 뒷벽 포인트 월 **${v}** 처리 — 전기 콘센트·미디어 배선 통합 설계`,
  'lr-lighting': (a, v) =>
    `거실 조명 **${v}** 계획 — 전기 설계 단계에서 회로 분리 반영`,
  'lr-storage-need': (a, v) =>
    `거실 수납 **${v}** 규모 — 수납 가구 위치 및 벽면 활용 계획`,
  'lr-special-item': (a, v) =>
    `설치 예정 특별 아이템: **${v}** — 위치·전기·구조 보강 사전 협의 필요`,

  // ── 주방 ──────────────────────────────
  'kitch-island': (a, v) =>
    `주방 구성 **${v}** 확정 — 아일랜드 규격 및 가스/전기 라인 계획`,
  'kitch-dining-size': (a, v) =>
    `**${v}** 기준 식탁 배치 — 주방 동선 및 아일랜드 간격 설계 반영`,
  'kitch-style': (a, v) =>
    `주방 스타일 **${v}** 확정 — 상부장·하부장·도어 샘플 제안 기준`,
  'kitch-counter': (a, v) =>
    `카운터 상판 **${v}** 확정 — 엣지 처리 및 세부 마감 방식 협의`,
  'kitch-floor': (a, v) =>
    `주방 바닥 **${v}** 처리 — 거실과의 경계 구분 여부 확정`,
  'kitch-cook-freq': (a, v) =>
    `요리 빈도 **${v}** — 환기·수납·작업 동선 설계에 우선 반영`,
  'kitch-storage-priority': (a, v) =>
    `주방 수납 우선 항목: **${v}** — 하부장·상부장·팬트리 구성 기준`,

  // ── 안방 ──────────────────────────────
  'mb-bed-size': (a, v) =>
    `침대 **${v}** 확정 — 안방 가구 배치 및 동선 계획 기준`,
  'mb-tv': (a, v) =>
    `안방 TV **${v}** — 배선 및 시청 동선 반영`,
  'mb-working': (a, v) =>
    `안방 작업/화장 공간 **${v}** — 가구 배치 및 콘센트 위치 확인`,
  'mb-style': (a, v) =>
    `안방 분위기 **${v}** 확정 — 침구·조명·마감재 제안 기준`,
  'mb-lighting': (a, v) =>
    `안방 조명 **${v}** 계획 — 간접 회로 및 스위치 위치 설계 반영`,

  // ── 드레스룸 ──────────────────────────
  'dr-type': (a, v) =>
    `드레스룸 **${v}** 구성 확정 — 도어 유무에 따른 공간 분리 계획`,
  'dr-category': (a, v) =>
    `수납 대상: **${v}** — 행거·선반·서랍 비율 설계 기준`,
  'dr-mirror': (a, v) =>
    `전신 거울 **${v}** 위치 확정 — 조명 배치와 연계 설계`,
  'dr-lighting': (a, v) =>
    `드레스룸 조명 **${v}** — 색 온도 및 연색성(Ra) 기준 적용`,

  // ── 자녀방/서재 ───────────────────────
  'ks-purpose': (a, v) =>
    `이 방의 용도 **${v}** 확정 — 가구 구성 및 콘센트 계획 기준`,
  'ks-child-age': (a, v) =>
    `자녀 나이 **${v}** — 가구 높이 기준·안전 마감·모서리 처리 적용`,
  'ks-desk': (a, v) =>
    `학습/작업 공간 **${v}** — 책상 배치 위치 및 조명·콘센트 계획`,
  'ks-bed': (a, v) =>
    `침대 구성 **${v}** 확정 — 공간 활용 및 안전 기준 반영`,

  // ── 공용욕실 ──────────────────────────
  'sb-bath': (a, v) =>
    `욕조 **${v}** — 방수·배관 설계 및 공간 재배치 계획`,
  'sb-style': (a, v) =>
    `공용욕실 스타일 **${v}** — 타일 샘플 제안 기준`,
  'sb-priority': (a, v) =>
    `욕실 개선 우선 항목: **${v}** — 공사 범위 및 예산 배분 기준`,

  // ── 안방욕실 ──────────────────────────
  'mab-bath': (a, v) =>
    `안방욕실 욕조 **${v}** — 배관·바닥 방수·공간 구획 사전 확인`,
  'mab-style': (a, v) =>
    `안방욕실 분위기 **${v}** 확정 — 타일·위생도기 제안 기준`,
  'mab-double-sink': (a, v) =>
    `세면대 **${v}** 확정 — 배관·수전 위치 및 수납 설계 반영`,

  // ── 세탁실 ────────────────────────────
  'lau-washer': (a, v) =>
    `세탁기/건조기 **${v}** 구성 — 급배수·전기 용량 및 공간 치수 확인`,
  'lau-sink': (a, v) =>
    `세탁실 개수대 **${v}** — 급배수 배관 및 위치 설계 반영`,
  'lau-storage': (a, v) =>
    `다용도 수납 대상: **${v}** — 선반·수납장 구성 계획`,

  // ── 기타 ──────────────────────────────
  'oth-wishlist': (a, v) => `"${v}"`,
};

// ──────────────────────────────────────────
// 분류 규칙
// must    : required:true   → 반드시 반영할 확정 결정사항
// nice    : required:false  → 선호 방향 (가능하면 반영)
// note    : short-text / memo → 설계 참고 배경 메모
// special : 별도 섹션 처리
// ──────────────────────────────────────────
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
      if (q.type === 'priority')
        return answer.map((v, i) => `${this._rankMark(i)} ${v}`).join('  ');
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

  // 공간 답변을 must/nice/notes 로 분류 (markdown 전용)
  groupSpaceAnswers(space, answers) {
    const must = [], nice = [], notes = [];
    space.sections.forEach(sec => {
      sec.questions.forEach(q => {
        const a = answers[q.id];
        if (!this._hasValue(a)) return;
        const cls = this.classify(q);
        if (cls === 'special') return;
        if (cls === 'note') { notes.push(String(a).trim()); return; }
        const sentence = this.toSentence(q, a);
        if (!sentence) return;
        if (cls === 'must') must.push(sentence);
        else nice.push(sentence);
      });
    });
    return { must, nice, notes };
  },

  // 패널용 컴팩트 rows + reason (메모 연결)
  panelRows(space, answers) {
    const must = [], nice = [], notes = [];
    const reasons = [];   // 공간 메모 → reason tag로 표시

    space.sections.forEach(sec => {
      sec.questions.forEach(q => {
        const a = answers[q.id];
        if (!this._hasValue(a)) return;
        const cls = this.classify(q);
        if (cls === 'special') return;

        if (cls === 'note') {
          reasons.push(String(a).trim());
          return;
        }

        const val = this.formatValue(q, a);
        if (!val) return;
        const row = {
          qid:    q.id,
          spaceId: space.id,
          label:  q.summary.label,
          val,
          isPriority: q.type === 'priority',
        };
        if (cls === 'must') must.push(row);
        else nice.push(row);
      });
    });

    return { must, nice, notes, reason: reasons.join(' / ') || null };
  },

  // 공간 완료 상태
  spaceStatus(space, answers) {
    let total = 0, answered = 0;
    space.sections.forEach(sec => {
      sec.questions.forEach(q => {
        if (q.required) {
          total++;
          if (this._hasValue(answers[q.id])) answered++;
        }
      });
    });
    const pct = total > 0 ? Math.round(answered / total * 100) : 0;
    let badge = '⬜ 미시작';
    if (total === 0)        badge = '─';
    else if (answered === total) badge = '✅ 완료';
    else if (answered > 0)  badge = '🔄 진행중';
    return { answered, total, pct, badge };
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
  // Markdown 생성 (설계 참고용 회의록)
  // ────────────────────────────────────────
  buildMarkdown(state) {
    const { projectName, spaceName, meetingDate, answers } = state;
    const L = [];
    const push = (...lines) => lines.forEach(l => L.push(l));

    // ── 1. 커버 헤더
    push(`# 1차 디자인 인터뷰 회의록`, '');
    push(`> 고객: **${projectName || '(미입력)'}**`);
    if (spaceName) push(`> 공간: ${spaceName}`);
    push(`> 일자: ${meetingDate || new Date().toLocaleDateString('ko-KR')}`);
    push(`> 작성: DASIFILL 디자인`);
    push('', '---', '');

    // ── 2. 공간별 진행 현황 표
    const allSpaces = [INTERVIEW_DATA.globalPreferences, ...INTERVIEW_DATA.spaces];
    const anyAnswered = allSpaces.some(sp => {
      const { answered } = this.spaceStatus(sp, answers);
      return answered > 0;
    });

    if (anyAnswered) {
      push('## 📋 공간별 진행 현황', '');
      push('| 공간 | 필수 완료 | 상태 |');
      push('|------|-----------|------|');
      allSpaces.forEach(sp => {
        const { answered, total, badge } = this.spaceStatus(sp, answers);
        if (total === 0) return;
        push(`| ${sp.icon} ${sp.label} | ${answered} / ${total} | ${badge} |`);
      });
      push('', '---', '');
    }

    // ── 3. 전체 선호도
    const globalLines = this._buildGlobalSection(answers);
    if (globalLines.length) {
      push('## ⭐ 전체 선호도', '');
      globalLines.forEach(l => push(l));
      push('');
    }

    // ── 4. 공간별 요구사항
    const hasAnySpace = INTERVIEW_DATA.spaces.some(sp => {
      const { must, nice, notes } = this.groupSpaceAnswers(sp, answers);
      return must.length || nice.length || notes.length;
    });

    if (hasAnySpace) {
      push('---', '', '## 🏠 공간별 요구사항', '');

      INTERVIEW_DATA.spaces.forEach(sp => {
        const { must, nice, notes } = this.groupSpaceAnswers(sp, answers);
        if (!must.length && !nice.length && !notes.length) return;

        const { badge } = this.spaceStatus(sp, answers);
        push(`### ${sp.icon} ${sp.label}  \`${badge}\``, '');

        if (must.length) {
          push('#### ✅ MUST — 반드시 반영');
          must.forEach(s => push(`- ${s}`));
          push('');
        }
        if (nice.length) {
          push('#### 🔸 NICE TO HAVE — 선호 방향');
          nice.forEach(s => push(`- ${s}`));
          push('');
        }
        if (notes.length) {
          push('#### 💬 설계 참고 메모');
          notes.forEach(n => push(`> ${n}`));
          push('');
        }
      });
    }

    // ── 5. 주의사항 & 후속 처리
    const sp = this.specialSections(answers);
    const hasSpecial = sp.painPoints || sp.absoluteNo || sp.followUp
                     || sp.allergy   || sp.mustKeep   || sp.extraSpace;
    if (hasSpecial) {
      push('---', '', '## ⚠️ 설계 제약 및 후속 처리', '');

      if (sp.allergy) {
        push('#### 🚫 알레르기 / 민감 소재 — 설계 전 과정 회피');
        push(`- ${sp.allergy}`);
        push('');
      }
      if (sp.absoluteNo) {
        push('#### 🚫 절대 배제 사항 (Absolute No)');
        this._splitLines(sp.absoluteNo).forEach(l => push(`- ${l}`));
        push('');
      }
      if (sp.painPoints) {
        push('#### 💢 현재 Pain Point — 개선 우선 검토');
        this._splitLines(sp.painPoints).forEach(l => push(`- ${l}`));
        push('');
      }
      if (sp.mustKeep) {
        push('#### 📦 기존 유지 / 재사용 아이템');
        push(`- ${sp.mustKeep}`);
        push('');
      }
      if (sp.extraSpace) {
        push('#### 🏠 추가 논의 공간');
        push(`- ${sp.extraSpace}`);
        push('');
      }
      if (sp.followUp) {
        push('#### 🔍 후속 확인 항목 — 담당자 검토 필요');
        this._splitLines(sp.followUp).forEach((l, i) =>
          push(`- [ ] **#${String(i + 1).padStart(2, '0')}** ${l}`)
        );
        push('');
        push(`> 📌 위 항목은 다음 미팅 전 현장 확인 또는 내부 검토 후 상태를 업데이트해 주세요.`);
        push('');
      }
    }

    // ── 6. 위시리스트
    if (sp.wishlist) {
      push('---', '');
      push('## 💫 위시리스트 — 클라이언트의 최종 목표');
      push('');
      push(`> ${sp.wishlist}`);
      push('');
    }

    // ── 7. 키워드
    const kw = this.collectKeywords(answers);
    if (kw.length) {
      push('---', '');
      push('## 🏷️ 스타일 키워드', '');
      push(kw.map(k => `#${k}`).join('  '));
      push('');
    }

    // ── 8. 미결 요약 (unanswered required)
    const pending = this._buildPendingSection(answers);
    if (pending.length) {
      push('---', '');
      push('## 🕐 미확인 필수 항목', '');
      push('> 아래 항목은 아직 답변이 수집되지 않았습니다. 다음 미팅에서 확인이 필요합니다.');
      push('');
      pending.forEach(({ space, label }) =>
        push(`- [ ] ${space.icon} **${space.label}** — ${label}`)
      );
      push('');
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
        spaceName:   state.spaceName,
        meetingDate: state.meetingDate,
        exportedAt:  new Date().toISOString()
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
  // 전체 선호도 섹션
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

    // 라이프스타일 블록
    const lifestyleLines = [];
    if (household && household.length)
      lifestyleLines.push(`거주 구성원: **${[].concat(household).join(', ')}**`);
    if (tempo)   lifestyleLines.push(`생활 패턴: **${tempo}**`);
    if (hosting) lifestyleLines.push(`손님 초대: **${hosting}**`);
    if (lifestyleLines.length) {
      push2(lines, '**라이프스타일**');
      lifestyleLines.forEach(l => push2(lines, `- ${l}`));
      push2(lines, '');
    }

    // 스타일 방향 블록
    const styleLines = [];
    if (style && style.length)
      styleLines.push(`스타일 방향: **${[].concat(style).join(', ')}**`);
    if (color)
      styleLines.push(`색감 선호: **${color}**`);
    if (material && material.length)
      styleLines.push(`선호 소재: **${[].concat(material).join(', ')}**`);
    if (styleLines.length) {
      push2(lines, '**스타일 방향**');
      styleLines.forEach(l => push2(lines, `- ${l}`));
      push2(lines, '');
    }

    // 핵심 가치 우선순위
    if (priority && priority.length) {
      push2(lines, '**핵심 가치 우선순위**');
      priority.forEach((v, i) =>
        push2(lines, `- ${this._rankMark(i)} **${v}**`)
      );
      push2(lines, '');
    }

    // 예산 우선 공간
    if (budgetP && budgetP.length) {
      push2(lines, '**예산 집중 공간**');
      budgetP.forEach((v, i) =>
        push2(lines, `- ${this._rankMark(i)} ${v}`)
      );
      push2(lines, '');
    }

    // 레퍼런스
    if (ref) {
      push2(lines, `> 📌 레퍼런스 키워드: "${ref}"`);
      push2(lines, '');
    }

    return lines;
  },

  // ────────────────────────────────────────
  // 미확인 필수 항목 수집
  // ────────────────────────────────────────
  _buildPendingSection(answers) {
    const pending = [];
    [INTERVIEW_DATA.globalPreferences, ...INTERVIEW_DATA.spaces].forEach(sp => {
      sp.sections.forEach(sec => {
        sec.questions.forEach(q => {
          if (q.required && !SPECIAL_IDS.has(q.id) && !this._hasValue(answers[q.id])) {
            pending.push({ space: sp, label: q.label });
          }
        });
      });
    });
    return pending;
  },

  // ────────────────────────────────────────
  // Private helpers
  // ────────────────────────────────────────
  _rankMark(i) {
    return ['①','②','③','④','⑤','⑥','⑦','⑧','⑨'][i] || `${i + 1}.`;
  },

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
    return str.split(/\n+/).map(s => s.trim()).filter(Boolean);
  }
};

// _buildGlobalSection 내부에서 사용하는 로컬 push 헬퍼
function push2(arr, line) { arr.push(line); }
