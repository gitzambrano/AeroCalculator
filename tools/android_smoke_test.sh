#!/usr/bin/env bash
set -euo pipefail

APK_PATH="${1:?Usage: android_smoke_test.sh <apk> <api-level>}"
API_LEVEL="${2:-unknown}"
PACKAGE_NAME="flightdyn.aerocalculator"
OUT_ROOT="smoke-results/api-${API_LEVEL}"
mkdir -p "$OUT_ROOT"

adb wait-for-device
adb install -r "$APK_PATH"

resolved="$(adb shell cmd package resolve-activity --brief "$PACKAGE_NAME" 2>/dev/null | tr -d '\r' || true)"
if [[ -z "$resolved" || "$resolved" == "No activity found"* ]]; then
  echo "Unable to resolve launcher activity for $PACKAGE_NAME" >&2
  exit 1
fi
printf '%s\n' "$resolved" > "$OUT_ROOT/resolved-activity.txt"

profiles=(
  "compact:720x1280:320"
  "dense-compact:1080x1920:480"
  "modern:1080x2340:440"
  "tall:1080x2400:420"
  "tablet:1600x2560:320"
)

capture_state() {
  local dir="$1" name="$2"
  mkdir -p "$dir"
  # UiAutomator can observe the final tree a few frames before the emulator
  # compositor produces a stable screenshot after a display-size/rotation change.
  # Warm up SurfaceFlinger once and keep the second frame.
  adb shell uiautomator dump /sdcard/window.xml >/dev/null 2>&1 || true
  adb pull /sdcard/window.xml "$dir/${name}.xml" >/dev/null 2>&1 || true
  adb exec-out screencap -p > /tmp/aerocalculator-screencap-warmup.png || true
  sleep 0.6
  adb exec-out screencap -p > "$dir/${name}.png"
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

wait_for_landscape_configuration() {
  local width="$1" height="$2"
  for _ in $(seq 1 25); do
    local state
    state="$(adb shell dumpsys window windows 2>/dev/null | tr -d '\r' || true)"
    if grep -E -q "[[:space:]]land[[:space:]]" <<<"$state" && \
       grep -F -q "mBounds=Rect(0, 0 - ${width}, ${height})" <<<"$state"; then
      sleep 0.5
      return 0
    fi
    sleep 0.4
  done
  echo "Landscape configuration ${width}x${height} did not become stable." >&2
  adb shell dumpsys window windows | grep -m3 -E 'mBounds=Rect|land|port' >&2 || true
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
  adb shell uiautomator dump /sdcard/tap-node.xml >/dev/null 2>&1
  adb pull /sdcard/tap-node.xml "$tmp" >/dev/null 2>&1
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

exercise_portrait() {
  local dir="$1" width="$2" height="$3"
  adb shell am force-stop "$PACKAGE_NAME" || true; adb logcat -c; launch_app
  wait_for_ui_text 'text="Hp"'
  capture_state "$dir" "portrait-inputs-top"
  assert_alive_foreground_and_clean "$dir" "portrait-inputs-top"
  assert_dump_contains "$dir" "portrait-inputs-top" 'text="Hp"'

  scroll_down_repeatedly "$width" "$height" 8
  capture_state "$dir" "portrait-inputs-bottom"
  assert_alive_foreground_and_clean "$dir" "portrait-inputs-bottom"
  assert_dump_contains "$dir" "portrait-inputs-bottom" 'HeadWind|HeadWnd|WindSpd|Wind Speed|Wind Spd'

  tap_text "CALCULATE"
  capture_state "$dir" "portrait-outputs-top"
  assert_alive_foreground_and_clean "$dir" "portrait-outputs-top"
  assert_dump_contains "$dir" "portrait-outputs-top" 'Pressure Altitude'

  scroll_down_repeatedly "$width" "$height" 18
  capture_state "$dir" "portrait-outputs-bottom"
  assert_alive_foreground_and_clean "$dir" "portrait-outputs-bottom"
  assert_dump_contains "$dir" "portrait-outputs-bottom" 'AlongTrack Crosswind'

  tap_text "AIRPLANES"
  capture_state "$dir" "portrait-airplanes"
  assert_alive_foreground_and_clean "$dir" "portrait-airplanes"
}

# Headless emulators are more reliable if the physical display stays in its
# natural portrait size and Android rotates the Configuration itself.
exercise_landscape() {
  local dir="$1" width="$2" height="$3"
  adb shell am force-stop "$PACKAGE_NAME" || true; adb logcat -c; launch_app
  wait_for_ui_text 'text="Hp"'
  capture_state "$dir" "landscape-inputs-top"
  assert_alive_foreground_and_clean "$dir" "landscape-inputs-top"
  assert_landscape_window "$dir" "landscape-inputs-top" "$width" "$height"

  scroll_down_repeatedly "$width" "$height" 8
  capture_state "$dir" "landscape-inputs-bottom"
  assert_alive_foreground_and_clean "$dir" "landscape-inputs-bottom"

  tap_text "CALCULATE"
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

  landscape_size="${portrait_height}x${portrait_width}"
  echo "=== API $API_LEVEL / $label / landscape ${landscape_size}@${density}dpi ==="
  adb shell wm size "$size"; adb shell wm density "$density"
  adb shell settings put system accelerometer_rotation 0 || true
  adb shell settings put system user_rotation 1 || true
  adb shell cmd window user-rotation lock 1 >/dev/null 2>&1 || true
  wait_for_landscape_configuration "$portrait_height" "$portrait_width"
  exercise_landscape "$dir" "$portrait_height" "$portrait_width"
  adb shell settings put system user_rotation 0 || true
  adb shell cmd window user-rotation lock 0 >/dev/null 2>&1 || true
done

adb shell cmd window user-rotation free >/dev/null 2>&1 || true
adb shell settings put system user_rotation 0 || true
adb shell settings put system accelerometer_rotation 1 || true
adb shell wm size reset || true
adb shell wm density reset || true

echo "Multi-screen scroll/layout smoke completed successfully for API $API_LEVEL."
