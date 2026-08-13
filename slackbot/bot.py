# =============================================================
#  calm forest · Claude Agent 슬랙봇
#  ------------------------------------------------------------
#  Slack 멘션/DM → Claude Agent SDK(Claude Code 하네스) → 스레드 답장.
#
#  ▶ 구조: Socket Mode 라 인바운드 포트가 필요 없다(웹훅 URL 없음).
#    MCP는 "귀"가 아니라 "손" — 멘션 수신은 Bolt 가, 도구 사용은 Agent 가.
#  ▶ 세션: 슬랙 스레드 = Claude 세션. 같은 스레드에서 다시 부르면
#    이전 대화를 resume 해 문맥이 이어진다(메모리 맵, 재시작 시 초기화).
#  ▶ 안전: ALLOWED_SLACK_USER_IDS 로 사용자를 제한(봇은 VM 셸을 쓸 수
#    있으므로 반드시 본인 ID만). max_turns/예산 상한으로 폭주 방지.
# =============================================================
from __future__ import annotations

import asyncio
import dataclasses
import logging
import os
import re
from pathlib import Path

from claude_agent_sdk import (
    AssistantMessage,
    ClaudeAgentOptions,
    ResultMessage,
    query,
)
from dotenv import load_dotenv
from slack_bolt.adapter.socket_mode.async_handler import AsyncSocketModeHandler
from slack_bolt.async_app import AsyncApp

# 레포 루트 .env 재사용(SLACK_*, ANTHROPIC_API_KEY) — 한 곳 관리
REPO_ROOT = Path(__file__).resolve().parents[1]
load_dotenv(REPO_ROOT / ".env")

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("calm-slackbot")

app = AsyncApp(token=os.environ["SLACK_BOT_TOKEN"])

# 스레드(thread_ts) → Claude 세션 ID. 같은 스레드는 대화가 이어진다.
_sessions: dict[str, str] = {}
# 2 vCPU VM 보호 — Claude 세션 동시 실행 상한
_gate = asyncio.Semaphore(int(os.environ.get("BOT_MAX_CONCURRENCY", "2")))

SYSTEM_PROMPT = """너는 Slack에서 호출되는 개인 어시스턴트다. 작업 디렉터리는 calm_forest 레포
(Three.js 힐링 게임 + ml/ 파이썬 분석 환경)이며, 파일을 읽고 명령을 실행해 실제 근거로 답한다.

- 한국어로, Slack 메시지답게 간결하게 답한다. 핵심 답부터, 부연은 그 뒤에.
- 서식은 Slack mrkdwn 을 쓴다: *굵게*, _기울임_, `코드`, ```코드블록```. (**별표 두 개**는 쓰지 않는다)
- 데이터 질문(D1, DAU 등)은 ml/ 프로젝트를 활용한다: `cd ml && uv run python -c "..."` 로
  calm_ml.db 헬퍼를 호출하면 Supabase 를 직접 조회할 수 있다.
- 파일 수정·커밋·푸시 같은 변경 작업은 명시적으로 요청받았을 때만 한다.
- 오래 걸릴 일은 지금 확인 가능한 만큼만 하고, 무엇이 더 필요한지 말한다."""


def _build_options(session_id: str | None) -> ClaudeAgentOptions:
    """설치된 SDK 버전에 없는 옵션은 조용히 떨궈서(하위호환) 봇이 죽지 않게 한다."""
    wanted: dict[str, object] = {
        "system_prompt": SYSTEM_PROMPT,
        "cwd": os.environ.get("CLAUDE_CWD", str(REPO_ROOT)),
        "allowed_tools": ["Read", "Grep", "Glob", "Bash", "WebSearch", "WebFetch"],
        "permission_mode": "bypassPermissions",   # 헤드리스 — 승인 프롬프트 없이 진행
        "max_turns": int(os.environ.get("BOT_MAX_TURNS", "25")),
        "max_budget_usd": float(os.environ.get("BOT_MAX_BUDGET_USD", "2.0")),
    }
    if session_id:
        wanted["resume"] = session_id
    fields = {f.name for f in dataclasses.fields(ClaudeAgentOptions)}
    return ClaudeAgentOptions(**{k: v for k, v in wanted.items() if k in fields})


async def _run_claude(prompt: str, thread_key: str) -> tuple[str, float | None]:
    """Agent 세션 1회 실행 → (답변 텍스트, 비용 USD)."""
    texts: list[str] = []
    cost: float | None = None
    async for message in query(prompt=prompt, options=_build_options(_sessions.get(thread_key))):
        if isinstance(message, AssistantMessage):
            for block in message.content:
                text = getattr(block, "text", None)
                if text:
                    texts.append(text)
        elif isinstance(message, ResultMessage):
            if message.session_id:
                _sessions[thread_key] = message.session_id   # 스레드 문맥 이어가기용
            cost = getattr(message, "total_cost_usd", None)
            if getattr(message, "result", None):
                texts = [message.result]                     # 최종 요약이 있으면 그걸 우선
    return ("\n".join(texts).strip() or "(응답이 비어 있어요 — 다시 시도해주세요)", cost)


def _chunks(text: str, size: int = 3500) -> list[str]:
    """Slack 메시지 길이 제한 대응 — 줄 단위로 끊어서 나눈다."""
    out, buf = [], ""
    for line in text.splitlines(keepends=True):
        if len(buf) + len(line) > size:
            out.append(buf)
            buf = ""
        buf += line
    if buf:
        out.append(buf)
    return out or [text]


def _allowed(user_id: str | None) -> bool:
    allow = os.environ.get("ALLOWED_SLACK_USER_IDS", "").strip()
    if not allow:
        return True   # 미설정 = 전체 허용(개인 워크스페이스 가정) — README 보안 절 참고
    return user_id in {u.strip() for u in allow.split(",")}


async def _handle(event: dict, client) -> None:
    user, channel = event.get("user"), event["channel"]
    ts = event["ts"]
    thread_ts = event.get("thread_ts") or ts
    if not _allowed(user):
        log.warning("차단된 사용자 호출: %s", user)
        return
    # 멘션 태그(<@U123>) 제거 → 순수 요청 텍스트
    prompt = re.sub(r"<@[^>]+>", "", event.get("text", "")).strip()
    if not prompt:
        await client.chat_postMessage(channel=channel, thread_ts=thread_ts,
                                      text="무엇을 도와드릴까요? 예: `D1 리텐션 뽑아줘`")
        return

    await client.reactions_add(channel=channel, timestamp=ts, name="eyes")
    try:
        async with _gate:
            answer, cost = await _run_claude(prompt, f"{channel}:{thread_ts}")
        footer = f"\n\n_💸 ${cost:.4f}_" if cost is not None else ""
        parts = _chunks(answer)
        for i, part in enumerate(parts):
            tail = footer if i == len(parts) - 1 else ""
            await client.chat_postMessage(channel=channel, thread_ts=thread_ts, text=part + tail)
        await client.reactions_add(channel=channel, timestamp=ts, name="white_check_mark")
    except Exception as e:  # 봇은 죽지 않는다 — 에러도 스레드로
        log.exception("Claude 세션 실패")
        await client.chat_postMessage(channel=channel, thread_ts=thread_ts,
                                      text=f"⚠️ 처리 중 오류가 났어요: `{e}`")
    finally:
        try:
            await client.reactions_remove(channel=channel, timestamp=ts, name="eyes")
        except Exception:
            pass


@app.event("app_mention")
async def on_mention(event, client):
    await _handle(event, client)


@app.event("message")
async def on_dm(event, client):
    # DM 만 처리(채널 일반 메시지는 멘션으로만). 봇 자신·수정 이벤트는 무시
    if event.get("channel_type") == "im" and not event.get("bot_id") and not event.get("subtype"):
        await _handle(event, client)


async def main() -> None:
    handler = AsyncSocketModeHandler(app, os.environ["SLACK_APP_TOKEN"])
    log.info("calm-slackbot 시작 (Socket Mode)")
    await handler.start_async()


if __name__ == "__main__":
    asyncio.run(main())
