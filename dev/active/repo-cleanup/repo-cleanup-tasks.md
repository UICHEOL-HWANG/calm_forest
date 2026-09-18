# 저장소 정리 — 체크리스트

## 사전
- [x] 진행 중 retention-guidance 작업 커밋 (2695900)
- [x] 베이스라인 측정 — 725 pass
- [x] dev docs 생성

## 0단계 — 미추적 쓰레기 ignore
- [ ] `.gitignore` 에 스크래치·산출물 추가
- [ ] `docs/beginner-guide/img` 추적 중인 2장 `git rm --cached`
- [ ] `git status` 미추적 190여 개 → 한 자릿수 확인
- [ ] `npm test` 725 pass · `build-web.mjs` 파일 수 불변
- [ ] 커밋

## 1단계 — 죽은 스크래치 삭제
- [ ] `tools/cardnews/_dbg*.mjs` 10개
- [ ] 끊어진 스킬 심볼릭 링크 5개 + `skills-lock.json` 정합
- [ ] 검증 · 커밋

## 2단계 — 배포 밖 디렉토리 구조화
- [ ] `sql/` 32개 평면 → 목적별
- [ ] `dev/active` 완료 태스크 → `dev/archive/`
- [ ] `docs/` 주제별
- [ ] 검증 · 커밋
