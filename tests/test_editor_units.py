"""Regression checks for aircraft profile unit conversion and swipe isolation.

The browser E2E suite validates numerical conversions and touch behavior.
These portable checks also guard the Android implementation in CI.
"""
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APK = (ROOT / "Airp.bas").read_text(encoding="utf-8-sig")
WEB = (ROOT / "web/src/main.ts").read_text(encoding="utf-8")


class EditorUnitsParityTests(unittest.TestCase):
    def test_android_editor_converts_all_reference_values(self):
        self.assertIn("Sub ConvertAircraftEdit(", APK)
        for helper in ("AircraftAreaFactor", "AircraftLengthFactor", "AircraftWeightFactor"):
            self.assertIn("Private Sub " + helper, APK)
        self.assertIn("ConvertAircraftEdit(edtSref, AircraftAreaFactor(record), AircraftAreaFactor(idx))", APK)
        self.assertIn("ConvertAircraftEdit(edtcref, AircraftLengthFactor(record), AircraftLengthFactor(idx))", APK)
        for i in range(1, 7):
            self.assertIn(f"ConvertAircraftEdit(edtWeight{i}, oldFactor, newFactor)", APK)
        self.assertIn("If idx <> record Then", APK)
        self.assertIn("raw.Length = 0", APK)

    def test_web_editor_converts_all_six_weight_fields(self):
        self.assertIn("function convertProfileEditorUnit(", WEB)
        self.assertIn("WEIGHT_KEYS.map((key) => `profile-weight-${key}`)", WEB)
        self.assertIn('["profile-sref-unit", ["profile-sref"], units.areaToM2, "Wing Area Unit"]', WEB)
        self.assertIn('["profile-cref-unit", ["profile-cref"], lengthAnyToM, "Chord Unit"]', WEB)
        self.assertIn("converted.toPrecision(12)", WEB)

    def test_swipe_blocks_synthetic_click_and_cancels_long_press(self):
        self.assertIn('shell.addEventListener("click", (event) => {', WEB)
        self.assertIn("event.stopImmediatePropagation();", WEB)
        self.assertIn("movedHorizontally", WEB)
        self.assertIn("Math.hypot(event.clientX - downX, event.clientY - downY) > 10", WEB)


if __name__ == "__main__":
    unittest.main()
