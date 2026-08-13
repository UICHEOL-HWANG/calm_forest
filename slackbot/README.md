# calm forest · slackbot — Claude Agent 슬랙봇

Slack에서 `@calm-claude`를 부르면 **Claude Agent SDK**(Claude Code 하네스)가
calm_forest 레포 안에서 파일을 읽고 명령을 실행해 답하는 개인 봇입니다.

```
Slack 멘션/DM
  → bot.py (Bolt · Socket Mode — 인바운드 포트 불필요)
    → Claude Agent SDK query()  ← Claude Code 하네스(Read/Bash/Grep/WebSearch…)
      → 레포 조회·ml/ 실행(Supabase 조회)·웹 검색
  → 스레드 답장 (같은 스레드 = 같은 세션, 문맥 유지)
```

- **MCP는 "손", Bolt는 "귀"** — 멘션 수신은 Slack 앱이 하고, 도구 사용은 에이전트가 합니다.
  MCP 서버를 붙이려면 `bot.py`의 `ClaudeAgentOptions`에 `mcp_servers={...}`를 추가하고
  `allowed_tools`에 `mcp__서버명__*`을 열어주면 됩니다.
- 인증은 **ANTHROPIC_API_KEY**(사용량 과금)입니다. Pro/Max 구독 로그인은 헤드리스
  서버에서 쓸 수 없고, 서비스에 구독 인증을 얹는 건 약관상 금지입니다.

## 설정 (.env — 레포 루트)

| 키 | 설명 |
|---|---|
| `SLACK_BOT_TOKEN` | `xoxb-…` (OAuth & Permissions) |
| `SLACK_APP_TOKEN` | `xapp-…` (Socket Mode용 App-Level Token, `connections:write`) |
| `ANTHROPIC_API_KEY` | platform.claude.com 발급 |
| `ALLOWED_SLACK_USER_IDS` | 허용 사용자 ID 콤마 목록(권장). Slack 프로필 → ⋯ → Copy member ID |
| `BOT_MAX_TURNS` / `BOT_MAX_BUDGET_USD` / `BOT_MAX_CONCURRENCY` | 폭주 방지 상한 (기본 25 / $2 / 2) |

## 로컬 테스트

```bash
cd slackbot
uv sync
uv run python bot.py     # Slack에서 @calm-claude 멘션 → 답장 확인
```

## 상시 실행

Socket Mode라 인터넷에서 접근 가능한 서버가 필요 없습니다 — 봇 프로세스가
살아있는 곳 어디서든(로컬 머신 포함) 동작합니다. 항상 켜두려면 서버·NAS 등
상시 구동 머신에서 `uv run python bot.py`를 프로세스 매니저로 감싸면 됩니다.

## 보안 주의

- 봇은 `permission_mode="bypassPermissions"`로 **VM 셸을 자유롭게** 씁니다.
  봇이 초대된 채널의 누구든 명령을 시킬 수 있으므로 **`ALLOWED_SLACK_USER_IDS`를
  반드시 본인 ID로 제한**하고, 봇은 개인 채널/DM에서만 쓰세요.
- 세션당 비용 상한(`BOT_MAX_BUDGET_USD`)이 있지만 API 키 자체의 지출 한도도
  platform.claude.com 에서 걸어두는 걸 권합니다.
- 스레드→세션 매핑은 메모리라 봇 재시작 시 문맥이 초기화됩니다(대화는 스레드에 남음).
