#!/usr/bin/env bash
# Security + functional smoke test against a deployed environment.
# Usage: scripts/smoke-test.sh <base-url> <namespace>
#   e.g. scripts/smoke-test.sh http://192.168.100.240 celebra-stage
set -uo pipefail

BASE="${1:?base url}"
NS="${2:?namespace}"
PASS=0
FAIL=0
JAR="$(mktemp)"
trap 'rm -f "$JAR"' EXIT

check() { # name expected actual
  if [[ "$2" == "$3" ]]; then echo "  PASS  $1"; PASS=$((PASS+1)); else echo "  FAIL  $1 (expected $2, got $3)"; FAIL=$((FAIL+1)); fi
}
code() { curl -s -o /dev/null -w '%{http_code}' "$@"; }

echo "Smoke test: $BASE ($NS)"

echo "Public surface"
check "readyz (DB reachable)" 200 "$(code "$BASE/api/readyz")"
check "landing page" 200 "$(code "$BASE/")"
check "public invitation" 200 "$(code "$BASE/e/sofia-y-mateo")"
check "landing has no legacy guessable token" 0 "$(curl -s "$BASE/" | grep -c 'familia-perez')"

echo "Organizer surface is locked without a session"
check "GET /api/events -> 401" 401 "$(code "$BASE/api/events")"
check "GET /api/events?slug= (guest list) -> 401" 401 "$(code "$BASE/api/events?slug=sofia-y-mateo")"
check "POST /api/events -> 401" 401 "$(code -X POST -H 'Content-Type: application/json' -d '{}' "$BASE/api/events")"
check "POST /api/guests -> 401" 401 "$(code -X POST -H 'Content-Type: application/json' -d '{}' "$BASE/api/guests")"
check "DELETE /api/guests -> 401" 401 "$(code -X DELETE "$BASE/api/guests?eventId=x&id=y")"
check "/dashboard redirects to /login" 307 "$(code "$BASE/dashboard")"
check "forged session cookie rejected" 401 "$(code -b 'celebra_session=v1.9999999999.forged' "$BASE/api/events")"

echo "Public RSVP rules"
check "old guessable token rejected" 404 "$(code -X POST -H 'Content-Type: application/json' \
  -d '{"slug":"sofia-y-mateo","token":"familia-perez","status":"confirmed","passesConfirmed":2}' "$BASE/api/rsvp")"
check "tokenless RSVP blocked when open RSVP is off" 403 "$(code -X POST -H 'Content-Type: application/json' \
  -d '{"slug":"sofia-y-mateo","name":"Spam","status":"confirmed","passesConfirmed":2}' "$BASE/api/rsvp")"
check "old delete action on /api/rsvp does nothing harmful" 404 "$(code -X POST -H 'Content-Type: application/json' \
  -d '{"action":"delete","id":"gst-1"}' "$BASE/api/rsvp")"

echo "Login"
check "wrong password -> 401" 401 "$(code -X POST -H 'Content-Type: application/json' -d '{"password":"nope"}' "$BASE/api/auth/login")"
ADMIN_PW="$(kubectl get secret celebra-auth -n "$NS" -o jsonpath='{.data.admin-password}' | base64 -d)"
check "correct password -> 200" 200 "$(code -c "$JAR" -X POST -H 'Content-Type: application/json' \
  -d "{\"password\":\"$ADMIN_PW\"}" "$BASE/api/auth/login")"
unset ADMIN_PW
check "session can list events" 200 "$(code -b "$JAR" "$BASE/api/events")"

echo "Guest token + pass cap (uses a throwaway guest)"
EVENT_JSON="$(curl -s -b "$JAR" "$BASE/api/events?slug=sofia-y-mateo")"
EVENT_ID="$(printf '%s' "$EVENT_JSON" | sed -n 's/.*"event":{"[^}]*"id":"\([^"]*\)".*/\1/p' | head -1)"
[[ -z "$EVENT_ID" ]] && EVENT_ID="evt-boda-sofia-mateo"
NEW="$(curl -s -b "$JAR" -X POST -H 'Content-Type: application/json' \
  -d "{\"eventId\":\"$EVENT_ID\",\"name\":\"Smoke Test\",\"passesAllocated\":2}" "$BASE/api/guests")"
TOKEN="$(printf '%s' "$NEW" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')"
GID="$(printf '%s' "$NEW" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p' | head -1)"
check "new token is 22 random chars" 22 "${#TOKEN}"
RSVP="$(curl -s -X POST -H 'Content-Type: application/json' \
  -d "{\"slug\":\"sofia-y-mateo\",\"token\":\"$TOKEN\",\"status\":\"confirmed\",\"passesConfirmed\":99}" "$BASE/api/rsvp")"
check "confirmed passes capped at allocation (99 -> 2)" 1 "$(printf '%s' "$RSVP" | grep -c '"passesConfirmed":2')"
check "RSVP response has no phone field" 0 "$(printf '%s' "$RSVP" | grep -c '"phone"')"
PAGE="$(curl -s "$BASE/e/sofia-y-mateo?g=$TOKEN")"
check "invitation page HTML leaks no phone numbers" 0 "$(printf '%s' "$PAGE" | grep -cE '521[0-9]{10}')"
check "invitation page HTML leaks no other guest tokens" 0 "$(printf '%s' "$PAGE" | grep -oE '\\"token\\":\\"[^\\]+' | grep -vc "$TOKEN")"
check "cleanup: delete throwaway guest" 200 "$(code -b "$JAR" -X DELETE "$BASE/api/guests?eventId=$EVENT_ID&id=$GID")"

echo ""
echo "Result: $PASS passed, $FAIL failed"
[[ "$FAIL" -eq 0 ]]
