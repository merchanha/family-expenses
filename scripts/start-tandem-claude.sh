#!/usr/bin/env bash
# Start Claude Code for Tandem Expenses inside tmux (agent-team split panes).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SESSION="${TANDEM_TMUX_SESSION:-tandem}"

cd "$ROOT"

if ! command -v tmux >/dev/null 2>&1; then
  echo "tmux not found. Install with: brew install tmux"
  exit 1
fi

if ! command -v claude >/dev/null 2>&1; then
  echo "claude not found. Install Claude Code CLI first."
  exit 1
fi

if [[ -n "${TMUX:-}" ]]; then
  echo "Already inside tmux. Starting Claude Code…"
  exec claude --teammate-mode tmux "$@"
fi

if tmux has-session -t "$SESSION" 2>/dev/null; then
  echo "Attaching to existing tmux session: $SESSION"
  echo "Inside Claude, run: /tandem-phase P0"
  exec tmux attach -t "$SESSION"
fi

echo "Creating tmux session: $SESSION"
echo "After Claude starts, run: /tandem-phase P0"
exec tmux new-session -s "$SESSION" "claude --teammate-mode tmux $*"
