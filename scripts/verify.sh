#!/usr/bin/env bash

BOLD='\033[1m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

pass=0
fail=0

step() {
  echo -e "\n${BOLD}[$1] $2${NC}"
}

run_check() {
  if eval "$1"; then
    echo -e "  ${GREEN}PASS${NC}"
    pass=$((pass + 1))
  else
    echo -e "  ${RED}FAIL${NC}"
    fail=$((fail + 1))
  fi
}

cd "$(dirname "$0")/.."

step 1 "npm install"
run_check "npm install --silent 2>&1"

step 2 "Unit tests (vitest)"
run_check "npx vitest run 2>&1"

step 3 "Library build"
run_check "npm -w @gesture-arcade/engine run build 2>&1"

step 4 "Verify dist output"
run_check "test -f packages/gesture-engine/dist/gesture-engine.js"

step 5 "Smoke test"
run_check "node scripts/smoke-test.js 2>&1"

step 6 "Dev server health check"
npx vite --port 4173 &
VITE_PID=$!
sleep 3

HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4173/demo.html || echo "000")
kill $VITE_PID 2>/dev/null || true
wait $VITE_PID 2>/dev/null || true

if [ "$HTTP_STATUS" = "200" ]; then
  echo -e "  ${GREEN}PASS${NC} (HTTP $HTTP_STATUS)"
  pass=$((pass + 1))
else
  echo -e "  ${RED}FAIL${NC} (HTTP $HTTP_STATUS)"
  fail=$((fail + 1))
fi

echo -e "\n${BOLD}=== Summary: ${pass} passed, ${fail} failed ===${NC}"

if [ "$fail" -gt 0 ]; then
  exit 1
fi
