"""Capture audit screenshots for AeroCalculator APK on Android emulator.

This script automates capturing 30 screenshots (6 themes x 5 screens)
from the AeroCalculator application running on an Android emulator.
"""

import argparse
import os
import subprocess
import time

# Default parameters
DEFAULT_ADB_PATH = r"C:\Users\gusta\AppData\Local\Android\Sdk\platform-tools\adb.exe"
DEFAULT_DEVICE_ID = "emulator-5554"
DEFAULT_OUTPUT_DIR = r"artifacts\screenshots\audit_apk"
DEFAULT_PACKAGE_NAME = "flightdyn.aerocalculator"

THEME_CONFIGS = [
    ("Green Peace", "green_peace", 1374),
    ("Ancient Brown", "ancient_brown", 1526),
    ("Dark Shadows", "dark_shadows", 1678),
    ("Blue Sky", "blue_sky", 1830),
    ("Red Alert", "red_alert", 1982),
    ("Orange Juice", "orange_juice", 2134),
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

    def restart_to_main(self) -> None:
        """Cleanly restart the application to the main activity."""
        self.run_cmd(["shell", "am", "force-stop", DEFAULT_PACKAGE_NAME])
        time.sleep(0.5)
        self.run_cmd(["shell", "am", "start", "-n", f"{DEFAULT_PACKAGE_NAME}/.main"])
        time.sleep(4.0)

    def set_theme(self, target_y: int) -> None:
        """Open settings and select a theme from the bottom sheet."""
        self.tap(1000, 135, 1.2)        # 3-dot overflow menu
        self.tap(750, 690, 1.5)         # Settings menu item
        self.tap(750, 520, 1.5)         # Theme row button
        self.tap(540, target_y, 6.0)    # Target theme in bottom sheet -> Activity.Recreate

    def capture_theme(self, theme_slug: str) -> None:
        """Capture all 5 screens for the current active theme."""
        print(f"\n--- Capturing theme: {theme_slug} ---")

        # 1. Airplanes tab
        print("  1. Airplanes tab")
        self.tap(180, 260, 1.0)
        self.screencap(f"{theme_slug}_01_airplanes.png")

        # 2. Inputs tab
        print("  2. Inputs tab")
        self.tap(540, 260, 1.0)
        self.screencap(f"{theme_slug}_02_inputs.png")

        # 3. Calculate tab
        print("  3. Calculate tab")
        self.tap(900, 260, 1.0)
        self.screencap(f"{theme_slug}_03_calculate.png")

        # 4. Settings overlay popup
        print("  4. Settings popup")
        self.tap(1000, 135, 1.2)        # 3-dot overflow menu
        self.tap(750, 690, 1.5)         # Settings menu item
        self.screencap(f"{theme_slug}_05_settings.png")
        self.run_cmd(["shell", "input", "keyevent", "4"])  # Close Settings
        time.sleep(1.0)

        # 5. Airplane Editor activity (Airp.bas)
        print("  5. Airplane editor")
        self.tap(890, 135, 3.0)         # Tap '+' button in top bar
        self.screencap(f"{theme_slug}_04_airplane_editor.png")
        self.restart_to_main()

    def capture_all(self) -> None:
        """Capture all 6 themes in sequential order."""
        # Ensure portrait orientation lock
        self.run_cmd(["shell", "settings", "put", "system", "accelerometer_rotation", "0"])
        self.run_cmd(["shell", "settings", "put", "system", "user_rotation", "0"])
        self.restart_to_main()

        for name, slug, target_y in THEME_CONFIGS:
            # Set target theme
            self.set_theme(target_y)
            # Capture all 5 screens
            self.capture_theme(slug)

        # Restore default Green Peace
        print("\nRestoring default Green Peace...")
        self.set_theme(1374)
        print("\nAll 30 APK theme audit screenshots captured successfully!")


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
    capturer.capture_all()


if __name__ == "__main__":
    main()
