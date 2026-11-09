# Context

Last Updated: 2026-11-09

## 파일 (scripts/lib/wiki/)
- guides.mjs: categoryGuide(catId, entries) / entryGuide(entry, all, backlinks) / buildBacklinks(content, index) 조합부
- guides-text.mjs: 직접 쓴 CAT_GUIDES, ROUTINES, MISTAKES, HOME_GUIDE, CAT_BLURB
- guides-data.mjs: 문서별 데이터 문단(entryExtra) + 헬퍼(fact, lnk, josa 연동, rankText, condText)
- guides-cat-data.mjs: 분류 대문 데이터 절(overview, 조건별, 수치 비교)
- guides-faq.mjs: 분류 대문 자주 묻는 질문
- guides-tips.mjs: 항목별 직접 쓴 팁(ENTRY_TIPS), 요리 미니게임 단계(RECIPE_STEPS)
- render.mjs: renderCat/renderDoc/renderHome 에서 위 모듈 호출, build.mjs 가 ctx.backlinks 전달
- load-data.mjs: river 의 강 조개·달빛 물고기 보상이 비어 있던 버그 보강, ore 수정에 '깊이' fact 추가
- 테스트: tests/wiki-guides.test.mjs (분량·링크·조사·중복·명칭), tests/wiki.test.mjs

## 결정
- 문장 안 링크는 [[cat/id]] 표기 후 renderInline 으로 렌더. 링크 뒤 조사는 josa 헬퍼, 링크 목록 뒤에는 '등'을 끼워 조사 문제를 피한다.
- 🪙 뒤에는 '으로/이다' 로 읽히게 쓴다(코인).
- 본문 md 의 기존 오타(군고구마이나 등)는 건드리지 않았다.

## 측정 (2026-11-09 빌드 기준)
- 렌더된 가시 텍스트: 개별 문서 667~1215자(평균 854), 분류 대문 1321~2205자, 대문 948자. 코덱스 이전 개별 문서는 약 270자.

## 남은 일
- 사용자 확인 후 커밋·배포(Cloudflare 웹). 배포 전 위키 외 미커밋 변경 분리 필요.
- 구글 서치콘솔/애드센스 재검토 요청은 사용자 몫.
- 위키 외 테스트 3건 실패는 다른 작업 중 변경에서 온 것: event-taxonomy 에 house_guide_* 4개 행 누락, game.js 컷신 입력 테스트 2건.
