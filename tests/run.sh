#!/usr/bin/env bash
# Browser tests for the website, in headless Firefox. Needs: firefox, geckodriver, node 22+, python3.
# Usage: tests/run.sh            (tests docs/ as it is on disk)
# Written with AI assistance (Claude).
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"; DOCS="$HERE/../docs"
WORK="$(mktemp -d)"; trap 'kill $SRV $GD 2>/dev/null; rm -rf "$WORK"' EXIT
cp -r "$DOCS" "$WORK/site"; cp "$HERE/_phone.html" "$WORK/site/"; mkdir -p "$WORK/shots"
PORT=8790; python3 -m http.server $PORT -d "$WORK/site" >/dev/null 2>&1 & SRV=$!
geckodriver --port 4444 >/dev/null 2>&1 & GD=$!
sleep 2
U="http://127.0.0.1:$PORT"; fail=0
run() { echo "== $1"; shift; out="$("$@" 2>&1)"; code=$?; echo "$out" | grep -v '^INFO'; { [ $code != 0 ] || echo "$out" | grep -q '^FAIL'; } && fail=1; }
run "general (desktop)"  node "$HERE/general.mjs" "$U" t "$WORK/shots" desktop 1.0
run "phone 360 px"       node "$HERE/phone.mjs" "$U" 360 "$WORK/shots"
run "phone 390 px"       node "$HERE/phone.mjs" "$U" 390 "$WORK/shots"
run "somewhere else"     node "$HERE/custom.mjs" "$U" ""
run "numbers and CSV"    node "$HERE/numbers.mjs" "$U"
run "stress"             node "$HERE/stress.mjs" "$U"
run "review fixes"       node "$HERE/review.mjs" "$U"
run "3D mission replay"   node "$HERE/replay.mjs" "$U"
run "random clicking"     node "$HERE/monkey.mjs" "$U" 250
run "opened from disk"   node "$HERE/custom.mjs" "file://$(cd "$DOCS" && pwd)" ""   # docs/ itself: snap Firefox cannot read /tmp
run "science helpers" node "$HERE/science.mjs"
run "custom-place mathematics" node "$HERE/../engine/check_custom.mjs"
[ $fail = 0 ] && echo "ALL PASSED" || echo "SOME TESTS FAILED"
exit $fail
