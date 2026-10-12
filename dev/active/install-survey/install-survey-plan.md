# 🧭 첫 실행 "어디서 알게 되셨어요?" 설문 (iOS·안드로이드)

## Context
iOS 는 Play 같은 install referrer 가 없어 채널을 자동으로 알 수 없고, 안드로이드도 Play 링크 없이 들어온 사람(검색·스토어 둘러보기)은 `organic`·`unknown` 으로만 잡힌다. 채널별 리텐션을 보려면 **첫 실행에 직접 묻는다**(튜토리얼 뒤에 물으면 일찍 나간 사람이 빠져 생존자 편향). 스토어를 거치면 초대 코드가 사라지는 iOS 친구 초대 문제도 같은 창에서 코드 입력으로 푼다.
- 확정: **시안 A**(로딩 위 가운데 카드·2열 버튼 12개·건너뛰기·🤝 친구 초대만 코드칸) · 보기 12개 그대로 · iOS 첫 실행 전원 / 안드로이드는 이번 실행에서 referrer 를 새로 읽었고 `organic`·`unknown` 인 사람만 · 웹·토스·itch 는 안 띄움
- iOS: 승인된 1.0.0 은 **출시하지 않고** 설문 들어간 빌드로 교체해 재심사 후 출시(사용자 결정)

## 설계
1. **보기 → 값**(UTM Source 시트와 같은 이름): 🔍 구글·네이버 검색 `search` · 🛒 스토어 둘러보다가 `store` · 📸 `instagram` · 🧵 `threads` · ▶️ `youtube` · 𝕏 `x` · 📍 `1km` · 👋 `hithere` · 📝 블로그·커뮤니티 `community` · 💬 아는 사람이 알려 줌 `word_of_mouth` · 🤝 친구 초대 받았어요 `friend` · ✨ 기타 `other`. 새 값(search·store·community·word_of_mouth·other)은 시트 Links 목록에도 추가.
2. **언제**: 부팅 직후 `#loading` 위에 **형제 요소**로 카드(`#survey-card`, z-index 32 — `#loading` 안에 넣으면 setLoadWait 가 덮어씀). bootWorld 와 **병렬**로 뜨고, bootWorld 가 먼저 끝나면 `initAuth` 직전에 설문이 끝나길 기다린다(답이 느린 사람만 기다림). 초대 코드는 enterPlay 전에 `cf_invite` 에 들어가야 하므로 이 순서가 맞다.
3. **누구에게**(순수 함수 `shouldAskSurvey`):
   - `cf_survey` 키가 있으면 안 띄움(1기기 1회) · dev 세션은 `?survey=1` 일 때만(트래킹은 trackEvent 가 이미 막음)
   - iOS: 키 없으면 띄움(1.0.x 가 첫 공개라 모든 기기가 신규)
   - 안드로이드: `bootInstallReferrer` 가 **이번 실행에 새로 읽은** 결과이고 source 가 `organic`·`unknown` 일 때만. 기존 유저는 캐시되었거나 `preexisting` 이라 자동 제외. ⚠️ wiring 테스트가 `await bootInstallReferrer` 를 금지 → 반환 promise 를 잡아 **최대 3초** 경쟁, 늦으면 이번엔 안 묻고 다음 실행에도 안 묻는다(`cf_survey={skipped:'late'}`)
   - `bootInstallReferrer` 가 새로 읽었는지 알려 주도록 반환값에 `fresh` 추가(캐시 경로는 fresh:false)
4. **답 처리**: 버튼 한 번 → 카드 닫힘. `friend` 만 코드칸이 열리고, 코드는 `readInviteParam('?invite='+입력)` 로 검증(8자, I·O·0·1 없음) → 맞으면 `cf_invite` 저장 → 기존 `referralOnPlay` 가 로그인 뒤 그대로 연결. 틀리면 칸 아래 "코드를 다시 확인해 주세요", 비우고 확인하면 코드 없이 friend 로 기록.
5. **저장**
   - 기기: localStorage `cf_survey = { answer, ts, code: bool, synced: [] }`
   - DB: 새 테이블 `install_survey(id, user_id, client_id, platform ('ios','android'), answer, has_code bool, created_at, unique(user_id, client_id))` · RLS select/insert own(install_attribution 과 같은 패턴). `install_attribution` 은 방식(Play 자동)이 달라 섞지 않는다(그 테이블은 unique+ignoreDuplicates 라 넣으면 조용히 버려짐).
   - 동기화는 `syncInstallAttribution` 처럼 로그인 콜백에서 `syncInstallSurvey`(계정마다 1행, synced 배열)
   - GA4: 사용자 속성 `heard_from`(analytics.js `installProps()` 가 localStorage 를 다시 읽는 구조라 같은 곳에서 읽게) + 이벤트 `install_survey{action: shown|answer|skip|late, answer, has_code}` (파라미터 ≤5)
6. **입구 이탈 측정**: `install_survey` shown → 다음 `login_screen`/게임 입장까지 이어지는지 BQ 로 확인(이 창 때문에 이탈이 늘었는지).

## 단계 (TDD, `feat/install-survey` 워크트리 — origin/main 에서 새로)
0. dev docs `dev/active/install-survey/` 3종 + 시안 A 캡처 보관
1. SQL `sql/migrations/migrate_install_survey.sql` → pg8000 직접 적용 + DO 블록 셀프테스트(롤백)
2. 순수 `js/install-survey.js`: `SURVEY_OPTIONS`, `shouldAskSurvey({platform, stored, referrer, dev, force})`, `recordAnswer`, 초대 코드 검증은 `readInviteParam` 재사용 + 테스트
3. `js/install-referrer-boot.js` 반환값에 `fresh` (+기존 테스트 유지)
4. `js/install-survey-ui.js`: 카드 DOM(시안 A), 코드칸, 건너뛰기 → `Promise<answer|null>` (fake-dom 테스트)
5. `js/supabase-client.js` `insertInstallSurvey` · `syncInstallSurvey` · `js/analytics.js` heard_from
6. `index.html`: 부팅 wiring(병렬 표시 → initAuth 전 대기), CSS(시안 A 그대로), `#survey-card` 마크업 · wiring 테스트(순서·IS_DEV_SESSION·no-await 규칙 유지)
7. i18n: 보기·문구 영어판 `js/i18n-en.js`
8. 모바일 실측(375px, ko/en, 코드칸 열림) · 리뷰(code-reviewer + security-reviewer: 새 RLS 테이블·코드 입력)

## 배포
- 웹 배포(코드만, 웹엔 안 뜸) · main + feat/capacitor-app 푸시 · Play v71 internal·alpha 업로드는 사용자 실행 → 프로덕션 제출
- iOS: feat/ios-app 에 main 병합 → 빌드 번호 +1 → 업로드 → **승인된 1.0.0 을 개발자 거부 후 새 빌드로 교체해 재제출**(API) → 승인 뒤 출시
- 토스: 동작 변화 없음이지만 공용 코드 변경 → 체크리스트대로 번들(메모) · itch zip
- 사용자 몫: GA4 사용자 범위 맞춤 측정기준 `heard_from` 등록 · Play·iOS 업로드/출시 버튼

## 검증
- `npm test` 전체 통과(새: shouldAskSurvey 표, 답/건너뛰기/코드 검증, fresh 플래그, wiring 순서, i18n_check)
- 브라우저 `?survey=1&platform=…` 로 카드 실렌더(375px ko/en)·버튼·코드 오류 확인
- 실기기: 안드로이드 앱 삭제 → 링크 없이 Play 설치 → 첫 실행에 카드 → 답 → DB `install_survey` 행 확인 · iOS TestFlight 에서 동일
- 다음 날 BQ: `install_survey` shown/answer/skip 비율과 입구 이탈 비교
