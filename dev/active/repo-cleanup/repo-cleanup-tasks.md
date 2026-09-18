# 저장소 정리 — 체크리스트

## 사전
- [x] 진행 중 retention-guidance 작업 커밋 (2695900)
- [x] 베이스라인 측정 — 725 pass
- [x] dev docs 생성

## 0단계 — 미추적 쓰레기 ignore
- [x] `.gitignore` 에 스크래치·산출물 추가
- [x] `docs/beginner-guide/img` 추적 중인 2장 `git rm --cached`
- [x] `git status` 미추적 190여 개 → 14개(전부 커밋해야 할 소스)
- [x] `npm test` 725 pass · `build-web.mjs` 128개 불변
- [x] 커밋 4137497

## 1단계 — 죽은 스크래치 삭제
- [x] `tools/cardnews/_dbg*.mjs` 10개 삭제
- [x] 끊어진 스킬 심볼릭 링크 5개 제거 · 루트 .gitignore 중복 5줄 제거
- [x] 검증 · 커밋 650a629

## 2단계 — 배포 밖 디렉토리 구조화
- [x] `sql/` 33개 → migrations·notices·analytics·setup (72222d5)
- [ ] `dev/active` 완료 태스크 → `dev/archive/` — **보류**(어느 게 끝났는지 사용자 판단 필요)
- [x] `docs/` → analysis·ops·beta·design (2e64d01)
- [x] 검증 · 커밋

## 곁들여 처리한 것
- [x] 🌳 워크트리 2개 제거 — intelligent-almeida(113M, detached)·orchard(57M, main 점유).
      240M → 70M. `main` 체크아웃 가능해짐. 미커밋 있는 2개(ab-testing·farm-instancing)는 남김.

## 발견했지만 고치지 않은 것
- `docs/superpowers/plans/2026-09-04-churn-intervention.md` 는 `cd ml` 뒤의 상대경로
  `sql/churn_trigger_sample.sql` 를 쓴다. 저장소 루트 기준이 아니므로 **맞는 표기다**.
  ml/ 관련 문서를 일괄 치환할 때 이걸 건드리지 말 것(한 번 틀렸다가 되돌렸다).
- ⚠️ `main` 이 3dffc1b 로 앞서 있다. 현재 브랜치는 그보다 뒤처져 있으니 병합 전 확인.
