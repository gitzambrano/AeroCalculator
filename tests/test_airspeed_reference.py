import unittest

from tools.reference_physics import (
    dynamic_pressure,
    impact_pressure_subsonic,
    impact_pressure_to_mach,
    standard_atmosphere,
    tas_to_cas,
    tas_to_eas,
    tas_to_mach,
)


class TestAirspeedReference(unittest.TestCase):
    """Protects PH-5."""

    def test_sea_level_eas_equals_tas(self):
        s = standard_atmosphere(0.0)
        self.assertAlmostEqual(tas_to_eas(100.0, s.density_kg_m3), 100.0, places=4)

    def test_low_speed_cas_near_tas_at_sea_level(self):
        s = standard_atmosphere(0.0)
        self.assertAlmostEqual(tas_to_cas(50.0, s), 50.0, delta=0.05)

    def test_mach_definition(self):
        s = standard_atmosphere(0.0)
        M = tas_to_mach(s.speed_of_sound_m_s * 0.5, s.temperature_k)
        self.assertAlmostEqual(M, 0.5, places=12)

    def test_dynamic_pressure(self):
        self.assertAlmostEqual(dynamic_pressure(100.0, 1.225), 6125.0, places=8)

    def test_impact_pressure_mach_round_trip(self):
        for pressure_pa in (101325.0, 54019.9, 22632.1):
            for mach in (0.0, 0.2, 0.5, 0.8):
                with self.subTest(pressure_pa=pressure_pa, mach=mach):
                    qc = impact_pressure_subsonic(mach, pressure_pa)
                    recovered = impact_pressure_to_mach(qc, pressure_pa)
                    self.assertAlmostEqual(recovered, mach, places=12)
