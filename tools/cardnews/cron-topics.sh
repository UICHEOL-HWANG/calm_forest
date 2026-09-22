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

# 준비 과정(PATH·네트워크·Aside·락)은 cron-reel.sh 와 같은 것을 쓴다
source "$HERE/cron-lib.sh"

mkdir -p "$(dirname "$LOG")"
echo "=== $(date '+%Y-%m-%d %H:%M:%S') 소재 수집 시작 ===" >> "$LOG"

cd "$HERE" || { echo "cd 실패: $HERE" >> "$LOG"; exit 1; }

# ── 하루 한 번 가드 ──────────────────────────────────────────
#  ⚠️ 시각 하나(StartCalendarInterval)만 믿으면 그 시각에 맥이 **꺼져 있는** 날은
#     그날치를 통째로 잃는다. 잠든 맥은 깨어나서 따라잡지만, 전원이 꺼진 동안
#     지나간 시각은 launchd 가 그냥 버린다 — 2026-09-15~22 일주일을 그렇게 잃었다
#     (runs=0, 로그 0줄. 그 주 부팅은 전부 10시 이후였다).
#     그래서 plist 에 RunAtLoad 를 켜 두고(부팅·로그인마다 깨어난다) 여기서
#     "오늘 이미 돌았나" 를 본다. 늦게 켜도 그날 안에 한 번은 돈다.
STAMP="$CF_STAMP_DIR/topics-last-run"
mkdir -p "$CF_STAMP_DIR"
TODAY="$(date '+%Y-%m-%d')"
if [ -f "$STAMP" ] && [ "$(cat "$STAMP")" = "$TODAY" ]; then
  echo "오늘 이미 돌았다 ($TODAY) — 건너뜀" >> "$LOG"
  rm -f "$OUT"; exit 0
fi

# 준비가 안 되면 스탬프를 찍지 않고 물러난다 — 다음 로그인 때 다시 시도한다
cf_prepare || { rm -f "$OUT"; exit 0; }

# 여기까지 왔으면 오늘치를 시작한다 — 중간에 죽어도 같은 날 두 번 돌지 않게 먼저 찍는다
echo "$TODAY" > "$STAMP"

# ── 수집 ─────────────────────────────────────────────────────
if node topics.mjs --top 5 > "$OUT" 2>&1; then
  STATUS="성공"
else
  STATUS="실패"
fi
cat "$OUT" >> "$LOG"

# ── 메일 ─────────────────────────────────────────────────────
BODY="$(cat "$OUT")"
SUBJECT="오늘의 카드뉴스 소재"
[ "$STATUS" = "실패" ] && SUBJECT="⚠️ 카드뉴스 소재 수집 실패"

if cf_send_mail "$SUBJECT" "$BODY"; then MAIL="발송 완료"; else MAIL="발송 실패"; fi

echo "=== $(date '+%H:%M:%S') 수집 $STATUS · 메일 $MAIL ===" >> "$LOG"
rm -f "$OUT"
