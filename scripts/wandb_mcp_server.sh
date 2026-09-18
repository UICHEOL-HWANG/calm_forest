#!/bin/zsh
set -euo pipefail

# Keep the W&B credential out of ~/.codex/config.toml. Only this one value is
# loaded from the project .env; other project secrets are not exported.
env_file="/Users/uicheol_hwang/calm_forest/.env"
key_line=$(/usr/bin/grep -m 1 '^WANDB_API_KEY=' "$env_file" || true)
wandb_key="${key_line#WANDB_API_KEY=}"
wandb_key="${wandb_key#\"}"
wandb_key="${wandb_key%\"}"
wandb_key="${wandb_key#\'}"
wandb_key="${wandb_key%\'}"

if [[ -z "$wandb_key" || "$wandb_key" == "$key_line" ]]; then
  print -u2 "WANDB_API_KEY is missing from $env_file"
  exit 1
fi

export WANDB_API_KEY="$wandb_key"
unset wandb_key key_line

# Pin the reviewed official W&B MCP source for reproducible startup.
exec /Users/uicheol_hwang/.local/bin/uvx \
  --from 'git+https://github.com/wandb/wandb-mcp-server@53b199a5f4af29aa82077e2c7f1e2c5e5e0c2ca0' \
  --with 'mcp<2' \
  wandb_mcp_server "$@"
