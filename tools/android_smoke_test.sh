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

# label:physical-pixels:density-dpi. The combinations below intentionally represent
# realistic Android logical viewport sizes after px -> dp conversion, rather than
# treating CSS-like dp dimensions as physical emulator pixels.
profiles=(
  "compact:720x1280:320"       # 360 x 640 dp
  "dense-compact:1080x1920:480" # 360 x 640 dp at higher density
  "modern:1080x2340:440"       # ~393 x 851 dp
  "tall:1080x2400:420"         # ~411 x 914 dp
  "tablet:1600x2560:320"       # 800 x 1280 dp
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

launch_app() {
  adb shell monkey -p "$PACKAGE_NAME" -c android.intent.category.LAUNCHER 1 >/dev/null
  sleep 3
}

for profile in "${profiles[@]}"; do
  IFS=: read -r label size density <<< "$profile"
  width="${size%x*}"
  height="${size#*x}"
  dir="$OUT_ROOT/$label"
  mkdir -p "$dir"

  echo "=== API $API_LEVEL / $label / ${size}@${density}dpi ==="
  adb shell wm size "$size"
  adb shell wm density "$density"
  adb shell settings put system accelerometer_rotation 0
  adb shell settings put system user_rotation 0
  adb shell pm clear "$PACKAGE_NAME" >/dev/null || true
  adb logcat -c

  launch_app
  capture_state "$dir" "portrait-launch"
  assert_alive_foreground_and_clean "$dir" "portrait-launch"

  # Keep swipes well away from Android's edge-back gesture zones. This traverses
  # the app pager rather than accidentally dismissing the Activity on gesture-nav
  # versions of Android.
  start_x=$((width * 70 / 100))
  end_x=$((width * 30 / 100))
  mid_y=$((height / 2))
  for page in 1 2 3 4 5; do
    adb shell input swipe "$start_x" "$mid_y" "$end_x" "$mid_y" 350
    sleep 1
    capture_state "$dir" "portrait-page-${page}"
    assert_alive_foreground_and_clean "$dir" "portrait-page-${page}"
  done

  # Rotate the same virtual device to landscape and repeat a launch + short pager
  # traversal. This catches fixed-height/fixed-width assumptions in B4A layouts.
  adb shell settings put system user_rotation 1
  sleep 2
  adb shell am force-stop "$PACKAGE_NAME"
  adb logcat -c
  launch_app
  capture_state "$dir" "landscape-launch"
  assert_alive_foreground_and_clean "$dir" "landscape-launch"

  landscape_width="$height"
  landscape_height="$width"
  start_x=$((landscape_width * 70 / 100))
  end_x=$((landscape_width * 30 / 100))
  mid_y=$((landscape_height / 2))
  for page in 1 2 3; do
    adb shell input swipe "$start_x" "$mid_y" "$end_x" "$mid_y" 350
    sleep 1
    capture_state "$dir" "landscape-page-${page}"
    assert_alive_foreground_and_clean "$dir" "landscape-page-${page}"
  done

done

adb shell settings put system user_rotation 0 || true
adb shell settings put system accelerometer_rotation 1 || true
adb shell wm size reset || true
adb shell wm density reset || true

echo "Smoke test completed successfully for API $API_LEVEL."
