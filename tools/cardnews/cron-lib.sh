#!/bin/bash
# =============================================================
#  calm forest · 카드뉴스 크론 공통부
#  ------------------------------------------------------------
#  cron-topics.sh · cron-reel.sh 가 source 로 불러 쓴다.
#  ⚠️ 두 크론이 똑같은 준비 과정을 거친다. 복사본을 두면 한쪽만 고치는
#     사고가 나므로 여기 한 곳에만 둔다.
#
#  호출 규약: 부르기 전에 $LOG 를 정해 둘 것.
#            각 함수는 0=진행 가능, 1=오늘은 보류.
#            1 을 받으면 호출자는 **스탬프를 찍지 말고** 물러난다 —
#            그래야 다음 로그인 때 다시 시도한다.
# =============================================================

CF_STAMP_DIR="$HOME/Library/Application Support/calmforest"

cf_log() { echo "$*" >> "$LOG"; }

# ── PATH·node ────────────────────────────────────────────────
#  ⚠️ launchd 의 PATH 는 최소한이다(/usr/bin:/bin:/usr/sbin:/sbin).
#     node 와 aside 를 명시적으로 얹는다.
cf_fix_path() {
  export PATH="$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"
  if ! command -v node >/dev/null; then
    # nvm 으로 깔았으면 PATH 에 없다 — 가장 최근 버전을 찾아 얹는다
    local nvm_node
    nvm_node="$(ls -d "$HOME"/.nvm/versions/node/*/bin 2>/dev/null | tail -1)"
    [ -n "$nvm_node" ] && export PATH="$nvm_node:$PATH"
  fi
  command -v node >/dev/null || { cf_log "node 를 못 찾았다 (PATH=$PATH)"; return 1; }
  return 0
}

# ── 네트워크 ─────────────────────────────────────────────────
#  ⚠️ 부팅 직후에 깨어나면 Wi-Fi 가 아직 안 붙어 있다.
cf_wait_network() {
  local i
  for i in $(seq 1 24); do          # 최대 2분
    curl -s -o /dev/null -m 3 https://www.google.com/generate_204 && return 0
    sleep 5
  done
  cf_log "네트워크가 안 붙는다 — 오늘치 보류(다음 로그인 때 재시도)"
  return 1
}

# ── Aside 독점 ───────────────────────────────────────────────
#  ⚠️ topics 와 reel 은 RunAtLoad 때문에 로그인 시 **동시에** 깨어난다.
#     둘 다 같은 Aside 브라우저를 모니 겹치면 서로 탭을 빼앗는다.
#     mkdir 은 원자적이라 락으로 쓴다(macOS 에는 flock 이 없다).
cf_lock_aside() {
  local lock="$CF_STAMP_DIR/aside.lock" waited=0
  mkdir -p "$CF_STAMP_DIR"
  # 30분 넘게 남아 있는 락은 죽은 프로세스가 흘린 것으로 본다
  # (SIGKILL 로 죽으면 아래 trap 이 안 돌아 락이 남는다)
  if [ -d "$lock" ] && [ -z "$(find "$lock" -maxdepth 0 -mmin -30 2>/dev/null)" ]; then
    cf_log "오래된 락을 치운다"
    rmdir "$lock" 2>/dev/null
  fi
  while ! mkdir "$lock" 2>/dev/null; do
    waited=$((waited + 10))
    if [ "$waited" -ge 1800 ]; then
      cf_log "다른 크론이 Aside 를 30분 넘게 쓰고 있다 — 오늘치 보류"
      return 1
    fi
    sleep 10
  done
  trap "rmdir '$lock' 2>/dev/null" EXIT
  return 0
}

# ── Aside 준비 ───────────────────────────────────────────────
#  ⚠️ 수집도 발송도 Aside 앱이 떠 있어야 한다. 안 떠 있으면
#     "Aside isn't running on this machine" 으로 즉시 죽고, 발송마저 같은
#     이유로 죽어서 **실패 메일조차 오지 않는다**(조용한 실패).
#     2026-09-15~22 일주일이 이렇게 통째로 비었다.
#  ⚠️ 준비 판정에 console.log 만 쓰면 안 된다. 앱이 막 떴을 때 그건 통과하는데
#     정작 openTab 은 그대로 "isn't running" 으로 죽는다
#     (2026-09-22 실측: "준비됨" 을 찍고 바로 다음 줄에서 실패했다).
#     그래서 **실제로 탭을 여는** 호출로 잰다 — 본 작업과 같은 경로다.
CF_ASIDE_PROBE='const p = await openTab("about:blank"); console.log("ok")'
cf_ensure_aside() {
  aside repl "$CF_ASIDE_PROBE" >/dev/null 2>&1 && return 0
  cf_log "Aside 가 안 떠 있다 — 띄우고 기다린다"
  open -g -a /Applications/Aside.app || true
  local i
  for i in $(seq 1 30); do          # 최대 2분 30초
    sleep 5
    if aside repl "$CF_ASIDE_PROBE" >/dev/null 2>&1; then cf_log "Aside 준비됨"; return 0; fi
  done
  cf_log "Aside 가 끝내 안 뜬다 — 오늘치 보류(다음 로그인 때 재시도)"
  return 1
}

# ── 메일 발송 ────────────────────────────────────────────────
#  aside 에이전트에게 발송을 맡긴다(Gmail 스킬). 여기선 aside 가 정상 동작한다 —
#  자기 자신을 자식으로 부르는 구조가 아니기 때문이다.
#
#  ⚠️ exit code 를 **반드시** 본다. 안 보면 발송이 죽어도 로그엔 "성공" 이 남아
#     조용히 넘어간다(2026-09-22 실행에서도 중간에 Invalid parameters 가 났다.
#     그땐 aside 가 스스로 재시도해 겨우 보냈다).
#  ⚠️ 발송이 실패하면 **메일로는 알릴 수가 없다**. 화면 알림으로 띄운다 —
#     크론이 도는 시각은 사람이 맥 앞에 있는 시각이다.
cf_send_mail() {
  local subject="$1" body="$2"
  if aside "cheorish.hw@gmail.com 으로 메일을 보내줘. 제목은 '$subject'. 본문은 아래 내용을 그대로(형식 유지) 넣어줘. 다른 말은 덧붙이지 말고 메일만 보내.

$body" >> "$LOG" 2>&1; then
    cf_log "메일 발송 완료: $subject"
    return 0
  fi
  cf_log "⚠️ 메일 발송 실패: $subject"
  osascript -e "display notification \"$subject\" with title \"카드뉴스 크론\" subtitle \"메일 발송 실패 — 로그를 볼 것\"" >/dev/null 2>&1 || true
  return 1
}

# ── 준비 일괄 ────────────────────────────────────────────────
#  네트워크 → 락 → Aside 순서. 락을 Aside 보다 **먼저** 잡아야
#  둘이 동시에 앱을 띄우려 들지 않는다.
cf_prepare() {
  cf_fix_path     || return 1
  cf_wait_network || return 1
  cf_lock_aside   || return 1
  cf_ensure_aside || return 1
  return 0
}
