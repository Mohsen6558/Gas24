#!/usr/bin/env bash
# Regression tests for src/api (the provincial API gateway).
# Starts a fake upstream and the gateway with PHP's built-in server; no network needed.
set -euo pipefail
REPO="$(cd "$(dirname "$0")/.." && pwd)"
WORK="$(mktemp -d)"
UP=19101; GW=19100
cleanup() { kill $(jobs -p) 2>/dev/null || true; rm -rf "$WORK"; }
trap cleanup EXIT

mkdir -p "$WORK/site" "$WORK/upstream" "$WORK/tmp"
cp -r "$REPO/src/api" "$WORK/site/api"
sed -i "s#'https://es.nigc-kerman.ir'#'http://127.0.0.1:$UP'#" "$WORK/site/api/config.php"
cat > "$WORK/upstream/index.php" <<'PHP'
<?php
header('Content-Type: application/json');
echo json_encode([
    'uri' => $_SERVER['REQUEST_URI'], 'method' => $_SERVER['REQUEST_METHOD'],
    'auth' => $_SERVER['HTTP_AUTHORIZATION'] ?? null, 'body' => file_get_contents('php://input'),
]);
PHP
php -S 127.0.0.1:$UP -t "$WORK/upstream" "$WORK/upstream/index.php" >/dev/null 2>&1 &
TMPDIR="$WORK/tmp" php -S 127.0.0.1:$GW -t "$WORK/site" >/dev/null 2>"$WORK/gateway.log" &
for _ in $(seq 50); do curl -s -o /dev/null "http://127.0.0.1:$GW/" && curl -s -o /dev/null "http://127.0.0.1:$UP/" && break; sleep 0.1; done

fail=0
# expect <description> <expected status> <body substring or -> curl args...
expect() {
  local desc="$1" want="$2" needle="$3"; shift 3
  local out code
  out="$(curl -s --noproxy '*' -w '\n%{http_code}' "$@")"
  code="${out##*$'\n'}"; out="${out%$'\n'*}"
  if [[ "$code" != "$want" || ( "$needle" != "-" && "$out" != *"$needle"* ) ]]; then
    echo "FAIL $desc: got $code ${out:0:160}"; fail=1
  else
    echo "ok   $desc"
  fi
}
API="http://127.0.0.1:$GW/api/index.php"
K=(-H "Host: kerman.gas24.ir")

expect "forwards allowlisted action, path and auth" 200 '"auth":"Bearer t"' "${K[@]}" -X POST -H "Authorization: Bearer t" --data '{"a":1}' "$API/ws-optimize/get-faq"
expect "GET generate-captcha keeps query string" 200 'generate-captcha?x=1' "${K[@]}" "$API/ws-optimize/generate-captcha?x=1"
expect "unknown action is rejected" 404 'اکشن' "${K[@]}" -X POST "$API/admin/users"
expect "path traversal is rejected" 404 - "${K[@]}" -X POST --path-as-is "$API/ws-optimize/../../admin"
expect "foreign Origin is rejected" 403 - "${K[@]}" -X POST -H "Origin: https://evil.example" "$API/ws-optimize/get-faq"
expect "look-alike Origin is rejected" 403 - "${K[@]}" -X POST -H "Origin: https://evilgas24.ir" "$API/ws-optimize/get-faq"
expect "gas24 Origin is allowed" 200 - "${K[@]}" -X POST -H "Origin: https://my.gas24.ir" "$API/ws-optimize/get-faq"
expect "preflight from gas24 Origin" 204 - "${K[@]}" -X OPTIONS -H "Origin: https://ardabil.gas24.ir" "$API/ws-optimize/send-otp"
expect "DELETE is not allowed" 405 - "${K[@]}" -X DELETE "$API/ws-optimize/get-faq"
expect "unknown province" 404 - -H "Host: nowhere.gas24.ir" -X POST "$API/ws-optimize/get-faq"
expect "planned province gives clear message" 503 'قم' -H "Host: qom.gas24.ir" -X POST "$API/ws-optimize/get-faq"
expect "missing subdomain" 400 - -H "Host: gas24.ir" -X POST "$API/ws-optimize/get-faq"

for i in 1 2 3 4 5; do
  expect "send-otp #$i within limit" 200 - "${K[@]}" -X POST --data '{"mobNo":"09120000000"}' "$API/ws-optimize/send-otp"
done
expect "send-otp #6 same mobile is rate limited" 429 'تعداد درخواست' "${K[@]}" -X POST --data '{"mobNo":"0912 000 0000"}' "$API/ws-optimize/send-otp"
expect "other mobile is not limited" 200 - "${K[@]}" -X POST --data '{"mobNo":"09129999999"}' "$API/ws-optimize/send-otp"

if grep -qE 'Bearer t|09120000000|"a":1' "$WORK/gateway.log"; then
  echo "FAIL gateway log contains request secrets or bodies"; fail=1
else
  echo "ok   gateway log has no bodies, tokens or mobile numbers"
fi
exit $fail
