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

# label:physical-pixels:density-dpi. These cover compact phones, a dense small
# phone, modern/tall phones, and an 800dp-wide tablet viewport.
profiles=(
  "compact:720x1280:320"        # 360 x 640 dp
  "dense-compact:1080x1920:480" # 360 x 640 dp at xxhdpi
  "modern:1080x2340:440"        # ~393 x 851 dp
  "tall:1080x2400:420"          # ~411 x 914 dp
  "tablet:1600x2560:320"        # 800 x 1280 dp
)

capture_state() {
  local dir="$1"
  local name="$2"
  mkdir -p "$dir"
  adb exec-out screencap -p > "$dir/${name}.png"
  adb shell uiautomator dump /sdcard/window.xml >/dev/null 2>&1 || true
  adb pull /sdcard/window.xml "$dir/${name}.xml" >/dev/null 2>&1 || true
  adb shell dumpsys window windows > "$dir/${name}-window.txt" || true
}

foreground_activity() {
  local resumed
  resumed="$(adb shell dumpsys activity activities 2>/dev/null | grep -m1 -E 'mResumedActivity|topResumedActivity' | tr -d '\r' || true)"
  if [[ -n "$resumed" ]]; then
    printf '%s' "$resumed"
    return
  fi
  adb shell dumpsys window windows 2>/dev/null | grep -m1 -E 'mCurrentFocus|mFocusedApp' | tr -d '\r' || true
}

assert_alive_foreground_and_clean() {
  local dir="$1"
  local stage="$2"
  local pid foreground
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
  local dir="$1"
  local stage="$2"
  local pattern="$3"
  local xml="$dir/${stage}.xml"
  if [[ ! -s "$xml" ]] || ! grep -E -q "$pattern" "$xml"; then
    echo "Expected UI text '$pattern' was not visible at $stage" >&2
    return 1
  fi
}

launch_app() {
  adb shell monkey -p "$PACKAGE_NAME" -c android.intent.category.LAUNCHER 1 >/dev/null
  sleep 3
}

# Coordinates are derived from the B4A title layout: tabs are centered around
# 80dp from the Activity top and occupy thirds of the screen.
tap_tab() {
  local which="$1" width="$2" density="$3"
  local x y
  y=$((80 * density / 160))
  case "$which" in
    airplanes) x=$((width / 6)) ;;
    inputs) x=$((width / 2)) ;;
    calculate) x=$((width * 5 / 6)) ;;
    *) echo "unknown tab: $which" >&2; return 1 ;;
  esac
  adb shell input tap "$x" "$y"
  sleep 1
}

scroll_down_repeatedly() {
  local width="$1" height="$2" count="$3"
  local x sy ey
  x=$((width / 2))
  sy=$((height * 82 / 100))
  ey=$((height * 30 / 100))
  for _ in $(seq 1 "$count"); do
    adb shell input swipe "$x" "$sy" "$x" "$ey" 420
    sleep 0.35
  done
}

exercise_orientation() {
  local dir="$1" tag="$2" width="$3" height="$4" density="$5"

  adb shell am force-stop "$PACKAGE_NAME" || true
  adb logcat -c
  launch_app
  capture_state "$dir" "${tag}-inputs-top"
  assert_alive_foreground_and_clean "$dir" "${tag}-inputs-top"
  assert_dump_contains "$dir" "${tag}-inputs-top" 'text="Hp"'

  # Scroll the long Inputs page all the way to the wind fields. This proves that
  # content below the fold is reachable rather than merely present off-screen.
  scroll_down_repeatedly "$width" "$height" 8
  capture_state "$dir" "${tag}-inputs-bottom"
  assert_alive_foreground_and_clean "$dir" "${tag}-inputs-bottom"
  assert_dump_contains "$dir" "${tag}-inputs-bottom" 'HeadWind|HeadWnd|WindSpd|Wind Speed|Wind Spd'

  # Use the top tab instead of a horizontal gesture. Android 16 edge/back gesture
  # handling must not be confused with app pager navigation in a layout test.
  tap_tab calculate "$width" "$density"
  capture_state "$dir" "${tag}-outputs-top"
  assert_alive_foreground_and_clean "$dir" "${tag}-outputs-top"
  assert_dump_contains "$dir" "${tag}-outputs-top" 'Pressure Altitude'

  scroll_down_repeatedly "$width" "$height" 18
  capture_state "$dir" "${tag}-outputs-bottom"
  assert_alive_foreground_and_clean "$dir" "${tag}-outputs-bottom"
  assert_dump_contains "$dir" "${tag}-outputs-bottom" 'AlongTrack Crosswind'

  tap_tab airplanes "$width" "$density"
  capture_state "$dir" "${tag}-airplanes"
  assert_alive_foreground_and_clean "$dir" "${tag}-airplanes"
}

for profile in "${profiles[@]}"; do
  IFS=: read -r label size density <<< "$profile"
  portrait_width="${size%x*}"
  portrait_height="${size#*x}"
  dir="$OUT_ROOT/$label"
  mkdir -p "$dir"

  echo "=== API $API_LEVEL / $label / portrait ${size}@${density}dpi ==="
  adb shell wm size "$size"
  adb shell wm density "$density"
  adb shell settings put system accelerometer_rotation 0 || true
  adb shell settings put system user_rotation 0 || true
  adb shell cmd window user-rotation lock 0 >/dev/null 2>&1 || true
  adb shell pm clear "$PACKAGE_NAME" >/dev/null || true
  exercise_orientation "$dir" "portrait" "$portrait_width" "$portrait_height" "$density"

  # Force a true landscape viewport by swapping the display override itself. This
  # works consistently on both Android 9 and Android 16; relying only on the old
  # user_rotation setting does not rotate API 36 headless emulators reliably.
  landscape_size="${portrait_height}x${portrait_width}"
  echo "=== API $API_LEVEL / $label / landscape ${landscape_size}@${density}dpi ==="
  adb shell wm size "$landscape_size"
  adb shell wm density "$density"
  adb shell cmd window user-rotation free >/dev/null 2>&1 || true
  sleep 2
  if ! adb shell wm size | tr -d '\r' | grep -q "Override size: ${landscape_size}"; then
    echo "Landscape display override did not apply: $(adb shell wm size)" >&2
    exit 1
  fi
  exercise_orientation "$dir" "landscape" "$portrait_height" "$portrait_width" "$density"
done

adb shell cmd window user-rotation free >/dev/null 2>&1 || true
adb shell settings put system user_rotation 0 || true
adb shell settings put system accelerometer_rotation 1 || true
adb shell wm size reset || true
adb shell wm density reset || true

echo "Multi-screen scroll/layout smoke completed successfully for API $API_LEVEL."
