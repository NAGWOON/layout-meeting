/* ============================================
   INTERVIEW_DATA — 질문 세트 (JS 글로벌 객체)
   수정: 이 파일만 편집하면 질문 세트 교체 가능
   ============================================ */

const INTERVIEW_DATA = {
  meta: {
    version: '1.0.0',
    title: '1차 디자인 인터뷰',
    updatedAt: '2026-04-11'
  },

  // 공통 질문 (모든 프로젝트)
  globalPreferences: {
    id: 'global',
    label: '전체 선호도',
    icon: '⭐',
    sections: [
      {
        id: 'global-lifestyle',
        title: '라이프스타일',
        questions: [
          {
            id: 'g-household',
            label: '거주 구성원은 어떻게 되나요?',
            type: 'multi-choice',
            required: true,
            options: ['부부 둘', '자녀 1명', '자녀 2명 이상', '반려동물', '부모님 동거', '재택근무자'],
            summary: { label: '구성원', keyword: false }
          },
          {
            id: 'g-lifestyle-tempo',
            label: '일상 생활 패턴은?',
            type: 'single-choice',
            required: false,
            options: ['집에서 보내는 시간이 많음', '출퇴근 중심 (저녁/주말만)', '재택근무 비중 높음'],
            summary: { label: '생활패턴', keyword: false }
          },
          {
            id: 'g-hosting',
            label: '손님 초대 빈도는?',
            type: 'single-choice',
            required: false,
            options: ['거의 없음', '가끔 (월 1-2회)', '자주 (주 1회 이상)'],
            summary: { label: '손님 빈도', keyword: false }
          }
        ]
      },
      {
        id: 'global-style',
        title: '전체 스타일 방향',
        questions: [
          {
            id: 'g-style-direction',
            label: '전체적으로 원하는 인테리어 분위기는?',
            type: 'multi-choice',
            required: true,
            options: ['모던/미니멀', '내추럴/우드', '클래식/고급스러운', '인더스트리얼', '북유럽/스칸디나비안', '빈티지/레트로', '호텔식/리조트', '한국 전통 모던'],
            summary: { label: '스타일', keyword: true }
          },
          {
            id: 'g-color-tone',
            label: '선호하는 색감 톤은?',
            type: 'single-choice',
            required: true,
            options: ['무채색 계열 (화이트/그레이/블랙)', '웜톤 (베이지/브라운/크림)', '쿨톤 (블루/그린/민트)', '컬러 포인트 선호'],
            summary: { label: '색감', keyword: true }
          },
          {
            id: 'g-material-pref',
            label: '선호하는 소재 느낌은?',
            type: 'tag',
            required: false,
            options: ['원목', '대리석', '콘크리트', '패브릭', '가죽', '메탈', '유리', '라탄'],
            summary: { label: '소재', keyword: true }
          },
          {
            id: 'g-priority-value',
            label: '인테리어에서 가장 중요하게 생각하는 것은? (최대 3개 순위)',
            type: 'priority',
            required: true,
            maxSelect: 3,
            options: ['수납/정리', '심미성/디자인', '채광/밝기', '동선/편의성', '내구성/실용성', '청소 용이성', '아이 안전'],
            summary: { label: '핵심 가치', keyword: true }
          },
          {
            id: 'g-reference',
            label: '참고하고 싶은 스타일이나 이미지 키워드가 있다면?',
            type: 'short-text',
            required: false,
            placeholder: '예: 무인양품 느낌, 강남 모델하우스처럼...',
            summary: { label: '레퍼런스', keyword: false }
          }
        ]
      },
      {
        id: 'global-concerns',
        title: '특별 요구사항',
        questions: [
          {
            id: 'g-allergy',
            label: '알레르기나 민감 반응이 있는 소재/물질이 있나요?',
            type: 'short-text',
            required: false,
            placeholder: '없으면 빈칸으로',
            summary: { label: '알레르기', keyword: false }
          },
          {
            id: 'g-must-keep',
            label: '반드시 유지하거나 재사용할 기존 가구/아이템이 있나요?',
            type: 'short-text',
            required: false,
            placeholder: '예: 피아노, 부모님께 받은 장롱...',
            summary: { label: '유지 아이템', keyword: false }
          },
          {
            id: 'g-budget-priority',
            label: '예산을 집중하고 싶은 공간 순위는?',
            type: 'priority',
            required: false,
            maxSelect: 3,
            options: ['거실', '주방', '안방', '욕실', '현관', '드레스룸'],
            summary: { label: '예산 우선', keyword: false }
          }
        ]
      }
    ]
  },

  // 공간별 질문
  spaces: [
    {
      id: 'entryway',
      label: '현관',
      icon: '🚪',
      sections: [
        {
          id: 'entryway-function',
          title: '기능과 수납',
          questions: [
            {
              id: 'ent-storage-scale',
              label: '신발 수납 규모는 어느 정도 필요한가요?',
              type: 'single-choice',
              required: true,
              options: ['최소 (20켤레 이하)', '중간 (20-40켤레)', '대형 (40켤레 이상)', '신발장 전면 확장 원함'],
              summary: { label: '신발 수납', keyword: false }
            },
            {
              id: 'ent-storage-items',
              label: '현관에 수납하고 싶은 것은?',
              type: 'tag',
              required: false,
              options: ['우산', '골프백', '자전거', '유모차', '캐리어', '청소도구', '택배 보관'],
              summary: { label: '수납 품목', keyword: false }
            },
            {
              id: 'ent-bench',
              label: '신발 착용용 벤치/의자가 필요한가요?',
              type: 'single-choice',
              required: false,
              options: ['필요함', '없어도 됨', '공간 여유 있으면 원함'],
              summary: { label: '벤치', keyword: false }
            }
          ]
        },
        {
          id: 'entryway-style',
          title: '스타일',
          questions: [
            {
              id: 'ent-style',
              label: '현관 분위기 방향은?',
              type: 'single-choice',
              required: false,
              options: ['깔끔하고 미니멀하게', '따뜻하고 아늑하게', '호텔처럼 고급스럽게', '기능 위주로 단순하게'],
              summary: { label: '현관 스타일', keyword: true }
            },
            {
              id: 'ent-floor',
              label: '현관 바닥 소재 선호는?',
              type: 'single-choice',
              required: false,
              options: ['타일 (포세린/대리석)', '원목마루 연결', '현 상태 유지'],
              summary: { label: '현관 바닥', keyword: false }
            },
            {
              id: 'ent-memo',
              label: '현관 관련 특별 요청사항',
              type: 'short-text',
              required: false,
              placeholder: '자유 입력...',
              summary: { label: '현관 메모', keyword: false }
            }
          ]
        }
      ]
    },

    {
      id: 'living-room',
      label: '거실',
      icon: '🛋',
      sections: [
        {
          id: 'lr-function',
          title: '주 사용 목적',
          questions: [
            {
              id: 'lr-main-use',
              label: '거실을 주로 어떻게 사용하나요?',
              type: 'multi-choice',
              required: true,
              options: ['TV 시청 중심', '가족 모임/대화', '독서/취미', '홈오피스 겸용', '아이 놀이공간'],
              summary: { label: '거실 용도', keyword: true }
            },
            {
              id: 'lr-tv',
              label: 'TV 설치 방식은?',
              type: 'single-choice',
              required: true,
              options: ['벽걸이 (벽 매립)', 'TV장 위에', 'TV 없음/프로젝터', '미정'],
              summary: { label: 'TV 방식', keyword: false }
            }
          ]
        },
        {
          id: 'lr-style',
          title: '스타일 및 소재',
          questions: [
            {
              id: 'lr-floor',
              label: '거실 바닥재 선호는?',
              type: 'single-choice',
              required: true,
              options: ['원목마루', '강마루', '타일/대리석', '카펫 일부 활용', '현 상태 유지'],
              summary: { label: '거실 바닥', keyword: true }
            },
            {
              id: 'lr-sofa',
              label: '소파 스타일 선호는?',
              type: 'single-choice',
              required: false,
              options: ['패브릭 (린넨/벨벳)', '가죽', '모듈형 (배치 변경 가능)', '1인+3인 조합', '소파 없이 좌식'],
              summary: { label: '소파', keyword: false }
            },
            {
              id: 'lr-wall',
              label: 'TV 뒷 벽/포인트 월 처리는?',
              type: 'single-choice',
              required: false,
              options: ['페인트 포인트 컬러', '벽지 패턴', '우드 패널', '대리석/타일', '그냥 화이트'],
              summary: { label: '포인트 월', keyword: false }
            },
            {
              id: 'lr-lighting',
              label: '거실 조명 방향은?',
              type: 'multi-choice',
              required: false,
              options: ['간접조명 중심', '포인트 펜던트', '매립등 심플하게', '자연광 최대화', '스마트조명 연동'],
              summary: { label: '조명', keyword: true }
            }
          ]
        },
        {
          id: 'lr-storage',
          title: '수납',
          questions: [
            {
              id: 'lr-storage-need',
              label: '거실 수납 필요 규모는?',
              type: 'single-choice',
              required: false,
              options: ['최소화 (오픈 선반 정도)', '중간 (붙박이장 일부)', '대형 (벽면 수납 최대화)'],
              summary: { label: '거실 수납', keyword: false }
            },
            {
              id: 'lr-special-item',
              label: '거실에 배치할 특별한 아이템이 있나요?',
              type: 'tag',
              required: false,
              options: ['피아노', '오디오 기기', '대형 어항', '갤러리 월', '홈바', '식물/화분'],
              summary: { label: '특별 아이템', keyword: false }
            },
            {
              id: 'lr-memo',
              label: '거실 관련 특별 요청사항',
              type: 'short-text',
              required: false,
              placeholder: '자유 입력...',
              summary: { label: '거실 메모', keyword: false }
            }
          ]
        }
      ]
    },

    {
      id: 'kitchen',
      label: '주방',
      icon: '🍳',
      sections: [
        {
          id: 'kitchen-layout',
          title: '레이아웃',
          questions: [
            {
              id: 'kitch-island',
              label: '아일랜드/식탁 구성은?',
              type: 'single-choice',
              required: true,
              options: ['아일랜드 필수', '아일랜드+별도 식탁', '식탁만 (아일랜드 없이)', '공간 상황에 맞게'],
              summary: { label: '아일랜드', keyword: true }
            },
            {
              id: 'kitch-dining-size',
              label: '식사 인원 기준은?',
              type: 'single-choice',
              required: false,
              options: ['2인', '4인', '6인 이상', '손님 포함 확장형 원함'],
              summary: { label: '식사 인원', keyword: false }
            }
          ]
        },
        {
          id: 'kitchen-style',
          title: '스타일 및 소재',
          questions: [
            {
              id: 'kitch-style',
              label: '주방 스타일 방향은?',
              type: 'single-choice',
              required: true,
              options: ['모던/미니멀 (무광/무손잡이)', '내추럴 (우드+화이트)', '클래식 (몰딩/유광)', '산업적 (메탈+콘크리트)'],
              summary: { label: '주방 스타일', keyword: true }
            },
            {
              id: 'kitch-counter',
              label: '상판/카운터 소재 선호는?',
              type: 'single-choice',
              required: false,
              options: ['인조대리석', '세라믹 상판', '천연대리석', '스테인리스', '원목'],
              summary: { label: '카운터', keyword: false }
            },
            {
              id: 'kitch-floor',
              label: '주방 바닥 처리는?',
              type: 'single-choice',
              required: false,
              options: ['거실 바닥과 동일하게', '타일로 구분', '현 상태 유지'],
              summary: { label: '주방 바닥', keyword: false }
            }
          ]
        },
        {
          id: 'kitchen-function',
          title: '기능 및 수납',
          questions: [
            {
              id: 'kitch-cook-freq',
              label: '요리 빈도는?',
              type: 'single-choice',
              required: false,
              options: ['거의 안 함 (간단한 것만)', '보통 (주 3-4회)', '매일 본격 요리'],
              summary: { label: '요리 빈도', keyword: false }
            },
            {
              id: 'kitch-storage-priority',
              label: '주방 수납 우선순위는? (복수 선택)',
              type: 'multi-choice',
              required: false,
              options: ['식재료 팬트리', '그릇/조리도구', '냉장고 빌트인', '식기세척기', '커피머신 전용 공간'],
              summary: { label: '수납 우선', keyword: false }
            },
            {
              id: 'kitch-memo',
              label: '주방 관련 특별 요청사항',
              type: 'short-text',
              required: false,
              placeholder: '자유 입력...',
              summary: { label: '주방 메모', keyword: false }
            }
          ]
        }
      ]
    },

    {
      id: 'master-bedroom',
      label: '안방',
      icon: '🛏',
      sections: [
        {
          id: 'mb-setup',
          title: '기본 구성',
          questions: [
            {
              id: 'mb-bed-size',
              label: '침대 사이즈는?',
              type: 'single-choice',
              required: true,
              options: ['퀸 (1600mm)', '킹 (1800mm)', '슈퍼킹 (2000mm)', '분리 싱글 2개'],
              summary: { label: '침대', keyword: false }
            },
            {
              id: 'mb-tv',
              label: '안방 TV 설치 여부는?',
              type: 'single-choice',
              required: false,
              options: ['설치 원함 (벽걸이)', '설치 원함 (이동형)', '없어도 됨'],
              summary: { label: '안방 TV', keyword: false }
            },
            {
              id: 'mb-working',
              label: '안방에 작업 공간(책상)이 필요한가요?',
              type: 'single-choice',
              required: false,
              options: ['필요함', '없어도 됨', '작은 화장대 정도'],
              summary: { label: '작업 공간', keyword: false }
            }
          ]
        },
        {
          id: 'mb-style',
          title: '스타일 및 분위기',
          questions: [
            {
              id: 'mb-style',
              label: '안방 분위기는?',
              type: 'single-choice',
              required: true,
              options: ['호텔식 고급스러움', '따뜻하고 아늑한 코지함', '심플하고 모던하게', '내추럴 우드 감성'],
              summary: { label: '안방 분위기', keyword: true }
            },
            {
              id: 'mb-lighting',
              label: '안방 조명 방향은?',
              type: 'multi-choice',
              required: false,
              options: ['간접조명 (수면 배려)', '스탠드/사이드 조명', '조도 조절 가능하게', '블라인드/암막 중요'],
              summary: { label: '안방 조명', keyword: false }
            },
            {
              id: 'mb-memo',
              label: '안방 관련 특별 요청사항',
              type: 'short-text',
              required: false,
              placeholder: '자유 입력...',
              summary: { label: '안방 메모', keyword: false }
            }
          ]
        }
      ]
    },

    {
      id: 'dressing-room',
      label: '드레스룸',
      icon: '👗',
      sections: [
        {
          id: 'dr-function',
          title: '기능과 구성',
          questions: [
            {
              id: 'dr-type',
              label: '드레스룸 형태 선호는?',
              type: 'single-choice',
              required: true,
              options: ['오픈형 (노출 수납)', '도어형 (전체 가림)', '혼합형 (일부 오픈+일부 닫힘)'],
              summary: { label: '드레스룸 형태', keyword: true }
            },
            {
              id: 'dr-category',
              label: '주로 수납할 의류 유형은?',
              type: 'tag',
              required: false,
              options: ['정장/수트', '캐주얼 행거', '가방 컬렉션', '신발 (드레스룸 내)', '이불/시즌 용품', '액세서리'],
              summary: { label: '수납 유형', keyword: false }
            },
            {
              id: 'dr-mirror',
              label: '전신 거울 위치는?',
              type: 'single-choice',
              required: false,
              options: ['드레스룸 내부', '안방 내부', '필요 없음'],
              summary: { label: '거울', keyword: false }
            },
            {
              id: 'dr-lighting',
              label: '드레스룸 조명은?',
              type: 'single-choice',
              required: false,
              options: ['밝고 균일하게 (색 확인 중요)', '간접조명으로 분위기있게', '기본 천장등'],
              summary: { label: '드레스룸 조명', keyword: false }
            },
            {
              id: 'dr-memo',
              label: '드레스룸 관련 특별 요청사항',
              type: 'short-text',
              required: false,
              placeholder: '자유 입력...',
              summary: { label: '드레스룸 메모', keyword: false }
            }
          ]
        }
      ]
    },

    {
      id: 'kids-study',
      label: '자녀방/서재',
      icon: '📚',
      sections: [
        {
          id: 'ks-setup',
          title: '방 용도와 구성',
          questions: [
            {
              id: 'ks-purpose',
              label: '이 방의 주 용도는?',
              type: 'multi-choice',
              required: true,
              options: ['아이 침실', '아이 놀이/공부방', '홈오피스/서재', '게스트룸 겸용'],
              summary: { label: '용도', keyword: true }
            },
            {
              id: 'ks-child-age',
              label: '자녀 나이대는? (해당 시)',
              type: 'single-choice',
              required: false,
              options: ['영아 (0-3세)', '유아 (4-7세)', '초등 (8-13세)', '중고등 (14세 이상)', '해당 없음'],
              summary: { label: '자녀 나이', keyword: false }
            },
            {
              id: 'ks-desk',
              label: '책상/학습 공간 필요도는?',
              type: 'single-choice',
              required: false,
              options: ['메인 공간 (넓은 책상 필수)', '보조 공간 (작은 책상)', '현재 불필요'],
              summary: { label: '학습 공간', keyword: false }
            },
            {
              id: 'ks-bed',
              label: '침대 구성은?',
              type: 'single-choice',
              required: false,
              options: ['싱글 1개', '2인용 벙커침대', '다락형 침대', '침대 없음 (좌식/매트리스)'],
              summary: { label: '침대 구성', keyword: false }
            },
            {
              id: 'ks-memo',
              label: '자녀방/서재 특별 요청사항',
              type: 'short-text',
              required: false,
              placeholder: '자유 입력...',
              summary: { label: '방 메모', keyword: false }
            }
          ]
        }
      ]
    },

    {
      id: 'shared-bathroom',
      label: '공용욕실',
      icon: '🚿',
      sections: [
        {
          id: 'sb-function',
          title: '기능 및 스타일',
          questions: [
            {
              id: 'sb-bath',
              label: '욕조 설치 여부는?',
              type: 'single-choice',
              required: true,
              options: ['욕조 필수', '욕조 제거 (샤워부스만)', '현 상태 유지'],
              summary: { label: '욕조', keyword: true }
            },
            {
              id: 'sb-style',
              label: '욕실 스타일은?',
              type: 'single-choice',
              required: false,
              options: ['밝고 깔끔한 화이트', '내추럴 타일 (테라코타/석재)', '다크 무드 (블랙/그레이)', '패턴 타일 포인트'],
              summary: { label: '욕실 스타일', keyword: true }
            },
            {
              id: 'sb-priority',
              label: '욕실 우선 개선사항은?',
              type: 'multi-choice',
              required: false,
              options: ['수납 추가', '환기 개선', '방수/곰팡이 방지', '조명 개선', '세면대 교체'],
              summary: { label: '개선 우선', keyword: false }
            },
            {
              id: 'sb-memo',
              label: '공용욕실 특별 요청사항',
              type: 'short-text',
              required: false,
              placeholder: '자유 입력...',
              summary: { label: '공욕 메모', keyword: false }
            }
          ]
        }
      ]
    },

    {
      id: 'master-bathroom',
      label: '안방욕실',
      icon: '🛁',
      sections: [
        {
          id: 'mab-function',
          title: '기능 및 스타일',
          questions: [
            {
              id: 'mab-bath',
              label: '안방욕실 욕조는?',
              type: 'single-choice',
              required: true,
              options: ['욕조 유지/설치 원함', '욕조 제거 (샤워부스 확장)', '프리스탠딩 욕조 원함'],
              summary: { label: '안욕 욕조', keyword: true }
            },
            {
              id: 'mab-style',
              label: '안방욕실 분위기는?',
              type: 'single-choice',
              required: false,
              options: ['호텔/스파 느낌', '깔끔한 화이트', '내추럴 석재', '다크 럭셔리'],
              summary: { label: '안욕 스타일', keyword: true }
            },
            {
              id: 'mab-double-sink',
              label: '세면대 구성은?',
              type: 'single-choice',
              required: false,
              options: ['1구 세면대', '2구 더블 세면대', '공간 여유 있으면 2구'],
              summary: { label: '세면대', keyword: false }
            },
            {
              id: 'mab-memo',
              label: '안방욕실 특별 요청사항',
              type: 'short-text',
              required: false,
              placeholder: '자유 입력...',
              summary: { label: '안욕 메모', keyword: false }
            }
          ]
        }
      ]
    },

    {
      id: 'laundry',
      label: '세탁실/다용도실',
      icon: '🧺',
      sections: [
        {
          id: 'lau-setup',
          title: '구성 및 기능',
          questions: [
            {
              id: 'lau-washer',
              label: '세탁기/건조기 구성은?',
              type: 'single-choice',
              required: true,
              options: ['세탁기+건조기 (상하 스택)', '세탁기+건조기 (나란히)', '드럼 세탁기만', '통돌이 세탁기'],
              summary: { label: '세탁기 구성', keyword: false }
            },
            {
              id: 'lau-sink',
              label: '세탁실 싱크/개수대 필요 여부는?',
              type: 'single-choice',
              required: false,
              options: ['필요함', '없어도 됨', '있으면 좋겠음'],
              summary: { label: '세탁싱크', keyword: false }
            },
            {
              id: 'lau-storage',
              label: '다용도실 추가 수납 필요사항은?',
              type: 'tag',
              required: false,
              options: ['청소도구', '세제류', '비상식품/음료', '공구류', '계절가전'],
              summary: { label: '다용도 수납', keyword: false }
            },
            {
              id: 'lau-memo',
              label: '세탁실 특별 요청사항',
              type: 'short-text',
              required: false,
              placeholder: '자유 입력...',
              summary: { label: '세탁 메모', keyword: false }
            }
          ]
        }
      ]
    },

    {
      id: 'other',
      label: '기타',
      icon: '📝',
      sections: [
        {
          id: 'other-general',
          title: '기타 요청',
          questions: [
            {
              id: 'oth-space',
              label: '추가로 논의하고 싶은 공간이 있나요?',
              type: 'short-text',
              required: false,
              placeholder: '예: 발코니, 창고, 다락...',
              summary: { label: '추가 공간', keyword: false }
            },
            {
              id: 'oth-concerns',
              label: '현재 집에서 가장 불편한 점은? (Pain Point)',
              type: 'short-text',
              required: false,
              placeholder: '수납 절대 부족, 채광 나쁨, 동선 최악 등...',
              summary: { label: 'Pain Point', keyword: false }
            },
            {
              id: 'oth-absolute-no',
              label: '절대 원하지 않는 것이 있나요? (Absolute No)',
              type: 'short-text',
              required: false,
              placeholder: '예: 벽지 사용 반대, 욕조 제거 반대, 블랙 계열 싫음...',
              summary: { label: 'Absolute No', keyword: false }
            },
            {
              id: 'oth-followup',
              label: '후속 확인/검토가 필요한 사항이 있나요?',
              type: 'short-text',
              required: false,
              placeholder: '예: 발코니 확장 가능 여부, 구조 변경 검토, 인허가 확인...',
              summary: { label: '후속 검토', keyword: false }
            },
            {
              id: 'oth-wishlist',
              label: '인테리어 완성 후 꼭 실현하고 싶은 것은?',
              type: 'short-text',
              required: false,
              placeholder: '내 집이 이렇게 됐으면 좋겠다...',
              summary: { label: '위시리스트', keyword: true }
            }
          ]
        }
      ]
    }
  ]
};
