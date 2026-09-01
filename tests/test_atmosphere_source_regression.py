from __future__ import annotations

import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "AeroCalculator.b4a"


def sub_body(source: str, name: str) -> str:
    match = re.search(
        rf"(?ims)^\s*Sub\s+{re.escape(name)}\b.*?^\s*End Sub\s*$",
        source,
    )
    if match is None:
        raise AssertionError(f"missing B4A sub: {name}")
    return match.group(0)


class TestAtmosphereSourceRegression(unittest.TestCase):
    """Protects PH-1, PH-2, PH-3, PH-9, and QR-1 in the B4A source."""

    @classmethod
    def setUpClass(cls):
        cls.source = SOURCE.read_text(encoding="utf-8-sig")

    def test_production_uses_correct_high_altitude_temperature_bases(self):
        self.assertIn("Sub SetStandardAtmosphereFromPressureAltitude", self.source)
        for expression in (
            "T_std=216.65+0.001*(AltitudeM-20000)",
            "T_std=228.65+0.0028*(AltitudeM-32000)",
            "T_std=270.65",
            "T_std=270.65-0.0028*(AltitudeM-51000)",
            "T_std=214.65-0.002*(AltitudeM-71000)",
        ):
            self.assertIn(expression, self.source, expression)

        self.assertNotIn("T_std=310.65+1*(Hp-20000)/1000", self.source)
        self.assertNotIn("T_std=322.65+2.8*(Hp-32000)/1000", self.source)

    def test_production_uses_correct_high_altitude_pressure_relations(self):
        self.assertIn("P_P0=0.000660631908*Power(T_std/270.65,12.20114)", self.source)
        self.assertIn("P_P0=0.000039046555*Power(T_std/214.65,17.08160)", self.source)
        helper = sub_body(self.source, "PressureAltitudeFromStaticPressure")
        compact = helper.replace(" ", "")
        self.assertIn("Result=51000", compact)
        self.assertIn("Result=71000", compact)

    def test_pressure_altitude_helper_uses_b4a_return_statement(self):
        helper = sub_body(self.source, "PressureAltitudeFromStaticPressure")
        self.assertRegex(helper, r"(?im)^\s*Return\s+Result\s*$")
        self.assertNotRegex(
            helper,
            r"(?im)^\s*PressureAltitudeFromStaticPressure\s*=",
            "B4A returning Subs must return a value with Return.",
        )

    def test_geometric_altitude_error_evaluates_all_layers(self):
        self.assertIn("SetStandardAtmosphereFromPressureAltitude(Hp_input_m)", self.source)


if __name__ == "__main__":
    unittest.main()
