#!/bin/bash
# Installs a simulator build of Margin and takes screenshots of its main screens.
# Usage: ios/scripts/screenshots.sh path/to/Margin.app output-folder
set -euo pipefail

APP="$1"
OUT="$2"
BUNDLE_ID="app.margin.wellbeing"
mkdir -p "$OUT"

# The newest iOS runtime's standard "iPhone NN Pro" if there is one, otherwise any iPhone.
UDID=$(xcrun simctl list devices available -j | python3 -c '
import json, re, sys
devices = json.load(sys.stdin)["devices"]
found = []
for runtime, items in devices.items():
    m = re.search(r"iOS-(\d+)-(\d+)", runtime)
    if not m:
        continue
    for d in items:
        if d["name"].startswith("iPhone"):
            pro = bool(re.fullmatch(r"iPhone \d+ Pro", d["name"]))
            found.append(((int(m.group(1)), int(m.group(2))), pro, d["udid"], d["name"]))
found.sort()
print(found[-1][2])
print(found[-1][3], file=sys.stderr)
')
echo "Simulator: $UDID"

xcrun simctl boot "$UDID" 2>/dev/null || true
xcrun simctl bootstatus "$UDID" -b
xcrun simctl status_bar "$UDID" override --time "9:41" --batteryState charged --batteryLevel 100 \
  --cellularMode active --cellularBars 4 --wifiBars 3 || true
xcrun simctl install "$UDID" "$APP"

shot() {
  local name="$1"; shift
  xcrun simctl terminate "$UDID" "$BUNDLE_ID" 2>/dev/null || true
  xcrun simctl launch "$UDID" "$BUNDLE_ID" "$@" >/dev/null
  sleep 7
  xcrun simctl io "$UDID" screenshot "$OUT/$name.png" >/dev/null
  echo "Saved $name.png"
}

xcrun simctl ui "$UDID" appearance light
shot 01-setup -MarginReset YES
shot 02-home -MarginReset YES -MarginSeed YES -MarginFakeAuth YES
shot 03-apps -MarginSeed YES -MarginFakeAuth YES -MarginRoute apps
shot 04-statistics -MarginSeed YES -MarginFakeAuth YES -MarginRoute stats
shot 05-settings -MarginSeed YES -MarginFakeAuth YES -MarginRoute settings
xcrun simctl ui "$UDID" appearance dark
shot 06-home-dark -MarginSeed YES -MarginFakeAuth YES
xcrun simctl ui "$UDID" appearance light
