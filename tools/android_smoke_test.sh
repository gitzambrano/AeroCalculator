#!/usr/bin/env bash
set -euo pipefail

APK_PATH="${1:?Usage: android_smoke_test.sh <apk> <api-level>}"
API_LEVEL="${2:-unknown}"
PACKAGE_NAME="flightdyn.aerocalculator"
PRIMARY_ALTITUDE_PATTERN='text="(HP|H[Pp]|Altitude H[Pp])"'
OUT_ROOT="smoke-results/api-${API_LEVEL}"
FULL_VISUAL_AUDIT="${AEROCALC_FULL_VISUAL_AUDIT:-0}"
mkdir -p "$OUT_ROOT"

adb wait-for-device
adb install -r "$APK_PATH"

resolved="$(adb shell cmd package resolve-activity --brief "$PACKAGE_NAME" 2>/dev/null | tr -d '\r' || true)"
if [[ -z "$resolved" || "$resolved" == "No activity found"* ]]; then
  echo "Unable to resolve launcher activity for $PACKAGE_NAME" >&2
  exit 1
fi
printf '%s\n' "$resolved" > "$OUT_ROOT/resolved-activity.txt"

if [[ "$FULL_VISUAL_AUDIT" == "1" ]]; then
  profiles=(
    "micro:520x1040:320"
    "tiny:560x1120:320"
    "narrow:640x1280:320"
    "compact:720x1280:320"
    "dense-compact:1080x1920:480"
    "modern:1080x2340:440"
    "tall:1080x2400:420"
    "tablet:1600x2560:320"
  )
else
  profiles=(
    "tiny:560x1120:320"
    "modern:1080x2340:440"
    "tablet:1600x2560:320"
  )
fi

capture_state() {
  local dir="$1" name="$2"
  mkdir -p "$dir"
  adb shell rm -f /sdcard/window.xml >/dev/null 2>&1 || true
  adb shell uiautomator dump /sdcard/window.xml >/dev/null 2>&1 || true
  adb pull /sdcard/window.xml "$dir/${name}.xml" >/dev/null 2>&1 || true
  if [[ "$FULL_VISUAL_AUDIT" == "1" ]]; then
    adb exec-out screencap -p > /tmp/aerocalculator-screencap-warmup.png || true
    sleep 0.6
    adb exec-out screencap -p > "$dir/${name}.png"
  fi
  adb shell dumpsys window windows > "$dir/${name}-window.txt" || true
}

foreground_activity() {
  local resumed
  resumed="$(adb shell dumpsys activity activities 2>/dev/null | grep -m1 -E 'mResumedActivity|topResumedActivity' | tr -d '\r' || true)"
  if [[ -n "$resumed" ]]; then printf '%s' "$resumed"; return; fi
  adb shell dumpsys window windows 2>/dev/null | grep -m1 -E 'mCurrentFocus|mFocusedApp' | tr -d '\r' || true
}

assert_alive_foreground_and_clean() {
  local dir="$1" stage="$2" pid foreground
  pid="$(adb shell pidof "$PACKAGE_NAME" | tr -d '\r' || true)"
  if [[ -z "$pid" ]]; then
    echo "App process is not alive at $stage" >&2
    adb logcat -d > "$dir/${stage}-logcat.txt" || true
    return 1
  fi
  foreground="$(foreground_activity)"
  printf '%s\n' "$foreground" > "$dir/${stage}-foreground.txt"
  if [[ "$foreground" != *"$PACKAGE_NAME"* ]]; then
    echo "AeroCalculator is not the foreground app at $stage: $foreground" >&2
    adb logcat -d > "$dir/${stage}-logcat.txt" || true
    return 1
  fi
  adb logcat -d > "$dir/${stage}-logcat.txt" || true
  if grep -E -i "FATAL EXCEPTION|ANR in ${PACKAGE_NAME}|Process: ${PACKAGE_NAME}.*has died" "$dir/${stage}-logcat.txt" >/dev/null; then
    echo "Android runtime failure detected at $stage" >&2
    return 1
  fi
}

assert_dump_contains() {
  local dir="$1" stage="$2" pattern="$3" xml="$1/$2.xml"
  if [[ ! -s "$xml" ]] || ! grep -E -q "$pattern" "$xml"; then
    echo "Expected UI text '$pattern' was not visible at $stage" >&2
    return 1
  fi
}

wait_for_ui_text() {
  local pattern="$1" tries="${2:-20}" tmp="$OUT_ROOT/wait-ui.xml"
  for _ in $(seq 1 "$tries"); do
    rm -f "$tmp"
    adb shell uiautomator dump /sdcard/wait-ui.xml >/dev/null 2>&1 || true
    adb pull /sdcard/wait-ui.xml "$tmp" >/dev/null 2>&1 || true
    if [[ -s "$tmp" ]] && grep -E -q "$pattern" "$tmp"; then
      sleep 0.4
      return 0
    fi
    sleep 0.35
  done
  echo "Timed out waiting for UI pattern: $pattern" >&2
  return 1
}

assert_landscape_window() {
  local dir="$1" stage="$2" width="$3" height="$4" file="$1/$2-window.txt"
  if ! grep -E -q "[[:space:]]land[[:space:]]" "$file"; then
    echo "Android did not report landscape configuration at $stage" >&2
    return 1
  fi
  if ! grep -F -q "mBounds=Rect(0, 0 - ${width}, ${height})" "$file"; then
    echo "Landscape bounds ${width}x${height} were not reported at $stage" >&2
    return 1
  fi
}

launch_app() {
  adb shell monkey -p "$PACKAGE_NAME" -c android.intent.category.LAUNCHER 1 >/dev/null
  sleep 3
}

tap_text() {
  local text="$1" tmp="$OUT_ROOT/tap-node.xml" xy
  # Never reuse a dump from an earlier profile: a failed dump would otherwise
  # tap stale coordinates from a different screen size.
  for _ in 1 2 3; do
    rm -f "$tmp"
    adb shell rm -f /sdcard/tap-node.xml >/dev/null 2>&1 || true
    adb shell uiautomator dump /sdcard/tap-node.xml >/dev/null 2>&1 || true
    adb pull /sdcard/tap-node.xml "$tmp" >/dev/null 2>&1 || true
    [[ -s "$tmp" ]] && break
    sleep 0.6
  done
  if [[ ! -s "$tmp" ]]; then
    echo "uiautomator dump failed while looking for: $text" >&2
    return 1
  fi
  xy="$(python - "$tmp" "$text" <<'PY'
import re, sys, xml.etree.ElementTree as ET
path, wanted = sys.argv[1], sys.argv[2]
root = ET.parse(path).getroot()
for n in root.iter('node'):
    if n.attrib.get('text','').strip().upper() == wanted.upper():
        m = re.fullmatch(r'\[(-?\d+),(-?\d+)\]\[(-?\d+),(-?\d+)\]', n.attrib.get('bounds',''))
        if m:
            x1,y1,x2,y2 = map(int,m.groups())
            print(f'{(x1+x2)//2} {(y1+y2)//2}')
            break
PY
)"
  if [[ -z "$xy" ]]; then
    echo "Unable to find UI node with text: $text" >&2
    return 1
  fi
  read -r x y <<< "$xy"
  echo "tap '$text' at $x,$y"
  adb shell input tap "$x" "$y"
  sleep 1
}

scroll_down_repeatedly() {
  local width="$1" height="$2" count="$3" x sy ey
  x=$((width / 2)); sy=$((height * 82 / 100)); ey=$((height * 30 / 100))
  for _ in $(seq 1 "$count"); do
    adb shell input swipe "$x" "$sy" "$x" "$ey" 420
    sleep 0.35
  done
}

# Switch tabs and wait for the target page. A tap during scroll settling can be
# lost, so tap once more before failing.
open_tab() {
  local text="$1" pattern="$2"
  tap_text "$text"
  if ! wait_for_ui_text "$pattern" 10; then
    tap_text "$text"
    wait_for_ui_text "$pattern" 20
  fi
}

# Older emulators can drop swipes right after a display-size change. After the
# fixed swipe batch, keep scrolling until the expected bottom text is visible.
scroll_until_text() {
  local width="$1" height="$2" count="$3" pattern="$4" extra="${5:-12}" tmp="$OUT_ROOT/scroll-ui.xml"
  scroll_down_repeatedly "$width" "$height" "$count"
  for _ in $(seq 1 "$extra"); do
    rm -f "$tmp"
    adb shell uiautomator dump /sdcard/scroll-ui.xml >/dev/null 2>&1 || true
    adb pull /sdcard/scroll-ui.xml "$tmp" >/dev/null 2>&1 || true
    if [[ -s "$tmp" ]] && grep -E -q "$pattern" "$tmp"; then
      return 0
    fi
    sleep 0.6
    scroll_down_repeatedly "$width" "$height" 2
  done
}

exercise_portrait() {
  local dir="$1" width="$2" height="$3"
  adb shell am force-stop "$PACKAGE_NAME" || true; adb logcat -c; launch_app
  wait_for_ui_text "$PRIMARY_ALTITUDE_PATTERN"
  capture_state "$dir" "portrait-inputs-top"
  assert_alive_foreground_and_clean "$dir" "portrait-inputs-top"
  assert_dump_contains "$dir" "portrait-inputs-top" "$PRIMARY_ALTITUDE_PATTERN"
  scroll_until_text "$width" "$height" 8 'Headwind|HeadWind|HeadWnd|WindSpd|Wind Speed|Wind Spd'
  capture_state "$dir" "portrait-inputs-bottom"
  assert_alive_foreground_and_clean "$dir" "portrait-inputs-bottom"
  assert_dump_contains "$dir" "portrait-inputs-bottom" 'Headwind|HeadWind|HeadWnd|WindSpd|Wind Speed|Wind Spd'
  open_tab "CALCULATE" 'Pressure Altitude'
  capture_state "$dir" "portrait-outputs-top"
  assert_alive_foreground_and_clean "$dir" "portrait-outputs-top"
  assert_dump_contains "$dir" "portrait-outputs-top" 'Pressure Altitude'
  scroll_until_text "$width" "$height" 18 'Along[- ]Track Crosswind'
  capture_state "$dir" "portrait-outputs-bottom"
  assert_alive_foreground_and_clean "$dir" "portrait-outputs-bottom"
  assert_dump_contains "$dir" "portrait-outputs-bottom" 'Along[- ]Track Crosswind'
  tap_text "AIRPLANES"
  capture_state "$dir" "portrait-airplanes"
  assert_alive_foreground_and_clean "$dir" "portrait-airplanes"
}

exercise_landscape() {
  local dir="$1" width="$2" height="$3"
  adb shell am force-stop "$PACKAGE_NAME" || true; adb logcat -c; launch_app
  wait_for_ui_text "$PRIMARY_ALTITUDE_PATTERN"
  capture_state "$dir" "landscape-inputs-top"
  assert_alive_foreground_and_clean "$dir" "landscape-inputs-top"
  assert_landscape_window "$dir" "landscape-inputs-top" "$width" "$height"
  scroll_down_repeatedly "$width" "$height" 8
  capture_state "$dir" "landscape-inputs-bottom"
  assert_alive_foreground_and_clean "$dir" "landscape-inputs-bottom"
  open_tab "CALCULATE" 'Pressure Altitude'
  capture_state "$dir" "landscape-outputs-top"
  assert_alive_foreground_and_clean "$dir" "landscape-outputs-top"
  scroll_down_repeatedly "$width" "$height" 18
  capture_state "$dir" "landscape-outputs-bottom"
  assert_alive_foreground_and_clean "$dir" "landscape-outputs-bottom"
  tap_text "AIRPLANES"
  capture_state "$dir" "landscape-airplanes"
  assert_alive_foreground_and_clean "$dir" "landscape-airplanes"
}

for profile in "${profiles[@]}"; do
  IFS=: read -r label size density <<< "$profile"
  portrait_width="${size%x*}"; portrait_height="${size#*x}"
  dir="$OUT_ROOT/$label"; mkdir -p "$dir"

  echo "=== API $API_LEVEL / $label / portrait ${size}@${density}dpi ==="
  adb shell wm size "$size"; adb shell wm density "$density"
  adb shell settings put system accelerometer_rotation 0 || true
  adb shell settings put system user_rotation 0 || true
  adb shell cmd window user-rotation lock 0 >/dev/null 2>&1 || true
  adb shell pm clear "$PACKAGE_NAME" >/dev/null || true
  exercise_portrait "$dir" "$portrait_width" "$portrait_height"

  landscape_width="$portrait_height"
  landscape_height="$portrait_width"
  if (( landscape_width > 1920 )); then
    landscape_height=$((portrait_width * 1920 / portrait_height))
    landscape_width=1920
  fi
  landscape_size="${landscape_width}x${landscape_height}"
  echo "=== API $API_LEVEL / $label / landscape ${landscape_size}@${density}dpi ==="
  adb shell settings put system accelerometer_rotation 0 || true
  adb shell settings put system user_rotation 0 || true
  adb shell cmd window user-rotation free >/dev/null 2>&1 || true
  adb shell wm size "$landscape_size"; adb shell wm density "$density"
  sleep 2
  if ! adb shell wm size | tr -d '\r' | grep -q "Override size: ${landscape_size}"; then
    echo "Landscape display override did not apply: $(adb shell wm size)" >&2
    exit 1
  fi
  exercise_landscape "$dir" "$landscape_width" "$landscape_height"
done

adb shell cmd window user-rotation free >/dev/null 2>&1 || true
adb shell settings put system user_rotation 0 || true
adb shell settings put system accelerometer_rotation 1 || true
adb shell wm size reset || true
adb shell wm density reset || true

echo "Multi-screen scroll/layout smoke completed successfully for API $API_LEVEL."
