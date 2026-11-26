#!/usr/bin/env bash
# Security + functional smoke test against a deployed environment.
# Usage: scripts/smoke-test.sh <base-url> <namespace>
#   e.g. scripts/smoke-test.sh http://192.168.100.240 celebra-stage
# Creates throwaway users/events named "smoke-*" and deletes them at the end.
set -uo pipefail

BASE="${1:?base url}"
NS="${2:?namespace}"
PASS=0
FAIL=0
RUN="$(date +%s)"
TMP="$(mktemp -d)"
ADMIN="$TMP/admin"; A="$TMP/a"; B="$TMP/b"; INV="$TMP/inv"
EMAIL_A="smoke-a-$RUN@example.test"; EMAIL_B="smoke-b-$RUN@example.test"
PW_A="smoke-pass-A-$RUN"; PW_B="smoke-pass-B-$RUN"
SLUG_A="smoke-a-$RUN"; SLUG_INV="smoke-inv-$RUN"

check() { # name expected actual
  if [[ "$2" == "$3" ]]; then echo "  PASS  $1"; PASS=$((PASS+1)); else
    echo "  FAIL  $1 (expected $2, got $3)"; FAIL=$((FAIL+1))
    [[ -f "$TMP/last" ]] && echo "        last response: $(head -c 200 "$TMP/last")"
  fi
}
code() { curl -s -o /dev/null -w '%{http_code}' "$@"; }
# j '<printf template>' args...  -> JSON string. Single-quoted templates avoid bash 3.2 brace expansion.
j() { local fmt="$1"; shift; printf "$fmt" "$@"; }
post() { # jar url json -> status
  local jar="$1" url="$2" body="$3"
  curl -s -o "$TMP/last" -w '%{http_code}' -b "$jar" -c "$jar" -X POST -H 'Content-Type: application/json' -d "$body" "$BASE$url"
}
get() { curl -s -o "$TMP/last" -w '%{http_code}' -b "$1" -c "$1" "$BASE$2"; }
patch() { # jar url json -> status
  curl -s -o "$TMP/last" -w '%{http_code}' -b "$1" -c "$1" -X PATCH -H 'Content-Type: application/json' -d "$3" "$BASE$2"
}
field() { sed -n "s/.*\"$1\":\"\([^\"]*\)\".*/\1/p" "$TMP/last" | head -1; }
event_json() { # id slug title
  printf '{"id":"%s","slug":"%s","type":"boda","title":"%s","subtitle":"x","hosts":"x","parentsText":"","dateISO":"2030-01-01T17:00:00Z","coverImageUrl":"","galleryUrls":[],"musicTitle":"","theme":"emerald-gold","ceremonyVenue":"","ceremonyAddress":"","ceremonyTime":"","ceremonyMapUrl":"","receptionVenue":"","receptionAddress":"","receptionTime":"","receptionMapUrl":"","dressCode":"","dressCodeNotes":"","giftRegistryText":"","bankDetails":{"bank":"","beneficiary":"","clabe":"","concept":""},"quote":"","itinerary":[],"sections":{"showCountdown":true,"showItinerary":true,"showGallery":false,"showDressCode":true,"showGiftRegistry":true,"showGuestbook":true}}' "$1" "$2" "$3"
}
cleanup() {
  curl -s -o /dev/null -b "$ADMIN" -X DELETE "$BASE/api/events?id=evt-smoke-a-$RUN"
  curl -s -o /dev/null -b "$ADMIN" -X DELETE "$BASE/api/events?id=evt-smoke-inv-$RUN"
  curl -s -o /dev/null -b "$ADMIN" -X DELETE "$BASE/api/admin/users?email=$EMAIL_A"
  curl -s -o /dev/null -b "$ADMIN" -X DELETE "$BASE/api/admin/users?email=$EMAIL_B"
  rm -rf "$TMP"
}
trap cleanup EXIT

echo "Smoke test: $BASE ($NS)"

echo "Public surface"
check "readyz (DB reachable)" 200 "$(code "$BASE/api/readyz")"
check "landing page" 200 "$(code "$BASE/")"
check "landing shows login/sign-up menu" 1 "$(curl -s "$BASE/" | grep -c 'Iniciar sesión / Crear cuenta')"
check "public invitation" 200 "$(code "$BASE/e/sofia-y-mateo")"
check "login, sign-up, admin login pages" "200 200 200" "$(code "$BASE/login") $(code "$BASE/registro") $(code "$BASE/admin/login")"

echo "Google sign-in"
redir() { curl -s -o /dev/null -w '%{redirect_url}' "$@"; }
GOOGLE_ON="$(curl -s "$BASE/api/auth/google/status" | grep -c '"enabled":true')"
echo "  (Google sign-in is $([[ "$GOOGLE_ON" == 1 ]] && echo enabled || echo disabled) here)"
if [[ "$GOOGLE_ON" == 1 ]]; then
  START="$(redir "$BASE/api/auth/google/start?next=//evil.example")"
  check "start redirects to Google with PKCE" 1 "$(printf '%s' "$START" | grep -c '^https://accounts.google.com/.*code_challenge_method=S256')"
  check "start sets the short-lived oauth cookie" 1 "$(curl -s -D - -o /dev/null "$BASE/api/auth/google/start" | grep -ic 'set-cookie: celebra_oauth=.*path=/api/auth/google')"
else
  check "start without credentials -> login error" 1 "$(redir "$BASE/api/auth/google/start" | grep -c '/login?error=google_off')"
fi
check "callback without our state cookie is rejected" 1 "$(redir "$BASE/api/auth/google/callback?code=x&state=forged" | grep -cE '/login\?error=google_(state|off)')"
check "callback with mismatched state is rejected" 1 "$(redir -b 'celebra_oauth=eyJzdGF0ZSI6ImEiLCJ2ZXJpZmllciI6ImIiLCJub25jZSI6ImMiLCJuZXh0IjoiLyJ9' "$BASE/api/auth/google/callback?code=x&state=other" | grep -cE '/login\?error=google_(state|off)')"
check "callback never sets a session on failure" 0 "$(curl -s -D - -o /dev/null "$BASE/api/auth/google/callback?code=x&state=forged" | grep -c 'celebra_session=[^;]')"

echo "Locked without a session"
check "GET /api/events -> 401" 401 "$(code "$BASE/api/events")"
check "GET /api/events?slug= -> 401" 401 "$(code "$BASE/api/events?slug=sofia-y-mateo")"
check "POST /api/guests -> 401" 401 "$(code -X POST -H 'Content-Type: application/json' -d '{}' "$BASE/api/guests")"
check "GET /api/admin/users -> 401" 401 "$(code "$BASE/api/admin/users")"
check "/dashboard redirects to /login" 307 "$(code "$BASE/dashboard")"
check "/admin/usuarios redirects" 307 "$(code "$BASE/admin/usuarios")"
check "forged session cookie rejected" 401 "$(code -b 'celebra_session=forged-token' "$BASE/api/events")"

echo "Public RSVP rules"
check "legacy guessable token rejected" 404 "$(code -X POST -H 'Content-Type: application/json' \
  -d '{"slug":"sofia-y-mateo","token":"familia-perez","status":"confirmed","passesConfirmed":2}' "$BASE/api/rsvp")"
check "tokenless RSVP blocked when open RSVP is off" 403 "$(code -X POST -H 'Content-Type: application/json' \
  -d '{"slug":"sofia-y-mateo","name":"Spam","status":"confirmed","passesConfirmed":2}' "$BASE/api/rsvp")"

echo "Platform admin"
check "wrong admin password -> 401" 401 "$(post "$TMP/x" /api/auth/admin '{"password":"nope"}')"
ADMIN_PW="$(kubectl get secret celebra-auth -n "$NS" -o jsonpath='{.data.admin-password}' | base64 -d)"
check "admin login -> 200" 200 "$(post "$ADMIN" /api/auth/admin "$(j '{"password":"%s"}' "$ADMIN_PW")")"
unset ADMIN_PW
check "admin sees all events (demo included)" 200 "$(get "$ADMIN" "/api/events?slug=sofia-y-mateo")"
check "admin can list users" 200 "$(get "$ADMIN" /api/admin/users)"

echo "Accounts and tenant isolation"
check "sign-up A -> 200" 200 "$(post "$A" /api/auth/register "$(j '{"name":"Smoke A","email":"%s","password":"%s"}' "$EMAIL_A" "$PW_A")")"
check "duplicate email -> 409" 409 "$(post "$TMP/x" /api/auth/register "$(j '{"name":"Dup","email":"%s","password":"%s"}' "$EMAIL_A" "$PW_A")")"
check "short password rejected" 400 "$(post "$TMP/x" /api/auth/register "$(j '{"name":"S","email":"short-%s@example.test","password":"123"}' "$RUN")")"
get "$A" /api/events >/dev/null
check "new user sees no events" 1 "$(grep -c '"events":\[\]' "$TMP/last")"
check "user cannot open demo event" 404 "$(get "$A" "/api/events?slug=sofia-y-mateo")"
check "user cannot overwrite demo event" 404 "$(post "$A" /api/events "$(event_json evt-boda-sofia-mateo sofia-y-mateo Hacked)")"
check "user cannot add guests to demo event" 404 "$(post "$A" /api/guests '{"eventId":"evt-boda-sofia-mateo","name":"x","passesAllocated":1}')"
check "user cannot use admin APIs" 403 "$(get "$A" /api/admin/users)"
check "user A creates own event" 200 "$(post "$A" /api/events "$(event_json "evt-smoke-a-$RUN" "$SLUG_A" "Smoke A")")"
check "user A adds a guest" 200 "$(post "$A" /api/guests "$(j '{"eventId":"evt-smoke-a-%s","name":"Invitado A","passesAllocated":2}' "$RUN")")"
GID_A="$(field id)"
check "A marks invitation as sent" 200 "$(patch "$A" /api/guests "$(j '{"eventId":"evt-smoke-a-%s","id":"%s","inviteSent":true}' "$RUN" "$GID_A")")"
check "sent timestamp returned" 1 "$(grep -c '"inviteSentAt":"20' "$TMP/last")"
check "A unmarks it" 1 "$(patch "$A" /api/guests "$(j '{"eventId":"evt-smoke-a-%s","id":"%s","inviteSent":false}' "$RUN" "$GID_A")" >/dev/null; grep -c '"inviteSentAt":null' "$TMP/last")"
check "PATCH without inviteSent -> 400" 400 "$(patch "$A" /api/guests "$(j '{"eventId":"evt-smoke-a-%s","id":"%s"}' "$RUN" "$GID_A")")"
check "PATCH without a session -> 401" 401 "$(code -X PATCH -H 'Content-Type: application/json' -d '{}' "$BASE/api/guests")"
check "user B signs up" 200 "$(post "$B" /api/auth/register "$(j '{"name":"Smoke B","email":"%s","password":"%s"}' "$EMAIL_B" "$PW_B")")"
check "B cannot see A's event" 404 "$(get "$B" "/api/events?slug=$SLUG_A")"
check "B cannot add guests to A's event" 404 "$(post "$B" /api/guests "$(j '{"eventId":"evt-smoke-a-%s","name":"x","passesAllocated":1}' "$RUN")")"
check "B cannot take A's slug" 409 "$(post "$B" /api/events "$(event_json "evt-smoke-b-$RUN" "$SLUG_A" "Steal")")"
check "B cannot mark A's guest as sent" 404 "$(patch "$B" /api/guests "$(j '{"eventId":"evt-smoke-a-%s","id":"%s","inviteSent":true}' "$RUN" "$GID_A")")"
check "admin can see A's event" 200 "$(get "$ADMIN" "/api/events?slug=$SLUG_A")"
check "logout + login again for A" "200 200" "$(post "$A" /api/auth/logout '{}') $(post "$A" /api/auth/login "$(j '{"email":"%s","password":"%s"}' "$EMAIL_A" "$PW_A")")"
check "wrong user password -> 401" 401 "$(post "$TMP/x" /api/auth/login "$(j '{"email":"%s","password":"wrong-password"}' "$EMAIL_A")")"

echo "Invitation password"
check "admin creates unowned event" 200 "$(post "$ADMIN" /api/events "$(event_json "evt-smoke-inv-$RUN" "$SLUG_INV" "Smoke Inv")")"
check "user cannot generate invitation passwords" 403 "$(post "$A" /api/admin/invitation-password "$(j '{"eventId":"evt-smoke-inv-%s"}' "$RUN")")"
check "admin generates invitation password" 200 "$(post "$ADMIN" /api/admin/invitation-password "$(j '{"eventId":"evt-smoke-inv-%s"}' "$RUN")")"
INV_PW="$(field password)"
check "password format XXXX-XXXX-XXXX" 1 "$(printf '%s' "$INV_PW" | grep -cE '^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$')"
check "wrong invitation password -> 401" 401 "$(post "$TMP/x" /api/auth/invitation "$(j '{"slug":"%s","password":"AAAA-BBBB-CCCC"}' "$SLUG_INV")")"
LOWER_PW="$(printf '%s' "$INV_PW" | tr 'A-Z' 'a-z' | tr -d '-')"
check "invitation login (lowercase, no dashes) -> 200" 200 "$(post "$INV" /api/auth/invitation "$(j '{"slug":"%s","password":"%s"}' "$SLUG_INV" "$LOWER_PW")")"
get "$INV" /api/events >/dev/null
check "invitation session sees exactly its event" "1 1" "$(grep -o '"slug":"' "$TMP/last" | wc -l | tr -d ' ') $(grep -c "\"slug\":\"$SLUG_INV\"" "$TMP/last")"
check "invitation session cannot open other events" 404 "$(get "$INV" "/api/events?slug=sofia-y-mateo")"
check "invitation session cannot create events" 403 "$(post "$INV" /api/events "$(event_json "evt-smoke-x-$RUN" "smoke-x-$RUN" "X")")"
check "invitation session can add guests" 200 "$(post "$INV" /api/guests "$(j '{"eventId":"evt-smoke-inv-%s","name":"Invitado Inv","passesAllocated":3}' "$RUN")")"
check "owned events can't be opened by invitation password" 401 "$(post "$TMP/x" /api/auth/invitation "$(j '{"slug":"%s","password":"%s"}' "$SLUG_A" "$INV_PW")")"

echo "Claim invitation into an account"
check "B claims it with the password" 200 "$(post "$B" /api/account/claim "$(j '{"slug":"%s","password":"%s"}' "$SLUG_INV" "$INV_PW")")"
check "B now manages it" 200 "$(get "$B" "/api/events?slug=$SLUG_INV")"
check "old invitation session revoked" 401 "$(get "$INV" /api/events)"
check "invitation password no longer works" 401 "$(post "$TMP/x" /api/auth/invitation "$(j '{"slug":"%s","password":"%s"}' "$SLUG_INV" "$INV_PW")")"
check "A cannot claim it" 401 "$(post "$A" /api/account/claim "$(j '{"slug":"%s","password":"%s"}' "$SLUG_INV" "$INV_PW")")"

echo "Admin password reset"
get "$ADMIN" /api/admin/users >/dev/null
UID_B="$(sed -n "s/.*\"id\":\"\([^\"]*\)\",\"email\":\"$EMAIL_B\".*/\1/p" "$TMP/last")"
check "admin resets B's password" 200 "$(post "$ADMIN" /api/admin/users "$(j '{"userId":"%s","action":"reset"}' "$UID_B")")"
TEMP_B="$(field temporaryPassword)"
check "B's existing session revoked" 401 "$(get "$B" /api/events)"
check "old password fails, temporary works" "401 200" "$(post "$TMP/x" /api/auth/login "$(j '{"email":"%s","password":"%s"}' "$EMAIL_B" "$PW_B")") $(post "$B" /api/auth/login "$(j '{"email":"%s","password":"%s"}' "$EMAIL_B" "$TEMP_B")")"

echo "Guest token + pass cap"
check "admin adds guest to A's event" 200 "$(post "$ADMIN" /api/guests "$(j '{"eventId":"evt-smoke-a-%s","name":"Cap Test","passesAllocated":2}' "$RUN")")"
TOKEN="$(field token)"
check "token is 22 random chars" 22 "${#TOKEN}"
RSVP="$(curl -s -X POST -H 'Content-Type: application/json' \
  -d "$(j '{"slug":"%s","token":"%s","status":"confirmed","passesConfirmed":99,"message":"hola"}' "$SLUG_A" "$TOKEN")" "$BASE/api/rsvp")"
check "passes capped (99 -> 2)" 1 "$(printf '%s' "$RSVP" | grep -c '"passesConfirmed":2')"
check "RSVP response has no phone" 0 "$(printf '%s' "$RSVP" | grep -c '"phone"')"
PAGE="$(curl -s "$BASE/e/sofia-y-mateo")"
check "invitation HTML leaks no phone numbers" 0 "$(printf '%s' "$PAGE" | grep -cE '521[0-9]{10}')"
check "invitation HTML leaks no guest tokens" 0 "$(printf '%s' "$PAGE" | grep -c 'token')"

echo "Throttling"
for _ in $(seq 1 10); do post "$TMP/x" /api/auth/login "$(j '{"email":"%s","password":"bad"}' "$EMAIL_A")" >/dev/null; done
check "11th bad login for same email -> 429" 429 "$(post "$TMP/x" /api/auth/login "$(j '{"email":"%s","password":"bad"}' "$EMAIL_A")")"

echo ""
echo "Result: $PASS passed, $FAIL failed"
[[ "$FAIL" -eq 0 ]]
