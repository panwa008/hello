#!/usr/bin/env bash
# Hello API smoke test (idempotent — safe to re-run):
#   health → login/refresh → GPS → nearby (privacy rules) → buy → equip → avatar → games → GPS path → egg → wallet → market
# Usage:  bash scripts/smoke.sh            (API at http://localhost:3001/api)
#         API=http://localhost:5173/api bash scripts/smoke.sh   (through the web proxy)
set -uo pipefail
API=${API:-http://localhost:3001/api}
FAILS=0
j() { node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{let o;try{o=JSON.parse(s)}catch{o={}};let v;try{v=($1)}catch(e){v=''};console.log(typeof v==='object'?JSON.stringify(v):v)})"; }
pass() { echo "✅ $*"; }
fail() { echo "❌ $*"; FAILS=$((FAILS+1)); }
# call METHOD PATH [json] → sets BODY and CODE
call() { local m=$1 p=$2 d=${3:-}; local out; if [ -n "$d" ]; then out=$(curl -s -w '\n%{http_code}' -X "$m" "$API$p" -H "Authorization: Bearer ${TOK:-}" -H 'Content-Type: application/json' -d "$d"); else out=$(curl -s -w '\n%{http_code}' -X "$m" "$API$p" -H "Authorization: Bearer ${TOK:-}"); fi; CODE=${out##*$'\n'}; BODY=${out%$'\n'*}; }
okish() { [ "$CODE" = 200 ] || [ "$CODE" = 201 ]; }

call GET /health; [ "$(echo "$BODY" | j o.status)" = up ] && pass "health ($API)" || { fail "health — is the API running?"; exit 1; }
call POST /auth/login '{"email":"mayy@hello.app","password":"hello123"}'
okish && TOK=$(echo "$BODY" | j o.result.tokens.accessToken) && REF=$(echo "$BODY" | j o.result.tokens.refreshToken) || { fail "login $CODE $BODY"; exit 1; }
STATE=$BODY; pass "login mayy@hello.app (points=$(echo "$STATE" | j o.state.points), pets=$(echo "$STATE" | j o.state.pets.length))"
call POST /auth/refresh "{\"refreshToken\":\"$REF\"}"; okish && TOK=$(echo "$BODY" | j o.result.tokens.accessToken) && pass "refresh-token rotation" || fail "refresh $CODE"
call POST /auth/login '{"email":"mayy@hello.app","password":"wrong"}'; [ "$CODE" = 401 ] && pass "wrong password rejected (401)" || fail "wrong password → $CODE"

# make sure there are points for the purchases below (demo top-up)
call POST /wallet/demo-topup '{"points":5000}'; okish && pass "demo top-up +5000 (points=$(echo "$BODY" | j o.state.points))" || fail "demo-topup $CODE $BODY"

LAT=13.7299; LNG=100.5585
call POST /explorer/location "{\"lat\":$LAT,\"lng\":$LNG,\"accuracy\":12,\"source\":\"gps\"}"; okish && pass "GPS fix posted ($LAT,$LNG ±12 m)" || fail "location $CODE $BODY"
call GET "/explorer/nearby?radius=1000"; NB=$BODY
echo "   nearby: $(echo "$NB" | j 'o.people.length+" people (clear "+o.people.filter(p=>p.visibility==="clear").length+" ≤200 m, blur "+o.people.filter(p=>p.visibility==="blur").length+" ≤500 m, dot "+o.people.filter(p=>p.visibility==="dot").length+")"')"
[ "$(echo "$NB" | j 'o.people.every(p=>p.lat===undefined&&p.lng===undefined)')" = true ] && pass "nearby: no raw coordinates leaked" || fail "coords leaked"
[ "$(echo "$NB" | j 'o.people.filter(p=>p.visibility==="clear").every(p=>p.distance<=200)&&o.people.filter(p=>p.visibility==="blur").every(p=>p.distance>200&&p.distance<=500)')" = true ] && pass "nearby: 200/500 m blur rules (Haversine)" || fail "blur rules"
[ "$(echo "$NB" | j 'o.people.filter(p=>p.visibility==="dot").every(p=>p.id.startsWith("anon_")&&!p.name)')" = true ] && pass "nearby: >500 m anonymised dots" || fail "dots not anonymised"

# PetShop: buy the first pet cosmetic not owned yet (or reuse an owned one)
call GET /me; ME=$BODY
ITEM=$(echo "$ME" | j '["c1","c2","c3","c4","c5","c6","c7","c8"].find(i=>!o.state.owned.includes(i))||""')
PET=$(echo "$ME" | j o.state.activePet)
if [ -n "$ITEM" ]; then call POST /shop/buy "{\"itemId\":\"$ITEM\",\"qty\":1}"; okish && pass "PetShop buy $ITEM (points=$(echo "$BODY" | j o.state.points))" || fail "buy $ITEM $CODE $BODY"; else ITEM=c7; pass "PetShop: all cosmetics already owned — reusing c7"; fi
call POST /shop/buy '{"itemId":"f1","qty":1}'; okish && pass "PetShop buy food f1" || fail "buy food $CODE $BODY"
call POST "/pets/$PET/equip" "{\"itemId\":\"$ITEM\"}"; okish && pass "equip $ITEM on active pet → gear $(echo "$BODY" | j "JSON.stringify(o.state.pets.find(p=>p.id==='$PET').gear)")" || fail "equip $CODE $BODY"
call POST "/pets/$PET/feed" '{"food":"f1"}'; if okish; then pass "feed pet f1 (hunger $(echo "$BODY" | j "Math.round(o.state.pets.find(p=>p.id==='$PET').hunger)"))"; elif echo "$BODY" | grep -q '"code":"full"'; then pass "feed refused: pet already full (server-side rule)"; else fail "feed $CODE $BODY"; fi

# AvatarShop + wardrobe (aura/backpack slots)
AV=$(echo "$ME" | j '["z1","z2","z3","k1","k2","k3"].find(i=>!o.state.owned.includes(i))||""')
if [ -n "$AV" ]; then call POST /avatar/buy "{\"itemId\":\"$AV\",\"equip\":true}"; okish && pass "AvatarShop buy+equip $AV → outfit $(echo "$BODY" | j 'JSON.stringify(o.state.outfit)')" || fail "avatar buy $CODE $BODY"; else pass "AvatarShop: aura/backpacks already owned"; fi
call PUT /avatar/outfit '{"hair":"h1","top":"a1","bottom":"b1","shoes":"s1","backpack":"none"}'; okish && pass "wardrobe outfit saved (7 slots)" || fail "outfit $CODE $BODY"
call PUT /avatar/outfit '{"aura":"z9"}'; [ "$CODE" = 400 ] && pass "wardrobe rejects unknown/unowned item ($CODE)" || fail "outfit validation → $CODE"

# Games — awards are computed server-side; 429 = anti-spam interval (also a pass)
game() { call POST "/games/$1/score" "$2"; if okish; then pass "game $1 → +$(echo "$BODY" | j o.result.points) P ($(echo "$BODY" | j o.result.label))"; elif [ "$CODE" = 429 ]; then pass "game $1 → 429 too_fast (anti-cheat interval)"; else fail "game $1 $CODE $BODY"; fi; }
game runner '{"stars":40}'
call POST "/pets/$PET/rest"; call POST "/pets/$PET/rest"; okish && pass "pet rested (energy $(echo "$BODY" | j "Math.round(o.state.pets.find(p=>p.id==='$PET').energy)"))" || fail "rest $CODE $BODY"
game battle "{\"win\":true,\"petId\":\"$PET\"}"
game puzzle '{"moves":9,"durationMs":42000}'
game adventure '{"gems":6,"egg":false}'
call POST /games/puzzle/score '{"moves":2,"durationMs":1000}'; [ "$CODE" = 400 ] || [ "$CODE" = 429 ] && pass "impossible puzzle score rejected ($CODE)" || fail "puzzle cheat → $CODE"

# Explorer egg: refuse while far, walk a GPS path, then collect at ≤200 m
call GET /explorer/eggs; EGG=$(echo "$BODY" | j 'o.eggs.sort((a,b)=>b.distance-a.distance)[0]')
EID=$(echo "$EGG" | j o.id); ELAT=$(echo "$EGG" | j o.lat); ELNG=$(echo "$EGG" | j o.lng); EDIST=$(echo "$EGG" | j o.distance)
echo "   egg $EID at $EDIST m"
if [ "${EDIST%.*}" -gt 200 ]; then call POST "/explorer/eggs/$EID/collect"; [ "$CODE" = 400 ] && pass "collect refused while ${EDIST} m away" || fail "far collect → $CODE"; fi
for i in 1 2 3 4 5; do
  la=$(node -e "console.log($LAT+($ELAT-$LAT)*$i/5)"); ln=$(node -e "console.log($LNG+($ELNG-$LNG)*$i/5)")
  call POST /explorer/location "{\"lat\":$la,\"lng\":$ln,\"accuracy\":8,\"source\":\"gps\"}"; okish || fail "path fix $i $CODE $BODY"
  sleep 0.3
done; pass "GPS path walked toward the egg (5 fixes)"
call POST "/explorer/eggs/$EID/collect"; okish && pass "egg collected at ≤200 m → $(echo "$BODY" | j o.result.rarity) (eggs now $(echo "$BODY" | j o.state.eggs.length))" || fail "collect $CODE $BODY"

# Wallet: steps validated server-side, redeem, TrueMoney sandbox
call GET /me; S0=$(echo "$BODY" | j o.state.steps)
call POST /wallet/steps "{\"steps\":$((S0+600)),\"source\":\"manual\"}"; okish && pass "steps sync $S0 → $((S0+600))" || fail "steps $CODE $BODY"
call POST /wallet/steps '{"steps":0,"source":"manual"}'; [ "$CODE" = 400 ] && pass "steps decrease rejected" || fail "steps decrease → $CODE"
call POST /wallet/steps '{"steps":99999,"source":"manual"}'; [ "$CODE" = 400 ] && pass "implausible steps rejected" || fail "implausible steps → $CODE"
call POST /wallet/redeem; okish && pass "redeem steps → +$(echo "$BODY" | j o.result.points) P" || { [ "$CODE" = 400 ] && pass "redeem: $(echo "$BODY" | j o.code)" || fail "redeem $CODE $BODY"; }
call POST /wallet/topup '{"thb":20,"phone":"0812345678"}'; okish && pass "TrueMoney top-up ฿20 → +$(echo "$BODY" | j o.result.points) P (sandbox=$(echo "$BODY" | j o.result.sandbox))" || fail "topup $CODE $BODY"

# Payments: pending charge → signed webhook credits once (idempotent), bad signature rejected
WHS=${TRUEMONEY_WEBHOOK_SECRET:-sandbox-webhook-secret}
call GET /me; P0=$(echo "$BODY" | j o.state.points)
call POST /payments/truemoney/charge '{"thb":20,"phone":"0812345678","sandboxAsync":true}'
if [ "$CODE" = 202 ]; then
  PID=$(echo "$BODY" | j o.result.id); pass "TrueMoney charge created → pending ($PID)"
  hook() { local body=$1 sig=${2:-}; local ts; ts=$(date +%s); [ -z "$sig" ] && sig=$(printf '%s' "$ts.$body" | openssl dgst -sha256 -hmac "$WHS" -hex | sed 's/^.* //'); local out; out=$(curl -s -w '\n%{http_code}' -X POST "$API/payments/truemoney/webhook" -H 'Content-Type: application/json' -H "X-TrueMoney-Timestamp: $ts" -H "X-TrueMoney-Signature: sha256=$sig" -d "$body"); CODE=${out##*$'\n'}; BODY=${out%$'\n'*}; }
  EVB="{\"event_id\":\"evt_$PID\",\"reference\":\"$PID\",\"status\":\"SUCCESS\",\"amount\":\"20.00\"}"
  hook "$EVB" deadbeef; [ "$CODE" = 401 ] && pass "webhook with bad signature rejected (401)" || fail "bad-signature webhook → $CODE $BODY"
  hook "$EVB"; okish && [ "$(echo "$BODY" | j o.credited)" = true ] && pass "signed webhook → wallet credited" || fail "webhook $CODE $BODY"
  hook "$EVB"; okish && [ "$(echo "$BODY" | j o.duplicate)" = true ] && pass "same webhook replayed → ignored (duplicate event)" || fail "replay $CODE $BODY"
  hook "{\"event_id\":\"evt2_$PID\",\"reference\":\"$PID\",\"status\":\"SUCCESS\",\"amount\":\"20.00\"}"; okish && [ "$(echo "$BODY" | j o.credited)" = false ] && pass "second success event → no double credit" || fail "double credit? $CODE $BODY"
  call GET /me; P1=$(echo "$BODY" | j o.state.points); [ $((P1-P0)) = 2000 ] && pass "points +2000 exactly once ($P0 → $P1)" || fail "points delta $((P1-P0)) (expected 2000)"
  call GET "/payments/$PID"; [ "$(echo "$BODY" | j o.result.status)" = succeeded ] && pass "payment status = succeeded" || fail "payment status $BODY"
elif [ "$CODE" = 501 ]; then pass "TrueMoney live without keys → 501 ($(echo "$BODY" | j 'o.missing.join(",")'))"
else fail "charge $CODE $BODY"; fi
call POST /payments/promptpay/qr '{"thb":50}'
if [ "$CODE" = 201 ]; then pass "PromptPay QR payload $(echo "$BODY" | j 'o.result.qrPayload.slice(0,24)')…"; elif [ "$CODE" = 501 ]; then pass "PromptPay not configured → 501 (set PROMPTPAY_ID)"; else fail "promptpay $CODE $BODY"; fi
out=$(curl -s "${API}/socket.io/?EIO=4&transport=polling"); [ "${out:0:1}" = 0 ] && pass "realtime: socket.io endpoint up (/api/socket.io)" || fail "socket.io handshake: ${out:0:80}"

# Market: list → buy (points) from someone else
call POST /market/listings '{"name":"Smoke test lamp","thb":99,"category":"อื่น ๆ","condition":"ใหม่","emoji":"💡","points":9900}'; okish && LID=$(echo "$BODY" | j o.result.id) && pass "market listing created ($LID)" || fail "listing $CODE $BODY"
[ -n "${LID:-}" ] && { call DELETE "/market/listings/$LID"; okish && pass "market listing removed" || fail "remove listing $CODE $BODY"; }
call GET /me; MK=$(echo "$BODY" | j '(o.state.market.sort((a,b)=>a.thb-b.thb)[0]||{}).id')
if [ -n "$MK" ]; then
  call POST /market/orders "{\"listingId\":\"$MK\",\"method\":\"thb\",\"pay\":\"truemoney\",\"meet\":\"BTS อโศก\"}"; okish && pass "market order $MK (฿$(echo "$BODY" | j o.result.amount) via $(echo "$BODY" | j o.result.pay), sandbox=$(echo "$BODY" | j o.result.sandbox)) → $(echo "$BODY" | j o.result.orderId)" || fail "order $CODE $BODY"
else pass "market: no active listings left to buy"; fi

echo
if [ "$FAILS" = 0 ]; then echo "🎉 smoke test passed"; else echo "💥 $FAILS check(s) failed"; exit 1; fi
