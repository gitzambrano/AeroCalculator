"""Capture audit screenshots for AeroCalculator APK on Android emulator.

This script automates capturing 30 screenshots (6 themes x 5 screens)
from the AeroCalculator application running on an Android emulator.
"""

import argparse
import os
import subprocess
import sys
import time

# Default parameters
DEFAULT_ADB_PATH = r"C:\Users\gusta\AppData\Local\Android\Sdk\platform-tools\adb.exe"
DEFAULT_DEVICE_ID = "emulator-5554"
DEFAULT_OUTPUT_DIR = r"artifacts\screenshots\audit_apk"
DEFAULT_PACKAGE_NAME = "flightdyn.aerocalculator"

THEME_CONFIGS = [
    ("Green Peace", "green_peace", 1375),
    ("Ancient Brown", "ancient_brown", 1527),
    ("Dark Shadows", "dark_shadows", 1679),
    ("Blue Sky", "blue_sky", 1831),
    ("Red Alert", "red_alert", 1983),
    ("Orange Juice", "orange_juice", 2135),
]


class ApkScreenshotCapturer:
    """Manages emulator interaction and captures audit screenshots."""

    def __init__(self, adb_path: str, device_id: str, output_dir: str):
        self.adb = adb_path
        self.device = device_id
        self.output_dir = output_dir
        os.makedirs(self.output_dir, exist_ok=True)

    def run_cmd(self, args: list) -> subprocess.CompletedProcess:
        """Run an ADB command on the target device."""
        cmd = [self.adb, "-s", self.device] + args
        return subprocess.run(cmd, capture_output=True, text=True)

    def tap(self, x: int, y: int, delay_sec: float = 1.0) -> None:
        """Send a touch tap event to coordinates (x, y)."""
        self.run_cmd(["shell", "input", "tap", str(x), str(y)])
        time.sleep(delay_sec)

    def screencap(self, file_name: str) -> str:
        """Capture the current screen and save to output directory."""
        target_path = os.path.join(self.output_dir, file_name)
        img_bytes = subprocess.check_output(
            [self.adb, "-s", self.device, "exec-out", "screencap", "-p"]
        )
        with open(target_path, "wb") as f:
            f.write(img_bytes)
        print(f"Captured: {file_name} ({len(img_bytes):,} bytes)")
        return target_path

    def is_settings_open(self) -> bool:
        """Check if Settings overlay is currently open."""
        self.run_cmd(["shell", "uiautomator", "dump", "/sdcard/d.xml"])
        res = self.run_cmd(["shell", "grep", "-q", "SETTINGS", "/sdcard/d.xml"])
        return res.returncode == 0

    def close_settings_if_open(self) -> None:
        """Ensure Settings overlay is closed."""
        if self.is_settings_open():
            self.run_cmd(["shell", "input", "keyevent", "4"])
            time.sleep(1.0)

    def ensure_main_activity(self) -> None:
        """Ensure the main activity is active and dialogs are closed."""
        # Dismiss any open dialogs or return from sub-activities
        res = self.run_cmd(["shell", "dumpsys", "window"])
        for line in res.stdout.splitlines():
            if "mCurrentFocus" in line and ".airp" in line:
                # Close Airplane Editor
                self.tap(750, 140, 0.8)  # Tap Cancel
                self.tap(716, 1339, 1.2)  # Tap Discard
                break
        self.close_settings_if_open()

    def set_theme(self, theme_name: str, theme_y: int) -> None:
        """Switch the application theme via the Settings menu."""
        print(f"\n--- Applying Theme: {theme_name} ---")
        self.ensure_main_activity()

        # Open 3-dot overflow menu (x=1020, y=140)
        self.tap(1020, 140, 0.8)

        # Tap Settings menu item (x=822, y=650)
        self.tap(822, 650, 1.2)

        # Tap Theme row button (x=808, y=529)
        self.tap(808, 529, 1.0)

        # Tap target theme option in bottom sheet
        self.tap(540, theme_y, 3.0)

        # If theme was already selected, settings remains open; dismiss it
        self.close_settings_if_open()

    def capture_theme_screens(self, theme_slug: str) -> None:
        """Capture all 5 required screens for the current theme."""
        # 1. Airplanes tab
        print("  Capturing 01_airplanes...")
        self.tap(180, 265, 1.2)
        self.screencap(f"{theme_slug}_01_airplanes.png")

        # 2. Inputs tab
        print("  Capturing 02_inputs...")
        self.tap(540, 265, 1.2)
        self.screencap(f"{theme_slug}_02_inputs.png")

        # 3. Calculate tab
        print("  Capturing 03_calculate...")
        self.tap(900, 265, 1.2)
        self.screencap(f"{theme_slug}_03_calculate.png")

        # 4. Airplane Editor activity (Airp.bas)
        print("  Capturing 04_airplane_editor...")
        self.tap(906, 140, 1.8)  # Tap '+' button in top bar
        self.screencap(f"{theme_slug}_04_airplane_editor.png")
        # Exit Airplane Editor
        self.tap(750, 140, 0.8)  # Tap 'Cancel' in header
        self.tap(716, 1339, 1.2)  # Tap 'Discard' in confirmation dialog

        # 5. Settings overlay popup
        print("  Capturing 05_settings...")
        self.tap(1020, 140, 0.8)  # Open 3-dot overflow menu
        self.tap(822, 650, 1.5)  # Tap Settings item
        self.screencap(f"{theme_slug}_05_settings.png")
        # Close Settings popup (tap 'x' or press Back key)
        self.tap(975, 226, 0.8)

    def capture_all_themes(self) -> None:
        """Capture all screens across all 6 themes."""
        print("Starting comprehensive APK theme audit capture...")
        for theme_name, theme_slug, theme_y in THEME_CONFIGS:
            self.set_theme(theme_name, theme_y)
            self.capture_theme_screens(theme_slug)

        # Restore default Green Peace theme at completion
        print("\nRestoring default Green Peace theme...")
        self.set_theme("Green Peace", 1375)
        print("\nAll APK theme audit screenshots captured successfully.")


def main():
    parser = argparse.ArgumentParser(
        description="Capture AeroCalculator audit screenshots on Android emulator."
    )
    parser.add_argument(
        "--adb",
        default=DEFAULT_ADB_PATH,
        help="Path to adb executable",
    )
    parser.add_argument(
        "--device",
        default=DEFAULT_DEVICE_ID,
        help="Device or emulator ID",
    )
    parser.add_argument(
        "--output-dir",
        default=DEFAULT_OUTPUT_DIR,
        help="Output directory for captured screenshots",
    )
    args = parser.parse_args()

    capturer = ApkScreenshotCapturer(
        adb_path=args.adb,
        device_id=args.device,
        output_dir=args.output_dir,
    )
    capturer.capture_all_themes()


if __name__ == "__main__":
    main()
