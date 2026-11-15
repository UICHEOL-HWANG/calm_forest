# npc-affinity 작업 목록

## 기획 (완료)
- [x] 코드·세이브·GA4 현황 조사
- [x] 방향 3안 시안 → A + C 편지 선택
- [x] 세부 3결정 시안 → 칩+수첩 / 소식함 편지 칸 / 전용1+공통 액자
- [x] 선물 하트 상한 → 주민당 하루 +2
- [x] 설계 문서, dev docs
- [x] 사용자 설계 문서 검토 (2026-11-13 확정)

## P1 준비
- [x] 문구 검수: 화면 문구 17종 추천안 확정 (2026-11-13) → `npc-affinity-copy.md`
- [x] 이웃·친구 편지 22통 + 도면 받은 사람 갈래 9통 확정 → `npc-affinity-copy.md`
- [x] 단짝 아이템 이름 11 + 액자 이름 확정 → `npc-affinity-copy.md`
- [ ] 편지·문구 영어 번역 검수 (구현 때)
- [ ] 꾸러미·판다/올빼미 친구 보상 값 재계산(SELL_PRICE), 아이템 id 실재 확인(미끼·밀가루·꿀·반딧불이·달걀)
- [ ] GA4 현재 파라미터 키 목록 대조(상한 23)

## P1 구현 (TDD) · 2026-11-13 완료, 미커밋
- [x] `tests/affinity-stages.test.mjs` → `js/affinity/stages.js`
- [x] `HIDDEN_AFFINITY` 파리티 테스트
- [x] `addAffinity` 를 `js/affinity/index.js` 로 위임, ❤️3마다 답례 제거
- [x] 선물 하트 하루 +2 (`hintsSeen.affGift`), 넘으면 상한 토스트
- [x] 올빼미 일일 5건 완료 +1 (`hintsSeen.affOwlDay`, npcClaim 의 `st.idx === DAILY_COUNT`)
- [x] 대화창 칩(`#npc-hearts` 를 버튼으로), 칩 → 수첩
- [x] 📒 주민 수첩(☰ 소식·친구 칸, `#npcbook-modal`, 숨은 이웃 제외)
- [x] 소식함 탭(📮 소식 / ✉️ 편지), 편지 상세·받기
- [x] 단계 오름 토스트 (집 완성 전엔 안 띄움). 머리 위 이모지 말풍선은 넣지 않음(아래 남은 것)
- [x] 소급 발행(P1 은 이웃·친구까지, `LETTER_MAX_STAGE` 2)
- [x] 계측 5종 + `docs/analysis/event-taxonomy.csv` 행
- [x] `tests/npc-letters.test.mjs`, `tests/affinity-copy.test.mjs`, `tests/affinity-i18n.test.mjs`
- [x] 편지 영어는 `js/data/npc-letters.js` 의 `bodyEn/altEn` (첫 화면 번들 650KB 상한 때문에 i18n-en 에서 뺌). 수첩·편지 UI 는 동적 import
- [ ] 세이브 왕복 테스트(hintsSeen 키 보존): applySave 가 hintsSeen 을 통째로 펼치는 것만 코드로 확인, 자동 테스트는 없음

## P1 검증·배포
- [x] 실게임(로컬 워크트리 서버): 선물 상한·단계 토스트·편지 2통·받기(목재 15)·중복 방지·소급 3통·올빼미 하루 1번·칩→수첩·수첩→편지, PC 1280·모바일 375·320
- [x] code-reviewer: HIGH 1(편지 테스트, 이미 수정), MEDIUM 3(탭 전환 읽음·상한 토스트 가림·올빼미 토스트 겹침) 수정, LOW 1(대화창마다 수첩 계산) 수정
- [x] 전체 테스트 5,289/5,289, 첫 화면 번들 643.9KB
- [ ] 영어 번역 검수 (`npc-affinity-copy.md` ④)
- [ ] 토스 웹뷰 실기기 확인
- [ ] 단계 오름 머리 위 이모지 말풍선(설계 5.3-1) — 기존 API 없음, spawnFloatText 로 할지 결정
- [ ] 커밋(사용자 요청 시) → 배포 승인 → deploy-checklist (새 꾸미기 id 없음, 단독 배포 가능)
- [ ] 다음 날 BQ 재검증

## P2 (진행 중, 2026-11-13)
- [x] 스타일 C 기념물형 + 액자 F2 확정, 11종 시안 완성
- [x] 단짝·가족 편지 22통 확정
- [x] 보여 주기 A+B+C(💌) 확정, 문구 S1~S12 확정
- [x] 편지 데이터·영어·테스트 (LETTER_MAX_STAGE 4, 단짝·가족 22통 + bodyEn)
- [x] js/affinity/art.js (시안 모델에서 생성, 재질별 굽기 2~5메시) · js/data/affinity-decor.js · catalog 등록 22 id · outdoorMesh/indoor decorMesh · 충돌 상자(발자국 85%)
- [x] 받기 → $w.grantDecor, 🧺 토스트 · 가족 이름표 🌳 (refreshFamilyTags)
- [x] A 소개 카드(#affintro-modal, 3D 썸네일 js/affinity/thumb.js) + 길 안내(js/affinity/guide.js, flow 'affinity') · B 의뢰 패널 줄(#aff-track) · C 💌(npcGlyph, 의뢰 기호 우선)
- [x] 실게임: 소개 카드→안내 1/2→2/2→완료, 작물 2개 보충, 편지 4통·꾸미기 지급, 흔들의자 배치(2메시/2,448삼각형), 액자 높이 0.44, 이름표 🌳, 상시 줄 PC(썸네일)·모바일
- [x] 함정: 토스 아이콘이 이모지를 span/img(.te/.ti)로 바꿈 → CSS 는 자식 결합자(>)나 전용 클래스로만
- [x] code-reviewer P2: MEDIUM 4(안내 멈춤·상시 줄 갱신·배치 발자국·올빼미 소개) + LOW 4(작물 보충 1회·지급 실패 시 받음 표시 안 함·썸네일 실패 대비·칩 클릭 시 모달 겹침) 수정, 테스트 5,297 통과, 첫 화면 번들 646.1KB(상한 650)
- [ ] 영어 검수(P1+P2 한꺼번에), 토스 실기기, 커밋, 5곳 동시 배포
- [ ] 단짝 11종 이름 검수
- [ ] 렌더 시안: 4명씩 묶어 3안 (11종) + 액자 틀 3안, PC·모바일 실물 크기
- [ ] `js/affinity/art.js`, 카탈로그 등록(OUTDOOR hidden quest:'affinity' 11, DECOR hidden sm 11)
- [ ] 단짝·가족 편지 22통 초안 → 검수 → en
- [ ] 이름표 🌳
- [ ] 소급 발행 상한 4로
- [ ] 5곳 동시 배포, E3 사전등록에 배포일
