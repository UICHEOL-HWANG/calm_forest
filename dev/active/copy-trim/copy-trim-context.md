# copy-trim context
Last Updated: 2026-10-25 (구현·검증 완료, 리뷰 대기)

- 워크트리 ~/calm_forest-copy-trim, 브랜치 feat/copy-trim (origin/main 97b2541e 기준)
- 토스트: index.html ui.toast(msg) → #toast.panel. 영어는 MutationObserver 가 텍스트 노드 단위로 번역 → 쪼개기 전에 t() 로 통째 번역해야 키가 맞는다
- 카드: showHintModal body={tiles} 를 받아 hint 모달 안에서 칸 카드로(firstHint 재시도·체인 그대로 활용)
- 출석 카드(js/daily-card.js)의 dc-* 스타일 재사용
- 새 코드 주석 금지, 문구 엠대시 금지
