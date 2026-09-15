#!/bin/bash
# =============================================================
#  calm forest · 📰 카드뉴스 소재 수집 — 매일 실행 (launchd)
#  ------------------------------------------------------------
#  ~/Library/LaunchAgents/cloud.calmforest.topics.plist 가 부른다.
#  손으로 돌릴 때도 같은 스크립트를 쓴다: bash tools/cardnews/cron-topics.sh
#
#  ⚠️ 왜 aside 루틴이 아니라 launchd 인가:
#     aside 루틴 안에서 node 를 돌리면 그 node 가 다시 aside 를 부르는 꼴이 된다.
#     그 경로에서 세 겹이 막혔다 — (1) PATH 에 aside 없음 (2) HOME 이 샌드박스
#     홈으로 잡힘 (3) .app 내부 바이너리를 직접 부르면 네이티브 모듈을 못 찾음.
#     launchd 는 사람이 쓰는 셸과 같은 환경이라 이미 검증된 경로 그대로 돈다.
# =============================================================
set -uo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
LOG="$HOME/Library/Logs/calmforest-topics.log"
OUT="$(mktemp -t cardnews-topics)"

mkdir -p "$(dirname "$LOG")"
echo "=== $(date '+%Y-%m-%d %H:%M:%S') 소재 수집 시작 ===" >> "$LOG"

cd "$HERE" || { echo "cd 실패: $HERE" >> "$LOG"; exit 1; }

# ⚠️ launchd 의 PATH 는 최소한이다. node 와 aside 를 명시적으로 얹는다.
export PATH="$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"
if ! command -v node >/dev/null; then
  # nvm 으로 깔았으면 PATH 에 없다 — 가장 최근 버전을 찾아 얹는다
  NVM_NODE="$(ls -d "$HOME"/.nvm/versions/node/*/bin 2>/dev/null | tail -1)"
  [ -n "$NVM_NODE" ] && export PATH="$NVM_NODE:$PATH"
fi

if ! command -v node >/dev/null; then
  echo "node 를 못 찾았다 (PATH=$PATH)" >> "$LOG"
  exit 1
fi

# ── 수집 ─────────────────────────────────────────────────────
if node topics.mjs --top 5 > "$OUT" 2>&1; then
  STATUS="성공"
else
  STATUS="실패"
fi
cat "$OUT" >> "$LOG"

# ── 메일 ─────────────────────────────────────────────────────
#  aside 에이전트에게 발송을 맡긴다(Gmail 스킬). 여기선 aside 가 정상 동작한다 —
#  자기 자신을 자식으로 부르는 구조가 아니기 때문이다.
BODY="$(cat "$OUT")"
SUBJECT="오늘의 카드뉴스 소재"
[ "$STATUS" = "실패" ] && SUBJECT="⚠️ 카드뉴스 소재 수집 실패"

aside "cheorish.hw@gmail.com 으로 메일을 보내줘. 제목은 '$SUBJECT'. 본문은 아래 내용을 그대로(형식 유지) 넣어줘. 다른 말은 덧붙이지 말고 메일만 보내.

$BODY" >> "$LOG" 2>&1

echo "=== $(date '+%H:%M:%S') $STATUS · 메일 발송 시도 완료 ===" >> "$LOG"
rm -f "$OUT"
