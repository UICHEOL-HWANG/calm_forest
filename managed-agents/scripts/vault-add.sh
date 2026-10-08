#!/bin/bash
# Usage: scripts/vault-add.sh supabase|slack
# Reads the secret from macOS Keychain (asks once via a hidden dialog if missing),
# then registers it as a credential in the calm forest Managed Agents vault.
# The secret is never printed or written to disk.
set -euo pipefail

VAULT_ID="vlt_011CfovbWZuvijWmFmHCijWh"
KIND="${1:?usage: vault-add.sh supabase|slack}"

case "$KIND" in
  supabase)
    SERVICE="calmforest-supabase-pat-cma"
    PROMPT="Supabase 개인 액세스 토큰(sbp_...)을 붙여 넣으세요. 맥 키체인에 저장되고 Claude 볼트에 등록됩니다."
    ;;
  slack)
    SERVICE="calmforest-slack-bot-kpi"
    PROMPT="Slack Bot User OAuth Token(xoxb-...)을 붙여 넣으세요. 맥 키체인에 저장되고 Claude 볼트에 등록됩니다."
    ;;
  *) echo "unknown kind: $KIND" >&2; exit 2 ;;
esac

if ! CMA_SECRET="$(security find-generic-password -s "$SERVICE" -w 2>/dev/null)"; then
  CMA_SECRET="$(osascript -e "text returned of (display dialog \"$PROMPT\" default answer \"\" with hidden answer with title \"calm forest · Managed Agents\" giving up after 600)")"
  CMA_SECRET="$(printf '%s' "$CMA_SECRET" | tr -d '[:space:]')"
  [ -n "$CMA_SECRET" ] || { echo "empty input, nothing saved" >&2; exit 1; }
  security add-generic-password -U -s "$SERVICE" -a calmforest -w "$CMA_SECRET"
  echo "saved to Keychain: $SERVICE"
else
  echo "found in Keychain: $SERVICE"
fi
export CMA_SECRET

case "$KIND" in
  supabase) jq -n '{
    display_name: "Supabase MCP (read-only, calm forest)",
    auth: {type: "static_bearer",
      mcp_server_url: "https://mcp.supabase.com/mcp?project_ref=zuyxgjfihxtfdpolljzw&read_only=true&features=database",
      token: env.CMA_SECRET}}' ;;
  slack) jq -n '{
    display_name: "Slack bot (calm forest KPI)",
    auth: {type: "environment_variable", secret_name: "SLACK_BOT_TOKEN", secret_value: env.CMA_SECRET,
      networking: {type: "limited", allowed_hosts: ["slack.com"]},
      injection_location: {header: true}}}' ;;
esac | ant beta:vaults:credentials create --vault-id "$VAULT_ID" --transform '{id,display_name}'
unset CMA_SECRET
