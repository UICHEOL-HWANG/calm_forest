# Context — sea-forage
Last Updated: 2026-10-27 (이식 착수)

## 핵심 파일
- 시뮬: sims/mudflat-dig-sim.html (새로 작성, three@0.160.0 unpkg importmap — sims/sea-feel-sim.html 과 같은 방식)
- 곰 캐릭터: sea-feel-sim.html 의 buildBear 를 복사해 씀(게임 리그는 playerArms·poseHeldTool 이라 이식 때 프레임 비교 다시)
- 바다터 게임 코드: js/spaces/sea.js, 어종 수치 js/data/places.js SEA_SPECIES
- 병행 작업: dev/active/sea-feel (낚시 손맛 C 링 타이밍 이식 대기, 모션 ①②③ 선택 대기)

## 의사결정
- 2026-10-27 분할 방향: 낚시 vs 채집 → 사용자 "A(갯벌)·B(잠수) 좋다" → 선택 화면 2안(세 장) 확정
- C(바위 웅덩이 뒤집기)는 보류
- 2026-10-27 갯벌 캐기 방식 **C 숨 쉴 때 캐기 확정**(링이 구멍으로 줄어들 때 누름, 헛손질 2번이면 구멍 숨음). 낚시 C 링 타이밍과 같은 계열이라 잠수는 타이밍이 아닌 숨 관리·탐색 쪽으로 차별화
- 잠수 한 판 = 숨 세 번(잠수 3회). 깊을수록 귀한 것, 내려가는 데도 숨이 듦 → 어디서 잠수할지가 전략
- 갯벌을 먼저 만드는 이유: 땅 파기 동작·바닥 지형이라 새 공간 부담이 가장 적음. 잠수는 물속 카메라·안개·조명 새로 필요

- 2026-10-27 결과창 **3안 수첩 확정**(줄 노트·손글씨 Gaegu·비뚤게 붙는 스티커·희귀종 "오늘의 대물" 라벨). 캡처 result-3-notebook.jpg
- 2026-10-27 선택 화면 **A 나란히 세 장 확정**(한 번 누르면 바로 시작, 세로 폰은 가로 줄 세 개로 쌓임). 캡처 pick-A-side-by-side.jpg
  - 제목: "오늘은 바다에서 뭐 할까요?"
  - 🎣 대어 낚시 · 버티고 당겨서 대어 낚기 · [손맛] [🏆 오늘의 참치 순위]
  - 🐚 갯벌 캐기 · 밀물 전에 조개 가득 캐기 · [수집] [⏱️ 밀물까지 1분] · 새로 생겼어요
  - 🤿 잠수 · 숨 참고 바닷속 보물 줍기 · [탐험] [🫧 숨 세 번] · 새로 생겼어요
  - 카드 미리보기는 게임에서 실제 녹화 webm/mp4(무음·loop·playsinline). 시안은 sims ?clip=1 가상 시계로 찍은 프레임
- 결과창은 갯벌·잠수 공용 모듈(sims/forage-result.js, showResult({design, mode, items, ...})). 테마 색만 mode 로 바뀜. 크기는 컨테이너 쿼리(낮은 화면 ≤520px 은 가로 배치)
- 2026-10-27 잠수 숨 규칙 **A 숨 다 되면 떠오르기 확정**(벌칙 없이 저절로 떠오름, 주운 건 유지). 시뮬 기본값은 아직 ?v=A 가 기본이라 그대로
- 잠수 C(공기 방울)는 방울을 무한 재사용하면 판이 안 끝남 → 잠수 1회당 방울 4곳 각 1번

## 이식 (2026-10-27 승인)
- 워크트리: /Users/uicheol_hwang/calm_forest-sea-forage (feat/sea-forage, origin/main 6ee2b4c3 에서 분기). 원래 체크아웃(analytics/metrics-framework)은 main 보다 뒤처져 설산이 없음
- 계획 전문: ~/.claude/plans/async-jingling-glade.md
- 범위: 잡은 것은 종류별 아이템 11종 · 도감/박물관은 다음 단계 · 5곳 한 번에 배포
- 보상(잡을 때/판매): 바지락 1/2 칠게 1/1 꼬막 1/3 맛조개 1/4 가리비 2/6 낙지 5/15 · 소라 1/2 불가사리 1/1 전복 2/5 문어 3/8 진주 5/18
  - 근거: econ_logs 30일 sea_catch 10코인/15초(약 40/분, 물고기 포함 약 98), sled_run 21.6/115초(약 11/분). 표본 작음(47·14건)
- 갯벌 캐기 도구는 기존 삽+삽질 모션(스윙 모션 변경 금지) · 잠수 헤엄 자세는 새 모션이라 프레임 비교 승인 필요
- 트래킹: sea-forage-tracking.md (사용자 요청 "ML 학습 고려·GA4 파라미터 한도 고려")
- 선례: 썰매 js/mountain/sled-run.js (sled_start/result/detail + sled_runs 풍부한 행) · 난이도 js/difficulty.js + js/tuning.js DIFFICULTY

## 아이템 등록 (2026-10-27)
- 단일 출처 js/forage/logic.js → SELL_PRICE 맨 끝에 펼침(맨 앞이면 판매 화면 맨 위로 올라와 기존 작물이 밀림) · SELL_ICO_G · RES_LABEL · index.html ITEM_META·BAG_CATS "🌊 바다" · 판매 줄은 바다 아이템만 이름 <b> 표시(🐚 아이콘이 5종 겹침)
- 시세(±30%)가 새 아이템에도 똑같이 걸림 → 바지락 2코인이 1코인까지 내려감(정상)
- 미리보기 서버: 루트 .claude/launch.json 의 "sea-forage"(8857, 8855는 다른 세션 사용 중)
- 검증 중 게스트 익명 계정 1개 생성(?dbg=1). 캐릭터 고르기·닉네임은 진행 안 함. 다시 게스트로 들어가지 말 것(익명 계정 증식)
- 워크트리엔 node_modules 없음 → npm ci 먼저(안 하면 빌드 테스트 9개 실패)
- sims/sea-feel-sim.html 은 main 버전에 clip 연결 고리 2줄만 더함(옛 체크아웃 파일로 덮으면 main 의 모션 시안 MOS 코드가 사라짐)

## 트래킹·DB (2026-10-27)
- forage_runs 운영 적용 완료: 컬럼 47, CHECK 14(json 16KB·글자 길이·개수 1000 상한 포함), RLS 자기 행 insert/select, run_date 는 서버 KST 트리거가 덮어씀(기기 시계 무시)
- jsonb 크기는 Postgres 출력 기준(쉼표·콜론 뒤 공백)으로 재야 함 → 테스트도 그 기준
- tests/kst-date.test.mjs 가 run_date: kstDate() 개수를 고정(4→5)해 둠. 새 *_runs 전송 함수를 더하면 같이 올릴 것
- 난이도 저장값은 mergeDifficulty 가 알려진 게임만 남김 → 옛 클라이언트가 저장하면 mudflat/dive 판 순번이 0으로 돌아감(영향 작음, 5곳 동시 배포로 해소)
- 적용 스크립트는 scratchpad(apply_forage.py), 실행은 ml/.venv/bin/python (시스템 파이썬엔 pandas 없음)

## 선택 화면 (2026-10-27)
- 문(nearDoor 'sea') → openSeaPick(). ?sea=1 디버그는 그대로 enterSea 직행
- 클래스 접두사 seap-(sp- 는 .sp-bar 와 겹침). 가로 폰은 닫기 버튼을 카드 바깥 오른쪽(right:-48px)
- 화면 검증법: ?dbg=1&e2=skip_login 이면 로그인 없이 오프라인 게스트로 입장, 익명 계정은 사람 입력(isTrusted) 뒤에만 생김 → 스크립트 클릭만 쓰면 계정 0. 새 게스트는 바다터 잠겨 문 안내가 안 뜨므로 await import('/js/spaces/sea-pick.js') 로 openSeaPick() 직접 호출(같은 모듈 인스턴스)
- 개발 세션은 trackEvent 가 아무것도 안 보냄 → GA4 확인은 배포 다음 날 BigQuery
- event-taxonomy.csv 에 새 이벤트 행 필수(테스트가 잡음). forage_start/forage_result 는 공간에서 보내기 시작할 때 추가

## 갯벌 공간 (2026-10-27)
- 결정: 독립 공간 대신 바다터(atSea) 안 놀이로. mudflat.active 로 분기하는 곳: sea.js updateSea·seaCamera·exitSea(leaveMudflat 먼저), game.js 이동 제한·도구 전환 막기·미니맵 중심·handleAction·?mudflat=1·?mudflatdebug=1(window.__mudflat), doors.js 안내/나가기, sea-pick ENTRY
- 🚨 seaGroup 자체가 SEA(400,0,0)에 있다 → 안에 넣는 그룹 위치는 MUDFLAT - seaGroup.position (처음엔 x=800 에 지어져 안 보였음)
- 캐기 판정은 누른 순간 위상, 보상·연출은 0.33초 뒤(삽질 모션 임팩트)
- HUD 바구니 개수는 밀물 막대 줄 안(따로 두면 안내 줄과 겹침, 사용자 지적)
- 확인 함정: 캐릭터 창을 style 로만 숨기면 ui.anyModalOpen() 이 참이라 행동이 먹힘 → classList.remove('show')
- 확인 중 익명 계정 1개 생김(미리보기 창에 실제 입력이 들어간 것으로 추정). 개발 세션이라 이벤트·로그는 없음

## 이식 때 함정
- 결과창 클래스(.row .grid .btns .card 등)가 페이지 전역 CSS 와 충돌함(비교 페이지 .row margin 34px 로 실제 발생) → 게임 이식 시 클래스 전부 fr- 접두사로 바꿀 것
- 결과창 글꼴 Jua·Gaegu·Baloo 2 를 Google Fonts 로 불러옴 → 토스 번들·오프라인에서 글꼴 로딩 정책 확인 필요
- 미리보기 탭이 백그라운드면 rAF·CSS 애니메이션이 멈춤 → 검증은 __mud.step / __dive.step 직접 호출 + document.getAnimations().finish()

## 지켜야 할 규칙 (메모리)
- 시안 3개 이상 PC+모바일 나란히 비교받기
- 새 문구는 한국어 후보 먼저 검수, 엠대시 금지
- 월드 말풍선·표시는 이모지만
- 도구 휘두르는 기존 모션 변경 금지 (호미질은 새 모션이라 시뮬에서 승인받고 이식)
- 새 코드는 game.js 에 몰지 말고 js/spaces/<공간>.js, 코드 주석 금지

## 디버그 파라미터 (시뮬)
- ?v=A|B|C 캐기 방식 · ?seed=N 고정 배치 · ?tide=초 한 판 길이 · ?embed=1 설정 패널 숨김
