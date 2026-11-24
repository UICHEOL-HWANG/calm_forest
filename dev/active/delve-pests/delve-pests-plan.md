# delve-pests 계획 (승인 2026-11-24)

설계 전문: docs/superpowers/specs/2026-11-24-delve-pests-design.md
고른 안: A1 첫 만남 소개 카드 + B2 받아먹기 + 부탁은 실제로 지켰을 때만 + 문구 a안 전부.

1. 데이터: VEIN_HP 5, 몹 규칙 수치(LURK_DIST·CATCH_R), PEST_COPY 를 몹별 카드·문구로.
2. 순수 규칙(pests.js): lurk 상태(광맥을 치기 시작하면 다가와 대기), catchAtBreak, counterFor, tap/bait 조건 강화, sleep, 층 집계.
3. 연결(spaces/delve.js): 광맥 HP, 깨질 때 받아먹기, 첫 만남 카드, 버튼 조건, 말풍선 상태, 미끼 남은 초, 톡·뺏김 토스트, 층 결과 토스트, 기록 키 추가, 1층 공통 배너 제거.
4. 말풍선 배경 베이지(블룸 회피).
5. 영어 사전.
6. 직접 플레이 캡처(세로 폰·가로 폰·PC), npm test, 웹 빌드, 코드 리뷰, 로컬 커밋.
7. 다음 단계(별도 승인): 몹 생김새 다듬기·새 도둑 몹(sims/delve-mobs-compare.html).
