#!/usr/bin/env bash
# mint-and-start.sh
# Prompt for secret → role → TTL, mint JWT, copy to clipboard, start backend.

set -euo pipefail

BACKEND_DIR="${BACKEND_DIR:-backend}"
DEFAULT_TTL="${DEFAULT_TTL:-1h}"
DEBUG="${DEBUG:-0}"
KEEP_OPEN_ON_ERROR="${KEEP_OPEN_ON_ERROR:-1}"

# Ensure Windows system tools are on PATH (for desktop shortcut via Git Bash)
if [[ -d "/c/Windows/System32" ]]; then
  export PATH="/c/Windows/System32:$PATH"
fi

log()   { echo "• $*"; }
ok()    { echo "✅ $*"; }
warn()  { echo "⚠️  $*"; }
die()   { echo "❌ $*"; [[ "$KEEP_OPEN_ON_ERROR" == "1" ]] && read -rp "Press Enter to close... " </dev/tty; exit 1; }

# ---------- Helpers ----------
select_role() {
  while true; do
    # Print menu to STDERR so it appears before read prompts (fixes Git Bash/shortcut buffering)
    cat >&2 <<'MENU'
Select a role:
  1) owner
  2) admin
  3) guest
  4) user
  5) contributor
MENU
    printf "Enter choice [1-5]: " >&2
    read -r choice
    case "$choice" in
      1) echo "owner"; return 0 ;;
      2) echo "admin"; return 0 ;;
      3) echo "guest"; return 0 ;;
      4) echo "user"; return 0 ;;
      5) echo "contributor"; return 0 ;;
      *) echo "Invalid selection. Please try again." >&2 ;;
    esac
  done
}

# Parse tokens like 2h, 30m, 45s, 1d (can be chained: "1h30m", "2d 4h", etc.)
parse_ttl_to_seconds() {
  local raw="${1,,}"  # lowercase
  local rest="$raw"
  local total=0

  # strip commas; collapse whitespace
  rest="${rest//,/ }"
  rest="$(echo "$rest" | tr -s '[:space:]' ' ')"

  # consume <num><unit> pairs greedily
  while [[ "$rest" =~ ^[[:space:]]*([0-9]+)[[:space:]]*([smhd])[[:space:]]*(.*)$ ]]; do
    local num="${BASH_REMATCH[1]}"
    local unit="${BASH_REMATCH[2]}"
    rest="${BASH_REMATCH[3]}"

    case "$unit" in
      s) (( total += num )) ;;
      m) (( total += num * 60 )) ;;
      h) (( total += num * 3600 )) ;;
      d) (( total += num * 86400 )) ;;
      *)  return 1 ;;
    esac
  done

  # after consuming tokens, leftover must be whitespace only
  if [[ -n "$(echo "$rest" | tr -d '[:space:]')" ]]; then
    return 1
  fi

  (( total > 0 )) || return 1

  echo "$total"
  return 0
}

pretty_from_seconds() {
  local s="$1"
  local d=$(( s / 86400 )); s=$(( s % 86400 ))
  local h=$(( s / 3600 ));  s=$(( s % 3600 ))
  local m=$(( s / 60 ));    s=$(( s % 60 ))
  local out=()
  (( d > 0 )) && out+=("${d}d")
  (( h > 0 )) && out+=("${h}h")
  (( m > 0 )) && out+=("${m}m")
  (( s > 0 )) && out+=("${s}s")
  ((${#out[@]}==0)) && out=("0s")
  printf "%s " "${out[@]}"
}

# ---------- Inputs ----------
# Secret (always visible)
SECRET="${JWT_SECRET:-}"
if [[ -z "$SECRET" ]]; then
  printf "Enter JWT secret: " >&2
  read -r SECRET
fi
export JWT_SECRET="$SECRET"

# Role (single) — show menu BEFORE input
ROLES="${ROLES:-}"
if [[ -z "$ROLES" ]]; then
  ROLES="$(select_role)"
fi

# TTL with parsing/validation
TTL_RAW="${TTL:-}"
if [[ -z "$TTL_RAW" ]]; then
  printf "TTL [%s] (units s/m/h/d, e.g., 45m or 1h30m): " "$DEFAULT_TTL" >&2
  read -r TTL_RAW
  TTL_RAW="${TTL_RAW:-$DEFAULT_TTL}"
fi

TTL_SECS="$(parse_ttl_to_seconds "$TTL_RAW" 2>/dev/null || true)"
if [[ -z "$TTL_SECS" ]]; then
  while true; do
    echo "TTL must be one or more <number><unit> tokens (units: s,m,h,d). Examples: 45m | 1h30m | 2d 4h" >&2
    printf "Enter TTL: " >&2
    read -r TTL_RAW
    TTL_SECS="$(parse_ttl_to_seconds "$TTL_RAW" 2>/dev/null || true)"
    [[ -n "$TTL_SECS" ]] && break
  done
fi
TTL_CANON="${TTL_SECS}s"
log "Resolved TTL: $(pretty_from_seconds "$TTL_SECS")(${TTL_CANON})"

# ---------- Mint (capture ALL output) ----------
log "Minting JWT (role=$ROLES)..."
RAW_OUTPUT="$(npm run mint --prefix "$BACKEND_DIR" -- \
  --secret "$JWT_SECRET" \
  --roles "$ROLES" \
  --ttl "$TTL_CANON" \
  2>&1 || true
)"
RAW_OUTPUT="$(printf '%s' "$RAW_OUTPUT" | tr -d '\r')"

if [[ "$DEBUG" == "1" ]]; then
  echo "----- mint raw output -----"
  echo "$RAW_OUTPUT"
  echo "---------------------------"
fi

# Extract token (JSON → regex → last non-empty)
TOKEN="$(printf '%s' "$RAW_OUTPUT" | awk '
  BEGIN { token="" }
  /"token"[[:space:]]*:/        { gsub(/.*"token"[[:space:]]*:[[:space:]]*"?/, "", $0); gsub(/"[,}].*/, "", $0); token=$0 }
  /"access_token"[[:space:]]*:/ { gsub(/.*"access_token"[[:space:]]*:[[:space:]]*"?/, "", $0); gsub(/"[,}].*/, "", $0); token=$0 }
  END { print token }
')"
if [[ -z "$TOKEN" ]]; then
  TOKEN="$(printf '%s' "$RAW_OUTPUT" | grep -oE '[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}' | tail -n 1 || true)"
fi
if [[ -z "$TOKEN" ]]; then
  TOKEN="$(printf '%s' "$RAW_OUTPUT" | awk 'NF{last=$0} END{print last}')"
fi
[[ "$TOKEN" == *.*.* ]] || die "Mint step did not yield a JWT. Re-run with DEBUG=1 to inspect output."

# ---------- Save & clipboard ----------
echo -n "$TOKEN" > "$BACKEND_DIR/.last_token"

copy_to_clipboard() {
  if command -v clip.exe >/dev/null 2>&1; then
    printf %s "$TOKEN" | clip.exe && { ok "Copied via clip.exe"; return 0; }
  fi
  if command -v powershell.exe >/dev/null 2>&1; then
    printf %s "$TOKEN" | powershell.exe -NoProfile -Command \
      "Set-Clipboard -Value ([Console]::In.ReadToEnd())" \
      && { ok "Copied via PowerShell"; return 0; }
  fi
  if command -v pbcopy >/dev/null 2>&1; then
    printf %s "$TOKEN" | pbcopy && { ok "Copied via pbcopy"; return 0; }
  fi
  if command -v xclip >/dev/null 2>&1; then
    printf %s "$TOKEN" | xclip -selection clipboard && { ok "Copied via xclip"; return 0; }
  fi
  if command -v xsel >/dev/null 2>&1; then
    printf %s "$TOKEN" | xsel --clipboard --input && { ok "Copied via xsel"; return 0; }
  fi
  return 1
}

if copy_to_clipboard; then
  ok "JWT minted and copied to clipboard."
else
  warn "Couldn't copy to clipboard. Token saved at $BACKEND_DIR/.last_token"
fi

echo "Token fingerprint: $(echo "$TOKEN" | cut -c1-10)...$(echo "$TOKEN" | rev | cut -c1-10 | rev)"

# ---------- Start backend ----------
log "Starting backend..."
npm run start --prefix "$BACKEND_DIR"
