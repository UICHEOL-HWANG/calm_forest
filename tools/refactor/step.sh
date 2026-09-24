#!/usr/bin/env bash
# =============================================================
#  🧪 구역 하나 옮기기 — 추출 → 정적 증명 → 테스트 → 스모크 2회 → 비교 → 커밋
#  ------------------------------------------------------------
#  사용: tools/refactor/step.sh <이름> "<시작 머리말>" "<끝 머리말>" <기준커밋> <후보 서버 포트> <기준 라벨 접두어>
#        (후보 서버 = 이 워크트리를 serve.py 로 띄운 포트 · 기준 = 원본 스냅샷을 같은 조건으로 잰 라벨)
#  하나라도 실패하면 **커밋하지 않고** 멈춘다 — 워크트리에 결과가 남아 원인을 볼 수 있다.
# =============================================================
set -euo pipefail
cd "$(dirname "$0")/../.."
NAME="$1"; START="$2"; END="$3"; BASE="$4"; PORT="$5"; BPFX="$6"
LOG="${TMPDIR:-/tmp}/step-$NAME-test.log"

node tools/refactor/extract-module.mjs "$NAME" "$START" "$END"
node tools/refactor/verify-extract.mjs "$BASE"
npm test > "$LOG" 2>&1 || true
grep -E "^# (pass|fail)" "$LOG"
grep -q "^# fail 0" "$LOG" || { echo "❌ 테스트 실패 — 멈춤 ($LOG)"; grep "^not ok" "$LOG" | head; exit 1; }
node tools/refactor/smoke.mjs "k-$NAME-1" "$PORT" 9591 > /dev/null 2>&1 &
P1=$!
node tools/refactor/smoke.mjs "k-$NAME-2" "$PORT" 9592 > /dev/null 2>&1 &
P2=$!
wait $P1 $P2
node tools/refactor/smoke-multi.mjs "$BPFX" "k-$NAME-1" "k-$NAME-2"
TITLE=$(sed -n 2p "js/spaces/$NAME.js" | sed 's#^//  ##')
git add -A js tests
git commit -q -m "refactor: 📦 ${TITLE%% —*} → js/spaces/$NAME.js

원문 이동 + game.js 에 남은 let 쓰기만 \$w 세터 — verify-extract (a~h) 통과 · npm test 통과 ·
스모크 2회: 원본 기준($BPFX*) 고정값과 동일(tools/refactor/step.sh)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git log --oneline -1
