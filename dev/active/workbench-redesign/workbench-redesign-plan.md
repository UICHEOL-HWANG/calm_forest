# 작업대 리디자인 + 첫 방문 음영 안내 · 계획

## 목표
작업대 창(#cook-menu)을 상점 팔기 탭과 같은 결(칸 그리드 + 고른 칸 상세 + 가운데 닫기)로 바꾸고,
처음 여는 사람에게 음영 스포트라이트로 탭·칸·만들기·별 강화·조각을 차례로 짚어 준다.

## 확정 (2026-11-11, 사용자)
- 배치 B안: 넓은 화면(가로 700px 이상, PC·가로 폰)은 오른쪽 상세 패널, 세로 폰은 아래 패널.
- 안내 문구 후보 1 (5단계). 넓은 화면은 ②의 "아래에"를 "오른쪽에"로.
- 시안: sims/workbench-redesign-compare.html

## 단계
1. 순수 뷰 모델 js/workbench/bench-view.js (탭별 칸 목록·상세·버튼 상태) + 테스트
2. 안내 단계 js/onboarding/bench-steps.js + 테스트
3. DOM 렌더 js/workbench/bench-ui.js, index.html 렌더 함수 교체, CSS
4. 첫 열림에 안내 실행(hintSeen 'spotBench'), 탭 강제 도구 → 끝나면 원래 탭
5. i18n-en 문구, 실게임 PC·세로·가로 캡처, 리뷰, 로컬 커밋
