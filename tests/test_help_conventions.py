"""Regression tests for synchronized aircraft help text and selector spacing."""
from __future__ import annotations

import json
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CAT = json.loads((ROOT / "docs/quantity_catalog.json").read_text(encoding="utf-8"))
ANDROID = (ROOT / "AeroNames.bas").read_text(encoding="utf-8")
MAIN_B4A = (ROOT / "AeroCalculator.b4a").read_text(encoding="utf-8-sig")
AIRP_B4A = (ROOT / "Airp.bas").read_text(encoding="utf-8-sig")
WEB = (ROOT / "web/src/catalog.ts").read_text(encoding="utf-8")
WEB_MAIN = (ROOT / "web/src/main.ts").read_text(encoding="utf-8")
CSS = (ROOT / "web/src/style.css").read_text(encoding="utf-8")


def _web_entries() -> dict[str, dict[str, str]]:
    entries = {}
    pattern = r'^  "((?:\\.|[^"\\])+)": \{([\s\S]*?)^  \},'
    for match in re.finditer(pattern, WEB, re.MULTILINE):
        key = json.loads('"' + match.group(1) + '"')
        body = match.group(2)
        desc = re.search(r'^    desc: ("(?:\\.|[^"\\])*"),\s*$', body, re.MULTILINE)
        if desc:
            entries[key] = {"definition": json.loads(desc.group(1))}
    return entries


def _ts_helpers(name: str) -> dict[str, str]:
    pattern = rf'const {re.escape(name)}: Record<string, string> = \{{(.*?)\n\}};'
    match = re.search(pattern, WEB_MAIN, re.DOTALL)
    assert match is not None, name
    return {
        json.loads('"' + key + '"'): json.loads(value)
        for key, value in re.findall(r'^  "((?:\\.|[^"\\])+)": ("(?:\\.|[^"\\])*"),$', match.group(1), re.MULTILINE)
    }


def _android_cases() -> dict[str, str]:
    cases = list(re.finditer(r'^    Case "([^"]+)"\s*$', ANDROID, re.MULTILINE))
    return {
        match.group(1): ANDROID[match.end():cases[i + 1].start() if i + 1 < len(cases) else len(ANDROID)]
        for i, match in enumerate(cases)
    }


class HelpConventionTests(unittest.TestCase):
    def test_all_input_output_editor_help_texts_match(self):
        """Every catalog entry must agree with the APK and the web modal."""
        web = _web_entries()
        android = _android_cases()
        input_helper = _ts_helpers("FIELD_HELPERS")
        result_helper = _ts_helpers("RESULT_HELPERS")

        for section in ("inputs", "results", "editor"):
            for key, item in CAT[section].items():
                with self.subTest(section=section, key=key):
                    # Both clients use the same concise definition.
                    android_key = "Vs Factor Output" if section == "results" and key == "Vs Factor" else key
                    web_key = android_key
                    self.assertIn(android_key, android)
                    self.assertIn("Definition: " + item["definition"], android[android_key])
                    self.assertIn(web_key, web)
                    self.assertEqual(item["definition"], web[web_key]["definition"])
                    if section == "inputs":
                        self.assertEqual(item["definition"], input_helper[key])
                    if section == "results":
                        self.assertEqual(item["definition"], result_helper[key])

    def test_no_separate_model_physics_in_any_help(self):
        for section, items in CAT.items():
            for key, item in items.items():
                with self.subTest(section=section, key=key):
                    self.assertNotIn("physics", item)
                    self.assertTrue(item["definition"].strip())
        self.assertNotIn("Model Physics", ANDROID)
        self.assertNotIn("Model Physics", MAIN_B4A)
        self.assertNotIn("model: ", WEB)
        self.assertNotIn('result-tooltip-range-box', WEB_MAIN)
        self.assertNotIn('modelText', (ROOT / "ClsBottomSheet.bas").read_text(encoding="utf-8-sig"))

    def test_common_quantities_are_identical_across_input_output(self):
        pairs = (
            ("Hp", "Pressure Altitude"),
            ("Hg", "Geometric Altitude"),
            ("P", "Pressure"),
            ("Δ ISA", "Delta ISA"),
            ("OAT", "Temperature"),
            ("TAS", "True Airspeed"),
            ("CAS", "Calibrated Airspeed"),
            ("EAS", "Equivalent Airspeed"),
            ("CL", "Lift Coefficient CL"),
            ("Qdyn", "Dynamic Pressure"),
            ("Qc", "Impact Pressure"),
            ("Heading", "Heading Angle Ψ"),
            ("Track", "Track Angle"),
            ("Sideslip", "Sideslip Angle β"),
            ("Drift", "Drift Angle"),
        )
        for incoming, outgoing in pairs:
            with self.subTest(input=incoming, output=outgoing):
                self.assertEqual(CAT["inputs"][incoming]["definition"],
                                 CAT["results"][outgoing]["definition"])

    def test_physical_definitions_and_sign_conventions(self):
        for section, key in (("inputs", "P"), ("results", "Pressure"),
                             ("results", "Density")):
            self.assertIn("ideal gas law", CAT[section][key]["definition"])
        self.assertIn("Sutherland's law", CAT["results"]["Viscosity"]["definition"])
        self.assertIn("shear stress", CAT["results"]["Viscosity"]["definition"])
        self.assertIn("Kinetic energy per unit volume", CAT["inputs"]["Qdyn"]["definition"])
        self.assertIn("onset of stall", CAT["inputs"]["CLmax"]["definition"])
        self.assertIn("equals CLmax", CAT["results"]["Stall Speed Vs"]["definition"])
        self.assertIn("nose to the right", CAT["inputs"]["Heading"]["definition"])
        self.assertIn("relative wind coming from the right", CAT["inputs"]["Sideslip"]["definition"])
        self.assertIn("wind coming from the right", CAT["inputs"]["CrossWind"]["definition"])
        self.assertIn("same impact pressure", CAT["inputs"]["CAS"]["definition"])
        self.assertIn("same dynamic pressure", CAT["inputs"]["EAS"]["definition"])
        self.assertIn("manufacturer", CAT["editor"]["mass.BOW"]["definition"])
        self.assertIn("11 km", CAT["results"]["Temperature Altitude"]["definition"])
        self.assertIn('showContextualHelp(name === "Vs Factor" ? "Vs Factor Output" : name)', WEB_MAIN)
        self.assertIn('If k = "Vs Factor" Then k = "Vs Factor Output"', MAIN_B4A)

    def test_release_337_precision_and_unit_wording(self):
        """Only targeted clarifications; rejected physics commentary stays absent."""
        self.assertEqual(
            "Basic Operating Weight as defined by the aircraft manufacturer, expressed as mass in the selected units.",
            CAT["editor"]["mass.BOW"]["definition"],
        )
        self.assertIn("specified in knots", CAT["inputs"]["Vs Factor"]["definition"])
        self.assertIn("subsonic isentropic Pitot relation", CAT["inputs"]["CAS"]["definition"])
        self.assertEqual(
            CAT["inputs"]["CAS"]["definition"],
            CAT["results"]["Calibrated Airspeed"]["definition"],
        )
        self.assertIn("unit lift coefficient (CL = 1)", CAT["results"]["DynPressure * S / g"]["definition"])
        self.assertIn("kilogram-force (kgf)", CAT["results"]["Weight/Delta W/δ"]["definition"])
        self.assertIn("without probe recovery corrections", CAT["results"]["Total Temperature"]["definition"])
        for section, key in (
            ("inputs", "Hp"), ("results", "Pressure Altitude"),
            ("results", "Vs Factor"), ("results", "Geopotential Altitude"),
            ("results", "Total Pressure"), ("results", "Turn Radius"),
        ):
            with self.subTest(section=section, key=key):
                definition = CAT[section][key]["definition"]
                for unwanted in (
                    "height above the ground",
                    "This is not a maneuver load factor",
                    "distinct from geometric altitude",
                    "shock losses are not included",
                    "normalization does not change aircraft mass",
                    "Wind modifies the ground trajectory",
                ):
                    self.assertNotIn(unwanted, definition)

    def test_release_337_versions_match_across_clients(self):
        self.assertEqual(
            json.loads((ROOT / "web/package.json").read_text(encoding="utf-8"))["version"],
            "3.37.0",
        )
        lock = json.loads((ROOT / "web/package-lock.json").read_text(encoding="utf-8"))
        self.assertEqual(lock["version"], "3.37.0")
        self.assertEqual(lock["packages"][""]["version"], "3.37.0")
        self.assertIn("#VersionName: 3.37", MAIN_B4A)
        self.assertIn("#VersionCode: 42", MAIN_B4A)
        self.assertIn(" / version 3.37</p>", WEB_MAIN)

    def test_chevron_inset_preserves_android_text_width(self):
        for name, source in (("Main", MAIN_B4A), ("Airplanes", AIRP_B4A)):
            with self.subTest(client=name):
                self.assertIn('setCompoundDrawablePadding", Array As Object(1dip)', source)
                self.assertIn('setPadding", Array As Object(1dip, 0, 4dip, 0)', source)
                self.assertIn("Dim arrowW As Int = 4dip", source)
                self.assertIn("Dim arrowH As Int = 3dip", source)
                self.assertIn("arrowW = 6dip", source)
                self.assertIn("arrowH = 4dip", source)
        old_horizontal_spacing_dp = 2 + 2 + 2
        new_horizontal_spacing_dp = 1 + 1 + 4
        self.assertEqual(old_horizontal_spacing_dp, new_horizontal_spacing_dp)

    def test_web_chevron_inset_and_label_space(self):
        self.assertIn("background-position: right 4px center, center;", CSS)
        self.assertNotIn("right 2px center", CSS)
        self.assertIn(".field-select { padding-right: 10px; padding-left: 2px; }", CSS)
        self.assertIn("padding: 0 10px 0 2px;", CSS)
        self.assertEqual(8 + 4, 10 + 2)


if __name__ == "__main__":
    unittest.main()
