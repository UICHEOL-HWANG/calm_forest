# 저장소 정리 — 승인된 계획

**승인일** 2026-09-19 · **범위** 0~2단계 (3단계 배포에셋 재배치는 이번에 안 함)

## 지켜야 할 것
1. 게임 진행에 절대 방해 금지
2. 배포 밖 디렉토리를 단계별로 구조화
3. 홍보용 이미지·빌드 산출물은 ignore

## 안전 경계 — 이게 전부다
`scripts/build-web.mjs` 의 `INCLUDE` 가 배포 화이트리스트다. 여기 없으면 배포되지 않는다.

    배포됨: index.html · js/ · dashboards/ · beta/ · guide/ · auth-popup.html
            assets/{social,favicon,pwa}/ · sw.js · offline.html
            privacy.html · delete-account.html · _headers
    배포 안 됨: tools/ ml/ sql/ docs/ dev/ sims/ scripts/ infra/ functions/ android/

같은 파일 `FORBIDDEN` 이 `docs`·`scripts`·`functions`·`*.sql`·`*.md` 를 2차 차단한다.
→ **오른쪽은 자유롭게 옮겨도 게임 무해. 왼쪽은 이번에 건드리지 않는다.**

## 단계
- **0단계** 미추적 쓰레기 ignore. 파일 삭제 없음.
- **1단계** 죽은 스크래치 삭제 (`tools/cardnews/_dbg*.mjs` 등) + 끊어진 스킬 심볼릭 링크.
- **2단계** 배포 밖 디렉토리 구조화 (`sql/`·`dev/active`·`docs/`).

## 이번에 하지 않는 것 (별건)
- `js/` 패키지 재편 — 미참조 모듈이 0개라 이득은 미관뿐인데, index.html 상대 import 12개
  + 테스트 40개 + sw.js 캐시 + 토스/itch 번들 경로가 얽혀 리스크가 규칙 1을 깬다.
- `js/game.js` 15,024줄 / `index.html` 4,989줄 분할 — 정리가 아니라 리팩터 프로젝트.

## 검증 (매 단계)
    npm test                      # 베이스라인 725 pass
    node scripts/build-web.mjs    # dist 파일 수 불변 + 금지패턴 0
