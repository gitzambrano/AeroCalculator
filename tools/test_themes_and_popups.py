import subprocess
import time
import os

adb = r"C:\Users\gusta\AppData\Local\Android\Sdk\platform-tools\adb.exe"
device = "emulator-5554"
out_dir = r"artifacts\screenshots\theme_and_popup_audit"
os.makedirs(out_dir, exist_ok=True)

def cmd(args):
    return subprocess.run([adb, "-s", device] + args, capture_output=True, text=True)

def screencap(name):
    path = os.path.join(out_dir, name)
    img = subprocess.check_output([adb, "-s", device, "exec-out", "screencap", "-p"])
    with open(path, "wb") as f:
        f.write(img)
    print(f"Captured: {path}")

def tap(x, y):
    cmd(["shell", "input", "tap", str(x), str(y)])
    time.sleep(1.0)

def main():
    print("1. Installing APK...")
    cmd(["install", "-r", r"Objects\AeroCalculator.apk"])
    
    print("2. Launching app...")
    cmd(["shell", "monkey", "-p", "flightdyn.aerocalculator", "-c", "android.intent.category.LAUNCHER", "1"])
    time.sleep(3.0)

    print("3. Capturing main inputs screen (Green Peace)...")
    screencap("01_inputs_wing_area_sref.png")

    print("4. Opening bottom sheet popup (Altitude type)...")
    tap(250, 550) # tap btnAltType
    time.sleep(1.0)
    screencap("02_bottomsheet_alt_type.png")
    tap(500, 200) # tap scrim to dismiss
    time.sleep(0.8)

    print("5. Opening bottom sheet popup (Speed type)...")
    tap(250, 850) # tap btnSpdType
    time.sleep(1.0)
    screencap("03_bottomsheet_speed_type.png")
    tap(500, 200) # tap scrim to dismiss
    time.sleep(0.8)

    print("6. Opening 3-dot menu and Settings...")
    tap(1020, 140) # tap 3-dot menu
    time.sleep(0.8)
    tap(800, 650) # tap Settings (4th item in menu)
    time.sleep(1.5)
    screencap("04_settings_overlay.png")
    cmd(["shell", "input", "keyevent", "4"]) # BACK to close settings
    time.sleep(0.8)

    print("7. Opening Airplane Editor dialog...")
    tap(890, 140) # tap + button
    time.sleep(1.5)
    screencap("05_airplane_editor.png")
    tap(750, 140) # tap Cancel button
    time.sleep(0.8)

    print("8. Opening Calculate tab...")
    tap(900, 220) # tap CALCULATE tab
    time.sleep(1.2)
    screencap("06_calculate_tab.png")

    print("9. Opening Airplanes tab...")
    tap(180, 220) # tap AIRPLANES tab
    time.sleep(1.2)
    screencap("07_airplanes_tab.png")
    
    tap(540, 220) # back to INPUTS tab
    time.sleep(0.8)

    # 10. Switch to Dark Shadows
    print("10. Switching to Dark Shadows...")
    tap(1020, 140) # menu
    time.sleep(0.8)
    tap(800, 650) # settings
    time.sleep(1.2)
    tap(750, 550) # Theme button
    time.sleep(1.2)
    screencap("08_bottomsheet_theme_choice.png")
    tap(540, 1750) # Dark Shadows
    time.sleep(2.5) # activity recreates
    screencap("09_theme_dark_shadows_inputs.png")

    tap(900, 220) # CALCULATE tab
    time.sleep(1.0)
    screencap("10_theme_dark_shadows_calc.png")

    tap(890, 140) # + button (Airplane editor in dark mode)
    time.sleep(1.2)
    screencap("11_theme_dark_shadows_airplane_editor.png")
    tap(750, 140) # Cancel button
    time.sleep(0.8)

    # Switch back to Green Peace
    print("11. Switching back to Green Peace...")
    tap(1020, 140)
    time.sleep(0.8)
    tap(800, 650)
    time.sleep(1.2)
    tap(750, 550) # Theme button
    time.sleep(1.2)
    tap(540, 1480) # Green Peace
    time.sleep(2.5)
    screencap("12_back_to_green_peace.png")

    print("Done audit captures!")

if __name__ == "__main__":
    main()
