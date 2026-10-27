# Context — npc-dialog-unify
Last Updated: 2026-10-28 (구현·실측 완료, 리뷰 중)

- 워크트리: .claude/worktrees/npc-dialog-unify (feat/npc-dialog-unify, origin/main 01798276 기준)
- 의뢰창 렌더: index.html openNPCModal(~4245행), closeNpc(~5074)
- 잡담: index.html startTalk(~5199), CSS #chat-modal(~1188)
- 상인: index.html openMerchantModal(~4696), CSS .merchant-actions(~2305)
- 광부: js/delve/miner-talk.js → js/mirror/talk-box.js showTalk({face,color,name,line,next})
- 거울 주민: js/spaces/mirror.js openTalk → showTalk(color=invertColor)
- 주민 색: js/data/npcs.js NPCS[].color/hat (숫자 0xRRGGBB). 셰프·사공은 몸색이 거의 흰색 → hat 또는 기본색으로 대체
- 결정: 색 계산은 js/ui/npc-tone.js 한 곳(CSS 변수 --nc/--nt/--ni/--nd)
- 함정: 기존 카페 주문창이 .cf-name/.cf-btn/.cf-body 를 쓴다 → 새 대화창 클래스는 tk- 접두어
- 함정: 내장 브라우저 캡처가 한 프레임 늦다 → 등장 애니메이션 중 반투명으로 찍힘, 다시 찍어 확인
- 실측 서버: 미리보기 슬롯 5개가 다른 채팅에 점유 → scripts/serve.py 8859 직접 실행
