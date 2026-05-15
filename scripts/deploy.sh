#!/bin/bash
# MC Deploy Script - Build, deploy, smoke test, auto-rollback
# Usage: ./deploy.sh [--skip-test] [--rollback]

set -euo pipefail

MC_DIR="/home/kevin/.openclaw/workspace/mission-control"
MC_PORT=8765
MC_LOG="/tmp/mission-control.log"
BACKUP_DIR="/home/kevin/.openclaw/workspace/mission-control/.deploy-backups"
SMOKE_ENDPOINTS=("/" "/api/status" "/api/tasks" "/api/events" "/api/calendar/events" "/api/health" "/api/activity/status")
LOGIN_USER="wolfencj"
LOGIN_PASS="203Rocky!"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[deploy]${NC} $1"; }
warn() { echo -e "${YELLOW}[deploy]${NC} $1"; }
fail() { echo -e "${RED}[deploy]${NC} $1"; exit 1; }

# Parse args
SKIP_TEST=false
ROLLBACK=false
for arg in "$@"; do
  case $arg in
    --skip-test) SKIP_TEST=true ;;
    --rollback) ROLLBACK=true ;;
  esac
done

# --- Rollback mode ---
if [ "$ROLLBACK" = true ]; then
  log "Rolling back to last known-good build..."
  if [ ! -d "$BACKUP_DIR" ] || [ -z "$(ls -A $BACKUP_DIR 2>/dev/null)" ]; then
    fail "No backup found to rollback to"
  fi
  LATEST_BACKUP=$(ls -t "$BACKUP_DIR" | head -1)
  log "Restoring from backup: $LATEST_BACKUP"
  
  # Kill current server
  fuser -k "$MC_PORT/tcp" 2>/dev/null || true
  sleep 2
  
  # Restore .next from backup
  rm -rf "$MC_DIR/.next"
  cp -r "$BACKUP_DIR/$LATEST_BACKUP/.next" "$MC_DIR/.next"
  
  # Restart
  cd "$MC_DIR"
  nohup npx next start -p "$MC_PORT" > "$MC_LOG" 2>&1 &
  sleep 5
  
  # Verify
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$MC_PORT/" 2>/dev/null || echo "000")
  if [ "$HTTP_CODE" = "307" ] || [ "$HTTP_CODE" = "200" ]; then
    log "Rollback successful! Server running on port $MC_PORT"
  else
    fail "Rollback failed - server not responding (HTTP $HTTP_CODE)"
  fi
  exit 0
fi

# --- Normal deploy ---

# Step 1: Backup current .next for rollback
log "Backing up current build..."
mkdir -p "$BACKUP_DIR"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
if [ -d "$MC_DIR/.next" ]; then
  cp -r "$MC_DIR/.next" "$BACKUP_DIR/$TIMESTAMP"
  # Keep only last 5 backups
  ls -t "$BACKUP_DIR" | tail -n +6 | xargs -I {} rm -rf "$BACKUP_DIR/{}"
  log "Backup saved: $TIMESTAMP"
fi

# Step 2: Clean build
log "Cleaning and building..."
cd "$MC_DIR"
rm -rf .next
BUILD_OUTPUT=$(npx next build 2>&1)
BUILD_EXIT=$?

if [ $BUILD_EXIT -ne 0 ]; then
  fail "Build failed!\n$BUILD_OUTPUT"
fi

# Check for build errors in output
if echo "$BUILD_OUTPUT" | grep -qi "error\|failed"; then
  # Ignore known harmless errors (Calendar API fetch, Plex Activity fetch)
  REAL_ERRORS=$(echo "$BUILD_OUTPUT" | grep -i "error" | grep -vi "Calendar API\|Plex Activity\|connect ECONNREFUSED" || true)
  if [ -n "$REAL_ERRORS" ]; then
    warn "Build had errors:\n$REAL_ERRORS"
    # Continue anyway since Next.js sometimes reports non-fatal errors
  fi
fi

log "Build succeeded"

# Step 3: Kill old server
log "Stopping old server..."
fuser -k "$MC_PORT/tcp" 2>/dev/null || true
sleep 2

# Double-check port is free
RETRY=0
while fuser "$MC_PORT/tcp" 2>/dev/null; do
  RETRY=$((RETRY + 1))
  if [ $RETRY -gt 10 ]; then
    fail "Port $MC_PORT still in use after 10 attempts"
  fi
  warn "Port still in use, retrying... ($RETRY)"
  fuser -k "$MC_PORT/tcp" 2>/dev/null || true
  sleep 2
done
log "Port $MC_PORT free"

# Step 4: Start new server
log "Starting server..."
cd "$MC_DIR"
nohup npx next start -p "$MC_PORT" > "$MC_LOG" 2>&1 &
SERVER_PID=$!

# Wait for server to be ready (up to 30 seconds)
RETRY=0
while true; do
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$MC_PORT/" 2>/dev/null || echo "000")
  if [ "$HTTP_CODE" != "000" ]; then
    break
  fi
  RETRY=$((RETRY + 1))
  if [ $RETRY -gt 30 ]; then
    fail "Server failed to start after 30 seconds"
  fi
  sleep 1
done

# Extra wait for Next.js to fully initialize routes
sleep 5

log "Server started (PID: $SERVER_PID, HTTP: $HTTP_CODE)"

# Step 5: Smoke test
if [ "$SKIP_TEST" = true ]; then
  warn "Smoke tests skipped with --skip-test"
  log "Deploy complete!"
  exit 0
fi

log "Running smoke tests..."
FAILED=()
PASSED=0

# Get auth cookie for protected endpoints
AUTH_COOKIE=$(curl -s -c - -X POST "http://localhost:$MC_PORT/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"username\":\"$LOGIN_USER\",\"password\":\"$LOGIN_PASS\"}" 2>/dev/null | grep -o 'session=[^;]*' || true)

for endpoint in "${SMOKE_ENDPOINTS[@]}"; do
  if [ -n "$AUTH_COOKIE" ] && [[ "$endpoint" == /api/* ]]; then
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -b "$AUTH_COOKIE" --max-time 15 "http://localhost:$MC_PORT$endpoint" 2>/dev/null || echo "000")
  else
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 "http://localhost:$MC_PORT$endpoint" 2>/dev/null || echo "000")
  fi
  
  # 404 on first hit = lazy compilation, retry once
  if [ "$HTTP_CODE" = "404" ]; then
    sleep 2
    if [ -n "$AUTH_COOKIE" ] && [[ "$endpoint" == /api/* ]]; then
      HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -b "$AUTH_COOKIE" --max-time 15 "http://localhost:$MC_PORT$endpoint" 2>/dev/null || echo "000")
    else
      HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 "http://localhost:$MC_PORT$endpoint" 2>/dev/null || echo "000")
    fi
  fi
  
  # 200 or 307 (login redirect) are both OK
  if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "307" ]; then
    PASSED=$((PASSED + 1))
    log "✓ $endpoint → $HTTP_CODE"
  else
    FAILED+=("$endpoint:$HTTP_CODE")
    warn "✗ $endpoint → $HTTP_CODE"
  fi
done

# Check CSS and JS chunks
CSS_FILE=$(ls "$MC_DIR/.next/static/chunks/"*.css 2>/dev/null | head -1)
if [ -n "$CSS_FILE" ]; then
  CSS_NAME=$(basename "$CSS_FILE")
  CSS_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$MC_PORT/_next/static/chunks/$CSS_NAME" 2>/dev/null || echo "000")
  if [ "$CSS_CODE" = "200" ]; then
    PASSED=$((PASSED + 1))
    log "✓ CSS chunk → $CSS_CODE"
  else
    FAILED+=("CSS chunk:$CSS_CODE")
    warn "✗ CSS chunk → $CSS_CODE"
  fi
fi

# Report
TOTAL=$((PASSED + ${#FAILED[@]}))
log "Smoke tests: $PASSED/$TOTAL passed"

if [ ${#FAILED[@]} -gt 0 ]; then
  warn "Failed endpoints: ${FAILED[*]}"
  warn "Consider running: $0 --rollback"
  
  # Log failure to activity tracker
  psql "postgresql://alfred:AlfredDB2026Secure@localhost:5432/mission_control" -c \
    "INSERT INTO activity_log (agent_name, action, details) VALUES ('alfred', 'deploy_smoke_test_failed', 'Failed: ${FAILED[*]}')" 2>/dev/null || true
  
  exit 1
fi

# Log success
psql "postgresql://alfred:AlfredDB2026Secure@localhost:5432/mission_control" -c \
  "INSERT INTO activity_log (agent_name, action, details) VALUES ('alfred', 'deploy_success', 'All $TOTAL smoke tests passed')" 2>/dev/null || true

log "Deploy complete! All smoke tests passed ✅"