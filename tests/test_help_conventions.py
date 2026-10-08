"""Verify technical help wording and sign conventions across web and Android."""
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CAT = json.loads((ROOT / "docs/quantity_catalog.json").read_text(encoding="utf-8"))
APK = (ROOT / "AeroNames.bas").read_text(encoding="utf-8")
WEB = (ROOT / "web/src/catalog.ts").read_text(encoding="utf-8")
MAIN = (ROOT / "web/src/main.ts").read_text(encoding="utf-8")

class HelpConventionTests(unittest.TestCase):
    def test_angles(self):
        i = CAT["inputs"]
        for key in ("Heading", "Track", "Wind Direction", "Runway Angle"):
            with self.subTest(key=key):
                self.assertIn("true north", i[key]["definition"])
                self.assertIn("Positive: clockwise", i[key]["definition"])
        self.assertIn("nose to the right", i["Heading"]["definition"])
        self.assertIn("relative wind coming from the right", i["Sideslip"]["definition"])
        self.assertIn("wind coming from the right", i["CrossWind"]["definition"])
        self.assertIn("wind from ahead", i["HeadWind"]["definition"])

    def test_pressures_and_physics(self):
        for section, cas, eas in (("inputs", "CAS", "EAS"),
                                  ("results", "Calibrated Airspeed", "Equivalent Airspeed")):
            self.assertIn("same impact pressure", CAT[section][cas]["definition"])
            self.assertIn("same dynamic pressure", CAT[section][eas]["definition"])
        self.assertIn("Sutherland", CAT["results"]["Viscosity"]["physics"])
        self.assertIn("molecular momentum transport", CAT["results"]["Viscosity"]["physics"])
        self.assertIn("11 km", CAT["results"]["Temperature Altitude"]["physics"])

    def test_weights_and_factor(self):
        for key in ("mass.MTOW", "mass.MLW", "mass.MZFW", "mass.BOW"):
            self.assertIn("weight", CAT["editor"][key]["full"])
        self.assertIn("manufacturer", CAT["editor"]["mass.BOW"]["definition"])
        self.assertNotIn("operator", CAT["editor"]["mass.BOW"]["definition"])
        self.assertIn("multiplier", CAT["inputs"]["Vs Factor"]["definition"])
        self.assertIn("Ratio of current calibrated airspeed", CAT["results"]["Vs Factor"]["definition"])
        self.assertIn('showContextualHelp(name === "Vs Factor" ? "Vs Factor Output" : name)', MAIN)
        self.assertIn('If k = "Vs Factor" Then k = "Vs Factor Output"', (ROOT / "AeroCalculator.b4a").read_text(encoding="utf-8"))

    def test_sync(self):
        for section in CAT.values():
            for key, item in section.items():
                with self.subTest(key=key):
                    self.assertIn("Definition: " + item["definition"], APK)
                    if item["physics"]:
                        self.assertIn("Model Physics: " + item["physics"], APK)
        for key in ("Heading", "Sideslip", "CrossWind", "CAS", "EAS"):
            self.assertIn("desc: " + json.dumps(CAT["inputs"][key]["definition"], ensure_ascii=False), WEB)

if __name__ == "__main__":
    unittest.main()
