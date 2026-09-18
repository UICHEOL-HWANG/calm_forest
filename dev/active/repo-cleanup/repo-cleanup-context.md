# 저장소 정리 — 컨텍스트

**Last Updated** 2026-09-19

## 베이스라인 (정리 시작 시점)
- 테스트 **725 pass / 0 fail**
- 추적 파일 514개 · `.git` 144MB
- `git status` 미추적 **190여 개** (docs 92 · ml 78 · 나머지)
- 브랜치 `codex/retention-guidance-rule-model`, main 대비 커밋 1개(2695900 리텐션 안내)

## 핵심 파일
| 파일 | 역할 |
|---|---|
| `scripts/build-web.mjs` | 배포 화이트리스트 `INCLUDE` + 방어선 `FORBIDDEN`. **정리의 안전 경계** |
| `.gitignore` | 0단계 대상 |
| `package.json` | `npm test` = `node --test tests/*.test.mjs` |

## 조사로 확정한 사실
- **`js/` 에 미참조 모듈 0개.** 45개 전부 어딘가에서 import 된다 → js 는 죽은 코드가 없다.
- **`guide/img` (45장) 는 배포 에셋이다.** `guide/guide.html` 이 상대경로 `img/*.jpg` 로
  참조하고 INCLUDE 에 `'guide'` 가 있다. **절대 ignore 금지** — 안내서 이미지가 깨진다.
- **`docs/beginner-guide/img` (94장 9.7M) 는 그 마스터 원본**이다. 이름은 같지만 md5 가
  다른 고해상도 원본이고 49장이 더 있다. `docs` 는 FORBIDDEN 이라 배포된 적이 없다.
  → ignore 해도 게임 무영향. 잃는 건 "사진을 다른 크기로 다시 뽑을 때의 원본"뿐. (사용자 승인)
- **`tools/cardnews/assets/story` (14장 9M) 는 산출물이 아니라 입력 소재**다.
  `rough-first-build.png`·`calm-mobile-old.png` 는 과거 빌드 화면이라 재촬영 불가 → 커밋한다.
- **`android/app/build` 33M 만 산출물**이고 `app/src`·`build.gradle`·`twa-manifest.json` 은 설정이다.
- `.claude/skills/` 의 심볼릭 링크 5개(game-feel·secrets-audit·threejs-*)는 대상이 사라진
  끊어진 링크다. `skills-lock.json` 은 아직 그 5개를 갖고 있어 디스크와 어긋나 있다.

## 함정
- ⚠️ `guide/` 와 `docs/beginner-guide/` 를 헷갈리지 말 것. 앞은 게임, 뒤는 문서.
- ⚠️ `ml/` 미추적 78개는 쓰레기가 아니라 분석 노트북·리포트 소스다. ignore 대상 아님.
- ⚠️ 워크트리 미커밋 유실 사고 이력 있음 — 단계마다 커밋하고 넘어간다.
