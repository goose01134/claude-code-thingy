#!/bin/bash
# Installs a simulator build of Margin and takes screenshots of its main screens.
# Usage: ios/scripts/screenshots.sh path/to/Margin.app output-folder
set -euo pipefail

APP="$1"
OUT="$2"
BUNDLE_ID="app.margin.wellbeing"
mkdir -p "$OUT"

log() { echo "[$(date +%H:%M:%S)] $*"; }

# Runs a command, killing it after N seconds (macOS has no `timeout`).
limit() {
  local secs="$1"; shift
  "$@" &
  local pid=$!
  ( sleep "$secs"; kill -9 "$pid" 2>/dev/null && echo "Timed out after ${secs}s: $*" ) &
  local watcher=$!
  local rc=0
  wait "$pid" || rc=$?
  kill "$watcher" 2>/dev/null || true
  return "$rc"
}

SDK=$(xcrun --sdk iphonesimulator --show-sdk-version)
log "Simulator SDK: $SDK"
xcrun simctl list runtimes

# An iPhone on the runtime that matches this Xcode's SDK (or the newest one not newer than it),
# preferring a standard "iPhone NN Pro".
UDID=$(xcrun simctl list devices available -j | SDK="$SDK" python3 -c '
import json, os, re, sys
sdk = tuple(int(x) for x in os.environ["SDK"].split(".")[:2])
devices = json.load(sys.stdin)["devices"]
found = []
for runtime, items in devices.items():
    m = re.search(r"iOS-(\d+)-(\d+)", runtime)
    if not m:
        continue
    version = (int(m.group(1)), int(m.group(2)))
    if version > sdk:
        continue
    for d in items:
        if d["name"].startswith("iPhone"):
            pro = bool(re.fullmatch(r"iPhone \d+ Pro", d["name"]))
            found.append((version, pro, d["name"], d["udid"]))
if not found:
    sys.exit("No usable iPhone simulator found")
found.sort()
print(f"{found[-1][2]} on iOS {found[-1][0][0]}.{found[-1][0][1]}", file=sys.stderr)
print(found[-1][3])
')
log "Simulator: $UDID"

limit 60 xcrun simctl boot "$UDID" || true
limit 420 xcrun simctl bootstatus "$UDID" -b
log "Booted"
limit 30 xcrun simctl status_bar "$UDID" override --time "9:41" --batteryState charged --batteryLevel 100 \
  --cellularMode active --cellularBars 4 --wifiBars 3 || true
limit 180 xcrun simctl install "$UDID" "$APP"
log "Installed"

shot() {
  local name="$1"; shift
  limit 30 xcrun simctl terminate "$UDID" "$BUNDLE_ID" >/dev/null 2>&1 || true
  limit 90 xcrun simctl launch "$UDID" "$BUNDLE_ID" "$@" >/dev/null
  sleep 8
  limit 60 xcrun simctl io "$UDID" screenshot "$OUT/$name.png" >/dev/null 2>&1
  log "Saved $name.png"
}

limit 30 xcrun simctl ui "$UDID" appearance light || true
shot 01-setup -MarginReset YES
shot 02-home -MarginReset YES -MarginSeed YES -MarginFakeAuth YES
shot 03-apps -MarginSeed YES -MarginFakeAuth YES -MarginRoute apps
shot 04-statistics -MarginSeed YES -MarginFakeAuth YES -MarginRoute stats
shot 05-settings -MarginSeed YES -MarginFakeAuth YES -MarginRoute settings
limit 30 xcrun simctl ui "$UDID" appearance dark || true
shot 06-home-dark -MarginSeed YES -MarginFakeAuth YES
limit 30 xcrun simctl ui "$UDID" appearance light || true
log "Done"
