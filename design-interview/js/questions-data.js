/* ============================================
   INTERVIEW_DATA — 질문 세트 (JS 글로벌 객체)
   수정: 이 파일만 편집하면 질문 세트 교체 가능
   ============================================ */

const INTERVIEW_DATA = {
  meta: {
    version: '3.3.0',
    title: 'DASIFILL 디자인 브리프',
    updatedAt: '2026-04-13'
  },

  // 공통 질문 (모든 프로젝트)
  globalPreferences: {
    id: 'global',
    label: '전체 선호도',
    icon: '⭐',
    sections: [
      {
        id: 'part1-life-understanding',
        title: '현재의 삶 이해',
        questions: [
          {
            id: 'p1-q1-household',
            label: '현재 함께 거주하는 구성원은 어떻게 되시나요?',
            type: 'multi-choice',
            required: true,
            options: ['부부', '자녀 1명', '자녀 2명 이상', '부모님 동거', '반려동물', '기타'],
            summary: { label: '가족 구성', keyword: false }
          },
          {
            id: 'p1-q2-home-time',
            label: '평소 집에 머무르는 시간은 어느 정도인가요?',
            type: 'single-choice',
            required: true,
            options: [
              '하루 대부분 집에서 생활합니다',
              '주로 저녁/주말에 머뭅니다',
              '생활보다 휴식/수면 위주로 이용합니다',
              '구성원마다 생활 패턴이 다릅니다'
            ],
            summary: { label: '생활 패턴', keyword: false }
          },
          {
            id: 'p1-q3-weekend-pattern',
            label: '주말에는 주로 어떤 방식으로 시간을 보내시나요? (복수 선택)',
            type: 'multi-choice',
            required: true,
            options: [
              '집에서 충분히 쉬며 보내는 편입니다',
              '외출 / 외부 활동이 많은 편입니다',
              '가족과 함께 시간을 보내는 편입니다',
              '집안 정리 / 청소 / 관리에 시간을 씁니다',
              '취미 / 자기계발 활동을 합니다',
              '손님을 초대하거나 모임을 갖는 편입니다'
            ],
            summary: { label: '주말 사용 방식', keyword: false }
          },
          {
            id: 'p1-q4-family-main-space',
            label: '가족이 함께 있을 때 가장 자주 머무는 공간은 어디인가요?',
            type: 'single-choice',
            required: true,
            options: [
              '거실에 자연스럽게 모이는 편입니다',
              '주방/식탁에서 함께 보내는 시간이 많습니다',
              '각자 방이나 개인 공간에서 보내는 편입니다',
              '상황에 따라 유동적으로 달라집니다'
            ],
            summary: { label: '가족 공용 체류 공간', keyword: false }
          },
          {
            id: 'p1-q5-main-activities',
            label: '집에서 가장 자주 이루어지는 활동은 무엇인가요? (복수 선택)',
            type: 'multi-choice',
            required: true,
            options: [
              '휴식 / 미디어 시청 중심',
              '식사 / 요리 / 다과 중심',
              '업무 / 학습 / 집중 활동',
              '취미 / 자기계발 / 독서',
              '육아 / 놀이 / 가족 활동',
              '손님 초대 / 교류 / 모임'
            ],
            summary: { label: '주요 활동', keyword: false }
          },
          {
            id: 'p1-q6-role-of-home',
            label: '당신에게 집은 어떤 역할에 더 가까운 공간인가요?',
            type: 'single-choice',
            required: true,
            options: [
              '하루의 피로를 풀고 쉬는 공간',
              '가족과 시간을 보내는 중심 공간',
              '혼자만의 루틴과 시간을 보내는 공간',
              '일과 생활이 함께 이루어지는 공간',
              '사람들과 관계를 나누는 공간'
            ],
            summary: { label: '집의 역할 인식', keyword: false }
          }
        ]
      },
      {
        id: 'part2-priority-values',
        title: '설계 우선순위 / 가치 기준',
        questions: [
          {
            id: 'p2-q1-planning-priority',
            label: '공간을 계획할 때 가장 중요하게 생각하는 요소는 무엇인가요?',
            type: 'single-choice',
            required: true,
            options: [
              '공간이 넓고 개방감 있게 느껴지는 것',
              '생활하기 편한 동선과 구조',
              '충분한 수납과 정리의 용이함',
              '깔끔하고 정돈된 분위기',
              '유지관리 및 청소의 편리함',
              '가족 간 소통과 교류'
            ],
            summary: { label: '공간 계획 최우선 요소', keyword: false }
          },
          {
            id: 'p2-q2-design-vs-practical',
            label: '디자인과 공간 구성 중 어느 쪽에 더 비중을 두고 싶으신가요?',
            type: 'single-choice',
            required: true,
            options: [
              '분위기/디자인 완성도가 더 중요합니다',
              '실용성과 사용 편의가 더 중요합니다',
              '두 요소의 균형이 중요합니다'
            ],
            summary: { label: '디자인·실용 비중', keyword: false }
          },
          {
            id: 'p2-q3-flex-vs-optimal-vs-stable',
            label: '공간 계획 시 어떤 방향을 더 선호하시나요?',
            type: 'single-choice',
            required: true,
            options: [
              '현재 생활 방식에 최적화된 구성',
              '향후 변화까지 고려한 유연한 구성',
              '누구나 편하게 사용할 수 있는 안정적인 구성'
            ],
            summary: { label: '공간 계획 방향', keyword: false }
          },
          {
            id: 'p2-q4-expected-change',
            label: '이번 프로젝트를 통해 가장 기대하는 변화는 무엇인가요?',
            type: 'single-choice',
            required: true,
            options: [
              '생활 만족도가 높아지는 것',
              '공간 활용도가 좋아지는 것',
              '전체 분위기/완성도가 좋아지는 것',
              '관리와 유지가 편해지는 것',
              '가족 간 생활 방식이 개선되는 것'
            ],
            summary: { label: '프로젝트 기대 변화', keyword: false }
          }
        ]
      },
      {
        id: 'part3-future-considerations',
        title: '미래 고려사항',
        questions: [
          {
            id: 'p3-q1-family-change-3to5y',
            label: '향후 3~5년 내 가족 구성 변화 계획이 있으신가요?',
            type: 'single-choice',
            required: true,
            options: [
              '자녀 계획이 있습니다',
              '자녀의 성장/독립 예정이 있습니다',
              '가족/부모님 동거 가능성이 있습니다',
              '특별한 변화 계획은 없습니다'
            ],
            summary: { label: '3~5년 가족 변화 계획', keyword: false }
          },
          {
            id: 'p3-q2-lifestyle-change-3to5y',
            label: '향후 생활 방식 변화 가능성이 있으신가요?',
            type: 'single-choice',
            required: true,
            options: [
              '재택/홈오피스 필요 가능성이 있습니다',
              '취미/작업 공간이 필요해질 수 있습니다',
              '수납/물품 증가가 예상됩니다',
              '특별한 변화는 없을 것 같습니다'
            ],
            summary: { label: '생활 방식 변화 가능성', keyword: false }
          },
          {
            id: 'p3-q3-tenure-plan',
            label: '이번 공간은 어느 정도 기간 사용 예정이신가요?',
            type: 'single-choice',
            required: true,
            options: ['단기 거주 예정 (5년 이하)', '중기 거주 예정 (5~10년)', '장기 실거주 예정'],
            summary: { label: '예상 사용 기간', keyword: false }
          }
        ]
      },
      {
        id: 'global-optional-appendix',
        title: '추가 참고사항 (선택)',
        questions: [
          {
            id: 'ga-must-keep',
            label: '반드시 유지하거나 재사용할 기존 가구/아이템이 있나요?',
            type: 'short-text',
            required: false,
            placeholder: '예: 피아노, 부모님께 받은 장롱...',
            summary: { label: '유지 아이템', keyword: false }
          }
        ]
      }
    ]
  },

  // 공간별 질문
  spaces: [
    {
      id: 'entrance',
      label: '현관',
      icon: '🚪',
      sections: [
        {
          id: 'entrance-main',
          title: '현관',
          questions: [
            {
              id: 'ent-middle-door',
              label: '중문 계획은 어떻게 생각하고 계신가요?',
              type: 'single-choice',
              required: true,
              options: ['필요합니다', '필요하지 않습니다', '아직 정해지지 않음'],
              summary: { label: '중문 계획', keyword: false }
            },
            {
              id: 'ent-shoe-rack-width',
              label: '현재 사용 중인 신발장 규모를 알려주세요. (대략적인 가로 길이 기준)',
              type: 'single-choice',
              required: true,
              options: ['600mm 이하', '600~1200mm', '1200~1800mm', '1800mm 이상'],
              summary: { label: '신발장 가로 규모', keyword: false }
            },
            {
              id: 'ent-shoe-inventory',
              label: '현재 보유 중인 신발은 어느 정도인가요?',
              type: 'single-choice',
              required: true,
              options: ['10켤레 이하', '10~20켤레', '20~40켤레', '40켤레 이상'],
              summary: { label: '보유 신발 규모', keyword: false }
            },
            {
              id: 'ent-storage-satisfaction',
              label: '현재 신발장/현관 수납은 어느 정도인가요?',
              type: 'single-choice',
              required: true,
              options: ['여유 있음', '적당함', '부족함', '많이 부족함'],
              summary: { label: '현관 수납 만족도', keyword: false }
            }
          ]
        }
      ]
    },

    {
      id: 'living',
      label: '거실 / 공용부',
      icon: '🛋',
      sections: [
        {
          id: 'living-main',
          title: '거실 / 공용부',
          questions: [
            {
              id: 'liv-space-form',
              label: '공용 공간은 어떤 형태로 구성되길 원하시나요?',
              type: 'single-choice',
              required: true,
              options: [
                '소파 / TV 중심의 거실형 공간',
                '식탁 / 다이닝 중심의 공용 공간',
                '두 요소가 함께 있는 복합형 공간',
                '비워진 라운지형 공간'
              ],
              summary: { label: '공용 공간 형태', keyword: true }
            },
            {
              id: 'liv-center-element',
              label: '공용 공간의 중심이 되는 요소는 어떻게 계획하고 싶으신가요?',
              type: 'single-choice',
              required: true,
              options: [
                'TV / 영상 시청 중심',
                '오디오 / 취미 요소 중심',
                '디자인 가구 / 오브제 중심',
                '특별한 중심 요소 없이 비워진 공간'
              ],
              summary: { label: '공용 공간 중심 요소', keyword: true }
            },
            {
              id: 'liv-tv-direction',
              label: 'TV 공간은 어떤 방향을 선호하시나요? (복수 선택 가능)',
              type: 'multi-choice',
              required: false,
              showIf: { qId: 'liv-center-element', hasValue: 'TV / 영상 시청 중심' },
              options: [
                '벽걸이/심플한 구성',
                '매립/반매립형 연출',
                '아트월/포인트 디자인 포함',
                '하부장/수납장 필요',
                '젠다이/단올림 디자인 선호'
              ],
              summary: { label: 'TV 공간 방향', keyword: true }
            },
            {
              id: 'liv-dining-table-size',
              label: '희망하시는 식탁 규모를 선택해주세요. (가로 길이 기준)',
              type: 'single-choice',
              required: false,
              showIf: {
                qId: 'liv-space-form',
                hasAnyValue: [
                  '식탁 / 다이닝 중심의 공용 공간',
                  '두 요소가 함께 있는 복합형 공간'
                ]
              },
              options: [
                '1200mm 이하',
                '1200~1600mm',
                '1600~2000mm',
                '2000mm 이상',
                '아직 정해지지 않음'
              ],
              summary: { label: '식탁 가로 규모', keyword: false }
            },
            {
              id: 'liv-element-direction',
              label: '해당 요소는 어떤 방향으로 계획되길 원하시나요?',
              type: 'single-choice',
              required: false,
              showIf: {
                qId: 'liv-center-element',
                hasAnyValue: [
                  '오디오 / 취미 요소 중심',
                  '디자인 가구 / 오브제 중심'
                ]
              },
              options: [
                '기능 중심으로 명확하게 배치',
                '인테리어와 자연스럽게 어우러지게',
                '공간의 포인트가 되도록 강조되게',
                '수납/가구와 결합되게'
              ],
              summary: { label: '중심 요소 연출 방향', keyword: false }
            },
            {
              id: 'liv-atmosphere',
              label: '공용 공간은 어떤 분위기로 운영되길 원하시나요?',
              type: 'single-choice',
              required: true,
              options: [
                '가구/기능이 채워진 안정감 있는 공간',
                '여유롭고 비워진 공간',
                '필요에 따라 유동적으로 활용 가능한 공간'
              ],
              summary: { label: '공용 공간 분위기', keyword: true }
            },
            {
              id: 'liv-priority-focus',
              label: '거실/공용부 계획 시 가장 중요하게 생각하는 요소는 무엇인가요?',
              type: 'single-choice',
              required: true,
              options: [
                '개방감 / 공간감',
                '편안한 휴식감',
                '정돈된 연출 / 미니멀함',
                '가족 중심 구조',
                '활용성 / 다목적성'
              ],
              summary: { label: '거실/공용부 우선 요소', keyword: true }
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
          id: 'kitchen-main',
          title: '주방',
          questions: [
            {
              id: 'kitch-use-pattern',
              label: '주방은 평소 어떤 방식으로 사용하시나요?',
              type: 'single-choice',
              required: true,
              options: [
                '간단한 조리 위주로 사용합니다',
                '일반적인 가정식 조리를 자주 합니다',
                '다양한 요리/베이킹 등 적극적으로 활용합니다',
                '조리보다는 배달/간편식 위주입니다'
              ],
              summary: { label: '주방 사용 방식', keyword: false }
            },
            {
              id: 'kitch-priority-factors',
              label: '주방 계획 시 가장 중요하게 생각하는 요소는 무엇인가요? (복수 선택 가능)',
              type: 'multi-choice',
              required: true,
              options: [
                '조리 동선의 효율성',
                '넓은 작업 공간 확보',
                '충분한 수납과 정리',
                '깔끔하고 정돈된 디자인',
                '가족/손님과 소통 가능한 구조'
              ],
              summary: { label: '주방 계획 우선 요소', keyword: true }
            },
            {
              id: 'kitch-island-plan',
              label: '아일랜드 계획 시 어떤 방향을 선호하시나요?',
              type: 'single-choice',
              required: true,
              options: [
                '아일랜드 중심 구조를 원합니다',
                '바체어가 결합된 아일랜드 구조를 원합니다',
                '일반 식탁형 다이닝이 결합된 아일랜드 구조를 원합니다',
                '아일랜드는 필요하지 않습니다',
                '아직 정해지지 않아 제안을 받고 싶습니다'
              ],
              summary: { label: '아일랜드 계획', keyword: true }
            },
            {
              id: 'kitch-island-priorities',
              label: '아일랜드 계획 시 중요하게 생각하는 요소는 무엇인가요? (복수 선택 가능)',
              type: 'multi-choice',
              required: false,
              showIf: {
                qId: 'kitch-island-plan',
                hasAnyValue: [
                  '아일랜드 중심 구조를 원합니다',
                  '바체어가 결합된 아일랜드 구조를 원합니다',
                  '일반 식탁형 다이닝이 결합된 아일랜드 구조를 원합니다'
                ]
              },
              options: [
                '전/후면 모두 수납이 가능했으면 합니다',
                '전면 디자인 마감까지 완성도 있게 구성되길 원합니다',
                '조리/준비 공간이 넓었으면 합니다',
                '간단한 식사/티타임이 가능했으면 합니다'
              ],
              summary: { label: '아일랜드 중요 요소', keyword: false }
            },
            {
              id: 'kitch-dining-scale',
              label: '식사 공간은 어느 정도 규모를 계획하고 계신가요?',
              type: 'single-choice',
              required: false,
              showIf: {
                qId: 'kitch-island-plan',
                hasAnyValue: [
                  '바체어가 결합된 아일랜드 구조를 원합니다',
                  '일반 식탁형 다이닝이 결합된 아일랜드 구조를 원합니다'
                ]
              },
              options: [
                '2인 규모',
                '4인 규모',
                '6인 규모',
                '6인 이상 / 확장형 필요',
                '아직 정해지지 않음'
              ],
              summary: { label: '식사 공간 규모', keyword: false }
            },
            {
              id: 'kitch-storage-appliance',
              label: '주방 수납/가전 계획 시 선호하시는 방향이 있다면 선택해주세요. (복수 선택 가능)',
              type: 'multi-choice',
              required: false,
              options: [
                '가전이 최대한 보이지 않도록 숨겨지길 원합니다',
                '자주 사용하는 가전은 쉽게 꺼내 쓸 수 있길 원합니다',
                '밥솥/소형가전은 별도 전용 공간이 있었으면 합니다',
                '기능성 하드웨어가 적용된 구성을 선호합니다',
                '특별히 없음 / 제안을 받고 싶음'
              ],
              summary: { label: '주방 수납·가전 선호', keyword: false }
            }
          ]
        }
      ]
    },

    {
      id: 'bedroom',
      label: '침실',
      icon: '🛏',
      sections: [
        {
          id: 'bedroom-main',
          title: '침실',
          questions: [
            {
              id: 'bed-atmosphere',
              label: '침실은 어떤 분위기로 계획되길 원하시나요?',
              type: 'single-choice',
              required: true,
              options: [
                '호텔처럼 정돈되고 안정감 있는 분위기',
                '따뜻하고 편안한 분위기',
                '미니멀하고 절제된 분위기',
                '포인트/디자인 요소가 있는 분위기'
              ],
              summary: { label: '침실 분위기', keyword: true }
            },
            {
              id: 'bed-size',
              label: '계획 중인 침대 사이즈를 선택해주세요.',
              type: 'single-choice',
              required: true,
              options: [
                'SS / 슈퍼싱글',
                'Q / 퀸',
                'K / 킹',
                'KK 이상 / 패밀리침대',
                '아직 정해지지 않음'
              ],
              summary: { label: '침대 사이즈', keyword: false }
            },
            {
              id: 'bed-side-furniture',
              label: '침대 주변 가구 계획은 어떻게 생각하고 계신가요? (복수 선택 가능)',
              type: 'multi-choice',
              required: true,
              options: [
                '별도 협탁이 필요합니다 (기성 제품 예정)',
                '맞춤 제작 협탁을 원합니다',
                '화장대가 필요합니다 (기성 제품 예정)',
                '맞춤 제작 화장대를 원합니다',
                '특별히 계획 없음'
              ],
              summary: { label: '침대 주변 가구', keyword: true }
            },
            {
              id: 'bed-frame-plan',
              label: '침대 프레임은 어떤 방향을 계획하고 계신가요?',
              type: 'single-choice',
              required: true,
              options: [
                '기성 침대 프레임 사용 예정',
                '맞춤 제작 프레임 희망',
                '아직 정해지지 않아 제안을 받고 싶음'
              ],
              summary: { label: '침대 프레임', keyword: false }
            },
            {
              id: 'bed-headwall-plan',
              label: '침대 헤드월/헤드보드 계획은 어떻게 생각하시나요?',
              type: 'single-choice',
              required: true,
              options: [
                '별도 없이 심플한 구성 선호',
                '디자인 포인트가 되는 헤드월 제작 희망',
                '수납/기능이 포함된 헤드월 희망',
                '아직 정해지지 않음'
              ],
              summary: { label: '헤드월/헤드보드', keyword: false }
            }
          ]
        }
      ]
    },

    {
      id: 'dressing-room',
      label: '드레스룸',
      icon: '👗',
      optional: true,
      sections: [
        {
          id: 'dressing-room-main',
          title: '드레스룸',
          questions: [
            {
              id: 'dr-storage-approach',
              label: '드레스룸/의류 수납은 어떤 방식으로 계획하고 싶으신가요?',
              type: 'single-choice',
              required: true,
              options: [
                '맞춤 제작 가구를 희망합니다',
                '기성 가구/붙박이 활용 예정입니다',
                '시스템장 형태를 희망합니다',
                '아직 정해지지 않아 제안을 받고 싶습니다'
              ],
              summary: { label: '드레스룸 수납 방식', keyword: true }
            },
            {
              id: 'dr-current-wardrobe-length',
              label: '현재 사용 중인 옷장/드레스룸 규모를 알려주세요. (대략적인 길이 기준)',
              type: 'single-choice',
              required: true,
              options: ['1200mm 이하', '1200~2400mm', '2400~3600mm', '3600mm 이상'],
              summary: { label: '현재 옷장 길이', keyword: false }
            },
            {
              id: 'dr-clothing-volume',
              label: '현재 의류/수납은 어느 정도인가요?',
              type: 'single-choice',
              required: true,
              options: [
                '여유가 있는 편입니다',
                '적당한 수준입니다',
                '다소 부족한 편입니다',
                '많이 부족한 편입니다'
              ],
              summary: { label: '의류 수납 체감', keyword: false }
            },
            {
              id: 'dr-clothing-characteristics',
              label: '보유 중인 의류/소지품 특성을 선택해주세요. (복수 선택 가능)',
              type: 'multi-choice',
              required: true,
              options: [
                '긴 옷/코트류가 많습니다',
                '짧은 상/하의류가 많습니다',
                '접어서 보관하는 의류가 많습니다',
                '가방/잡화류가 많습니다',
                '신발/액세서리류가 많습니다'
              ],
              summary: { label: '의류·소지품 특성', keyword: true }
            },
            {
              id: 'dr-layout-priorities',
              label: '드레스룸 구성 시 중요하게 생각하는 요소는 무엇인가요? (복수 선택 가능)',
              type: 'multi-choice',
              required: true,
              options: [
                '행거 중심 구성을 선호합니다',
                '서랍 중심 구성을 선호합니다',
                '선반/오픈수납 중심 구성을 선호합니다',
                '전신거울/피팅 공간 필요',
                '화장/스타일링 공간 필요'
              ],
              summary: { label: '드레스룸 구성 우선 요소', keyword: true }
            },
            {
              id: 'dr-finish-style',
              label: '드레스룸 마감/연출 방식은 어떤 방향을 선호하시나요?',
              type: 'single-choice',
              required: true,
              options: [
                '오픈형 시스템장 구조',
                '가구 도어형으로 깔끔하게 정리되는 구조',
                '유리도어 적용으로 고급스럽게 연출되는 구조',
                '가구/유리도어 혼합형 구조',
                '아직 정해지지 않아 제안을 받고 싶음'
              ],
              summary: { label: '드레스룸 마감·연출', keyword: true }
            }
          ]
        }
      ]
    },

    {
      id: 'study',
      label: '서재 / 작업실',
      icon: '📚',
      optional: true,
      sections: [
        {
          id: 'study-main',
          title: '서재 / 작업실',
          questions: [
            {
              id: 'study-purpose',
              label: '해당 공간은 주로 어떤 용도로 사용할 예정인가요? (복수 선택 가능)',
              type: 'multi-choice',
              required: true,
              options: [
                '재택근무 / 업무 공간',
                '개인 공부 / 독서 공간',
                '취미 / 작업 공간',
                '게임 / 엔터테인먼트 공간',
                '복합 용도로 활용 예정'
              ],
              summary: { label: '공간 용도', keyword: true }
            },
            {
              id: 'study-users',
              label: '주 사용 인원은 어떻게 되나요?',
              type: 'single-choice',
              required: true,
              options: ['1인 사용', '2인 사용', '상황에 따라 공동 사용'],
              summary: { label: '주 사용 인원', keyword: false }
            },
            {
              id: 'study-desk-plan',
              label: '책상/데스크 구성은 어떻게 계획하고 계신가요?',
              type: 'single-choice',
              required: true,
              options: [
                '기성 책상 배치 예정',
                '맞춤 제작 데스크 희망',
                '아직 정해지지 않아 제안을 받고 싶음'
              ],
              summary: { label: '책상·데스크', keyword: false }
            },
            {
              id: 'study-priorities',
              label: '작업 공간 계획 시 중요하게 생각하는 요소는 무엇인가요? (복수 선택)',
              type: 'multi-choice',
              required: true,
              options: [
                '넓은 작업/데스크 공간',
                '모니터/장비 배치 여유',
                '수납/정리 효율',
                '깔끔한 미니멀 디자인',
                '분위기/무드 중심 연출'
              ],
              summary: { label: '작업 공간 우선 요소', keyword: true }
            },
            {
              id: 'study-storage-needs',
              label: '별도 수납/구성이 필요한 항목이 있다면 선택해주세요. (복수 선택)',
              type: 'multi-choice',
              required: true,
              options: [
                '책/서적 수납',
                '서류/문서 정리',
                '취미/작업 도구 수납',
                '전시/디스플레이 공간',
                '특별히 없음'
              ],
              summary: { label: '수납·구성 필요 항목', keyword: false }
            },
            {
              id: 'study-atmosphere',
              label: '공간 분위기는 어떤 방향을 선호하시나요?',
              type: 'single-choice',
              required: true,
              options: [
                '차분하고 집중되는 분위기',
                '밝고 개방감 있는 분위기',
                '무게감 있고 고급스러운 분위기',
                '디자인 포인트가 있는 분위기'
              ],
              summary: { label: '공간 분위기', keyword: true }
            }
          ]
        }
      ]
    },

    {
      id: 'bathroom',
      label: '욕실',
      icon: '🛁',
      optional: true,
      repeatable: true,
      maxRepeat: 3,
      sections: [
        {
          id: 'bathroom-setup',
          title: '욕실 구성',
          questions: [
            {
              id: 'bath-input-mode',
              label: '욕실 입력 방식은 어떻게 진행할까요?',
              type: 'single-choice',
              required: false,
              options: ['자세히 입력하고 싶습니다 (권장)', '핵심만 간단히 입력하고 싶습니다'],
              summary: { label: '욕실 입력 방식', keyword: false }
            },
            {
              id: 'bath-q0-count',
              label: '계획이 필요한 욕실은 몇 개인가요?',
              type: 'single-choice',
              required: true,
              options: ['1개', '2개', '3개 이상'],
              summary: { label: '욕실 계획 개수', keyword: false }
            }
          ]
        },
        {
          id: 'bathroom-instance',
          title: '욕실 상세',
          questions: [
            {
              id: 'bath-label',
              label: '해당 욕실의 명칭/용도를 선택해주세요.',
              type: 'single-choice',
              required: true,
              options: ['공용욕실', '안방욕실', '자녀욕실', '게스트욕실', '사용자 입력'],
              summary: { label: '욕실 라벨', keyword: false }
            },
            {
              id: 'bath-q1-mood',
              label: '욕실은 어떤 분위기로 계획되길 원하시나요?',
              type: 'single-choice',
              required: true,
              options: [
                '호텔 같은 고급스럽고 정돈된 분위기',
                '미니멀하고 깔끔한 분위기',
                '따뜻하고 편안한 분위기',
                '디자인 포인트가 있는 분위기'
              ],
              summary: { label: '욕실 분위기', keyword: true }
            },
            {
              id: 'bath-q2-use-type',
              label: '해당 욕실은 어떤 용도로 주로 사용되나요?',
              type: 'single-choice',
              required: true,
              options: ['공용 욕실', '부부 / 마스터 욕실', '자녀 / 개인 욕실', '게스트 욕실'],
              summary: { label: '욕실 주 사용 용도', keyword: false }
            },
            {
              id: 'bath-q3-bathtub-plan',
              label: '욕조 계획은 어떻게 생각하시나요?',
              type: 'single-choice',
              required: true,
              options: ['욕조가 필요합니다', '욕조 없이 샤워 공간 위주를 선호합니다', '아직 정해지지 않아 제안을 받고 싶습니다'],
              summary: { label: '욕조 계획', keyword: false }
            },
            {
              id: 'bath-q4-shower-type',
              label: '샤워 공간은 어떤 방식으로 계획되길 원하시나요?',
              type: 'single-choice',
              required: true,
              options: [
                '오픈형 샤워 공간',
                '유리 파티션 구분형',
                '타일 파티션 구분형',
                '샤워부스 / 완전 분리형',
                '아직 정해지지 않음'
              ],
              summary: { label: '샤워 공간 방식', keyword: false }
            },
            {
              id: 'bath-q5-vanity-plan',
              label: '욕실 가구/세면 공간은 어떤 방향을 선호하시나요?',
              type: 'single-choice',
              required: true,
              options: [
                '롱젠다이 + 상부 복합장 구성',
                '젠다이 + 매립장 구성 (업그레이드 옵션)',
                '카운터형 세면대 + 하부 가구수납 (업그레이드 옵션)',
                '카운터형 세면대 + 하부 오픈선반 (업그레이드 옵션)',
                '최소한의 심플한 구성'
              ],
              summary: { label: '세면·가구 구성 방향', keyword: false }
            },
            {
              id: 'bath-q6-counter-sink-style',
              label: '카운터형 세면대는 어떤 스타일을 선호하시나요?',
              type: 'single-choice',
              required: false,
              showIf: {
                qId: 'bath-q5-vanity-plan',
                hasAnyValue: [
                  '카운터형 세면대 + 하부 가구수납 (업그레이드 옵션)',
                  '카운터형 세면대 + 하부 오픈선반 (업그레이드 옵션)'
                ]
              },
              options: ['언더볼 세면대', '타일 / 마감 일체형 세면대 (프리미엄 옵션)', '아직 정해지지 않음'],
              summary: { label: '카운터형 세면대 스타일', keyword: false }
            },
            {
              id: 'bath-q7-detail-options',
              label: '욕실 디테일 옵션 중 선호하시는 항목을 선택해주세요. (복수 선택 가능)',
              type: 'multi-choice',
              required: false,
              options: [
                '매립형 수전 (업그레이드 옵션)',
                '이노솔 / 평천장 (업그레이드 옵션)',
                '도장 마감 천장 (프리미엄 옵션)',
                '특별히 없음 / 제안을 받고 싶음'
              ],
              summary: { label: '욕실 디테일 옵션', keyword: false }
            },
            {
              id: 'bath-q8-toilet-type',
              label: '계획 중이신 변기 타입을 선택해주세요.',
              type: 'single-choice',
              required: true,
              options: [
                '원피스 / 투피스형 (기본 사양)',
                '비데 일체형 (업그레이드 옵션)',
                '벽걸이형 (프리미엄 옵션 / 기존 배수 구조에 따라 적용 여부 상이)',
                '아직 정해지지 않음'
              ],
              summary: { label: '변기 타입', keyword: false }
            }
          ]
        }
      ]
    },

    {
      id: 'laundry',
      label: '세탁실/다용도실',
      icon: '🧺',
      optional: true,
      sections: [
        {
          id: 'lau-setup',
          title: '실용적인 이야기',
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
      id: 'extra-space',
      label: '기타 공간',
      icon: '🏠',
      optional: true,
      sections: [
        {
          id: 'extra-space',
          title: '기타 공간',
          questions: [
            {
              id: 'es-areas',
              label: '추가 계획이 필요한 공간이 있다면 선택해주세요. (복수 선택 가능)',
              type: 'multi-choice',
              required: true,
              options: [
                '세탁실 / 유틸리티룸',
                '아이방 / 놀이방',
                '게스트룸',
                '취미방 / 멀티룸',
                '펫 공간',
                '기타 특수 공간',
                '별도 없음'
              ],
              summary: { label: '추가 계획 공간', keyword: true }
            },
            {
              id: 'es-detail',
              label: '위 공간에 특별히 필요한 기능/구성이 있다면 자유롭게 작성해주세요.',
              type: 'short-text',
              required: false,
              placeholder: '자유 입력...',
              summary: { label: '기타 공간 기능·구성', keyword: false }
            }
          ]
        }
      ]
    },

    {
      id: 'final-request',
      label: '최종 요청사항',
      icon: '📝',
      sections: [
        {
          id: 'final-request',
          title: '최종 요청사항',
          questions: [
            {
              id: 'fr-must-haves',
              label: '이번 프로젝트에서 꼭 반영되었으면 하는 요청사항이 있다면 작성해주세요.',
              type: 'short-text',
              required: false,
              placeholder: '자유 입력...',
              summary: { label: '필수 반영 요청', keyword: true }
            },
            {
              id: 'fr-notes',
              label: '설계/미팅 전 전달하고 싶은 기타 참고사항이 있다면 작성해주세요.',
              type: 'short-text',
              required: false,
              placeholder: '자유 입력...',
              summary: { label: '기타 참고사항', keyword: false }
            }
          ]
        }
      ]
    }
  ]
};
