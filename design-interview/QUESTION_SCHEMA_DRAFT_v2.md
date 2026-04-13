# DASIFILL Design Interview — Question Schema Draft v2
**작성일:** 2026-04-13  
**상태:** 검수 전 초안 v2 — questions-data.js 미반영  
**목표:** Exhaustive survey → Premium Design Briefing Tool  
**v1 대비:** 질문 수 최소화 · 설계 직결 질문 우선 · 욕실 심화 · 제작/시스템/기성 분기 추가

---

## 설계 원칙

> **모든 질문은 "이 답변이 도면·마감재·가구 계획을 바꾸는가?"를 기준으로 존재를 정당화해야 한다.**

- 설계 액션으로 직결되지 않으면 제거
- 감성·비전 질문은 공간당 최대 1개, 전략적 배치
- 분기(branch)는 질문 수를 절약하는 도구로 활용
- 메모(free-text)는 섹션당 1개만 허용

---

## 범례

| 기호 | 의미 |
|------|------|
| ✅ | 기존 ID 재사용 (내용 변경 없음) |
| ✏️ | 기존 ID 재사용, 선택지/wording 수정 |
| 🆕 | 신규 ID 생성 |
| 🔗 | showIf branch 조건 있음 |
| ~~취소선~~ | v1 대비 삭제 |

---

## 전체 구조 한눈에

```
GLOBAL
  ├─ Section 1: 삶과 구성          (4q)
  ├─ Section 2: 스타일 방향        (4q)
  ├─ Section 3: 설계 우선순위      (5q)
  └─ Section 4: 미래 고려사항      (5q)

SPACES
  ├─ 현관          2 sections  5q
  ├─ 거실          3 sections  9q + 4 branch
  ├─ 주방          2 sections  8q + 2 branch
  ├─ 안방          2 sections  5q
  ├─ 드레스룸      1 section   5q  [optional]
  ├─ 자녀방        1 section   5q  [optional, repeatable×2]
  ├─ 서재·홈오피스 1 section   4q  [optional]
  ├─ 공용욕실      1 section   8q + 1 branch  [optional, repeatable×2]
  ├─ 안방욕실      1 section   8q + 1 branch  [optional]
  ├─ 세탁실        1 section   4q  [optional]
  └─ 마무리        1 section   4q

총 핵심 질문: 약 74개 (branch 포함 최대 79개)
v1 대비 감소: 감성 filler 다수 제거, 설계 직결 질문으로 교체
```

---

---

# GLOBAL — 전체 선호도

---

## Section 1: `global-life` — 삶과 구성
> Master Spec PART 1 대응. 설계 맥락 파악 목적.  
> **제거:** g-sensory, g-energy-drain, g-life-vision, g-future-life (설계 직결 낮음 또는 타 섹션 중복)

| # | ID | Label | Type | Required | Options | showIf | 상태 |
|---|----|-------|------|----------|---------|--------|------|
| 1 | `g-household` | 현재 가족 구성은? | multi-choice | ✅ | 부부 둘 / 자녀 1명 / 자녀 2명 이상 / 반려동물 있음 / 부모님 동거 / 1인 거주 | — | ✏️ |
| 2 | `g-lifestyle-tempo` | 평일/주말 집에 머무르는 시간은? | single-choice | — | 출퇴근 중심 (저녁·주말만) / 재택 비중 높음 (주 3일 이상) / 대부분 집에서 생활 | — | ✏️ |
| 3 | `g-main-space` | 집에서 가장 오래 머무르는 공간은? | single-choice | — | 거실 / 주방·다이닝 / 안방 / 서재·작업실 | — | 🆕 |
| 4 | `g-hosting` | 손님 초대 빈도는? | single-choice | — | 거의 없음 / 가끔 (월 1-2회) / 자주 (주 1회 이상) | — | 🔀 이동 |

---

## Section 2: `global-style` — 스타일 방향
> 기존 유지. 변경 없음.

| # | ID | Label | Type | Required | Options | showIf | 상태 |
|---|----|-------|------|----------|---------|--------|------|
| 1 | `g-style-direction` | 원하는 인테리어 분위기는? | multi-choice | ✅ | 모던/미니멀 / 내추럴/우드 / 클래식/고급스러운 / 인더스트리얼 / 북유럽/스칸디나비안 / 빈티지/레트로 / 호텔식/리조트 / 한국 전통 모던 | — | ✅ |
| 2 | `g-color-tone` | 선호하는 색감 톤은? | single-choice | ✅ | 무채색 계열 / 웜톤 (베이지/브라운/크림) / 쿨톤 (블루/그린/민트) / 컬러 포인트 선호 | — | ✅ |
| 3 | `g-material-pref` | 선호하는 소재 느낌은? | tag | — | 원목 / 대리석 / 콘크리트 / 패브릭 / 가죽 / 메탈 / 유리 / 라탄 | — | ✅ |
| 4 | `g-reference` | 참고하고 싶은 스타일/키워드가 있다면? | short-text | — | 예) Muji Hotel, 핀터레스트 "japandi interior" | — | ✅ |

---

## Section 3: `global-priority` — 설계 우선순위
> Master Spec PART 2 대응. `global-concerns` 섹션 흡수·재편.

| # | ID | Label | Type | Required | Options | showIf | 상태 |
|---|----|-------|------|----------|---------|--------|------|
| 1 | `g-priority-value` | 이번 인테리어에서 가장 중요한 것은? (최대 3개 순위) | priority | ✅ | 수납/정리 / 심미성/디자인 / 채광/밝기 / 동선/편의성 / 내구성/실용성 / 청소 용이성 / 아이 안전 | — | ✅ |
| 2 | `g-budget-priority` | 예산을 집중할 공간 순위는? (최대 3개) | priority | — | 거실 / 주방 / 안방 / 욕실 / 현관 / 드레스룸 | — | ✅ |
| 3 | `g-must-have` | 예산과 무관하게 반드시 구현하고 싶은 요소는? | short-text | — | 예) 대형 아일랜드, 프리스탠딩 욕조, 홈오피스 방 | — | 🆕 |
| 4 | `g-must-keep` | 반드시 유지·재사용할 기존 가구/아이템은? | short-text | — | 예) 피아노, 부모님께 받은 장롱 | — | ✅ |
| 5 | `g-allergy` | 알레르기·민감 반응이 있는 소재/물질이 있나요? | short-text | — | 없으면 빈칸으로 | — | ✅ |

---

## Section 4: `global-future` — 미래의 이 집
> Master Spec PART 3 대응. `future-pet` 신규 추가, `future-notes` 유지.

| # | ID | Label | Type | Required | Options | showIf | 상태 |
|---|----|-------|------|----------|---------|--------|------|
| 1 | `future-tenure` | 이 공간에서 예상 거주 기간은? | single-choice | — | 1-2년 (단기) / 3-5년 (중기) / 5-10년 (장기) / 10년 이상·정착 | — | ✏️ |
| 2 | `future-family-change` | 향후 가족 구성 변화 계획이 있나요? | multi-choice | — | 추가 자녀 계획 / 부모님·어른 동거 가능성 / 자녀 독립 예정 / 변화 없음 | — | ✏️ |
| 3 | `future-pet` | 반려동물 계획이 있나요? | single-choice | — | 없음·계획도 없음 / 향후 입양 계획 있음 / 현재 있음 (설계 반영 필요) | — | 🆕 |
| 4 | `future-workhome` | 재택근무 장기 전망은? | single-choice | — | 장기 재택 유지·증가 / 점진적으로 줄어들 예정 / 재택 없음 | — | ✏️ |
| 5 | `future-aging` | 노후·장기 거주 대비가 필요한가요? | multi-choice | — | 단차 제거 (무장애 동선) / 안전 손잡이 공간 확보 / 넓은 욕실 접근성 / 고려 불필요 | 🔗 future-tenure: 5년 이상 | ✏️ |

---

---

# SPACE 1: 현관 (`entryway`)

---

### Section 1: `entryway-function` — 수납과 동선

| # | ID | Label | Type | Required | Options | showIf | 상태 |
|---|----|-------|------|----------|---------|--------|------|
| 1 | `ent-storage-scale` | 신발 수납 규모는? | single-choice | ✅ | 최소 (20켤레 이하) / 중간 (20-40켤레) / 대형 (40켤레 이상) / 신발장 전면 확장 | — | ✅ |
| 2 | `ent-storage-items` | 현관에 수납할 품목은? | tag | — | 우산 / 골프백 / 자전거 / 유모차 / 캐리어 / 청소도구 | — | ✅ |
| 3 | `ent-bench` | 벤치·의자가 필요한가요? | single-choice | — | 필요함 / 없어도 됨 / 공간 여유 있으면 원함 | — | ✅ |

### Section 2: `entryway-style` — 마감 방향

| # | ID | Label | Type | Required | Options | showIf | 상태 |
|---|----|-------|------|----------|---------|--------|------|
| 1 | `ent-style` | 현관 분위기 방향은? | single-choice | — | 깔끔·미니멀 / 따뜻·아늑 / 호텔식 고급 / 기능 위주 단순 | — | ✅ |
| 2 | `ent-floor` | 현관 바닥 소재는? | single-choice | — | 타일 (포세린·대리석) / 원목마루 연결 / 현 상태 유지 | — | ✅ |

> **제거 (v1 대비):** `ent-feeling`, `ent-memo` — 설계 직결 낮음. 전체 메모는 마무리 공간에서 수집.

---

---

# SPACE 2: 거실 (`living-room`)

---

### Section 1: `lr-function` — 거실 활용

| # | ID | Label | Type | Required | Options | showIf | 상태 |
|---|----|-------|------|----------|---------|--------|------|
| 1 | `lr-main-use` | 거실을 주로 어떻게 사용하나요? | multi-choice | ✅ | TV 시청 중심 / 가족 모임·대화 / 독서·취미 / 홈오피스 겸용 / 아이 놀이공간 / 다이닝 겸용 | — | ✏️ "다이닝 겸용" 추가 |
| 2 | `lr-tv` | TV 설치 방식은? | single-choice | ✅ | 벽걸이 (벽 매립) / TV장 위에 / TV 없음 / 프로젝터 사용 | — | ✅ |
| 3 | `lr-wfh-needs` | 홈오피스 공간 구성은? | single-choice | — | 고정 데스크 공간 확보 / 접이식·이동형 테이블 / 소파 사이드 미니 테이블 | 🔗 lr-main-use: 홈오피스 겸용 | ✅ |
| 4 | `lr-kids-floor` | 아이 놀이 바닥 소재는? | single-choice | — | 러그·카펫 구역 분리 / 쿠션 매트 시공 / 원목 그대로 / 바닥 난방 최대화 | 🔗 lr-main-use: 아이 놀이공간 | ✅ |
| 5 | `lr-dining-area` | 거실 내 다이닝 배치 방식은? | single-choice | — | 거실·식탁 통합형 / 주방 쪽에 분리 배치 / 아일랜드로 대체 | 🔗 lr-main-use: 다이닝 겸용 | 🆕 |
| 6 | `lr-audio` | 오디오 시스템이 필요한가요? | single-choice | — | 불필요 (TV 사운드바 정도) / 홈시어터 스피커 배치 / 하이파이 오디오 전용 공간 필요 | 🔗 lr-special-item: 오디오 기기 | 🆕 |

### Section 2: `lr-style` — 마감과 수납

| # | ID | Label | Type | Required | Options | showIf | 상태 |
|---|----|-------|------|----------|---------|--------|------|
| 1 | `lr-floor` | 거실 바닥재는? | single-choice | ✅ | 원목마루 / 강마루 / 타일·대리석 / 현 상태 유지 | — | ✅ |
| 2 | `lr-wall` | TV 뒷벽·포인트 월 처리는? | single-choice | — | 페인트 포인트 컬러 / 벽지 패턴 / 우드 패널 / 대리석·타일 / 화이트 그대로 | 🔗 lr-tv ≠ TV없음/프로젝터 | ✅ |
| 3 | `lr-lighting` | 거실 조명 방향은? | multi-choice | — | 간접조명 중심 / 포인트 펜던트 / 매립등 심플 / 자연광 최대화 | — | ✅ |
| 4 | `lr-storage-need` | 거실 수납 규모는? | single-choice | — | 최소화 (오픈 선반 정도) / 중간 (붙박이장 일부) / 대형 (벽면 최대화) | — | ✅ |
| 5 | `lr-storage-type` | 거실 수납 가구 방식은? | single-choice | — | 현장 제작 (맞춤) / 시스템 가구 (한샘·리바트 등) / 기성 가구 조합 (이케아 등) | — | 🆕 |

### Section 3: `lr-special` — 특수 항목

| # | ID | Label | Type | Required | Options | showIf | 상태 |
|---|----|-------|------|----------|---------|--------|------|
| 1 | `lr-special-item` | 거실에 배치할 특별한 아이템이 있나요? | tag | — | 피아노 / 오디오 기기 / 대형 어항 / 갤러리 월 / 홈바 / 식물·화분 | — | ✅ |
| 2 | `lr-sofa` | 소파 스타일 선호는? | single-choice | — | 패브릭 (린넨·벨벳) / 가죽 / 모듈형 / 좌식 | — | ✅ |
| 3 | `lr-memo` | 거실 관련 특별 요청사항 | short-text | — | — | — | ✅ |

> **제거 (v1 대비):** `lr-feeling` — 대신 `g-sensory` + 마무리 섹션에서 통합 수집.

---

---

# SPACE 3: 주방 (`kitchen`)

---

### Section 1: `kitchen-layout` — 구성과 기능

| # | ID | Label | Type | Required | Options | showIf | 상태 |
|---|----|-------|------|----------|---------|--------|------|
| 1 | `kitch-island` | 아일랜드·식탁 구성은? | single-choice | ✅ | 아일랜드 필수 / 아일랜드+별도 식탁 / 식탁만 (아일랜드 없이) / 공간 상황에 맞게 | — | ✅ |
| 2 | `kitch-dining-size` | 식사 인원 기준은? | single-choice | — | 2인 / 4인 / 6인 이상 / 손님 포함 확장형 | 🔗 kitch-island: 식탁 있는 경우 | ✅ |
| 3 | `kitch-bar-seat` | 아일랜드 바체어가 필요한가요? | single-choice | — | 필수 (식사·간식 공간으로 활용) / 원함 (가능하면) / 불필요 | 🔗 kitch-island: 아일랜드 포함 | ✅ |
| 4 | `kitch-cooktop` | 쿡탑 방식 선호는? | single-choice | — | 가스 (화력 중심) / 인덕션 (안전·청소 우선) / 하이브리드 (가스+인덕션) / 미정 | — | 🆕 |
| 5 | `kitch-cook-freq` | 요리 빈도는? | single-choice | — | 거의 안 함 / 보통 (주 3-4회) / 매일 본격 요리 | — | ✅ |
| 6 | `kitch-hood` | 후드·환기 방식 선호는? | single-choice | — | 빌트인 매립형 (슬림) / 아일랜드 펜던트 후드 / 일반 상부 후드 / 강력 환기 최우선 | 🔗 kitch-cook-freq: 매일 본격 요리 | ✅ |

### Section 2: `kitchen-style` — 마감과 수납

| # | ID | Label | Type | Required | Options | showIf | 상태 |
|---|----|-------|------|----------|---------|--------|------|
| 1 | `kitch-cabinet-type` | 주방 가구 방식은? | single-choice | ✅ | 현장 제작 (완전 맞춤) / 시스템 주방 (한샘·LG·에넥스 등) / 미정 | — | 🆕 |
| 2 | `kitch-style` | 주방 스타일 방향은? | single-choice | ✅ | 모던·미니멀 (무광·무손잡이) / 내추럴 (우드+화이트) / 클래식 (몰딩·유광) / 산업적 (메탈+콘크리트) | — | ✅ |
| 3 | `kitch-counter` | 상판·카운터 소재는? | single-choice | — | 인조대리석 / 세라믹 상판 / 천연대리석 / 스테인리스 / 원목 | — | ✅ |
| 4 | `kitch-storage-priority` | 주방 수납 우선순위는? | multi-choice | — | 식재료 팬트리 / 그릇·조리도구 / 냉장고 빌트인 / 식기세척기 / 커피머신 전용 공간 | — | ✅ |
| 5 | `kitch-memo` | 주방 관련 특별 요청사항 | short-text | — | — | — | ✅ |

> **제거 (v1 대비):** `kitch-floor`, `kitch-feeling` — 바닥은 거실과 연결 여부로 충분히 커버. 감성 질문 제거.

---

---

# SPACE 4: 안방 (`master-bedroom`)

---

### Section 1: `mb-setup` — 구성과 기능

| # | ID | Label | Type | Required | Options | showIf | 상태 |
|---|----|-------|------|----------|---------|--------|------|
| 1 | `mb-bed-size` | 침대 사이즈는? | single-choice | ✅ | 퀸 (1600mm) / 킹 (1800mm) / 슈퍼킹 (2000mm) / 분리 싱글 2개 | — | ✅ |
| 2 | `mb-tv` | 안방 TV 설치 여부는? | single-choice | — | 설치 원함 (벽걸이) / 없어도 됨 | — | ✏️ 옵션 간소화 |
| 3 | `mb-working` | 안방에 화장대·책상이 필요한가요? | single-choice | — | 화장대 공간 필요 / 작업 책상 필요 / 불필요 | — | ✏️ |

### Section 2: `mb-style` — 마감과 조명

| # | ID | Label | Type | Required | Options | showIf | 상태 |
|---|----|-------|------|----------|---------|--------|------|
| 1 | `mb-style` | 안방 분위기는? | single-choice | ✅ | 호텔식 고급스러움 / 따뜻하고 아늑한 코지함 / 심플·모던 / 내추럴 우드 감성 | — | ✅ |
| 2 | `mb-lighting` | 안방 조명 방향은? | multi-choice | — | 간접조명 (수면 배려) / 조도 조절 가능 / 블라인드·암막 중요 | — | ✏️ 옵션 간소화 |
| 3 | `mb-memo` | 안방 관련 특별 요청사항 | short-text | — | 예) 헤드보드 간접조명 필수, 침대 위치 창 방향 | — | ✅ |

> **제거 (v1 대비):** `mb-feeling` — 감성 질문 제거.

---

---

# SPACE 5: 드레스룸 (`dressing-room`) — optional

---

### Section 1: `dr-function` — 구성과 수납

| # | ID | Label | Type | Required | Options | showIf | 상태 |
|---|----|-------|------|----------|---------|--------|------|
| 1 | `dr-type` | 드레스룸 형태는? | single-choice | ✅ | 오픈형 (노출 수납) / 도어형 (전체 가림) / 혼합형 (일부 오픈+일부 닫힘) | — | ✅ |
| 2 | `dr-door-type` | 수납장 도어 방식은? | single-choice | — | 슬라이딩 (미닫이) / 여닫이 (힌지 도어) / 오픈 무도어 / 혼합 | — | 🆕 |
| 3 | `dr-furniture-type` | 드레스룸 가구 방식은? | single-choice | ✅ | 현장 제작 (맞춤 붙박이) / 시스템장 (한샘·리바트 등) / 기성 가구 (이케아 PAX 등) / 기존 재사용 | — | 🆕 |
| 4 | `dr-category` | 주로 수납할 의류 유형은? | tag | — | 정장·수트 / 캐주얼 행거 / 가방 컬렉션 / 신발 (드레스룸 내) / 이불·시즌 용품 / 액세서리 | — | ✅ |
| 5 | `dr-lighting` | 드레스룸 조명은? | single-choice | — | 밝고 균일 (색 확인 중요) / 간접조명 분위기 / 기본 천장등 | — | ✅ |

> **제거 (v1 대비):** `dr-mirror` (안방 메모로 흡수 가능), `dr-feeling`, `dr-memo`.

---

---

# SPACE 6: 자녀방 (`kids-study`) — optional, repeatable ×2

---

### Section 1: `ks-setup` — 구성

| # | ID | Label | Type | Required | Options | showIf | 상태 |
|---|----|-------|------|----------|---------|--------|------|
| 1 | `ks-purpose` | 이 방의 주 용도는? | multi-choice | ✅ | 아이 침실 / 아이 놀이·공부방 / 홈오피스·서재 / 게스트룸 겸용 | — | ✅ |
| 2 | `ks-child-age` | 자녀 나이대는? | single-choice | — | 영아 (0-3세) / 유아 (4-7세) / 초등 (8-13세) / 중고등 (14세 이상) | 🔗 ks-purpose: 아이 침실·놀이방 | ✅ |
| 3 | `ks-bed` | 침대 구성은? | single-choice | — | 싱글 1개 / 벙커침대 / 다락형 침대 / 침대 없음 | 🔗 ks-purpose: 아이 침실·게스트룸 | ✅ |
| 4 | `ks-desk` | 책상·학습 공간은? | single-choice | — | 메인 공간 (넓은 책상) / 보조 공간 (작은 책상) / 현재 불필요 | — | ✅ |
| 5 | `ks-memo` | 자녀방 특별 요청사항 | short-text | — | 예) 바닥 안전 최우선, 코너 라운딩 | — | ✅ |

---

---

# SPACE 7: 서재·홈오피스 (`study`) — optional 🆕

> Master Spec PART 4 Study 대응. `kids-study`의 홈오피스 옵션을 별도 공간으로 분리.

---

### Section 1: `study-setup` — 구성

| # | ID | Label | Type | Required | Options | showIf | 상태 |
|---|----|-------|------|----------|---------|--------|------|
| 1 | `study-purpose` | 이 공간의 용도는? | multi-choice | ✅ | 재택근무 전용 / 독서·공부 집중 / 취미·창작 작업실 / 게스트룸 겸용 | — | 🆕 |
| 2 | `study-desk` | 책상 구성은? | single-choice | ✅ | 1인 고정 책상 / 2인 나란히 / 넓은 작업대형 (L자·ㄷ자) / 접이식 | — | 🆕 |
| 3 | `study-door` | 소음 차단 필요 수준은? | single-choice | — | 완전 차단 (도어 필수) / 반투명 슬라이딩 / 개방형 (문 없어도 됨) | — | 🆕 |
| 4 | `study-memo` | 서재 관련 특별 요청사항 | short-text | — | 예) 집중력 위한 조명, 외부 소음 차단 | — | 🆕 |

> **제거 (v1 대비):** `study-monitor`, `study-storage` — 세분화 과잉. `study-memo`로 흡수.

---

---

# SPACE 8: 공용욕실 (`shared-bathroom`) — optional, repeatable ×2

> **핵심 심화 섹션.** 샤워 구획·세면대 타입·수전·변기·예산 등급 추가.

---

### Section 1: `sb-function` — 욕실 구성 심화

| # | ID | Label | Type | Required | Options | showIf | 상태 |
|---|----|-------|------|----------|---------|--------|------|
| 1 | `sb-bath` | 욕조 설치 여부는? | single-choice | ✅ | 욕조 필수 / 욕조 제거 (샤워부스만) / 현 상태 유지 | — | ✅ |
| 2 | `sb-shower-type` | 샤워 구획 방식은? | single-choice | — | 프레임리스 강화유리 / 알루미늄 프레임 유리 / 커튼봉 방식 / 오픈형 (구획 없음) | — | 🆕 |
| 3 | `sb-sink-type` | 세면대 타입은? | single-choice | — | 벽부형 단독 / 카운터형 (하부장+상판) / 매립형 (언더카운터) | — | 🆕 |
| 4 | `sb-sink-material` | 세면대 카운터 소재는? | single-choice | — | 인조대리석 / 세라믹 상판 / 포세린 타일 상판 / 소재 무관 | 🔗 sb-sink-type: 카운터형·매립형 | 🆕 |
| 5 | `sb-faucet` | 수전 스타일은? | single-choice | — | 매립형 (벽체 매립) / 노출형 데크 마운트 / 컬러 수전 선호 (블랙·골드 등) | — | 🆕 |
| 6 | `sb-toilet` | 변기 타입은? | single-choice | — | 일반형 (바닥 고정) / 벽걸이형 (탱크 매립) / 비데일체형 | — | 🆕 |
| 7 | `sb-style` | 욕실 스타일은? | single-choice | — | 밝고 깔끔한 화이트 / 내추럴 타일 (테라코타·석재) / 다크 무드 (블랙·그레이) / 패턴 타일 포인트 | — | ✅ |
| 8 | `sb-budget` | 욕실 마감재 예산 등급은? | single-choice | — | 실용 (국산 중저가 마감재) / 중급 (준수입급 타일·수전) / 프리미엄 (수입 타일·수전 전체 교체) | — | 🆕 |
| 9 | `sb-memo` | 공용욕실 특별 요청사항 | short-text | — | — | — | ✅ |

> **제거 (v1 대비):** `sb-priority` (→ sb-memo에 흡수. 항목 나열보다 자유 기술이 더 정확)

---

---

# SPACE 9: 안방욕실 (`master-bathroom`) — optional

> 공용욕실과 동일 심화 패턴. 더블 세면대 추가 유지.

---

### Section 1: `mab-function` — 욕실 구성 심화

| # | ID | Label | Type | Required | Options | showIf | 상태 |
|---|----|-------|------|----------|---------|--------|------|
| 1 | `mab-bath` | 안방욕실 욕조는? | single-choice | ✅ | 욕조 유지·설치 원함 / 욕조 제거 (샤워부스 확장) / 프리스탠딩 욕조 원함 | — | ✅ |
| 2 | `mab-shower-type` | 샤워 구획 방식은? | single-choice | — | 프레임리스 강화유리 / 알루미늄 프레임 유리 / 욕조와 병행 | — | 🆕 |
| 3 | `mab-double-sink` | 세면대 구성은? | single-choice | — | 1구 세면대 / 2구 더블 세면대 / 공간 여유 있으면 2구 | — | ✅ |
| 4 | `mab-sink-type` | 세면대 타입은? | single-choice | — | 벽부형 단독 / 카운터형 (하부장+상판) / 매립형 (언더카운터) | — | 🆕 |
| 5 | `mab-sink-material` | 세면대 카운터 소재는? | single-choice | — | 대리석 (천연·인조) / 세라믹 상판 / 소재 무관 | 🔗 mab-sink-type: 카운터형·매립형 | 🆕 |
| 6 | `mab-faucet` | 수전 스타일은? | single-choice | — | 매립형 (벽체 매립) / 노출형 데크 마운트 / 컬러 수전 선호 (블랙·골드 등) | — | 🆕 |
| 7 | `mab-style` | 안방욕실 분위기는? | single-choice | — | 호텔·스파 느낌 / 깔끔한 화이트 / 내추럴 석재 / 다크 럭셔리 | — | ✅ |
| 8 | `mab-memo` | 안방욕실 특별 요청사항 | short-text | — | 예) 히팅 타올 바, 욕실 바닥 히팅 | — | ✅ |

> **제거 (v1 대비):** `mab-toilet`, `mab-budget` — 안방욕실은 프리미엄 기본 전제. 선택지 단순화.  
> **Note:** 안방욕실에 변기 타입은 `mab-memo`에서 자유 기술로 충분.

---

---

# SPACE 10: 세탁실·다용도실 (`laundry`) — optional

---

### Section 1: `lau-setup` — 구성

| # | ID | Label | Type | Required | Options | showIf | 상태 |
|---|----|-------|------|----------|---------|--------|------|
| 1 | `lau-washer` | 세탁기·건조기 구성은? | single-choice | ✅ | 세탁기+건조기 (상하 스택) / 세탁기+건조기 (나란히) / 세탁기만 | — | ✏️ 옵션 간소화 |
| 2 | `lau-sink` | 세탁실 개수대가 필요한가요? | single-choice | — | 필요함 / 없어도 됨 | — | ✏️ |
| 3 | `lau-storage` | 다용도실 추가 수납 품목은? | tag | — | 청소도구 / 세제류 / 비상식품 / 공구류 / 계절가전 | — | ✅ |
| 4 | `lau-memo` | 세탁실 특별 요청사항 | short-text | — | — | — | ✅ |

---

---

# SPACE 11: 마무리 (`other`)

> Master Spec PART 5 최종 요청사항 직접 대응.

---

### Section 1: `other-general` — 꼭 하고 싶은 이야기

| # | ID | Label | Type | Required | Options | showIf | 상태 |
|---|----|-------|------|----------|---------|--------|------|
| 1 | `oth-concerns` | 현재 집에서 가장 불편한 점은? (Pain Point) | short-text | — | 예) 수납 부족, 환기 불량, 어두운 거실 | — | ✅ |
| 2 | `oth-absolute-no` | 절대 원하지 않는 것은? (Absolute No) | short-text | — | 예) 벽지 사용, 오픈 선반, 블랙 계열 | — | ✅ |
| 3 | `oth-followup` | 후속 확인·검토가 필요한 사항은? | short-text | — | 예) 발코니 확장 가능 여부, 내력벽 여부 | — | ✅ |
| 4 | `oth-wishlist` | 꼭 반영되었으면 하는 최종 요청은? | short-text | — | 완성된 집을 상상했을 때 무엇이 가장 먼저 보이나요? | — | ✏️ |

> **제거 (v1 대비):** `oth-space` (→ `oth-followup`으로 흡수)

---

---

## Summary-Builder 수정 범위 (v2 기준)

### 신규 SENTENCE_TEMPLATES 필요 항목

| ID | 설계 결정 문장 초안 |
|----|-------------------|
| `g-main-space` | `주거 생활의 중심 공간 **${v}** — 해당 공간 마감·조명·수납 설계에 우선순위 집중` |
| `g-must-have` | `"${v}" — 예산·구조 무관 반드시 실현. 설계 초기 포함 여부 확정 필요` |
| `future-pet` | `반려동물 계획 **${v}** — 바닥 내구성·청소 동선·수납 설계 반영` |
| `lr-dining-area` | `거실 내 다이닝 배치 **${v}** — 식탁 규격·조명 위치·동선 연동 계획` |
| `lr-audio` | `오디오 시스템 **${v}** — 스피커 위치·배선·방음 처리 사전 협의` |
| `lr-storage-type` | `거실 수납 방식 **${v}** — 제작 일정·비용 구조·설계 연동 계획 반영` |
| `kitch-cooktop` | `쿡탑 **${v}** — 가스 라인 또는 전기 용량 계획 반영` |
| `kitch-cabinet-type` | `주방 가구 방식 **${v}** — 설계 일정 및 협력업체 연동 계획 확정` |
| `dr-door-type` | `드레스룸 도어 방식 **${v}** — 레일 구조·프레임 재질 제작 사양 반영` |
| `dr-furniture-type` | `드레스룸 가구 방식 **${v}** — 현장 실측 및 제작 또는 발주 계획 수립` |
| `study-purpose` | `서재 용도 **${v}** — 책상·조명·수납·방음 구성 기준` |
| `study-desk` | `서재 책상 구성 **${v}** — 콘센트 위치·모니터 암 보강 계획` |
| `study-door` | `소음 차단 **${v}** — 도어 방식 및 프레임 마감 계획 반영` |
| `sb-shower-type` | `샤워 구획 **${v}** — 하자 방수·실리콘 마감·청소성 기준 적용` |
| `sb-sink-type` | `세면대 타입 **${v}** — 배관 위치·하부장 규격 연동 설계` |
| `sb-sink-material` | `세면대 카운터 소재 **${v}** — 타일 샘플 제안 및 하자 처리 방식 협의` |
| `sb-faucet` | `수전 방식 **${v}** — 벽체 매립 시 배관 사전 결정 필요` |
| `sb-toilet` | `변기 타입 **${v}** — 벽걸이형 시 탱크 매립 공사 범위 협의` |
| `sb-budget` | `욕실 예산 등급 **${v}** — 마감재 샘플 제안 범위 및 공사비 기준` |
| `mab-shower-type` | `안방욕실 샤워 구획 **${v}** — 욕조와의 공간 분할 계획 반영` |
| `mab-sink-type` | `안방욕실 세면대 **${v}** — 배관·상판·조명 연동 설계` |
| `mab-sink-material` | `안방욕실 카운터 소재 **${v}** — 럭셔리 마감재 샘플 제안 기준` |
| `mab-faucet` | `안방욕실 수전 방식 **${v}** — 스파 컨셉 연동 하드웨어 제안 기준` |

---

## 전체 변경 요약 (v1 → v2)

| 구분 | 항목 수 |
|------|---------|
| ✅ 재사용 (unchanged) | 39개 |
| ✏️ wording·옵션 수정 | 11개 |
| 🆕 신규 추가 | 23개 |
| ~~제거~~ (filler 감성 질문) | 14개 |
| **최종 핵심 질문 수** | **약 73개** (branch 별도) |

### 주요 제거 항목 (설계 직결 낮음)
`g-sensory` · `g-energy-drain` · `g-life-vision` · `g-future-life` · `g-life-value`  
`ent-feeling` · `ent-memo` · `lr-feeling` · `kitch-feeling` · `mb-feeling`  
`dr-feeling` · `dr-memo` · `dr-mirror` · `oth-space`

### 주요 추가 항목 (설계 직결 높음)
**수납/가구 방식:** `lr-storage-type` · `dr-door-type` · `dr-furniture-type` · `kitch-cabinet-type`  
**욕실 심화:** `sb-shower-type` · `sb-sink-type` · `sb-sink-material` · `sb-faucet` · `sb-toilet` · `sb-budget` · `mab-shower-type` · `mab-sink-type` · `mab-sink-material` · `mab-faucet`  
**신규 공간·기타:** `study` 공간 4개 · `kitch-cooktop` · `g-main-space` · `future-pet`

---

## v2 검수 요청 포인트

1. **감성 질문 제거 확인** — `ent-feeling`, `lr-feeling`, `kitch-feeling`, `mb-feeling`, `dr-feeling` 전부 제거. 공간당 감성 표현은 `*-memo`로만 수집. 동의 여부?
2. **욕실 질문 수 (9개)** — 공용욕실 9개 질문. 많지 않은가? `sb-toilet` 삭제 검토 가능.
3. **`dr-mirror` 제거** — 안방 메모로 흡수. 드레스룸 전신 거울 위치는 별도 질문 불필요 판단. 동의 여부?
4. **`study` 공간 독립** — `kids-study`에서 홈오피스 옵션 제거하고 study 공간으로 완전 분리. 동의 여부?
5. **`kitch-cooktop` 포함** — 가스/인덕션 선택은 설계 초기 단계에서 결정해야 하므로 포함. 그러나 시공 조건에 따라 변동 가능. 질문 유지 여부?
6. **`sb-budget` 욕실 예산 등급** — 이 질문이 어색하지 않은가? Premium briefing에 예산 등급 질문 포함 여부?
7. **`future-tenure` + `future-aging` branch** — 5년 이상만 노후 대비 질문 노출. 3-5년 (중기) 포함 여부 재검토.
8. **메모 정책** — v2에서 메모는 섹션당 1개만. 현관은 메모 없음. 일관성 유지 여부?
