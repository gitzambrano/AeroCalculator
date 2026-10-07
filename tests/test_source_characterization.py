import json
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = json.loads((ROOT / "tests/data/characterization_cases.json").read_text(encoding="utf-8"))


class TestSourceCharacterization(unittest.TestCase):
    """Protects QR-3 and the pre-refactor source baseline."""

    def test_expected_modules_and_libraries(self):
        text = (ROOT / "AeroCalculator.b4a").read_text(encoding="utf-8-sig")
        modules = [m.group(1).strip() for m in re.finditer(r"^Module\d+=(.+)$", text, re.MULTILINE)]
        libraries = [m.group(1).strip().lower() for m in re.finditer(r"^Library\d+=(.+)$", text, re.MULTILINE)]
        self.assertEqual(modules, DATA["declared_modules"])
        self.assertEqual(libraries, DATA["declared_libraries"])

    def test_calculation_entry_points_still_exist(self):
        text = (ROOT / "AeroCalculator.b4a").read_text(encoding="utf-8-sig")
        for sub in DATA["required_subs"]:
            with self.subTest(sub=sub):
                self.assertRegex(text, rf"(?im)^\s*Sub\s+{re.escape(sub)}\b")

    def test_android_unit_change_and_state_regressions(self):
        text = (ROOT / "AeroCalculator.b4a").read_text(encoding="utf-8-sig")

        # Temperature input unit must have its own persisted slot.
        self.assertIn('m.Put("var16", indTempUnit)', text)
        self.assertNotIn('m.Put("var16", indAltUnit)', text)
        self.assertIn('indTempUnit = m.GetDefault("var16",0)', text)

        # Unit pickers preserve the physical quantity represented by editable values.
        for snippet in (
            'ConvertEditByFactor(edtAlt, LengthUnitFactor(record), LengthUnitFactor(idx), 6)',
            'ConvertTemperatureEdit(record, idx)',
            'ConvertEditByFactor(edtSpd, SpeedUnitFactor(record), SpeedUnitFactor(idx), 6)',
            'ConvertEditByFactor(edtWeight, MassUnitFactor(record), MassUnitFactor(idx), 6)',
            'ConvertEditByFactor(edtSref, AreaUnitFactor(record), AreaUnitFactor(idx), areaDecimals)',
            'ConvertEditByFactor(edtcref, LengthUnitFactor(record), LengthUnitFactor(idx), 6)',
            'ConvertEditByFactor(edtAngle1, AngleUnitFactor(record), AngleUnitFactor(idx), 6)',
            'ConvertEditByFactor(edtAngle2, AngleUnitFactor(record), AngleUnitFactor(idx), 6)',
            'ConvertEditByFactor(edtHeadWind, SpeedUnitFactor(record), SpeedUnitFactor(idx), 6)',
            'ConvertEditByFactor(edtCrossWind, SpeedUnitFactor(record), SpeedUnitFactor(idx), 6)',
            'ConvertEditByFactor(edtWindRefAngle, AngleUnitFactor(record), AngleUnitFactor(idx), 6)',
        ):
            with self.subTest(snippet=snippet):
                self.assertIn(snippet, text)

        self.assertIn("If idx = 2 Or xx < 300dip Then areaDecimals = 3", text)

        # Crosswind owns its unit state; it must never proxy the headwind unit picker.
        match = re.search(
            r"(?ms)^Sub btnCrossWindUnit_Click\b(.*?)^End Sub",
            text,
        )
        self.assertIsNotNone(match)
        body = match.group(1)
        self.assertIn("indCrossWindUnit = idx", body)
        self.assertIn("CrossWindUnit_Click", body)
        self.assertNotIn("btnHeadWindUnit_Click", body)

        # Aircraft identity, not only list position, is persisted and reconciled after reorder.
        self.assertIn('m.Put("var35", ID_use)', text)
        self.assertIn('restoredAirplaneID = m.GetDefault("var35", 0)', text)
        self.assertIn("ListAirp.IndexOf(ID_use)", text)

    def test_android_output_angle_defaults_and_zero_wind_direction(self):
        text = (ROOT / "AeroCalculator.b4a").read_text(encoding="utf-8-sig")

        # First-run output angles match the degree input defaults.
        match = re.search(r"(?ms)^Sub SetDefaults\b(.*?)^End Sub", text)
        self.assertIsNotNone(match)
        self.assertIn('manager.SetString("angle", "deg")', match.group(1))

        # UI-1: wind direction is unavailable when wind speed is zero.
        self.assertIn("If IsNan(WD) Or IsInf(WD) Or Abs(WS) < 0.000000001 Then", text)

    def test_android_narrow_output_labels_drop_symbols(self):
        text = (ROOT / "AeroCalculator.b4a").read_text(encoding="utf-8-sig")

        # Below 340 dp the altitude and TAT output names drop their symbols so
        # the label does not touch the value.
        match = re.search(r"(?ms)^Private Sub UseOutputSymbols\b(.*?)^End Sub", text)
        self.assertIsNotNone(match)
        self.assertIn("Return xx >= 340dip", match.group(1))
        for name in (
            "Pressure Altitude", "Geometric Altitude", "Geopotential Altitude",
            "Density Altitude", "Temperature Altitude", "Total Air Temperature",
        ):
            with self.subTest(name=name):
                self.assertRegex(
                    text,
                    rf'If UseOutputSymbols Then lblVar\.Text = .+ Else lblVar\.Text = "{name}"',
                )

    def test_android_help_section_headers_follow_theme_contrast(self):
        text = (ROOT / "ClsBottomSheet.bas").read_text(encoding="utf-8-sig")

        # Small bold help headers need 4.5:1 contrast: dark tones on light
        # theme backgrounds, bright tones on the dark themes.
        self.assertIn("Private Sub SectionHeaderColor(onLight As Int, onDark As Int) As Int", text)
        self.assertIn("lblModelHdr.TextColor = SectionHeaderColor(Colors.RGB(0, 102, 74), Colors.RGB(0, 180, 120))", text)
        self.assertIn("lblUnitHdr.TextColor = SectionHeaderColor(Colors.RGB(143, 66, 0), Colors.RGB(230, 130, 0))", text)
