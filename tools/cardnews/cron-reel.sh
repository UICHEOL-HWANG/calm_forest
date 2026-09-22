#!/bin/bash
# =============================================================
#  calm forest · 🎬 쇼츠 생성 — 4일마다 실행 (launchd)
#  ------------------------------------------------------------
#  ~/Library/LaunchAgents/cloud.calmforest.reel.plist 가 부른다.
#  손으로: bash tools/cardnews/cron-reel.sh
#
#  하는 일: 발행 안 된 decks/reel-NN.json 을 하나 집어 만들고 메일로 알린다.
#  ⚠️ 발행은 하지 않는다. 사람이 영상을 보고 publish-reel.mjs --publish 를 친다.
#  ⚠️ 준비된 deck 이 없으면 만들 것도 없다(주제·프롬프트는 사람이 쓴다).
#
#  ⚠️ Flow 를 aside 로 모는 구조는 그대로다(flow.mjs → aside repl → Flow).
#     바뀐 건 "누가 시작하느냐"뿐이다. aside 루틴이 node 를 돌리면 그 node 가
#     다시 aside 를 못 찾는다 — 자세한 사정은 cron-topics.sh 주석 참고.
# =============================================================
set -uo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
LOG="$HOME/Library/Logs/calmforest-reel.log"
OUT="$(mktemp -t cardnews-reel)"

# 준비 과정(PATH·네트워크·Aside·락)은 cron-topics.sh 와 같은 것을 쓴다
source "$HERE/cron-lib.sh"

mkdir -p "$(dirname "$LOG")"
echo "=== $(date '+%Y-%m-%d %H:%M:%S') 쇼츠 생성 시작 ===" >> "$LOG"

cd "$HERE" || { echo "cd 실패: $HERE" >> "$LOG"; exit 1; }

# ── 4일 간격 판단 ────────────────────────────────────────────
#  ⚠️ launchd 는 "4일마다" 를 직접 표현하지 못한다(요일·일자 단위뿐).
#     StartInterval 은 맥이 꺼져 있으면 밀린다. 그래서 매일 깨어나서
#     "나흘 지났나" 를 여기서 판단한다 — cardnews-cron.js 와 같은 방식이다.
#     날짜식(*/4)을 쓰면 월말에 간격이 하루로 줄어든다.
EVERY_DAYS=4
STAMP="$CF_STAMP_DIR/reel-last-run"
mkdir -p "$CF_STAMP_DIR"
TODAY="$(date '+%Y-%m-%d')"
if [ -f "$STAMP" ]; then
  LAST="$(cat "$STAMP")"
  LAST_S="$(date -j -f '%Y-%m-%d' "$LAST" '+%s' 2>/dev/null || echo 0)"
  TODAY_S="$(date -j -f '%Y-%m-%d' "$TODAY" '+%s')"
  DIFF=$(( (TODAY_S - LAST_S) / 86400 ))
  if [ "$DIFF" -lt "$EVERY_DAYS" ]; then
    echo "마지막 실행 $LAST · ${DIFF}일 전 — ${EVERY_DAYS}일이 안 됐다. 건너뜀" >> "$LOG"
    rm -f "$OUT"; exit 0
  fi
fi

# 준비가 안 되면 스탬프를 찍지 않고 물러난다 — 다음 로그인 때 다시 시도한다.
# ⚠️ 스탬프를 준비 **뒤에** 찍는다. 앞에 찍으면 Aside 가 안 떠서 못 돈 날에도
#    "돌았다" 로 남아 나흘을 통째로 건너뛴다.
cf_prepare || { rm -f "$OUT"; exit 0; }

# 돌리기로 했으면 먼저 찍는다 — 중간에 죽어도 같은 날 또 돌지 않게
echo "$TODAY" > "$STAMP"

# ⚠️ 게임 녹화 컷이 있으면 로컬 서버가 떠 있어야 한다(record.mjs 가 localhost:8000 을 연다)
if ! curl -s -o /dev/null -m 3 "http://localhost:8000/index.html"; then
  echo "로컬 서버를 띄운다" >> "$LOG"
  (cd "$HERE/../.." && nohup python3 scripts/serve.py 8000 >/dev/null 2>&1 &)
  sleep 3
fi

if node reel-make.mjs --next > "$OUT" 2>&1; then
  if grep -q '준비된 쇼츠 deck 이 없다' "$OUT"; then
    SUBJECT="쇼츠: 준비된 deck 없음"
  else
    SUBJECT="🎬 쇼츠 완성 — 확인 후 발행"
  fi
else
  SUBJECT="⚠️ 쇼츠 생성 실패"
fi
cat "$OUT" >> "$LOG"

BODY="$(cat "$OUT")"
aside "cheorish.hw@gmail.com 으로 메일을 보내줘. 제목은 '$SUBJECT'. 본문은 아래 내용을 그대로 넣어줘. 다른 말은 덧붙이지 말고 메일만 보내.

$BODY" >> "$LOG" 2>&1

echo "=== $(date '+%H:%M:%S') $SUBJECT ===" >> "$LOG"
rm -f "$OUT"
