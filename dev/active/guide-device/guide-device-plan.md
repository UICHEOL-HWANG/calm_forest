# 안내서 PC·모바일 분리 + 10/18 이후 기능 반영 — 승인 2026-10-28

## 방식 (사용자 선택: 원본 하나, 기기별 자동 표시)
- guide/guide.html · guide-en.html 하나에 기기 전용 블록을 `data-dev="pc"` / `data-dev="touch"` 로 표시
- 게임 안: loadGuide 가 body.is-touch 로 `.gd.dev-touch` / `.gd.dev-pc` 를 붙인다 → guide.css 가 다른 쪽을 숨김
- 칩: 숨겨진 기기의 섹션은 칩에서 뺀다
- 공개 /guide/: 상단에 🖥️ PC · 📱 모바일 전환 탭, 기본값은 pointer:coarse
- 기기 전용 사진(폰 캡처)은 data-dev 로 감싸 숨긴다(lazy 라 안 받음)

## 내용
1. 기기 의존 문단 분리: 조작법·화면 읽기·도구 세트·튜토리얼·Space 표기·FAQ
2. 10/18 이후 기능: 바다터 갯벌·잠수·호미 가게, 나룻배 9척·급류, 시점 회전, 튜토리얼 1장 경로, 출석 카드, 우편함, 아이콘
3. 폰 캡처 추가(이미지 총량 한도 조정 필요 시 보고)
4. 영어판 동기화

## 검증
node --test tests/guide.test.mjs · 브라우저 패널에서 PC/폰 폭 렌더 · 공개 페이지 탭
