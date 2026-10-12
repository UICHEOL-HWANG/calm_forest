# 📲 안드로이드 설치 채널 귀속 (Play Install Referrer)

홍보 링크의 `referrer=` 값을 설치 후 첫 실행에 한 번 읽어 GA4 + Supabase 에 남긴다. 채널별 리텐션 측정용.

## 홍보 링크 규칙

```
https://play.google.com/store/apps/details?id=com.cheorish.lab.calmforest&referrer=utm_source%3D<채널>%26utm_medium%3D<매체>%26utm_campaign%3D<캠페인>
```

- `utm_source`: instagram · threads · littly · kakao · community (소문자, 영문·숫자·`_.-` 만 — 그 밖의 글자는 `_` 로 바뀐다, 36자)
- `referrer=` 안의 `=`·`&` 는 반드시 `%3D`·`%26` 으로 인코딩. 안 하면 Play 가 `utm_medium` 등을 자기 파라미터로 먹는다.
- `&pcampaignid=web_share` 같은 공유 버튼 링크는 referrer 가 없다 → `organic` 으로 잡힌다.

## 흐름

| 단계 | 위치 |
|---|---|
| 네이티브 읽기(첫 실행 1회, 확정되면 SharedPreferences `cf_install_referrer.done`) | `android/.../InstallReferrerPlugin.java` |
| 파싱 — 빈 값·`google-play`=organic, utm_source 없음=unknown, 미지원 기기=unknown, 첫 읽기보다 24시간 넘게 먼저 설치(이 기능 전 기존 사용자)=preexisting | `js/install-referrer.js` |
| 기기 확정(localStorage `cf_install_attr`) · GA4 이벤트 1회 · 계정 동기화 | `js/install-referrer-boot.js` |
| GA4 사용자 속성 `install_source`·`install_campaign`, 이벤트 `install_attribution{install_source,install_medium,install_campaign}` | `js/analytics.js` |
| Supabase `install_attribution` — 온라인 계정마다 1행(게스트 → Play Games 로 바뀌면 행 추가), 덮어쓰지 않음 | `sql/migrations/migrate_install_attribution.sql` |

일시 장애(`SERVICE_UNAVAILABLE`·연결 끊김·8초 무응답)는 저장하지 않아 다음 실행에서 다시 읽는다.
🧪 dev 세션(`?dbg` 등)에서는 읽지 않는다 — GA4 를 안 보내는데 1회 읽기만 소모되기 때문.

채널 리텐션 분석에서는 `preexisting` 을 빼고 본다.

## GA4 콘솔 할 일 (1회)

관리 → 맞춤 정의 → **사용자 범위** 맞춤 측정기준 `install_source`, `install_campaign` 등록. 등록 전 수집분은 탐색에서 안 보인다(BigQuery `user_properties` 에는 남는다).

## 검증

### A. 디버그 빌드 + adb (기기·에뮬레이터 필요)

디버그 빌드에서만 인텐트 extra `cf_test_referrer` 를 referrer 로 돌려준다(저장 안 함, 릴리스는 무시).

```bash
npm run build:cap && (cd android && ./gradlew :app:installDebug)
```

```bash
adb shell pm clear com.cheorish.lab.calmforest
```

```bash
adb shell am start -n com.cheorish.lab.calmforest/.MainActivity --es cf_test_referrer "utm_source=instagram\&utm_medium=social\&utm_campaign=adb_test"
```

```bash
adb logcat -d | grep -E "install-referrer|install_attribution"
```

기대: `[install-referrer] 귀속: instagram social adb_test`. 다시 테스트하려면 `pm clear` 부터(웹 저장소에 확정값이 남는다). 캠페인을 `adb_test` 로 두면 GA4·DB 에서 걸러낼 수 있다.

### B. Play 내부 테스트 트랙 (실제 referrer)

1. 이 변경이 들어간 빌드를 내부 테스트 트랙에 올린다(versionCode 올림 — 사용자 승인 후).
2. 테스트 기기에서 앱 삭제 → 기기 브라우저로 `…&referrer=utm_source%3Dinternal_test%26utm_medium%3Dqa%26utm_campaign%3Dreferrer_check` 링크를 연다(테스터 계정으로 로그인된 Play 스토어).
3. 설치 → 실행.
4. 확인
   - DB: `select source, medium, campaign, status, created_at from public.install_attribution where campaign = 'referrer_check';`
   - GA4 DebugView/실시간: `install_attribution` 이벤트, 사용자 속성 `install_source=internal_test`.
5. Play 를 거치지 않은 설치(adb install·사이드로드)는 referrer 가 비어 `organic` 이 정상이다.
