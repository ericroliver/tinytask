#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────────────────────────────────────
# TinyTask CLI Deploy Script
#
# Builds and deploys the tinytask CLI binary to all machines on the home network.
#
# Usage:
#   ./deploy-cli.sh           # Build + deploy to all reachable machines
#   ./deploy-cli.sh --build    # Build only, don't deploy
#   ./deploy-cli.sh --check    # Check current versions on all machines
#
# Prerequisites:
#   - SSH access to all machines (Tailscale network)
#   - Docker on blue-remote (for Linux build)
#   - nvm + Node 20 on m3x-remote (for macOS build)
#
# Machines:
#   Linux x86_64:  blue-remote, angstrom, spectre
#   macOS arm64:   m3x-remote, m1x-remote, lisao-remote
# ─────────────────────────────────────────────────────────────────────────────

# ── Config ────────────────────────────────────────────────────────────────────
REPO_URL="https://github.com/ericroliver/tinytask-mcp.git"
BRANCH="${BRANCH:-main}"
CLI_DIR="tinytask-cli"

# Machine lists
LINUX_MACHINES=("blue-remote.tail79f797.ts.net" "angstrom.tail79f797.ts.net" "spectre.tail79f797.ts.net")
MACOS_MACHINES=("m3x-remote.tail79f797.ts.net" "m1x-remote.tail79f797.ts.net" "lisao-remote.tail79f797.ts.net")

# Build machine: blue-remote builds Linux, m3x-remote builds macOS
LINUX_BUILD_HOST="blue-remote.tail79f797.ts.net"
MACOS_BUILD_HOST="m3x-remote.tail79f797.ts.net"

SSH_OPTS="-o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new"

# ── Helpers ──────────────────────────────────────────────────────────────────
log()  { echo -e "\033[0;34m▶\033[0m $*"; }
ok()   { echo -e "\033[0;32m✓\033[0m $*"; }
warn() { echo -e "\033[0;33m⚠\033[0m $*"; }
err()  { echo -e "\033[0;31m✗\033[0m $*" >&2; }

remote() {
  local host="$1"; shift
  ssh $SSH_OPTS "eo@${host}" "$@"
}

remote_scp() {
  local src="$1"; local host="$2"; local dest="$3"
  scp $SSH_OPTS "$src" "eo@${host}:${dest}"
}

# ── Check mode ───────────────────────────────────────────────────────────────
check_versions() {
  log "Checking tinytask versions on all machines..."
  echo ""

  local all_machines=("${LINUX_MACHINES[@]}" "${MACOS_MACHINES[@]}")

  printf "%-40s %-8s %-10s\n" "MACHINE" "VERSION" "STATUS"
  printf "%-40s %-8s %-10s\n" "───────" "───────" "──────"

  for host in "${all_machines[@]}"; do
    local version=""
    local status=""

    version=$(remote "$host" 'export PATH="$HOME/.local/bin:$PATH"; tinytask --version 2>/dev/null' 2>/dev/null) && status="online" || status="offline"

    if [[ "$status" == "offline" ]]; then
      version="—"
    fi

    printf "%-40s %-8s %-10s\n" "$host" "$version" "$status"
  done
}

# ── Build functions ──────────────────────────────────────────────────────────
ensure_repo_on_host() {
  local host="$1"
  local repo_path="$2"

  remote "$host" "
    if [ ! -d '$repo_path' ]; then
      mkdir -p '$(dirname $repo_path)'
      git clone '$REPO_URL' '$repo_path'
    fi
    cd '$repo_path'
    git fetch origin
    git checkout '$BRANCH' 2>/dev/null || git checkout -b '$BRANCH' "origin/$BRANCH"
    git pull origin '$BRANCH'
  " 2>&1 | grep -v "^From " | grep -v "^Already on " | grep -v "^Your branch"
}

build_linux() {
  local host="$LINUX_BUILD_HOST"
  local repo_path="$HOME/config/tinytask/tinytask-mcp"

  log "Building Linux binary on $host..."

  ensure_repo_on_host "$host" "$repo_path"

  remote "$host" "
    cd '$repo_path/$CLI_DIR'
    docker run --rm -v \$(pwd):/app -w /app node:20-slim sh -c 'npm ci && npm run sea:linux && chmod +x dist/tinytask-linux'
    echo 'Binary info:'
    ls -lh dist/tinytask-linux
  " 2>&1 | grep -E "^(Binary|-.*)" | head -2

  ok "Linux binary built on $host"
}

build_macos() {
  local host="$MACOS_BUILD_HOST"
  local repo_path="$HOME/config/tinytask/tinytask-mcp"

  log "Building macOS binary on $host..."

  ensure_repo_on_host "$host" "$repo_path"

  remote "$host" "
    export NVM_DIR=\"\$HOME/.nvm\"
    [ -s \"\$NVM_DIR/nvm.sh\" ] && . \"\$NVM_DIR/nvm.sh\"
    cd '$repo_path/$CLI_DIR'
    npm ci
    npm run sea:macos
    chmod +x dist/tinytask-macos
    echo 'Binary info:'
    ls -lh dist/tinytask-macos
  " 2>&1 | grep -E "^(Binary|-.*)" | head -2

  ok "macOS binary built on $host"
}

# ── Deploy functions ─────────────────────────────────────────────────────────
deploy_to_linux() {
  local build_host="$LINUX_BUILD_HOST"
  local repo_path="$HOME/config/tinytask/tinytask-mcp"

  for host in "${LINUX_MACHINES[@]}"; do
    log "Deploying to $host..."

    if ! remote "$host" 'echo ok' >/dev/null 2>&1; then
      warn "$host is offline — skipping"
      continue
    fi

    if [[ "$host" == "$build_host" ]]; then
      # Same machine — just copy locally
      remote "$host" "cp '$repo_path/$CLI_DIR/dist/tinytask-linux' ~/.local/bin/tinytask && chmod +x ~/.local/bin/tinytask"
    else
      # SCP from build host to target host
      # Download from build host to local temp, then upload to target
      local tmpfile="/tmp/tinytask-linux-$$"
      remote "$build_host" "cat '$repo_path/$CLI_DIR/dist/tinytask-linux'" > "$tmpfile" 2>/dev/null
      remote_scp "$tmpfile" "$host" "~/.local/bin/tinytask"
      rm -f "$tmpfile"
    fi

    # Verify
    local version
    version=$(remote "$host" 'export PATH="$HOME/.local/bin:$PATH"; tinytask --version' 2>/dev/null)
    ok "$host → v$version"
  done
}

deploy_to_macos() {
  local build_host="$MACOS_BUILD_HOST"
  local repo_path="$HOME/config/tinytask/tinytask-mcp"

  for host in "${MACOS_MACHINES[@]}"; do
    log "Deploying to $host..."

    if ! remote "$host" 'echo ok' >/dev/null 2>&1; then
      warn "$host is offline — skipping"
      continue
    fi

    if [[ "$host" == "$build_host" ]]; then
      # Same machine — copy locally
      remote "$host" "cp '$repo_path/$CLI_DIR/dist/tinytask-macos' ~/.local/bin/tinytask && chmod +x ~/.local/bin/tinytask"
    else
      # SCP from build host to target host
      # Use the build host's SSH to push to the target (both on Tailscale)
      remote "$build_host" "scp -o StrictHostKeyChecking=accept-new '$repo_path/$CLI_DIR/dist/tinytask-macos' 'eo@$host:~/.local/bin/tinytask'"
    fi

    # Verify
    local version
    version=$(remote "$host" 'export PATH="$HOME/.local/bin:$PATH"; tinytask --version' 2>/dev/null)
    ok "$host → v$version"
  done
}

# ── Main ─────────────────────────────────────────────────────────────────────
main() {
  local mode="${1:-deploy}"

  case "$mode" in
    --check)
      check_versions
      ;;
    --build)
      build_linux
      build_macos
      ok "Build complete"
      ;;
    deploy|"")
      echo ""
      echo "╔══════════════════════════════════════════════════════════════╗"
      echo "║          TinyTask CLI Deploy Script                          ║"
      echo "╚══════════════════════════════════════════════════════════════╝"
      echo ""

      # Build
      build_linux
      build_macos
      echo ""

      # Deploy
      log "Deploying to Linux machines..."
      deploy_to_linux
      echo ""

      log "Deploying to macOS machines..."
      deploy_to_macos
      echo ""

      # Summary
      log "Final status:"
      check_versions
      echo ""
      ok "Deploy complete!"
      ;;
    *)
      err "Unknown mode: $mode"
      err "Usage: $0 [--build|--check]"
      exit 1
      ;;
  esac
}

main "$@"
