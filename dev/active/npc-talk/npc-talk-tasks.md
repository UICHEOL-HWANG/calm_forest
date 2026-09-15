# npc-talk · 체크리스트

**Last Updated:** 2026-09-15

## 0. 준비
- [x] `feat/npc-talk` 브랜치
- [x] NPC 11명 캐릭터 시트 → `_npc-gen.js` 의 `NPC_SHEET`(한국어 `persona` + 영어 `personaEn`)
- [x] `farewell` 문구 11개 → 사용자 승인(2026-09-15)
- [ ] ⚠️ 올빼미(`courier`) persona 잠정 — 실제 대사 확인 후 조정

## 1. DB
- [x] `sql/migrate_npc_talk.sql` — 테이블 3개 + 읽기 rpc 3개 + RLS
- [x] Supabase 적용(사용자) · `wrangler secret put SUPABASE_SERVICE_KEY`(사용자)
- [x] 검증: anon 쓰기 **401 RLS 차단** · anon 읽기 rpc 200 · 테이블 직접 select 빈 집합

## 2. 생성 (TDD)
- [x] `_npc-gen.js` — 프롬프트·검증·상한 판정·Gemini 호출
- [x] `tools/seed-npc-dialogues.mjs` (`--dry-run` 은 DB 없이 동작)
- [x] 단위 테스트 30개 · 전체 497/497
- [x] 한국어 시딩 — 대사 330세트 · 첫인사 69줄
- [x] 영어 재시딩 완료 — ko/en 각각 대사 330세트 · 첫인사 132줄, 언어 오염 0

## 3. 읽기 API
- [x] `functions/api/npc-talk.js` — 날짜 시드 결정적 뽑기 + 엣지 캐시 12h
- [x] 검증: 같은 날짜 → 같은 세트 id(119,101) · 다른 날짜 → 다른 세트
- [x] `worker/index.js` 라우트 등록
- [x] `scripts/serve.py` 로컬 미러

## 4. 크론
- [x] `functions/npc-gen-cron.js` — 서브리퀘스트 예산 15조합/회
- [x] `worker/index.js` `scheduled` 를 `event.cron` 으로 분기
- [x] `wrangler.jsonc` 크론 **배열에 추가**(카드뉴스 `0 2 * * *` 보존)
- [x] 실패 메일은 기존 `notify.js`(send_email `NOTIFY`) 재사용 — 새 시크릿 0
- [ ] 실제 트리거 1회 검증(배포 후)

## 5. 게임 UI
- [x] ~~떠 있는 #chat-btn~~ **제거**(2026-09-15 사용자 결정) — Space 갈래로 일원화
- [x] `ui.openNPCModal` 에 💬 갈래 추가: 수락하기 / 나중에 / 💬 대화하기
- [x] `#chat-modal` (⚠️ `#talk-btn` 은 기존 모바일 버튼이라 id 를 못 쓴다)
- [x] 오프닝 → 3턴 → 작별 흐름
- [x] `gameState.talk` 카운터 + 날짜 리셋 + `if (saved.talk)` 복원
- [x] 브라우저 실증: 3턴 대화 · 1·2회차 다른 세트 · 3회차 "오늘은 그만" 비활성
- [x] 영어 모드 버튼/문구 번역 확인
- [x] 📱 360px 실측 — 우측 열 충돌 0(자원바·피드백·도감)
- [x] 🎨 대화창 리디자인 — 꼬리 말풍선·선택지 강조선·작별 구분·스태거 등장

## 6. 트래킹
- [x] `npc_talk_open` / `_turn` / `_done` / `_exhausted`
- [ ] 다음날 BQ 재검증

## 7. 마무리
- [x] code-reviewer 결과 반영 — C1·H2·H3·M1·M3·M4·M5·L1 처리, H1 은 ops-monitor 로 이관
- [ ] 4개 미커밋 파일과 함께 main 병합 → 웹 배포 → 토스 번들
- [ ] 배포 후 크론 1회 수동 트리거 검증

---

## 🔴 사고 기록 — 영어 대사 330행이 전부 한국어로 생성됨

**원인:** `buildPrompt` 의 영어 분기에 한국어 `persona`("푸근한 중년 농부. 반말.")를
그대로 넣고, `날씨` 라는 한글까지 섞고, **"영어로 써라"를 명시하지 않았다.**
모델이 프롬프트 언어를 따라 한국어로 답했다.

**왜 테스트가 못 잡았나:** 영어 프롬프트가 *영어인지* 검사하지 않았다.
"프롬프트에 캐릭터 말투와 턴 규칙이 들어간다"만 봤다.

**수정 3단:**
1. `personaEn` 필드 추가 — 영어 분기에 한국어를 한 글자도 넣지 않는다
2. 프롬프트 맨 앞에 `Write everything in English.` 못박기
3. **언어 가드** — `validateSets`/`validateOpeners` 가 `lang='en'` 인데 한글이 오면 버린다
   (프롬프트를 고쳐도 모델은 가끔 미끄러진다. 여기서 못 막으면 영어 유저 화면에 한국어가 뜬다)

**교훈:** 다국어 생성은 "프롬프트가 그 언어인가"를 테스트로 박아야 한다.
출력만 눈으로 보면 한 언어만 확인하고 넘어간다.

## ⚠️ 함정 기록
- **`#talk-btn` 은 이미 있다** — 모바일 NPC 근접 버튼(`index.html:1735`). 같은 id 를 쓰면
  `getElementById` 가 먼저 나온 것만 집어 기존 핸들러(`Input.doTalk`)가 통째로 가로채진다.
- **`GEMINI_MODEL` 은 이미지 모델일 수 있다** — `tools/cardnews/generate.mjs` 가 같은 변수로
  `gemini-3-pro-image-preview` 를 쓴다. 셸에 그 값이 떠 있으면 대사 생성이 즉시 429.
  `node --env-file` 은 기존 환경변수를 **덮어쓰지 않아** `.env` 로도 못 막는다.
  → 이 모듈은 `NPC_GEMINI_MODEL` 만 본다. (⚠️ `scripts/serve.py` 미러 4종은 아직 `GEMINI_MODEL` 을 읽는다 — 별건)
- **responseSchema 의 바깥 배열에도 `minItems/maxItems`** 를 걸어야 한다. 안 걸면 "3세트 달라"를
  무시하고 1세트만 줘도 스키마를 통과한다(실측: 66 요청 → 42 수신).
