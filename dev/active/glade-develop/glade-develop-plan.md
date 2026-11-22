# 반딧불이 계곡 디벨롭 · plan

승인된 설계: `docs/superpowers/specs/2026-11-22-glade-develop-design.md` (사용자 "이대로 설계진행", 조형 "s2 F3")
구현 계획 전문: `docs/superpowers/plans/2026-11-22-glade-develop.md` (태스크 0~9, 구현 착수는 사용자 승인 대기)

## 태스크 요약
0. 준비(의존성 링크, 기준 테스트, 문서·시안 커밋)
1. 밤 종류 규칙 `js/glade/night.js`
2. 줄등 진행 규칙 `js/glade/string.js`
3. 줄등 걸 곳 배치 `js/glade/string-layout.js`
4. 무리 규칙 `js/glade/swarm.js`
5. 문구·영어·배지 `js/glade/copy.js`, `js/i18n-en.js`, `js/data/dex.js`
6. 오늘 밤의 빛 연결 `js/spaces/glade.js`
7. 병등 줄 조형과 연결 `js/glade/string-art.js`
8. 무리 조형과 연결 `js/glade/swarm-art.js`
9. 전체 확인(테스트, 영어, 옛 세이브, 코드 리뷰, 기록)

## 검증 상태
- 태스크 1~4 의 코드와 테스트는 계획서에서 꺼내 임시 폴더에서 돌려 28개 통과를 확인했다(2026-11-22)
- 태스크 5~8 의 코드는 실행해 보지 않았다

## 병합·배포
사용자 승인 뒤. 새 값이 전부 `hintsSeen` 안이라 5곳 동시 배포 제약은 없을 것으로 본다(태스크 9 에서 옛 세이브로 확인)
