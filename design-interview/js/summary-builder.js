/* ============================================
   SUMMARY BUILDER — Pre-Design Client Brief 생성기
   ============================================ */

// ──────────────────────────────────────────
// 문장 템플릿 (questionId → 설계 결정문)
// a = 원본 answer 값, v = 포맷된 문자열
// ──────────────────────────────────────────
const SENTENCE_TEMPLATES = {

  // ── 현관 ──────────────────────────────
  'ent-middle-door': (a, v) =>
    `중문 계획 **${v}** — 출입 동선·문틀·마감 계획에 반영`,
  'ent-shoe-rack-width': (a, v) =>
    `현재 신발장 가로 규모 **${v}** — 교체·확장 시 목표 치수 기준`,
  'ent-shoe-inventory': (a, v) =>
    `보유 신발 규모 **${v}** — 수납 용량 및 선반 구성 계획 기준`,
  'ent-storage-satisfaction': (a, v) =>
    `현관 수납 체감 **${v}** — 수납 보강 필요도 판단 기준`,

  // ── 거실 / 공용부 ──────────────────────────────
  'liv-space-form': (a, v) =>
    `공용 공간 형태 **${v}** — 가구 배치·조명·동선 계획의 전제`,
  'liv-center-element': (a, v) =>
    `공간 중심 요소 **${v}** — 시청·취미·오브제 존 구획 기준`,
  'liv-tv-direction': (a, v) =>
    `TV 공간 방향 선호: **${v}** — 벽체·수납·연출 계획 반영`,
  'liv-dining-table-size': (a, v) =>
    `희망 식탁 가로 규모 **${v}** — 다이닝 배치 및 조명 연동`,
  'liv-element-direction': (a, v) =>
    `중심 요소 연출 방향 **${v}** — 가구·마감·포인트 계획 반영`,
  'liv-atmosphere': (a, v) =>
    `공용 공간 분위기 **${v}** — 가구 밀도·오픈 플랜 운영 방향`,
  'liv-priority-focus': (a, v) =>
    `거실/공용부 최우선 가치 **${v}** — 설계 검토 시 지속 참조`,

  // ── 주방 ──────────────────────────────
  'kitch-use-pattern': (a, v) =>
    `주방 사용 패턴 **${v}** — 조리대·가전·동선 강도 계획 기준`,
  'kitch-priority-factors': (a, v) =>
    `주방 계획 우선 요소: **${v}** — 레이아웃·수납·마감 우선순위`,
  'kitch-island-plan': (a, v) =>
    `아일랜드 계획 **${v}** — 구조·상판·좌석·전기 계획 기준`,
  'kitch-island-priorities': (a, v) =>
    `아일랜드 중시 요소: **${v}** — 수납·마감·작업·간이 식사 반영`,
  'kitch-dining-scale': (a, v) =>
    `식사 공간 규모 **${v}** — 아일랜드 연동 좌석·식탁 계획 반영`,
  'kitch-storage-appliance': (a, v) =>
    `주방 수납·가전 선호: **${v}** — 가전장·오픈랙·하드웨어 구성 기준`,

  // ── 침실 ──────────────────────────────
  'bed-atmosphere': (a, v) =>
    `침실 분위기 **${v}** — 마감·조명·가구 톤 계획 기준`,
  'bed-size': (a, v) =>
    `침대 사이즈 **${v}** — 배치·동선·침구 규격 기준`,
  'bed-side-furniture': (a, v) =>
    `침대 주변 가구: **${v}** — 협탁·화장대 맞춤/기성 계획 반영`,
  'bed-frame-plan': (a, v) =>
    `침대 프레임 **${v}** — 제작·조달 및 상판 연동 계획`,
  'bed-headwall-plan': (a, v) =>
    `헤드월/헤드보드 **${v}** — 벽체 마감·수납·조명 연계`,

  // ── 드레스룸 ──────────────────────────
  'dr-storage-approach': (a, v) =>
    `드레스룸 수납 방식 **${v}** — 가구 형태 및 시공 계획 기준`,
  'dr-current-wardrobe-length': (a, v) =>
    `현재 옷장 길이 **${v}** — 목표 수납 연장 및 구획 기준`,
  'dr-clothing-volume': (a, v) =>
    `의류 수납 체감 **${v}** — 용량·밀도 계획 기준`,
  'dr-clothing-characteristics': (a, v) =>
    `의류·소지품 특성: **${v}** — 행거·서랍·선반 비율 설계`,
  'dr-layout-priorities': (a, v) =>
    `드레스룸 구성 우선: **${v}** — 동선·거울·스타일링 존 반영`,
  'dr-finish-style': (a, v) =>
    `드레스룸 마감·연출 **${v}** — 도어·오픈형·유리 연출 계획`,

  // ── 서재 / 작업실 ───────────────────────
  'study-purpose': (a, v) =>
    `서재·작업실 용도: **${v}** — 동선·가구·전기 계획 기준`,
  'study-users': (a, v) =>
    `주 사용 인원 **${v}** — 좌석·수납·프라이버시 계획 반영`,
  'study-desk-plan': (a, v) =>
    `책상·데스크 **${v}** — 기성/맞춤 및 조명·콘센트 연동`,
  'study-priorities': (a, v) =>
    `작업 공간 우선 요소: **${v}** — 책상 규모·장비·수납 반영`,
  'study-storage-needs': (a, v) =>
    `별도 수납·구성: **${v}** — 선반·장·전시 공간 계획`,
  'study-atmosphere': (a, v) =>
    `서재·작업실 분위기 **${v}** — 마감·조명·색감 제안 기준`,

  // ── 기타 공간 ──────────────────────────
  'es-areas': (a, v) =>
    `추가 계획 공간: **${v}** — 해당 공간 설계 범위 검토`,
  'es-detail': (a, v) =>
    `기타 공간 기능·구성: "${v}"`,

  // ── 최종 요청사항 ──────────────────────
  'fr-must-haves': (a, v) =>
    `필수 반영 요청: "${v}"`,
  'fr-notes': (a, v) =>
    `기타 참고사항: "${v}"`,

  // ── 욕실 (repeatable) ───────────────────
  'bath-input-mode': (a, v) =>
    `욕실 입력 방식 **${v}**`,
  'bath-q0-count': (a, v) =>
    `계획 욕실 수 **${v}**`,
  'bath-label': (a, v) =>
    `욕실 라벨 **${v}**`,
  'bath-q1-mood': (a, v) =>
    `욕실 분위기 **${v}** — 타일·조명 연출 방향 기준`,
  'bath-q2-use-type': (a, v) =>
    `욕실 주 사용 용도 **${v}** — 기능 배치 우선순위 반영`,
  'bath-q3-bathtub-plan': (a, v) =>
    `욕조 계획 **${v}** — 배관·공간 구획 검토 기준`,
  'bath-q4-shower-type': (a, v) =>
    `샤워 공간 방식 **${v}** — 파티션·부스 계획 반영`,
  'bath-q5-vanity-plan': (a, v) =>
    `세면·가구 구성 방향 **${v}** — 젠다이/카운터/수납 계획 기준`,
  'bath-q6-counter-sink-style': (a, v) =>
    `카운터형 세면대 스타일 **${v}**`,
  'bath-q7-detail-options': (a, v) =>
    `욕실 디테일 옵션: **${v}**`,
  'bath-q8-toilet-type': (a, v) =>
    `변기 타입 **${v}**`,

  // ── 세탁실 ────────────────────────────
  'lau-washer': (a, v) =>
    `세탁기/건조기 **${v}** 구성 — 급배수·전기 용량 및 공간 치수 확인`,
  'lau-sink': (a, v) =>
    `세탁실 개수대 **${v}** — 급배수 배관 및 위치 설계 반영`,
  'lau-storage': (a, v) =>
    `다용도 수납 대상: **${v}** — 선반·수납장 구성 계획`,

  // ── Global: PART 1 현재의 삶 이해 ────────
  'p1-q1-household': (a, v) =>
    `거주 구성원 **${v}** — 공간 점유 밀도·방 구성·수납 기준 반영`,
  'p1-q2-home-time': (a, v) =>
    `집 체류 패턴 **${v}** — 조명·동선·운영 밀도 계획 기준`,
  'p1-q3-weekend-pattern': (a, v) =>
    `주말 사용 방식: **${v}** — 공용부 가구 구성 및 운영 시나리오 반영`,
  'p1-q4-family-main-space': (a, v) =>
    `가족 공용 체류 공간 **${v}** — 공용 공간 우선 설계 기준`,
  'p1-q5-main-activities': (a, v) =>
    `주요 생활 활동: **${v}** — 기능 구획·가구·수납 계획 반영`,
  'p1-q6-role-of-home': (a, v) =>
    `집의 역할 인식 **${v}** — 전체 설계 방향성의 기준점`,

  // ── Global: PART 2 우선순위/가치 기준 ───
  'p2-q1-planning-priority': (a, v) =>
    `공간 계획 최우선 요소 **${v}** — 플랜 의사결정 핵심 기준`,
  'p2-q2-design-vs-practical': (a, v) =>
    `디자인·실용 비중 **${v}** — 제안안 밸런스 설정 기준`,
  'p2-q3-flex-vs-optimal-vs-stable': (a, v) =>
    `공간 계획 방향 **${v}** — 가변성/최적화/안정성 판단 근거`,
  'p2-q4-expected-change': (a, v) =>
    `프로젝트 기대 변화 **${v}** — 결과 평가 및 우선 과제 설정 기준`,

  // ── Global: PART 3 미래 고려사항 ─────────
  'p3-q1-family-change-3to5y': (a, v) =>
    `3~5년 가족 변화 계획 **${v}** — 가변형 공간 및 수납 여유 검토`,
  'p3-q2-lifestyle-change-3to5y': (a, v) =>
    `생활 방식 변화 가능성 **${v}** — 향후 기능 확장 여지 반영`,
  'p3-q3-tenure-plan': (a, v) =>
    `예상 사용 기간 **${v}** — 내구성·유지관리·유연성 기준 반영`,
};

// ──────────────────────────────────────────
// 분류 규칙
// must    : required:true   → 반드시 반영할 확정 결정사항
// nice    : required:false  → 선호 방향 (가능하면 반영)
// note    : short-text / memo → 설계 참고 배경 메모
// special : 별도 섹션 처리
// ──────────────────────────────────────────
const SPECIAL_IDS = new Set([
  'ga-must-keep'
]);

// ──────────────────────────────────────────
// SummaryBuilder
// ──────────────────────────────────────────
const SummaryBuilder = {

  classify(q) {
    const baseId = this._baseQId(q.id);
    if (SPECIAL_IDS.has(baseId)) return 'special';
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
    const baseId = this._baseQId(q.id);
    const tmpl = SENTENCE_TEMPLATES[baseId];
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
      painPoints: null,
      absoluteNo: null,
      followUp:   null,
      mustKeep:   this._text(answers['ga-must-keep']),
      wishlist:   this._text(answers['fr-must-haves']),
      extraSpace: null,
    };
  },

  // 전체 키워드 수집
  collectKeywords(answers) {
    const kw = [];
    const push = (v) => { if (v && !kw.includes(v)) kw.push(v); };
    this._allActiveSpaces().forEach(sp => {
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
  // Markdown 생성 (Pre-Design Client Brief)
  // ────────────────────────────────────────
  buildMarkdown(state) {
    const { projectName, spaceName, briefDate, answers } = state;
    const L = [];
    const push = (...lines) => lines.forEach(l => L.push(l));

    // ── 1. 커버 헤더
    push(`# DASIFILL 디자인 브리프`, '');
    push(`> 고객: **${projectName || '(미입력)'}**`);
    if (spaceName) push(`> 공간: ${spaceName}`);
    push(`> 일자: ${briefDate || new Date().toLocaleDateString('ko-KR')}`);
    push(`> 작성: DASIFILL 디자인`);
    push('', '---', '');

    // ── 2. 공간별 진행 현황 표
    const activeSpaces = this._allActiveSpaces();
    const anyAnswered = activeSpaces.some(sp => {
      const { answered } = this.spaceStatus(sp, answers);
      return answered > 0;
    });

    if (anyAnswered) {
      push('## 📋 공간별 진행 현황', '');
      push('| 공간 | 필수 완료 | 상태 |');
      push('|------|-----------|------|');
      activeSpaces.forEach(sp => {
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
    const nonGlobalSpaces = activeSpaces.filter(sp =>
      sp.id !== 'global' && sp.id !== 'bathroom' && sp._instanceOf !== 'bathroom'
    );
    const hasAnySpace = nonGlobalSpaces.some(sp => {
      const { must, nice, notes } = this.groupSpaceAnswers(sp, answers);
      return must.length || nice.length || notes.length;
    });

    if (hasAnySpace) {
      push('---', '', '## 🏠 공간별 요구사항', '');

      nonGlobalSpaces.forEach(sp => {
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

    const bathLines = this._buildBathroomSection(state);
    if (bathLines.length) {
      push('---', '', '## 🚿 욕실 계획', '');
      bathLines.forEach(l => push(l));
      push('');
    }

    // ── 5. 주의사항 & 후속 처리
    const sp = this.specialSections(answers);
    const hasSpecial = sp.painPoints || sp.absoluteNo || sp.followUp
                     || sp.mustKeep;
    if (hasSpecial) {
      push('---', '', '## ⚠️ 설계 제약 및 후속 처리', '');
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
        briefDate: state.briefDate,
        exportedAt:  new Date().toISOString()
      },
      global: {},
      spaces: {},
      bathroomMeta: state.bathroomMeta || { count: 1, inputMode: '' },
      bathrooms: Array.isArray(state.bathrooms) ? state.bathrooms : [],
      special: this.specialSections(state.answers)
    };

    this._allActiveSpaces().forEach(sp => {
      if (sp.id === 'bathroom' || sp._instanceOf === 'bathroom') return;
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

    const p1q1 = answers['p1-q1-household'];
    const p1q2 = answers['p1-q2-home-time'];
    const p1q3 = answers['p1-q3-weekend-pattern'];
    const p1q4 = answers['p1-q4-family-main-space'];
    const p1q5 = answers['p1-q5-main-activities'];
    const p1q6 = answers['p1-q6-role-of-home'];

    const p2q1 = answers['p2-q1-planning-priority'];
    const p2q2 = answers['p2-q2-design-vs-practical'];
    const p2q3 = answers['p2-q3-flex-vs-optimal-vs-stable'];
    const p2q4 = answers['p2-q4-expected-change'];

    const p3q1 = answers['p3-q1-family-change-3to5y'];
    const p3q2 = answers['p3-q2-lifestyle-change-3to5y'];
    const p3q3 = answers['p3-q3-tenure-plan'];

    const sectionPart1 = [];
    if (p1q1 && p1q1.length) sectionPart1.push(`가족 구성: **${p1q1.join(', ')}**`);
    if (p1q2) sectionPart1.push(`집 체류 패턴: **${p1q2}**`);
    if (p1q3 && p1q3.length) sectionPart1.push(`주말 사용 방식: **${p1q3.join(', ')}**`);
    if (p1q4) sectionPart1.push(`가족 공용 체류 공간: **${p1q4}**`);
    if (p1q5 && p1q5.length) sectionPart1.push(`주요 활동: **${p1q5.join(', ')}**`);
    if (p1q6) sectionPart1.push(`집의 역할 인식: **${p1q6}**`);
    if (sectionPart1.length) {
      push2(lines, '**PART 1. 현재의 삶 이해**');
      sectionPart1.forEach(l => push2(lines, `- ${l}`));
      push2(lines, '');
    }

    const sectionPart2 = [];
    if (p2q1) sectionPart2.push(`공간 계획 최우선 요소: **${p2q1}**`);
    if (p2q2) sectionPart2.push(`디자인·실용 비중: **${p2q2}**`);
    if (p2q3) sectionPart2.push(`공간 계획 방향: **${p2q3}**`);
    if (p2q4) sectionPart2.push(`프로젝트 기대 변화: **${p2q4}**`);
    if (sectionPart2.length) {
      push2(lines, '**PART 2. 설계 우선순위 / 가치 기준**');
      sectionPart2.forEach(l => push2(lines, `- ${l}`));
      push2(lines, '');
    }

    const sectionPart3 = [];
    if (p3q1) sectionPart3.push(`3~5년 가족 변화 계획: **${p3q1}**`);
    if (p3q2) sectionPart3.push(`생활 방식 변화 가능성: **${p3q2}**`);
    if (p3q3) sectionPart3.push(`예상 사용 기간: **${p3q3}**`);
    if (sectionPart3.length) {
      push2(lines, '**PART 3. 미래 고려사항**');
      sectionPart3.forEach(l => push2(lines, `- ${l}`));
      push2(lines, '');
    }

    return lines;
  },

  _buildBathroomSection(state) {
    const lines = [];
    const meta = state.bathroomMeta || {};
    const baths = Array.isArray(state.bathrooms) ? state.bathrooms : [];
    if (meta.inputMode) lines.push(`- 입력 방식: **${meta.inputMode}**`);
    if (meta.count) lines.push(`- 계획 욕실 수: **${meta.count}개**`);
    if (!baths.length) return lines;
    lines.push('');
    baths.forEach((b, i) => {
      const label = b.label || `욕실 ${i + 1}`;
      const a = b.answers || {};
      lines.push(`### ${i + 1}) ${label}`);
      const rows = [
        ['욕실 분위기', a['bath-q1-mood']],
        ['주 사용 용도', a['bath-q2-use-type']],
        ['욕조 계획', a['bath-q3-bathtub-plan']],
        ['샤워 공간 방식', a['bath-q4-shower-type']],
        ['세면·가구 구성 방향', a['bath-q5-vanity-plan']],
        ['카운터형 세면대 스타일', a['bath-q6-counter-sink-style']],
        ['욕실 디테일 옵션', Array.isArray(a['bath-q7-detail-options']) ? a['bath-q7-detail-options'].join(', ') : a['bath-q7-detail-options']],
        ['변기 타입', a['bath-q8-toilet-type']]
      ];
      rows.forEach(([k, v]) => {
        if (!v || (Array.isArray(v) && !v.length)) return;
        lines.push(`- ${k}: **${v}**`);
      });
      lines.push('');
    });
    return lines;
  },

  // ────────────────────────────────────────
  // 미확인 필수 항목 수집
  // ────────────────────────────────────────
  _buildPendingSection(answers) {
    const pending = [];
    this._allActiveSpaces().forEach(sp => {
      sp.sections.forEach(sec => {
        sec.questions.forEach(q => {
          const baseId = this._baseQId(q.id);
          if (q.required && !SPECIAL_IDS.has(baseId) && !this._hasValue(answers[q.id])) {
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
  },

  // Strip virtual instance prefix (e.g. 'bathroom_2::bath-q1-mood' → 'bath-q1-mood')
  _baseQId(qId) {
    const idx = qId.indexOf('::');
    return idx >= 0 ? qId.slice(idx + 2) : qId;
  },

  // All active spaces — uses AppState when available (browser), falls back to
  // static INTERVIEW_DATA (Node.js test script)
  _allActiveSpaces() {
    if (typeof AppState !== 'undefined' && AppState.getActiveSpaces) {
      return AppState.getActiveSpaces();
    }
    return [INTERVIEW_DATA.globalPreferences, ...INTERVIEW_DATA.spaces];
  }
};

// _buildGlobalSection 내부에서 사용하는 로컬 push 헬퍼
function push2(arr, line) { arr.push(line); }
