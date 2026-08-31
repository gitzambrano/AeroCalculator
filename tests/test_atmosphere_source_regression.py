from __future__ import annotations

import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "AeroCalculator.b4a"


class TestAtmosphereSourceRegression(unittest.TestCase):
    """Protects PH-1, PH-2, PH-3, PH-9, and QR-1 in the B4A source."""

    @classmethod
    def setUpClass(cls):
        cls.source = SOURCE.read_text(encoding="utf-8-sig")

    def test_production_uses_correct_high_altitude_temperature_bases(self):
        self.assertTrue("Sub SetStandardAtmosphereFromPressureAltitude" in self.source)
        for expression in (
            "T_std=216.65+0.001*(AltitudeM-20000)",
            "T_std=228.65+0.0028*(AltitudeM-32000)",
            "T_std=270.65",
            "T_std=270.65-0.0028*(AltitudeM-51000)",
            "T_std=214.65-0.002*(AltitudeM-71000)",
        ):
            self.assertTrue(expression in self.source, expression)

        self.assertFalse("T_std=310.65+1*(Hp-20000)/1000" in self.source)
        self.assertFalse("T_std=322.65+2.8*(Hp-32000)/1000" in self.source)

    def test_production_uses_correct_high_altitude_pressure_relations(self):
        self.assertTrue("P_P0=0.000660631908*Power(T_std/270.65,12.20114)" in self.source)
        self.assertTrue("P_P0=0.000039046555*Power(T_std/214.65,17.08160)" in self.source)
        self.assertTrue("Sub PressureAltitudeFromStaticPressure" in self.source)
        self.assertTrue("PressureAltitudeFromStaticPressure = 51000" in self.source)
        self.assertTrue("PressureAltitudeFromStaticPressure = 71000" in self.source)

    def test_geometric_altitude_error_evaluates_all_layers(self):
        self.assertTrue("SetStandardAtmosphereFromPressureAltitude(Hp_input_m)" in self.source)


if __name__ == "__main__":
    unittest.main()
