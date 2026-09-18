# 🚦 분석 진행 원장

절차는 `ANALYSIS_PROTOCOL.md`. 이 파일은 **어디까지 왔는지**만 기록한다.
세션이 끊기거나 대화가 요약돼도 여기를 보면 상태가 복원된다.

---

## 지금 상태 (2026-09-15 대조)

**축을 나눠 읽어야 한다.** 기존 세션 이탈 예측모델은 학습·검증·2026-09-06 계수 교체까지 기록돼 있다(현재 VM 상태는 새로 검증하지 않음). 전체 활동·토스 행동 EDA는 00~09번 노트북에 있다. 토스 기존 집계의 1차 오프라인 세그먼트 검증은 `13_toss_offline_cohort_segments.ipynb`에 기록했다. `14_toss_early_later_label_audit.ipynb`에서 첫 10분/이후 24시간 경계 위반 0을 확인했고, `15_toss_segment_readiness_for_modeling.ipynb`에서 같은 46대·임시 양성 8대 기준 세그먼트 준비도를 확인했다. `16_toss_later_target_label_eda.ipynb`에서 후속 행동을 새 영역·퀘스트·낚시 후보로 쪼갰다. 이후 토스만 보지 않고 전체 채널로 확장하되, beta_A/B 표시 기기는 제외했다. `18_all_channel_exploratory_retention_model.ipynb`의 탐색 AUC 최고는 raw-rank `early_tracked_events` 0.883이고, `19`~`21`에서 이를 이벤트 밀도·의도행동·이벤트 구성으로 감사했다. 현재 결론은 `tracked>=20` 신호를 킵하되, 운영 피처는 원시 이벤트 수 단독이 아니라 의도행동 비율·자동/접속 이벤트·행동 다양성으로 분리해야 한다는 것이다. A/B 효과는 아직 보지 않는다. 라이브 낚시 A/B 안은 철회됐고 배포하지 않았다.

### 🧪 베타 번들 A/B — Hβ1 EDA (2026-09-16) · 방향 혼재, 검정 전 보류

**후보 Hβ1**: `beta_A` 번들(튜토리얼 순서 재배치·3일 보상 1.5배·첫 3회 관대 판정)은
`beta_B` 현행판보다 참여 깊이를 높인다. **사전 EDA 기준**: 베타 명단 10명과
세션 로그가 사람 단위로 조인되고, 활동 가짓수·하루 1회 초과 접속·총 플레이 시간을
A/B별로 계산할 수 있으면 EDA 통과. 표식이나 조인이 깨지면 검정으로 넘어가지 않는다.

- **조인 감사**: Supabase `beta_testers` 10명과 BigQuery `session_logs`의 `beta_A/B`
  사용자 10명이 모두 매칭됐다. BigQuery 미러에는 `beta_testers`·`beta_diary`가 없어
  명단은 Supabase에서 읽고 행동 로그는 BQ에서 읽었다.
- **기간·중복**: KST 2026-09-09~09-15, `session_logs`는 `session_id`별 최신
  `updated_at` 1행만 사용했다.
- **활동 가짓수**: 튜토리얼·일지·자동/계측 키를 제외한 `counts` 키 수 기준.
  `beta_A` 평균 101.8/중앙값 102.0, `beta_B` 평균 76.2/중앙값 83.0.
  A는 5명 모두 96~110으로 고르게 높고, B는 12~127로 분산이 크다.
- **자발 추가 접속**: 하루 첫 접속은 의무 접속으로 보고 같은 날 2번째 이후 세션만 합산.
  `beta_A` 총 19회/평균 3.8, `beta_B` 총 35회/평균 7.0.
- **총 플레이 시간**: `play_sec` 벽시계 합산 기준. `beta_A` 총 833.8분/평균 166.8분,
  `beta_B` 총 3,682.2분/평균 736.4분. B의 긴 꼬리 2명이 평균을 크게 끌어올렸다.
- **판정**: 주지표는 A 우세, 보조지표 둘은 B 평균 우세라 방향이 갈린다.
  Hβ1을 그대로 “A가 참여 깊이를 높였다”로 채택하기 어렵고, 검정 전 기준으로는
  **혼재/보류**다. p값·permutation 검정은 아직 하지 않았다.
- **후속 검정(사용자 승인 후 2026-09-16)**: 두 해석을 모두 봤다. ① 활동 가짓수만
  주지표로 보면 A 평균 101.8, B 평균 76.2, 차이 +25.6이지만 5:5 정확 permutation
  단측 p=0.155(양측 p=0.310)로 유의하다고 말하기 어렵다. ② 사전 설계의 세 지표
  동시 방향 기준은 활동 가짓수만 A 우세이고 자발 추가 접속(A-B -3.2, 단측 p=0.790)과
  총 플레이 시간(A-B -569.7분, 단측 p=0.873)이 반대 방향이라 통과하지 못했다.
- **기록**: CSV `ml/reports/beta_h1_eda_2026-09-16/`,
  차트 `ml/reports/figs/beta_h1_activity_breadth.png`,
  `ml/reports/figs/beta_h1_extra_sessions.png`,
  `ml/reports/figs/beta_h1_play_minutes.png`.

### 🧪 베타 맵 계단식 개방 — Hβ2 EDA (2026-09-16) · 효과 신호 약함

**후보 Hβ2**: 바다터·안개숲 계단식 개방은 플레이 관심도를 끌어올린다. **사전 EDA 기준**:
각 테스터의 맵 개방 전날·당일·다음날을 사람 단위로 맞춰 플레이 시간, 방문 수,
다음날 재방문을 계산할 수 있으면 EDA 통과. `sea_first`와 `mist_first` 두 순서에서
모두 개방일이 전날보다 높아야 맵 효과 신호로 본다.

- **범위·단위**: Supabase `beta_testers`의 `map_order`와 BigQuery `session_logs` 최신행을
  조인했다. D1은 KST 2026-09-09, 첫 맵 D3(2026-09-11), 두 번째 맵 D5(2026-09-13)로 고정했다.
  개방 이벤트는 10명 × 2회 = 20건.
- **첫 맵(D3)**: 평균 플레이 시간 차이는 `sea_first` +276.4분, `mist_first` +165.0분이지만
  긴 플레이 2건이 평균을 끌어올렸다. 중앙값은 전체 -12.2분이고, 전날보다 늘어난 사람은
  3/10명뿐이다. 세션 수 증가는 2/10명, 다음날 재방문은 5/10명.
- **두 번째 맵(D5)**: 전체 평균 차이 -3.8분, 중앙값 +7.0분으로 방향이 약하다.
  전날보다 늘어난 사람은 5/10명, 세션 수 증가는 3/10명, 다음날 재방문은 8/10명.
- **실제 맵 입장 기록**: 개방일에 `sea_enter` 또는 `mist_enter`가 찍힌 이벤트는
  20건 중 8건뿐이다. 바다터 3/10, 안개숲 5/10. 개방이 곧 실제 방문으로 이어졌다고
  보기 어렵다.
- **판정**: 두 순서 모두에서 개방일 지표가 전날보다 일관되게 높다는 기준을 충족하지 못했다.
  Hβ2는 현재 **효과 신호 약함/보류**다. 특히 평균 증가는 긴 꼬리에 민감하므로
  맵 개방 효과로 읽지 않는다.
- **기록**: CSV `ml/reports/beta_h2_map_eda_2026-09-16/`,
  차트 `ml/reports/figs/beta_h2_first_map_play_delta.png`,
  `ml/reports/figs/beta_h2_second_map_play_delta.png`,
  `ml/reports/figs/beta_h2_map_enter_users.png`.

### 🧪 베타 힌트 배너 — Hβ3 EDA (2026-09-16) · 방향성 약함, 단위 민감

**후보 Hβ3**: 곧 나갈 것 같은 순간의 비차단 힌트 배너는 60초 생존율을 높인다.
**사전 EDA 기준**: `churn_events`의 `arm`이 `treat/control`로 찍히고, 각 이벤트 뒤
세션 최신 `updated_at`까지 60초 이상 남았는지 계산할 수 있으면 EDA 통과.

- **범위·단위**: KST 2026-09-09~09-16 전, `variant in ('beta_A','beta_B')`인
  `churn_events` 1,920건을 봤다. 세션 종료 근사는 `session_logs`의 `session_id`별
  최신 `updated_at`을 사용했다.
- **arm 규모**: 이벤트 단위 control 920건/36세션/10명, treat 1,000건/37세션/8명.
  세션 동전 배정이더라도 점수 이벤트 수는 완전 5:5가 아니다.
- **이벤트 단위 결과**: control 897/920(97.5%), treat 957/1,000(95.9%) 생존.
  같은 세션의 반복 점수를 그대로 세면 control이 약간 높다.
- **세션 단위 결과**: 같은 세션의 여러 점수를 1개로 접으면 control 30/36(83.3%),
  treat 32/37(91.4%) 생존. 이 단위에서는 treat가 높다.
- **해석 한계**: `intervene=true`는 control에도 존재한다. 이는 모델이 개입 후보로 판단했으나
  control arm에서는 배너를 보류한 사건으로 읽어야 하며, 단순히 "배너 노출"과 같지 않다.
  또한 `updated_at` 기반 60초 생존은 실제 브라우저 종료 시각이 아니라 세션 요약의 최신 갱신
  시각 근사다.
- **판정**: 세션 단위에서는 힌트 배너 방향성 신호가 있으나, 이벤트 단위에서는 반대다.
  Hβ3는 **약한 방향성/보류**로 둔다. 다음 게이트에서 검정을 하려면 세션 단위를 사전 고정해야 한다.
- **기록**: CSV `ml/reports/beta_h3_banner_eda_2026-09-16/`,
  차트 `ml/reports/figs/beta_h3_banner_survival_event.png`,
  `ml/reports/figs/beta_h3_banner_survival_session.png`,
  `ml/reports/figs/beta_h3_banner_arm_counts.png`.

### 🧪 베타 일지 만족도·선호 — Hβ4 EDA (2026-09-16) · A 우세 근거 약함

**후보 Hβ4**: 행동 로그에서 보인 차이가 일지의 만족도·선호·막힘 서술에서도 같은 방향으로
나타난다. **사전 EDA 기준**: `beta_diary`가 명단과 조인되고, D7 선호도(`q5/q6`)와
매일 재방문 의향(`q3`)을 사람 단위로 요약할 수 있으면 통과.

- **범위·응답**: Supabase `beta_diary` 45행. `beta_A`는 5명/26일지, `beta_B`는
  4명/19일지다. B 1명은 일지 분석 분모에 없다.
- **재방문 의향(q3)**: 행 단위 평균은 A 2.92, B 3.11, 중앙값은 둘 다 3. 사람 평균으로도
  B가 약간 높지만, n이 작고 B 응답자 4명이라 우열을 주장하지 않는다.
- **처음 10분 선호(q6)**: 응답 6명 중 B 4명, A 2명. 사전 기준인 한쪽 9명 이상에
  못 미쳐 유의한 선호라고 보지 않는다.
- **제일 재밌었던 곳(q5)**: 응답 6명 중 마을 3명, 요리 3명. 바다터·안개숲 같은
  계단식 맵 선호가 직접적으로 두드러지지는 않았다.
- **자유응답 키워드 코딩**: 막힘/불편/버그와 농사/채집/반복이 각각 9명에서 잡혔다.
  튜토리얼/안내와 맵/탐험은 각각 8명, 재미/콘텐츠 호감은 5명이다. 단순 키워드 코딩이라
  감정 방향을 확정하지 않고, 반복 주제의 위치만 본다.
- **판정**: Hβ1에서 A가 활동 가짓수는 넓혔지만, 일지 만족도·선호는 A 우세를
  지지하지 않는다. Hβ4는 **A 우세 근거 약함/보류**다.
- **기록**: CSV `ml/reports/beta_h4_diary_eda_2026-09-16/`,
  차트 `ml/reports/figs/beta_h4_q3_revisit_intent.png`,
  `ml/reports/figs/beta_h4_q6_preference.png`,
  `ml/reports/figs/beta_h4_q5_favorite_place.png`,
  `ml/reports/figs/beta_h4_free_text_themes.png`.

### 🧪 베타 튜토리얼 재배치 — Hβ5 EDA (2026-09-16) · 재미 스텝 전진은 성공, 완주는 약함

**후보 Hβ5**: A군 튜토리얼 재배치(낚시·집짓기·입장·꾸미기 전진)는 초반 재미 스텝 도달을
늘리고 튜토리얼 진행 폭을 넓힌다. **사전 EDA 기준**: `session_logs.counts`의
`tut_*`, `tutorial_complete`, `tutorial_skip` 키로 사람별 도달 스텝 수와 핵심 스텝
도달률을 만들 수 있으면 통과.

- **스텝 폭**: `tut_*` 고유 스텝 수는 A 평균 8.8/중앙값 6, B 평균 7.4/중앙값 3.
  A가 약간 높지만 양쪽 모두 완주자와 거의 미진행자가 섞여 분산이 크다.
- **앞당긴 재미 스텝**: `fish/build/enter/decor` 중 도달 개수는 A 평균 3.4, B 평균 1.6.
  A는 5명 모두 `fish/build/enter`까지 도달했고 2명은 4개 모두 도달했다. B는 2명만
  4개 모두 도달했고 3명은 0개다.
- **완주·스킵**: `tutorial_complete`는 A 1/5, B 2/5. `tutorial_skip`은 A 4/5,
  B 2/5. A는 재미 스텝까지 더 빨리 닿았지만 끝까지 보게 만들지는 못했다.
- **판정**: 재배치가 초반 재미 스텝 노출을 늘렸다는 신호는 있다. 다만 완주율과 스킵률은
  반대 방향이라 “튜토리얼 개선 성공”으로는 채택하지 않는다. Hβ5는
  **부분 성공/보류**다.
- **기록**: CSV `ml/reports/beta_h5_tutorial_eda_2026-09-16/`,
  차트 `ml/reports/figs/beta_h5_tutorial_step_count.png`,
  `ml/reports/figs/beta_h5_fun_steps_reached.png`,
  `ml/reports/figs/beta_h5_complete_skip.png`.

### 🧪 베타 보상 부스트·경제 진행 — Hβ6 EDA (2026-09-16) · 적용은 됐지만 A 우세 아님

**후보 Hβ6**: A군 3일 보상 부스트(출석·퀘스트·확률 보상, 구현상 판매 부스트 포함)는
경제 진행을 빠르게 만든다. **사전 EDA 기준**: `econ_logs`에서 베타 기간의 코인 유입·소비,
부스트 대상 source, `item|boost` 표식을 사람 단위로 요약할 수 있으면 통과.

- **범위·단위**: KST 2026-09-09~09-16 전, BigQuery `econ_logs`와 Supabase 명단을
  `user_id`로 조인했다. 지표는 사람 단위 합산이다.
- **총 코인 유입**: A 총 19,100/평균 3,820/중앙값 3,556, B 총 22,442/평균 4,488/중앙값 2,208.
  B 평균은 한 명의 큰 판매 수익 꼬리에 민감하다.
- **부스트 대상 source 유입**: `daily_bonus/quest_reward/lucky_box/shop_sell` 양수 합은
  A 13,462, B 16,871. B가 더 높다.
- **적용 감사**: `item`에 `|boost`가 붙은 양수 amount는 A에서만 7,455, B는 0이다.
  즉 A군 부스트 표식 자체는 의도대로 남았다.
- **source별 차이**: B의 `shop_sell` 유입이 13,749로 A 7,512보다 크다. 반대로
  A의 `quest_reward`는 5,035로 B 2,589보다 크다. 총 유입은 특정 source 꼬리에 민감하다.
- **판정**: 부스트가 적용된 증거는 명확하지만, 경제 진행 전체가 A에서 더 빨랐다고
  말할 수 없다. Hβ6는 **적용 확인/효과 보류**다.
- **기록**: CSV `ml/reports/beta_h6_reward_economy_eda_2026-09-16/`,
  차트 `ml/reports/figs/beta_h6_total_inflow.png`,
  `ml/reports/figs/beta_h6_boost_source_inflow.png`,
  `ml/reports/figs/beta_h6_shop_sell_inflow.png`,
  `ml/reports/figs/beta_h6_boost_item_inflow.png`,
  `ml/reports/figs/beta_h6_source_stack.png`.

### 🧪 베타 첫 3회 관대 판정 — Hβ7 EDA (2026-09-16) · 바다낚시만 A 우세

**후보 Hβ7**: A군 첫 3회 관대 판정은 미니게임 성공률을 높인다. **사전 EDA 기준**:
성공/실패 쌍이 있는 미니게임에서 사람 단위 성공률을 만들 수 있으면 통과. 배 운행은
`boat_hit`만 있어 `boat_hit / boat_start`를 낮을수록 좋은 보조지표로 본다.

- **일반 낚시**: A 224/229(97.8%), B 343/353(97.2%). 양쪽 모두 천장에 가까워
  차이를 말하기 어렵다.
- **바다낚시**: A 14/25(56.0%), B 11/27(40.7%). 사람 평균도 A 48.9%, B 44.0%로
  A가 약간 높다. 다만 시도자는 양쪽 3명뿐이다.
- **안개숲 정화**: A 89/162(54.9%), B 66/112(58.9%). pooled rate와 사람 평균 모두
  B가 높다. B 시도자는 2명뿐이라 불안정하다.
- **배 운행**: `boat_hit / boat_start` 사람 평균은 A 1.30, B 1.25로 거의 같다.
- **판정**: 첫 3회 관대 판정이 전반 미니게임 성공률을 높였다는 일관된 신호는 없다.
  바다낚시만 A 우세 후보로 남고, Hβ7 전체는 **혼재/보류**다.
- **기록**: CSV `ml/reports/beta_h7_minigame_ease_eda_2026-09-16/`,
  차트 `ml/reports/figs/beta_h7_pooled_success_rates.png`,
  `ml/reports/figs/beta_h7_fishing_person_success.png`,
  `ml/reports/figs/beta_h7_sea_person_success.png`,
  `ml/reports/figs/beta_h7_mist_person_success.png`,
  `ml/reports/figs/beta_h7_boat_hit_per_run.png`.

### 🧪 베타 완주·성실도 — Hβ8 EDA (2026-09-16) · A 성실도 우세, 처치 효과 아님

**후보 Hβ8**: 베타 기간 동안 매일 접속·일지를 수행한 성실도에 A/B 차이가 있는가.
유급 테스터라 이탈률은 판정하지 않고, 운영 순응도와 이후 해석의 보정 변수로 본다.
**사전 EDA 기준**: 사람×날짜 10명×7일 그리드에서 접속일, 일지 작성일, 둘 다 한 날을
계산할 수 있으면 통과.

- **접속일 수**: A 평균 5.8일/중앙값 6일, B 평균 4.6일/중앙값 6일. 7일 모두 접속한
  테스터는 A 2명, B 0명.
- **일지 작성일 수**: A 평균 5.2일/중앙값 5일, B 평균 3.8일/중앙값 4일. 7일 모두
  작성한 테스터는 A 2명, B 0명.
- **접속+일지 동시 완료일**: A 평균 4.6일, B 평균 3.4일. 7일 모두 완료는 A 2명,
  B 0명.
- **날짜 흐름**: 전체적으로 후반부 접속자가 줄었다. B는 D4에 1명으로 특히 낮았고,
  A는 D7에 5명 모두 접속했다.
- **판정**: 성실도는 A가 높다. 다만 이 차이는 게임 처치 효과라기보다 테스터 개인차·일정·
  보상 순응도일 수 있어, Hβ1~Hβ7 해석의 보정 맥락으로만 둔다. **A 성실도 우세/인과 보류**.
- **기록**: CSV `ml/reports/beta_h8_completion_eda_2026-09-16/`,
  차트 `ml/reports/figs/beta_h8_active_days.png`,
  `ml/reports/figs/beta_h8_diary_days.png`,
  `ml/reports/figs/beta_h8_both_days.png`,
  `ml/reports/figs/beta_h8_daily_active_line.png`.

📄 **[설계서](superpowers/specs/2026-09-04-churn-intervention-design.md)** · 📊 **판정 노트북** `ml/notebooks/04_churn_model.ipynb`

### 🧭 전체 이력 재분석 — G1 데이터 구성·신뢰성 (2026-09-12) · 제한부 통과

**시작 전 기준**: 게임 개시일부터 2026-09-12(KST)까지 원천 범위가 확인되고,
식별키·이벤트 정의·중복·결측·시간대·Supabase 보존기간을 문서화해 이후 통계가
재현 가능하면 통과 → **제한부 통과**. GA4/BQ 장기 이력은 9/11까지, 9/12 자체 로그는
Supabase 핫 스토어에서 확인된다.

- **GA4**: 49,108이벤트 · `user_pseudo_id` 356기기 · 716세션 · 140 이벤트 유형.
  `user_pseudo_id` 결측 0%. `user_id`는 729개로 기기보다 2.0배 많아 사람 수 집계에 쓰지 않는다.
- **BigQuery 자체 로그**: `game_logs` 233,520행/281기기/937세션,
  `econ_logs` 2,646건/251기기/744세션, `session_logs` 최신 645세션,
  `game_saves` 388개, `churn_events` 1,058건.
- **품질 함정**: `game_logs.client_id` 결측 1.14%. `session_logs` 원본 648행에서
  upsert 중복 3행을 제거했다. 이후 세션 분석은 최신행 dedupe가 기본이다.
- **오늘분**: Supabase 9/12 자체 로그 7,906행/10기기, 9세션/7기기까지 확인.
  9/12 GA4 daily/intraday 테이블은 아직 없어 오늘 행동 이벤트 통계는 만들 수 없다.
- **기록**: 노트북 `ml/notebooks/00_full_history_data_inventory.ipynb` ·
  차트 `ml/reports/figs/g1_daily_source_device_coverage.png` ·
  W&B `g1-full-history-inventory` (`ke113ugz`).
- **다음 게이트**: 사용자 승인 뒤 이벤트·세션·진행도 분포 EDA. 모델링은 하지 않는다.

### 🧭 전체 이력 재분석 — G2 활성 사용자 EDA (2026-09-12) · 통과, H1 채택

**합의한 H1**: 활성 사용자 규모는 재방문보다 신규 유입 변화에 더 크게 의존한다.
**사전 기준**: 활동일의 신규 비중 중앙값 > 50%이고, 신규 DAU > 재방문 DAU인 날이
70% 이상이면 채택 → **채택**. 신규 비중 중앙값 71.8%, 신규 우세 35/46일(76.1%).

- **범위·규모**: GA4 완전 일자 2026-07-27~09-11, 47일/356기기. DAU 중앙값 8,
  최대 47. 최근 완전 일자(9/11)는 DAU 20 · WAU 85 · 28일 MAU 290.
- **MAU 한계**: 완전한 28일 창은 8/23부터 20개뿐이다. 달력 월간 사용자가 아니라
  rolling 28-day이며 장기 추세·계절성 판단에는 이르다.
- **재관측**: 전체 356대 중 관측일 2일 이상은 39대(11.0%). H1 채택은 유입 의존을
  뜻하며 획득 성과나 건강한 리텐션을 뜻하지 않는다.
- **세그먼트**: 최초 관측 기기 데스크톱 205/모바일 151, 국가 한국 217/미국 93/기타 46,
  최초 유입 `(direct)/(none)` 326(91.6%). 30대 미만 값은 기타로 통합했다. 미국의
  재관측 0%는 특정 날짜 유입과 겹치므로 지역 효과로 해석하지 않는다.
- **기록**: 노트북 `ml/notebooks/05_activity_eda.ipynb` · 개별 PNG 8장
  (`ml/reports/figs/g2_*.png`) · W&B `g2-activity-eda` (`r9pzu4by`) 및 분석 artifact.
- **다음 후보(G0 필요)**: 첫날 핵심 진행 깊이가 D1·D7 재방문을 가른다. 날짜 코호트를
  맞추고 단순 방문과 실제 게임 행동을 분리한다. 이번 게이트에서는 모델을 학습하지 않았다.

### 🧭 DAU 스파이크 재분석 — G2 행동·세그먼트 EDA (2026-09-12) · 통과, H2 채택

**합의한 H2**: 8/15 급증은 해외 무행동 유입이고, 9/4·9/10 급증은 국내 실플레이
유입이다. **사전 기준** 4개(8/15 해외 ≥60%·행동 ≤30%, 9월 두 코호트 한국 각각
≥50%·행동률 차이 각각 ≥30%p) → 모두 통과, **채택**.

- **8/15 신규 44대**: 해외 35(79.5%), 미국 32. 의도적 행동 4(9.1%), 첫날 관측
  간격 중앙값 7초. D1 2/44, D7 1/44.
- **9/4 신규 30대**: 한국 29(96.7%), 모바일 26(86.7%), 행동 12(40.0%). 벌목·NPC·
  퀘스트 수락 도달이 각각 6대(20%). D1 4/30, D7 1/30.
- **9/10 신규 25대**: 한국 22(88.0%), 행동 10(40.0%). NPC 9대, 퀘스트 수락 8대,
  농사·낚시·제작·카페까지 넓게 분포. D1 1/25, D7은 아직 미성숙.
- **정정된 표현**: 9월 코호트도 60%는 의도적 행동 0이다. “실플레이 다수”가 아니라
  **국내·상대적 고관여 유입**이다. 평시 행동률 36.6%와 비슷하다.
- **행동 정의**: 자동 수집·`login`·체류 요약·날씨·`econ_tx`는 제외하고 기존 감사된
  의도적 행동 허용목록만 사용. 과거 계측이 섞인 `tutorial_skip`도 제외했다.
- **기록**: 노트북 `ml/notebooks/06_spike_day_behavior_eda.ipynb` · 개별 PNG 9장
  (`ml/reports/figs/g2_spike_*.png`) · W&B `g2-spike-behavior-eda` (`o1ywyrop`) 및 artifact.
- **한계**: 코호트 n=25~44, 날짜·국가·기기·버전 동시 변화, 베타 테스터 혼입 가능.
  윌슨 구간이 겹쳐 재방문율·9월 날짜 간 순위는 주장하지 않는다. 모델링 없음.
- **다음 후보(G0 필요)**: 9/4·9/10 국내 행동자 22대의 첫 진입 경로. 동일 timestamp 안
  이벤트 순서는 복원 불가하므로 시퀀스 계측 한계를 먼저 다룬다.

### 🧭 국내 신규 활동 폭 비교 — G2 EDA (2026-09-14) · H3 기술적 기준 충족

**합의한 H3**: 9/10 국내 신규 기기는 9/4보다 첫날 5개 활동 영역 중 2개 이상에
도달한 비율이 높다. **사전 기준**: 두 날짜의 국내 신규 기기 전체를 분모로 할 때
9/10이 9/4보다 15%p 이상 높으면 채택. 관측값은 9/4 **5/29(17.2%)**,
9/10 **8/22(36.4%)**, 차이 **+19.1%p**로 기준을 충족했다. 이는 작은 표본의
기술적 판정이지 날짜의 인과효과나 모집단 차이의 확증이 아니다.

- **민감도**: 5개 영역을 모두 경험한 기기를 빼면 9/4 2/26(7.7%),
  9/10 4/18(22.2%)로 차이가 **+14.5%p**다. 사전 문턱 아래여서 소수 심층 플레이
  기기에 결과가 민감하다. 이 제외 분석으로 본판의 판정을 바꾸지 않는다.
- **기기 구성**: 9/4 모바일 25/29, 9/10 모바일 13/22. 날짜와 기기 유형이 함께
  바뀌었고 데스크톱 등 작은 셀은 따로 우열을 판단할 수 없다.
- **후속 정정(9/14)**: 같은 두 날짜의 전체 GA4 활동 기기 중 토스 플랫폼 이벤트가
  관측된 기기는 각각 21대·8대다. H3는 토스/웹을 합친 비교였으므로 차이를 토스
  이용자나 날짜 자체의 효과로 읽을 수 없다. 위 21대·8대는 H3의 국내 신규 분모와
  정의가 다르다.
- **기록**: 실행된 노트북 `ml/notebooks/07_domestic_spike_breadth_eda.ipynb` ·
  PNG 7장(`ml/reports/figs/g2_domestic_*.png`) · 집계표/가정 기록
  `ml/reports/g2_domestic_breadth_2026-09-14/` ·
  [W&B 실행 기록](https://wandb.ai/icucheol/calm-forest/runs/yueyxcti).
- **한계·다음 게이트**: 국내 신규 기기 29대·22대, 베타테스터 혼입 여부 미검증,
  첫날 이벤트 순서 복원 불가. 다음 분석은 사용자 승인 뒤 테스터 표식의 커버리지와
  심층 플레이 민감도를 확인한다. 모델링은 하지 않았다.

### 🧭 토스 플랫폼 첫날 행동 — G2 EDA (2026-09-14) · 로컬 완료, W&B 보류

**질문**: 토스 플랫폼으로 처음 관측된 기기는 첫날 무엇을 했나? GA4 이벤트의
`platform='toss'`를 사용하고, 관측된 `beta_A/B` 기기는 제외했다. GA4 완전 일별
export가 있는 2026-09-04~09-12(KST)만 사용한다. `traffic_source.source`는 토스
판정에 쓰지 않는다.

- **원시 규모**: 첫 토스 관측 기기 **49대**, 의도적 행동 1회 이상 **27대(55.1%)**,
  행동 0 **22대(44.9%)**. 9/4 코호트 21대 중 11대, 9/10 코호트 6대 중 3대가
  행동했다. 날짜별 작은 n의 우열은 주장하지 않는다.
- **행동 분포**: 기기당 행동 이벤트 중앙값 **1회**. 총 2,923건 중 상위 5대가
  2,366건(80.9%)을 남겼다. 자연·채집과 퀘스트·교류는 각각 20대,
  NPC 대화 20대, 벌목·퀘스트 수락은 각각 17대에서 기록됐다.
- **연결**: 14대에 연결 실패 기록, 24대에 토스 로그인 기록, 12대에 로그인 화면
  기록이 있다. 서로 겹칠 수 있어 퍼널·이탈 원인으로 해석하지 않는다.
- **표식 감사**: 해당 기간 GA4 토스 이벤트와 자체 로그 토스 세션에서
  `beta_A/B` 표식은 0건. 미표식 내부 사용자까지 배제됐다는 증거는 아니다.
  9/13 자체 로그는 있으나 GA4 일별 export가 없어 이번 행동 범위에서 제외.
- **기록**: 실행된 노트북 `ml/notebooks/08_toss_first_day_behavior_eda.ipynb` ·
  PNG 6장(`ml/reports/figs/g2_toss_*.png`) · 집계 CSV/가정
  `ml/reports/g2_toss_behavior_2026-09-14/` · SQL
  `ml/sql/g1_toss_identity_audit.sql`, `ml/sql/g2_toss_first_day_behavior.sql`.
- **W&B 보류**: 집계 CSV·차트·SQL의 외부 W&B 업로드가 안전 검토에서 거절됐다.
  로컬 분석만 완료했고 W&B run/artifact는 만들지 않았다. 업로드 항목과 목적지에 대한
  사용자 승인 전까지 재시도하지 않는다.
- **다음 후보**: 연결 실패가 플레이 진입을 가로막는지는 순서 계측과 별도 게이트로
  확인한다. 이 게이트에서 모델 학습은 하지 않았다.

### 🧭 토스 심층 행동 — G2 기기별 반복 행동 EDA (2026-09-14) · 로컬 완료, W&B 보류

**질문**: 첫 토스 관측일에 의도적 행동 31회 이상을 남긴 기기들은 무엇을 반복했나?
31회 문턱은 직전 토스 EDA에서 정한 구간을 그대로 사용했다. 결과는 실제 ID 대신
이번 실행의 행동량 순위 `T01`~`T10`으로만 표시한다. 영구 사용자 식별자로 쓰지 않는다.

- **원시 규모**: 심층 행동 기기 **10대**, 행동 이벤트 **2,796건**. 토스 전체 49대의
  첫날 행동 2,923건 중 **95.7%**다. 상위 5대 2,366건(80.9%)이라는 앞선 결과와 일치.
- **기기별 차이**: `T01` 843건·28종(광석 캐기 172, 나무 베기 164),
  `T02` 545건·20종(나무 베기 180, 낚싯대 던지기 81, 물고기 잡기 72),
  `T03` 389건·15종(씨앗 심기 174, 수확 89). 나머지 7대도 각각의 상위 4개
  행동과 5개 영역 구성을 노트북에 기록했다.
- **기록**: 실행된 노트북 `ml/notebooks/09_toss_deep_device_actions.ipynb` ·
  PNG 3장(`ml/reports/figs/g2_toss_deep_device_*.png`) · 익명 순위 집계 CSV/가정
  `ml/reports/g2_toss_deep_device_2026-09-14/` · SQL
  `ml/sql/g2_toss_deep_device_actions.sql`.
- **한계**: A/B 표식 없는 내부 점검 가능성, `first_chop`/`chop_tree` 등 중복 계측,
  이벤트 횟수와 실제 체류시간의 차이. 행동 선호·원인이나 일반 토스 유저의 전형으로
  해석하지 않는다. 9/13 GA4 export는 아직 범위 밖. 모델 학습 없음.
- **W&B 보류**: 이전 안전 검토의 외부 업로드 거절 상태가 계속된다. 이번 기기별
  표와 차트도 W&B에 보내지 않았다. 사용자 승인 전까지 업로드하지 않는다.

### 🧭 토스 낚시 행동 과거 로그 감사 — 라이브 안 철회 (2026-09-14)

라이브 안내 A/B 가설을 사용자가 승인했다고 적은 것은 **제 해석 오류**였다.
사용자는 기존 데이터에서 코호트를 새로 정의·테스트하고 오프라인 모델링하길 원한다.
라이브 전용 코드·SQL·테스트·설계 문서는 삭제했다. DB 적용·게임/인증 Worker 배포·
실제 라이브 배정·노출은 하지 않았다.

과거 데이터 감사 자체는 11번 노트북에 보존한다: 완전 GA4 일별 export
9/4~9/12(KST)의 토스 49기기 중 온보딩 종료·건너뛰기 기록 20기기,
`fishing_cast` 209건/6기기. 이는 오프라인 코호트 후보의 규모와 계측 한계이지
안내 효과나 예측 성능이 아니다. `tutorial_skip` 혼합 의미, 미표식 테스터,
과거 낚시 이력/호숫가 상태 결측을 새 코호트 정의에서 다시 검증한다.
다음 작업은 오프라인 표본·라벨의 재현성/누수/양성 수 확인이며 라이브 실험이 아니다.

### 🧭 토스 오프라인 모델링 준비 — G3 세그먼트·후보표 감사 (2026-09-15) · 보류

**질문**: 첫 토스 이벤트 뒤 10분 미만 행동으로, 10분 이후~24시간 내 의도적 행동을
예측하는 후보표가 모델링으로 넘어갈 만큼 준비됐나? **사전 기준**: 기기 단위 후보표가
재실행 가능하고, 14번 라벨 감사와 표본·양성 수가 일치하며, 피처/라벨 경계 위반이 0이고,
세그먼트별 표본 부족을 문서화하면 G3 보강 통과. 모델 학습 여부는 별도 판단.

- **표본 대조**: 익명 기기 후보표 **46대**, 임시 양성 **8대(17.4%)**, 음성 38대.
  14번 라벨 감사의 46대·8대와 일치했고, 피처/라벨 경계 위반은 모두 0.
- **세그먼트**: 초반 행동 0회 22대 중 후속 행동 2대, 1~5회 7대 중 0대,
  6회 이상 17대 중 6대. 초반 영역 2개 이상은 18대 중 6대, 자연·채집 초반 도달은
  19대 중 6대, 낚시·바다 초반 도달은 4대 중 3대다.
- **판정**: 전체 양성 8대라 `minority<10`, 대부분 세그먼트는 `n<30`. 지금 모델을
  학습하면 리텐션 신호보다 날짜·심층 기기·미표식 내부 사용자 꼬리를 외울 위험이 크다.
- **기록**: 실행된 노트북 `ml/notebooks/15_toss_segment_readiness_for_modeling.ipynb`,
  SQL `ml/sql/g3_toss_device_feature_candidate.sql`,
  `ml/sql/g3_toss_segment_modeling_readiness.sql`, 집계 CSV·가정
  `ml/reports/g3_toss_segment_readiness_2026-09-15/`, 차트
  `ml/reports/figs/g3_toss_segment_later_rate.png`.
- **다음 게이트 전 결정**: 예측 목표를 사용자와 먼저 고른다. 후보는 단순 후속 행동보다
  게임 안에서 유도 가능한 `새 영역 첫 도달` 또는 `퀘스트·교류 도달` 쪽이 더 자연스럽지만,
  합의 전에는 가설표에 올리지 않는다. G4는 승인 뒤 다수 클래스와 단일 피처 베이스라인만 본다.

### 🧭 토스 후속 행동 목표 — G3 라벨 후보 EDA (2026-09-15) · 후보화, 학습 보류

**질문**: 10분 이후~24시간 내 행동을 `뭐라도 함`이 아니라 게임 안에서 유도할 수 있는
목표로 쪼개면 무엇이 보이나? **사전 기준**: 14·15번과 같은 46대 표본·후속 행동 양성
8대·경계 위반 0을 유지하고, 후속 목표별 양성 수와 편중을 문서화하면 통과. 모델 학습은 하지 않는다.

- **후속 목표 분해**: 후속 의도적 행동 8/46, 새 영역 첫 도달 6/46, 퀘스트·교류 6/46,
  낚시·바다 7/46, 자연·채집 6/46. 후보끼리는 중복된다.
- **초반 6회 이상 집단**: 17대 중 후속 행동 6대. 이 6대는 자연·채집, 낚시·바다,
  퀘스트·교류가 모두 겹쳐서 특정 한 콘텐츠로 고정되지 않는다. 새 영역 도달은 4/17.
- **양성 8대 감사**: 첫 토스 관측일 기준 9/4가 5/21, 9/5가 2/9, 9/9가 1/3이고
  9/10·9/11은 0. 날짜와 깊은 플레이 꼬리의 영향을 분리할 만큼 표본이 없다.
- **새 영역 라벨**: 첫 10분에 없던 영역이 이후 24시간에 나타난 기기는 6대. 새 영역별로는
  낚시·바다 4대, 제작·집 3대, 고급 콘텐츠 2대, 퀘스트·교류 1대, 자연·채집 0대다.
- **판정**: `새 영역 첫 도달`은 퀘스트·즐길거리 유도 로직과 가장 가까운 라벨 후보지만
  양성 6대라 모델 목표로 확정하지 않는다. G4로 가기 전 목표 문구와 최소 표본 기준을 다시 합의한다.
- **기록**: 실행된 노트북 `ml/notebooks/16_toss_later_target_label_eda.ipynb`,
  SQL `ml/sql/g3_toss_later_target_candidates.sql`, 집계 CSV·가정
  `ml/reports/g3_toss_later_targets_2026-09-15/`, 차트
  `ml/reports/figs/g3_toss_later_target_summary.png`,
  `ml/reports/figs/g3_toss_early6_later_targets.png`,
  `ml/reports/figs/g3_toss_positive_by_first_day.png`,
  `ml/reports/figs/g3_toss_new_area_targets.png`.

### 🧭 전체 채널 후속 행동 — G4/G5-lite 탐색용 모델 (2026-09-15) · 로컬 학습, 운영 보류

**질문**: 베타 테스터 표식 기기를 제외하고 토스+메인 신규 기기를 합치면, 첫 10분 피처만으로
10분 이후~24시간 내 의도적 행동(`later_active`)을 가르는 모델이 돌아가나? **사전 기준**:
운영 계수 교체 없이 로컬에서만 majority·단일 피처·compact 로지스틱을 같은 CV로 비교하고,
10분 이후 컬럼과 A/B arm은 피처에서 제외한다.

- **표본·타깃**: 전체 신규 기기 95대, 후속 행동 양성 12대(12.6%). 보조 라벨은 새 영역 9대,
  퀘스트·교류 9대, 낚시·바다 8대, 자연·채집 7대라 이번 학습 타깃에서 제외.
- **AUC**: 단일 raw-rank 기준선 `early_tracked_events` 0.883 [0.779, 0.965],
  `early_actions` 0.761 [0.597, 0.922], `early_area_count` 0.757 [0.596, 0.911],
  `channel` 0.604 [0.452, 0.748]. CV 로지스틱은 `compact_plus_profile`
  0.846 [0.707, 0.968], `compact_behavior` 0.788 [0.603, 0.947],
  날짜 민감도 0.801 [0.623, 0.955]. majority 0.500.
- **계수 참고**: `log_early_tracked_events` 양의 방향이 가장 크고, `early_action_kinds`,
  `has_early_fishing_sea`, `has_early_connect_ok`도 양의 방향. `is_mobile`, direct source,
  `has_early_quest_social`은 음의 방향으로 나왔지만 표본이 작아 규칙으로 쓰지 않는다.
- **판정**: 탐색용 학습은 가능하다. 가장 강한 신호는 복잡한 모델이 아니라 첫 10분
  추적 이벤트 수 하나다. profile 포함 compact 모델도 높지만, 유입·기기 구성 꼬리 가능성이
  남고 점수 분포도 겹치므로 운영 투입용은 아니다.
- **확정 킵할 관측 신호**: `early_tracked_events` 단일 raw-rank AUC 0.883. 임시 규칙
  `early_tracked_events >= 20`은 95대 중 29대를 표시하고, 후속 행동 양성 12대 중
  10대를 포착한다(precision 34.5%, recall 83.3%, balanced accuracy 0.802).
  이는 “첫 10분 이벤트 밀도”가 다음 행동 유도 타이밍 후보라는 뜻이지,
  개인화 추천 성능이나 운영 임계값 확정은 아니다.
- **기록**: 실행된 노트북 `ml/notebooks/18_all_channel_exploratory_retention_model.ipynb`,
  빌더 `ml/scripts/build_g4_all_channel_exploratory_model_notebook.py`, 집계·점수·계수·감사 JSON
  `ml/reports/g4_all_channel_exploratory_model_2026-09-15/`, 차트
  `ml/reports/figs/g4_all_channel_exploratory_auc.png`,
  `ml/reports/figs/g4_all_channel_exploratory_coefficients.png`,
  `ml/reports/figs/g4_all_channel_exploratory_scores.png`.

### 🧭 첫 10분 이벤트 밀도 — G5 가설 검증 (2026-09-15) · 채택 후보

**가설 H-next**: 첫 10분의 이벤트 밀도는 게임 루프를 이해하고 조작을 이어간 신호다.
그래서 `early_tracked_events >= 20`인 기기 안에서는 10분 이후~24시간 후속 행동률이
`<20` 기기보다 높다. **사전 기준**: 차이 +15%p 이상 채택 후보, +5~15%p 보류,
+5%p 미만 기각. A/B 효과는 보지 않고, 베타 테스터 표식 기기는 제외된 후보표를 쓴다.

- **결과**: `>=20` 집단 29대 중 10대(34.5%), `<20` 집단 66대 중 2대(3.0%).
  차이 **+31.5%p**, bootstrap 95% 구간 **+14.1~+50.1%p**, permutation p=0.00005.
  단일 raw-rank AUC는 0.883.
- **민감도**: 기준 10회는 51대를 표시하고 양성 11/12를 잡지만 precision 21.6%.
  기준 20회는 29대를 표시하고 양성 10/12를 잡아 precision 34.5%, recall 83.3%.
  기준 100회는 precision 85.7%지만 recall 50.0%라 너무 좁다.
- **채널 점검**: 토스 관측 안에서도 `<20` 1/21(4.8%) vs `>=20` 7/25(28.0%).
  메인·웹만은 `<20` 1/45(2.2%) vs `>=20` 3/4(75.0%)지만 고밀도 셀이 4대라 순위를 말하지 않는다.
- **제품 해석**: `>=20`은 “다음 즐길거리 유도” 후보, `<20`은 콘텐츠 추천보다
  진입/조작/로그인/첫 행동 안내 후보로 나누는 기준이 될 수 있다. 운영 임계값 확정은 아니다.
- **기록**: 실행된 노트북 `ml/notebooks/19_early_event_density_hypothesis.ipynb`,
  빌더 `ml/scripts/build_g5_early_event_density_hypothesis_notebook.py`,
  집계·가정 `ml/reports/g5_early_event_density_hypothesis_2026-09-15/`, 차트
  `ml/reports/figs/g5_event_density_threshold_split.png`,
  `ml/reports/figs/g5_event_density_threshold_sensitivity.png`,
  `ml/reports/figs/g5_event_density_channel_split.png`.

### 🧭 이벤트 밀도×의도 행동 — G5 분기 가설 (2026-09-15) · 채택 후보

**가설 H-split**: `early_tracked_events >= 20` 집단 안에서도 실제 의도적 행동이 많은 기기는
새 영역·퀘스트·즐길거리 유도가 맞고, 의도적 행동이 적은 기기는 첫 행동·조작·진입 안내가 먼저다.
**사전 기준**: `tracked>=20 & early_actions>=6`은 저밀도 집단보다 +15%p 이상이면
즐길거리 유도 후보, `tracked>=20 & early_actions<6`은 +10%p 이상이면 첫 행동·진입 안내 후보.
각 고밀도 세그먼트 n이 10 미만이면 보류.

- **결과**: 저밀도+의도행동 없음 2/64(3.1%), 저밀도+의도행동 있음 0/2,
  고밀도+의도행동 적음 3/11(27.3%), 고밀도+의도행동 많음 7/18(38.9%).
- **검증**: 고밀도+의도행동 많음 vs 저밀도 차이 +35.9%p,
  bootstrap 95% 구간 +13.6~+59.6%p → 즐길거리 유도 후보. 고밀도+의도행동 적음
  vs 저밀도 차이 +24.2%p, 구간 -1.5~+53.0%p → 첫 행동·진입 안내 후보지만 재검증 필요.
- **후속 목표 차이**: 고밀도+의도행동 많음은 후속 행동 7/18, 퀘스트·교류 7/18,
  낚시·바다 6/18, 자연·채집 7/18. 고밀도+의도행동 적음은 후속 행동 3/11,
  새 영역 3/11, 낚시·바다 2/11, 퀘스트·교류 1/11, 자연·채집 0/11.
- **채널 점검**: 고밀도 세그먼트는 토스 쪽 표본이 더 크다. 메인·웹 고밀도 셀은
  1/1, 2/3처럼 너무 작아 채널 우열을 말하지 않는다.
- **제품 해석**: `tracked>=20 & early_actions>=6`은 다음 콘텐츠 유도,
  `tracked>=20 & early_actions<6`은 첫 행동·조작·진입 안내, 저밀도 무행동은
  콘텐츠보다 진입 전환 문제를 우선 의심하는 3분기 후보.
- **기록**: 실행된 노트북 `ml/notebooks/20_event_density_action_split_hypothesis.ipynb`,
  빌더 `ml/scripts/build_g5_event_density_action_split_hypothesis_notebook.py`,
  집계·가정 `ml/reports/g5_event_density_action_split_2026-09-15/`, 차트
  `ml/reports/figs/g5_event_density_action_split_rates.png`,
  `ml/reports/figs/g5_event_density_action_target_mix.png`,
  `ml/reports/figs/g5_event_density_action_channel_check.png`.

### 🧭 이벤트 밀도 구성 감사 — G5 피처 정제 (2026-09-15) · 유지하되 분리

**감사 질문**: `early_tracked_events >= 20` 신호는 실제 플레이 행동에서 왔나,
아니면 GA4 자동·세션·접속 이벤트가 많이 쌓인 착시인가. **사전 기준**: 고밀도 양성에서
의도행동 비중이 고밀도 음성보다 높으면 밀도 신호를 유지한다. 양쪽 모두 자동·접속 이벤트가
대부분이면 원시 이벤트 수를 그대로 쓰지 않고 구성 피처로 분리한다.

- **결과**: 고밀도+의도행동 많음의 양성 7대는 첫 10분 이벤트 1,115건 중
  의도행동 615건(**55.2%**)이다. 같은 세그먼트 음성 11대는 657건 중 241건(**36.7%**).
  중앙값 기준 의도행동 비율도 양성 53.1% vs 음성 31.0%.
- **구성**: 고밀도+의도행동 많음 양성은 `chop_tree` 21.5%, `mine_ore` 7.3%,
  `npc_talk` 2.9%, `plant_seed` 2.8%처럼 실제 행동 이벤트가 상위에 있다.
  음성에도 행동은 있지만 `churn_score`, `tutorial_step`, `quest_offered`, `page_view`,
  `scroll` 비중이 상대적으로 더 섞인다.
- **반례**: 고밀도+의도행동 적음 양성 3대는 후속 행동률은 높았지만 첫 10분 의도행동은
  151건 중 1건(**0.7%**)뿐이다. 이 집단은 “즐길거리 추천”보다 “첫 행동·진입 보조”로
  따로 다뤄야 한다.
- **판정**: `early_tracked_events`는 버리지 않는다. 다만 운영/학습 피처에서는
  `early_actions`, `early_action_kinds`, `early_area_count`, `deliberate_share`,
  자동·세션 이벤트 수, 접속 성공/실패 수를 분리해 넣는다. 원시 이벤트 수 하나만으로
  규칙을 만들지 않는다.
- **한계**: 전체 95대, 양성 12대이고 고밀도 양성은 10대다. 이벤트명만으로
  `session_time`, `econ_tx`, `daily_bonus` 같은 추적 이벤트의 의도를 완전히 분리할 수 없다.
- **기록**: SQL `ml/sql/g5_event_density_event_composition.sql`,
  실행된 노트북 `ml/notebooks/21_event_density_composition_audit.ipynb`,
  빌더 `ml/scripts/build_g5_event_density_composition_audit_notebook.py`,
  집계 `ml/reports/g5_event_density_composition_2026-09-15/`, 차트
  `ml/reports/figs/g5_event_density_composition_categories.png`,
  `ml/reports/figs/g5_event_density_composition_high_top_events.png`,
  `ml/reports/figs/g5_event_density_composition_deliberate_share.png`.

### 🧭 정제 피처 리텐션 모델 — G5 모델 검증 (2026-09-15) · 피처셋 채택 후보, 운영 보류

**검증 질문**: `early_tracked_events`를 자동·세션·진입·접속·의도행동 피처로 분해하면
원시 밀도 신호의 성능을 유지하면서 설명 가능한 모델 피처셋이 되는가. **사전 기준**:
refined model AUC가 majority 0.50과 channel baseline보다 높고, PR-AUC가 raw
`early_tracked_events` baseline 대비 80% 이상이면 피처셋 채택 후보. 운영 배포와
threshold 확정은 하지 않는다.

- **표본**: 전체 채널 신규 기기 95대, 양성 12대. 2026-09-04~09-11 KST 첫 관측,
  24시간 라벨 창 완료, beta_A/B 표시 기기 제외. 경계 위반 0. A/B 효과는 보지 않았다.
- **성능**: raw `early_tracked_events` baseline AUC **0.883**, PR-AUC **0.665**.
  `refined_behavior` logistic은 AUC **0.915**, bootstrap 95% 구간 **0.766~0.995**,
  PR-AUC **0.822**. named event count까지 넣으면 AUC **0.928**, PR-AUC **0.849**지만
  자유도가 커서 보조 결과로만 둔다.
- **상위 컷**: `refined_behavior` 점수 상위 20%는 19대 중 양성 10대
  precision **52.6%**, recall **83.3%**. 상위 30%는 29대 중 양성 11대
  precision **37.9%**, recall **91.7%**.
- **계수 해석**: 양의 계수 상위는 `early_ga_auto_events`, `early_advanced_events`,
  `early_entry_auth_events`, `early_fishing_sea_events`, `entry_auth_share`,
  `early_tracked_events`, `early_nature_events`. `early_connect_fail_events`는 음의 계수다.
  자동 이벤트가 양수인 것은 “자동 이벤트 자체가 좋다”가 아니라 첫 10분 체류/활동 밀도의
  대리 신호로 읽는다.
- **판정**: 피처셋은 채택 후보. 다음 학습 파이프라인 기본형은 `refined_behavior`로 두고,
  raw `early_tracked_events`는 baseline과 fallback rule로 보관한다. 표본이 늘기 전까지
  XGBoost/LightGBM, 운영 계수 export, G6 적용 설계는 보류한다.
- **기록**: SQL `ml/sql/g5_refined_retention_feature_table.sql`,
  실행된 노트북 `ml/notebooks/22_refined_retention_feature_model.ipynb`,
  빌더 `ml/scripts/build_g5_refined_retention_model_notebook.py`,
  집계·점수·계수 `ml/reports/g5_refined_retention_model_2026-09-15/`, 차트
  `ml/reports/figs/g5_refined_retention_model_auc.png`,
  `ml/reports/figs/g5_refined_retention_model_coefficients.png`,
  `ml/reports/figs/g5_refined_retention_model_scores.png`.

### 🧭 정제 모델 하이퍼파라미터 탐색 — G5 안정성 서치 (2026-09-15) · 후보 config 저장, 운영 보류

**탐색 질문**: 정제 피처 모델의 하이퍼파라미터를 좁게 탐색하면 기본값보다 안정적인
설정을 찾을 수 있는가. **사전 기준**: repeated CV AUC가 기본 `refined_behavior`
이상, PR-AUC가 기본값의 95% 이상, top 30% recall 80% 이상, nested CV AUC 0.85 이상이면
채택 후보. A/B 효과, `later_*` 피처, 원시 식별자, XGBoost/LightGBM은 쓰지 않는다.

- **탐색 범위**: LogisticRegression(`liblinear`)만 사용. feature set 3종
  (`lean_behavior`, `refined_behavior`, `refined_behavior_plus_named_events`),
  `C` 0.03·0.05·0.1·0.2·0.5·1.0, penalty L1/L2, class weight `balanced`·`pos_4`·`pos_7`.
- **선택 config**: `refined_behavior_plus_named_events`, `C=0.2`, `penalty=l2`,
  `class_weight={0:1, 1:4}`. 같은 repeated CV에서 AUC **0.935**, PR-AUC **0.875**,
  top 30% precision **37.9%**, recall **91.7%**.
- **nested 확인**: 상위 3개 설정만 바깥 4-fold×20회에서 재평가했다. nested AUC **0.928**,
  PR-AUC **0.884**, top 30% precision **37.9%**, recall **91.7%**. 안쪽 CV 선택은
  모두 named event 계열이며 `C=0.2` 36회, `C=0.1` 24회, `C=0.05` 20회였다.
- **계수 안정성**: `early_ga_auto_events`, `zone_enter`, `mine_ore`,
  `fishing_sea`, `session_time`, `advanced`, `entry_auth`, `econ_tx`,
  `connect_ok`, `tracked_events`는 대체로 양의 방향. `connect_fail`,
  `event_name_count`, `churn_score`는 음의 방향. `entry_auth_share`는 10~90% 구간이
  0을 걸쳐 운영 설명에는 보조로만 둔다.
- **판정**: 후보 config는 저장한다. 다만 named event까지 들어간 모델이라 표본이 늘기 전
  운영 배포·threshold 확정·계수 export는 하지 않는다. `refined_behavior`는 보수적 fallback,
  raw `early_tracked_events`는 baseline/rule fallback으로 유지한다.
- **기록**: 실행된 노트북 `ml/notebooks/23_refined_model_hyperparameter_search.ipynb`,
  빌더 `ml/scripts/build_g5_refined_hyperparam_search_notebook.py`, 결과·config
  `ml/reports/g5_refined_hyperparam_search_2026-09-15/selected_hyperparams.json`,
  grid·nested·계수 CSV `ml/reports/g5_refined_hyperparam_search_2026-09-15/`,
  차트 `ml/reports/figs/g5_refined_hyperparam_grid_auc.png`,
  `ml/reports/figs/g5_refined_hyperparam_nested_selection.png`,
  `ml/reports/figs/g5_refined_hyperparam_coef_stability.png`.

### 🧭 모델 패밀리 비교 — G5 대체 모델 점검 (2026-09-15) · Logistic 유지

**비교 질문**: Logistic 후보 외에 다음 모델로 평가할 가치가 있는 패밀리가 있는가.
**사전 기준**: Logistic보다 AUC 또는 PR-AUC가 높고 top 30% recall 80% 이상이면 대체 후보.
Logistic보다 낮지만 recall 80% 이상이고 해석이 쉬우면 보조 후보. AUC 0.75 미만 또는
top 30% recall 80% 미만이면 보류. XGBoost/LightGBM은 양성 12대라 이번 비교에서 제외했다.

- **결과**: `logistic_selected`가 AUC **0.933**, PR-AUC **0.867**,
  top 30% precision **37.9%**, recall **91.7%**로 1위다.
- **Naive Bayes**: `gaussian_nb`가 NB 계열 중 가장 낫다. AUC **0.837**, PR-AUC **0.465**,
  top 30% precision **34.5%**, recall **83.3%**. 보조 baseline 가치는 있지만
  Logistic 대체 후보는 아니다. ComplementNB는 AUC 0.54 수준이라 보류.
- **얕은 Tree**: `decision_tree_depth_2`는 AUC **0.838**, PR-AUC **0.433**,
  top 30% precision **31.0%**, recall **75.0%**라 성능 기준으로는 보류다.
  다만 full-fit 규칙은 `entry_auth_events`와 `zone_enter`를 먼저 봐서, 제품 규칙
  설명에는 참고할 만하다.
- **판정**: 주 모델은 하이퍼파라미터 탐색에서 고른 Logistic 후보를 유지한다.
  GaussianNB는 다음 재검증 때 보조 baseline으로 남기고, 얕은 Tree는 규칙 설명용으로만 쓴다.
  XGBoost/LightGBM은 양성 30대 이상이 되면 다시 연다.
- **기록**: 실행된 노트북 `ml/notebooks/24_model_family_comparison.ipynb`,
  빌더 `ml/scripts/build_g5_model_family_comparison_notebook.py`, 결과
  `ml/reports/g5_model_family_comparison_2026-09-15/`, Tree 규칙
  `ml/reports/g5_model_family_comparison_2026-09-15/decision_tree_depth_2_rules.txt`,
  차트 `ml/reports/figs/g5_model_family_auc.png`,
  `ml/reports/figs/g5_model_family_pr_precision.png`,
  `ml/reports/figs/g5_model_family_tree_importance.png`.

### 🧭 토스 선택형 지역 안내 — G1 계측 준비도 (2026-09-14) · 미통과, 로컬 완료

**G0 후보**: 선택형 지역 안내가 기존 배너보다 미경험 지역의 첫 행동 도달을 높인다.
**사전 G1 기준**: 노출마다 추천 ID·대상 지역이 있고, 클릭·도착을 같은 ID로
연결하며, 대조군 배정 단위를 확인할 수 있어야 한다. 하나라도 빠지면 미통과.

- **범위**: GA4 완전 일별 export 2026-09-04~09-12(KST)의 `platform='toss'`
  이벤트, 기록된 `beta_A/B` 표식 제외. 단위는 사람이 아닌 기기/브라우저.
- **원시 집계**: `churn_score` **217건/15기기**, 그중 배너 표시 **15건/6기기**.
  추천 ID·대상 지역 **0건**, 추천 클릭·도착 전용 이벤트 **0건**.
  `zone_enter` 257건/10기기는 일부 지역 진입 기록일 뿐 추천 도착이 아니다.
- **실험 단위 주의**: 점수 이벤트 기준 treat 115건/9기기, control 102건/8기기.
  2기기가 다른 세션에서 양쪽 arm에 있어 기기별 독립 A/B 표본으로 볼 수 없다.
- **기준선만 확인**: 앞선 토스 49기기의 첫날 지역 도달은 자연·채집과
  퀘스트·교류 각각 20기기, 낚시·바다 9기기. 도달 차이는 선호나 안내 효과가 아니다.
- **판정**: 현재 로그로 추천 지역→클릭→첫 행동의 연결이나 효과를 검정할 수 없다.
  목표 라벨도 없으므로 예측모델 학습은 진행하지 않았다. `shown`은 실제 시청·청취의
  증거가 아니며, 알림음 재생 성공도 미계측이다.
- **기록**: 실행된 노트북 `ml/notebooks/10_toss_guidance_measurement_readiness.ipynb`,
  SQL `ml/sql/g1_toss_guidance_measurement_audit.sql` 및
  `ml/sql/g1_toss_guidance_shown_devices.sql`, 집계 CSV·가정
  `ml/reports/g1_toss_guidance_readiness_2026-09-14/`, 차트
  `ml/reports/figs/g1_toss_guidance_measurement_chain.png`.
- **다음 게이트 전 조건**: 추천 ID, 대상 지역, 적격/잠금 상태, 노출, 클릭, 이동 선택,
  도착, 대상 지역 첫 행동, 닫기, 소리 요청/재생 성공을 연결해 계측한다. 구현·배포는
  이번 분석에 포함하지 않는다. W&B 외부 업로드도 기존 보류를 유지한다.

### 🧭 세그먼트 분석 — G1 데이터 신뢰성 (2026-09-06) · 통과, H1 기각, 🔴 표본 오염 발견

**시작 전 기준**: 표본 724건에 기기 종류(GA4 `device.category`, `user_id` 조인)가 붙는 비율 ≥ 90% · 모바일/데스크톱 각 ≥ 50건 · 함정 처리 문서화 → **통과** (90.6% · 모바일 395 · 데스크톱 261 · 기록 없음 68).

- **H1 "`mouse_travel` 은 기기 종류의 대리변수" → 기각(반증 조건 ①).** 폰에서도 터치 좌표가 `mouse_x/y` 로 찍힌다.
  모바일 표준편차 318 vs 데스크톱 522(비 0.61 ≥ 0.5), 중앙값은 모바일 510 > 데스크톱 237. 기기 안에서 이탈률도 데스크톱 25% · 모바일 23% 로 차이 없음(윌슨 구간 겹침).
- 🔴 **GA4 기록이 없는 68세션의 정체 — 자동 테스트 게스트.** 68세션 중 61세션이 8/31·9/1, 96% 게스트, 65 클라이언트, 중앙값 21행·19초, 전부 `time15` 트리거. 이탈률 **91%(62/68)**.
  **양성 라벨 218건 중 62건(28%)이 이 무리다.** 지금 모델이 "자동 테스트 = 이탈"을 일부 학습했을 가능성이 있다. `train_churn.py`·API 는 그대로 두고, 표본 정의(`ml/sql/churn_trigger_sample.sql`)에서 뺄지는 사용자 결정.
- 기록: W&B `g1-device-coverage` · 차트 `ml/reports/figs/g1_mouse_travel_by_device.png`, `g1_churn_by_device.png` · 스크립트는 세션 스크래치(노트북 정리는 G2 이후).
- **다음 결정(G2 전 확정)**: 자동 테스트 세션 제외 규칙 — 후보 A "세션 `user_id` 에 GA4 이벤트가 0건", 후보 B "8/31~9/1 게스트". 제외하면 `time15` 기저율·임계값이 바뀌므로 재학습·`coef.json` 교체가 따라온다.

### 🧭 세그먼트 분석 — G1 세그먼트 표 (2026-09-06 밤) · 통과 · 피처 검토의 밑그림

**기준(사전)**: 전체 기기와 학습 표본을 같은 축(신규/기존·시간·빈도·행동·기기·지역·계정·주차)으로 나눈 표 + 칸마다 n·결과, 50 미만 회색 → **통과**. W&B `g1-segments`. 차트 `ml/reports/figs/g1_seg_devices_return.png`, `g1_seg_sample_churn.png`. 스크립트는 세션 스크래치(`seg/g1_segments.py`).

- **전체 기기 291대(GA4)**: 하루만 온 기기 265(91%). 재방문 26대 전부 국내·게스트/로그인. **해외 126대 재방문 0%**, GA4에 user_id 없는 164대(로그인 화면도 못 지남) 재방문 1%. 무행동 168대(58%). 주요 행동 축은 무행동 빼면 전 칸 50 미만 — **행동 유형별 분석은 이 표본으로 불가**. 도감 `weather` 는 로그인 시 자동 발견(97대)이라 수집형에서 뺐다(안 빼면 49대가 가짜 수집형).
- **학습 표본 724행**: **게스트 45% vs 로그인 9%**(로그인은 cap 20까지 채운 단골이라 표본의 41%). 자동 테스트 68행(기기·지역 없음) 91%. 기기별·지역별 차이 없음(23~25%). 첫 세션 32% vs 재방문 27%. 주차 W34 48%.
- **피처 검토(G2)에 남기는 것**: ① 세그먼트로 쓸 수 있는 축은 계정(게스트/로그인)·기기·첫 세션 셋뿐(각 칸 ≥100행) ② 자동 테스트 68행 제외 여부를 G2 첫 줄에서 결정 ③ 로그인 여부는 라벨과 4배 차이 — 피처 후보이자 교란 변수(단골이라 안 나가는 것). 
- 이 게이트는 Artifact 페이지를 따로 내지 않고 G2와 합쳐 한 장으로 낸다(사용자 요청으로 분석이 한 번 중단됐던 터라 페이지는 결론이 있을 때).

### 🧭 세그먼트 분석 — G2 단변량 진단 (2026-09-06 밤) · 통과 · 재학습은 G3
**기준(사전)**: 자동 테스트 제외 전/후 × 세그먼트(계정·기기·첫 세션·트리거)별 피처 8개 단독 AUC + 부트스트랩 95% 구간 + 방향, 뒤집힘/무의미 피처 명시 → **통과**. 학습 없음. W&B `g2-segment-univariate`. 차트 `ml/reports/figs/g2_exclusion_effect.png`, `g2_segment_univariate.png`.

- **자동 테스트 68행 제외 효과(724→656행, 양성 218→156)**: `time15` 기저율(=운영 임계값) **0.553 → 0.440**, `quest` 0.139 그대로. 좌표 피처의 단독 AUC 거리(|AUC−0.5|)가 절반으로 준다 — `path_len` 0.667→0.591, `net_disp` 0.625→0.532, `mouse_travel` 0.295→0.392, `trigger_kind` 0.265→0.317. **`is_first_session` 은 방향이 뒤집힌다**(0.53→0.45: 테스트 세션이 전부 첫 세션이라 "첫 세션=나감"을 만들고 있었다). 지금 서빙 중인 계수는 이 68행을 포함해 학습된 것.
- **세그먼트별(제외 표본)**: `path_len` 은 게스트·모바일·첫 세션에서 유의(●), 로그인·데스크톱에선 구간이 0.5 를 품음. **`mouse_travel` 은 모바일(0.33●)·로그인(0.38●)·quest(0.33●)에서만 일하고 데스크톱(0.44○)·time15(0.52○)에선 안 한다** — 아침 가설의 정정: "둘러보기 신호"가 아니라 터치 조이스틱 이동 신호에 가깝다. `idle_ratio` 는 모바일·quest 에서만. `trigger_kind` 는 전 칸 유의.
- **어디서도 유의하지 않은 피처 3개: `net_disp`, `wander_ratio`, `yaw_total`** — G3 제거 후보.
- **G3(재학습·판정, 사용자 승인 뒤)에서 비교할 판**: ① 현행 8피처+전체 ② 8피처+테스트 제외 ③ 5피처(net_disp·wander·yaw 제거)+테스트 제외 ④ ③+`is_mobile` — 사전 기준(CI 하한>0.60)과 트리거 안 AUC 로 판정. `is_guest` 는 교란(단골) 우려로 피처가 아니라 세그먼트 보고용.

### 🧭 세그먼트 분석 — G3 재학습·판정 (2026-09-06 밤) · ✅ 판 ② 채택·교체 완료(사용자 승인 2026-09-06)
**기준(사전)**: CI 하한 > 0.60 이고 `path_len` 단독을 이기며, 겹치면 피처 적은 쪽. 계수 파일은 쓰지 않았다. W&B `g3-variants`. 차트 `ml/reports/figs/g3_variants.png`.

| 판 | n | AUC [95%] | time15 안 | quest 안 | trigger 단독 | 임계 time15 |
|---|---|---|---|---|---|---|
| ① 현행 8피처·전체 | 724 | 0.768 [0.728, 0.804] | 0.681 | 0.529 | 0.684 | 0.553 |
| ② 8피처·테스트 제외 | 656 | 0.677 [0.629, 0.726] | 0.454 | 0.512 | 0.622 | 0.440 |
| ③ 5피처(−net_disp·wander·yaw)·제외 | 656 | 0.678 [0.627, 0.727] | 0.471 | 0.506 | 0.622 | 0.440 |
| ④ ③ + is_mobile | 656 | 0.671 [0.619, 0.722] | 0.576 | 0.442 | 0.622 | 0.440 |

- **사전 기준으로는 ②③④ 전부 통과**(하한 0.62~0.63). 그러나 **트리거 안 AUC 는 0.45~0.51 — 동전 던지기**다. 통과분은 사실상 `trigger_kind` 하나(단독 0.622)이고 좌표 피처는 +0.05 를 얹을 뿐이다. ①의 0.77 은 자동 테스트 68행이 만든 숫자였다.
- **현행 서빙 계수(①)의 문제 둘**: 테스트 세션을 학습함 · `time15` 임계값 0.553 이 실제 기저율(0.440)보다 높아 배너가 의도보다 덜 뜸.
- **권고**: 지금(수요일 실험 전) 은 **②** 로 계수 교체 — 표본 SQL 에 제외 규칙만 넣으면 되고 피처 계약(JS·API·SQL 8개)을 안 건드린다. **③** 은 같은 성능에 피처 3개가 줄지만 `FEATURE_ORDER` 가 세 곳에서 바뀌어 클라이언트 재배포가 필요 → 실험 뒤. ④ 는 15초 트리거에서만 낫고(0.576) 퀘스트에서 나빠져 보류.
- **정직한 결론**: 이 모델은 "어느 트리거였나" 이상을 거의 못 본다. 실험 ②(배너)는 arm 무작위 배정이 본체라 모델 품질과 무관하게 진행 가능하지만, 배너를 받는 세션 선별은 트리거 안에서 사실상 무작위다. 좌표 피처로 더 가려면 표본이 몇 배 더 쌓여야 하고(수집은 API 적립이 하고 있다), 세션 안 행동 이벤트(GA4)를 피처로 넣는 게 다음 후보다.
- ✅ **교체 완료(2026-09-06 14:21Z, 커밋 0e9898a)**: 표본 SQL `sampled` 에 `user_id IN ga_uids`(GA4 흔적 있는 세션만) 추가, 기저율 가드 테스트 추가. 스케줄러 경로로 학습 → coef.json `2026-09-06T14:21:45Z`(n=656, AUC 0.677 [0.629, …], time15 임계 0.440 · quest 0.139) → API 핫리로드 확인, W&B 아티팩트 v3. 롤백은 `fetch_coef.py --version v2`.

### 배포된 것

- **추론 API** — `lab.calmforest.cloud/predict` · `/health`. `coef.json` 핫리로드 · fail-open 800ms
  (운영상 최선은 Cloudflare Worker 였지만 서빙 파이프라인을 직접 만드는 게 목적이라 VM 을 골랐다.
  아파지면 그리로 옮긴다 — 설계서 §6)
- **트리거별 임계값** — `time15` 0.5528 · `quest` 0.1386 (각 트리거의 기저율. 설계서 §4)
- **학습 표본 적립** — API 가 판정에 **실제로 쓴** 피처를 JSONL 로 append(학습/서빙 스큐 차단, 설계서 §9)
- **Airflow DAG 2개 가동 중**(2026-09-06 unpause) — 주 1회 재학습 + 야간 적립분 BQ 업로드. 수동 학습 성공: W&B `4a24hwra`, `coef.json` 교체 → API `model_version` 2026-09-06T06:31:34Z 핫리로드 확인
- **클라이언트 배선** — `js/predict.js`(롤링 윈도·트리거 2종·개입 배너). `dev` 에 병합됨(2026-09-06, 991295b). `main` 병합·`wrangler deploy` 전까지 실서비스에선 안 돈다

### 실측 (2026-09-06 · 노트북이 그 자리에서 계산한 값)

| | |
|---|---|
| 표본 | **724 트리거** / 293세션 / 156 클라이언트 (cap 20). 상한 없으면 851건 |
| 트리거별 | `time15` 284건 이탈 55.3% · `quest` 440건 이탈 13.9% |
| 모델 | AUC **0.7676** · 95% CI **[0.7280, 0.8040]** (GroupKFold 5겹 + 부트스트랩 1,000회) |
| 베이스라인 | 다수 클래스 정확도 0.699 · `path_len` 단독 0.559 · `trigger_kind` 단독 0.684 |
| 트리거 안에서만 | `time15` 0.644 [0.578, 0.707] · `quest` 0.597 [0.516, 0.674] |
| 병기(참고) | 사전등록 `span<180` 라벨 0.709 [0.654, 0.764] · 335세션. 축이 달라 우열 비교 불가 |
| 운영 임계값 이득 | 트리거의 52.2% 에 배너 · 이탈률이 기저율 대비 **1.11~1.17배** |

**판정 — ✅ 신호 있음.** CI 하한 **0.728 > 0.60**(사전등록 §5 · 설계서 §12).
사전등록의 기각 조건(`path_len` 단독을 못 이김)에도 걸리지 않는다.

⚠️ **통과분의 상당 부분이 `trigger_kind` 다.** 트리거 안에서만 재면 CI 하한이 0.578·0.516 으로
"보류" 밴드에 들어간다. **"AUC 0.77" 만 떼어 인용하면 오해가 된다.**
설계서 §12 대로 파이프라인은 그대로 두고 계수만 갈아끼운다.

### 🔴 설계 변경 (2026-09-06 · 사용자 결정)

**개입 배정을 세션 단위 무작위로 바꾼다** — `TUNING.churn.treatRate`(0.5),
GA4·JSONL 필드 `arm`(`treat`/`control`). 베타 번들 A/B(`variant`)와 **독립**이다.
테스터 10명으로는 사람 단위 분할을 두 개 버틸 수 없다.
설계서 §8 의 "배정은 기존 `state.variant` 재사용" 문장은 이 결정으로 대체됐다.

### 인수인계 — 사용자가 해야 할 것 (2026-09-06 갱신)

1. ~~Airflow 이미지 재빌드~~ ✅ 완료(2026-09-06).
2. ~~비밀값 배치 후 DAG 해제~~ ✅ 완료(2026-09-06). 키 `65be125f…` 그대로 사용 — 재발급 시 GH Actions `GCP_SA_KEY` 도 교체.
3. **로컬 테스트 세션 제외.** `churn_events` 에서 2026-09-06 에 들어간 아래 행을 뺀다 —
   `session_id` = `sess-sbj9ynmqkkjmtpbku2z`, 게스트 `user_id` = `f91e904d-9004-4bd8-bc91-ced6eba10851`
   · `4135ff5c-23bb-4653-96b7-df564ff5a7ab`, 그리고 `client_id`/`session_id` 가 `smoke` 인 행 전부.
4. **`dev` → `main` 병합 + `npx wrangler deploy` + push.** `experiment` → `dev` 는 병합됨(991295b). 배포 전엔 게임에서 예측 요청이 안 나간다.
5. **GA4 커스텀 차원 등록** — `arm` `p` `trigger` `shown` `model_version`(안 하면 `churn_score` 파라미터가 보고서에 안 뜬다).

### 확정된 것

| | |
|---|---|
| 예측 단위 | **세션**. 기기 단위는 불가(행동한 81대 중 79대 = **97.5% 이탈**, 분산 없음) |
| 라벨 | 트리거 시점 뒤 **60초 안에 세션 종료** (하나로 통일) |
| 트리거 | ① 접속 후 15초(커버리지 84%) ② 퀘스트 계열 접촉 — **이벤트마다** 판정(694건). 수락 16.6%·완료 14.2%·NPC 12.8% vs 기준선 8.9% |
| 추론 | **오라클 VM FastAPI** (`lab.calmforest.cloud/predict`). 계수는 서버, 클라이언트는 피처만 계산 · fail-open 800ms |
| 학습 | **Airflow DAG** 주 1회 → `coef.json` → API 핫리로드. VM 여유 실측 9.6Gi |
| 개입 | 모델 아님 — `gameState` 조회 규칙(미완 우선 → 다음 할 것). `showHintBanner` 재사용 |
| A/B | 전원 점수화 + 처치군만 개입 → 모델이 아니라 **개입 효과**를 측정. 배정은 **세션 단위 `arm`**(2026-09-06 변경 — 위 참조) |
| 표본 | **724 트리거**(293세션), 클라이언트당 20 상한. 상한 없는 판(851건)은 강건성 병기 |

### 트리거 근거 — 🔴 2026-09-04 정정됨

처음엔 **세션 기준**으로 재서 퀘스트 49%·집 완성 15%(3배 차)로 봤다.
그런데 세션 기준은 **자주 하는 행동을 자동으로 부풀린다** — 세션당 6.9회 하는 NPC 대화는
끝에 걸릴 기회가 7번, 1.2회 하는 집 완성은 1번이다. 개입은 행동할 때마다 하므로 **이벤트 기준**이 맞다.

**기준선(아무 순간): 8.9%** — 120초 넘게 논 세션의 GA4 전체 이벤트 18,427건

| 행동 | 이벤트 기준 | 기준선 대비 | (참고) 처음 셈 |
|---|---|---|---|
| 퀘스트 수락 | **16.6%** (193건) | 1.9배 | 49.1% |
| 퀘스트 완료 | 14.2% (127건) | 1.6배 | 47.1% |
| NPC 대화 | 12.8% (374건) | 1.4배 | 46.4% |
| 집 완성 | 12.5% (48건) | 1.4배 | 15.4% |
| 나무 베기 | 9.7% (1,945건) | 1.1배 | 39.0% |

**결정(안 B): 셋을 그대로 묶어 쓴다** — 이벤트 694건.
확실히 기준선 위인 건 퀘스트 수락 하나뿐이지만, 손해가 작고(배너 1개)
`trigger` 종류를 로그에 남기므로 나중에 갈라 볼 수 있다.

### 게이트 상태

모델 게이트(G3~G5) **판정 완료**(2026-09-06) — 위 "지금 상태" 참조. ✅ 신호 있음.
사전등록 `CHURN_ANALYSIS_PLAN.md` 의 `span<180` 라벨은 축이 달라 판정 때 **참고로만 병기**했다.

---

## 오늘 한 기술 분석 (모델 아님)

산출물은 노트북 두 권. 쿼리·차트·해석·정정이 한 흐름으로 들어 있다.

- **`ml/notebooks/02_churn_where.ipynb`** — 이탈 지점 탐색
- **`ml/notebooks/03_guest_conversion.ipynb`** — 게스트는 왜 안 남고 왜 로그인하지 않는가

### 나온 것

| | |
|---|---|
| 규모 | WAU 115(8/21) → **27**(9/2). DAU 5. DAU/MAU **2.2%** |
| 이탈 구조 | 5초 안에 나간 **133대** / 재방문 후 무행동 **32대** / 게임 안 흩어짐 65대 |
| 게스트 비중 | 전체의 31.7%. **구글 로그인은 8.2%(20대)** |
| 게스트 한 세션 | 행동 11회·6종·체류 188초(실제 시청 44초). **도감 중앙값 1개**, 47%는 0개 |
| 전환 경로 | "게스트로 해보고 전환" 이 **5건**. 전환자 20대 중 15대는 게스트를 안 거침 |
| 로그인 넛지 | 노출 19건(10대), **클릭 0건**. 조건이 `total === 5` 정확히 일치라 게스트는 도달 불가 |
| 튜토리얼 | 단계를 밟은 건 26대. 08-06 이후로는 11대. `carve` 는 0건(09-01 도입) |
| 세션 끝 | 35% 는 거의 완전 정지, 36% 는 끝까지 움직임. 정지 길이 중앙값 4행(≈30초) |

### 계측·설계에서 찾은 것

- **`tutorial_skip{at:'welcome'}` 이 ❓도움말 닫기와 합쳐져 있었다** → `welcome`/`help` 로 분리(index.html 3곳). **과거분은 소급 분리 불가.**
- **게스트 uid 회전** — `signInAsGuest()` 가 남은 익명 세션을 일부러 로그아웃한다(의도된 사양). 기기 205대가 uid 667개. 세이브 용량은 문제가 아니다(212건 0.51MB).
- **활동 순서를 복원할 수 없다** — 기기 95% 가 타임스탬프 동률. 순서 분석을 하려면 클라이언트가 증가하는 시퀀스 번호를 실어야 한다. `logger.js` per-sample `t` 부재와 같은 뿌리.
- **`js/config.js` 에 GA4 localhost 가드 없음** — 로컬로 index.html 을 열면 실계정이 오염된다.

### 이번에 틀렸다가 고친 것

기록에서 지우지 않는다. 같은 오답을 다시 집지 않게 하려는 것이다.

| 처음 읽은 것 | 실제 |
|---|---|
| 마지막 흔적이 `login` 인 32대 = "로그인만 하고 끝" | 전부 플레이 경험자. 로그인만 한 기기 0대 |
| welcome 스킵 73대 = 튜토리얼 거부 집단 | 게임을 가장 많이 한 집단(93%가 스킵 후 플레이) |
| 휘발 설계가 리텐션과 충돌 | 게스트=체험판은 의도된 사양. 전제로 둬야 한다 |
| `game_saves` 로 상태 판단 가능 | 로그인 8%만 남는 생존편향 |
| `tutorial_complete` 를 믿을 수 없다 | 정상 작동. `max_step` 이 평생 최대값이라 다른 판과 섞어 읽은 것 |
| "멈추는 자리는 마을 한복판" | 기저율. 정지 80.3% vs 움직임 77.3% 로 차이 없음 |
| 게스트 퍼널 "벽은 벌목" | 45대 중 41대가 이탈이 아니라 **다른 길로 간 것**. 28분 놀았다 |
| 9절 "행동별 멈춤 비율" = 위험도 | **위험도가 아니라 그 행동이 마지막이 될 확률**. 다들 어차피 이탈(97.5%)하므로 게임 흐름상 뒤에 있는 행동일수록 높게 나온다 |
| 트리거 근거 "퀘스트 49% vs 집 15%" | **세션 기준이라 자주 하는 행동이 부풀려진 것**. 이벤트 기준으로는 16.6% vs 12.5%(기준선 8.9%). 위 항목과 같은 뿌리인데 한 겹 더 있었다 |
| "GA4 퀘스트와 좌표는 이을 열쇠가 없다" | **`user_id` 로 이어진다.** 익명 uid가 세션마다 재발급돼 사실상 세션키(uid당 1.05세션). 508건 중 466건(91.7%)이 한 세션에 정확히 붙고 6건만 애매. 학습 표본 616건. 사전등록의 `user_id` 금지 경고를 '전면 금지'로 잘못 읽은 것 — 그 경고는 **리텐션에 한정**된다 |

⚠️ **위 표의 "9절 행동별 멈춤 비율" 항목은 `03` 10절에 아직 반영 안 됨.** 그 절의 퍼널·섕키는 "이탈" 로 라벨돼 있는데
실제로는 "그 단계를 안 거침" 이다. 다음 세션에서 고칠 것.

---

## 다음 세션에서 할 일

1. **위 인수인계 4건** — 이게 안 끝나면 모델이 갱신되지 않는다(DAG paused).
2. **트리거별 분리 학습을 재본다.** 기저율이 4배 차이라 계수 벡터 하나로 둘을 맡는 게 최선이 아닐 수 있다.
3. **`arm` 별 세션 연장 차이** — 방향만 본다. 베타 10명이라 유의성은 주장하지 않는다(검정력 ~7%).
4. **`logger.js` 에 샘플별 `t` 추가**(사전등록 §7 최우선, 아직 미이행) — 시계열 피처가 열린다.

> 구현은 끝났다 — `js/predict.js` · `ml/api/churn.py` · `ml/train_churn.py` ·
> `infra/airflow/dags/churn_train.py` · `ml/notebooks/04_churn_model.ipynb` 전부 있다.

### 아직 안 본 것 (급하지 않음)

- 8/15 유입이 어디서 왔는지(43대가 `(direct)`)
- 무행동 25대 중 `(direct)` 17대의 정체 — 인앱 브라우저 가설로 안 덮인 쪽
- 로그인 화면조차 못 본 141대(58%)
- 정지 분석에서 요리·조각 구간 제외(`cooking_start`~`cooking_result`)
- 인앱 브라우저 가설 검증 — **인스타 링크로 직접 열어보면 끝난다**(H 채택됨)

## 기반 작업 (2026-09-03)

- `main` → `experiment` 병합
- `ml/calm_ml/bq.py` 신설(BigQuery·ADC·서울 리전 고정) · `db.py` 에 "분석에 쓰지 말 것" 경고
- `ml/calm_ml/report.py` 신설 — 한글 폰트·마이너스 글리프·검증 팔레트·n 표기·`tint()` 강제
- `ml/sql/churn_sample.sql` — 재현성 PASS(2회 실행 동일), 누수 격리 확인
- 지침 3종: 스킬 `gated-analysis`(게이트 구조) · `analysis-step`(질문 하나 처리 루프) · `ANALYSIS_PROTOCOL.md`
