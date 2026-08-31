import math
import unittest

from tools.reference_physics import (
    LAYER_BASES,
    pressure_to_geopotential_altitude,
    standard_atmosphere,
)


class TestAtmosphereReference(unittest.TestCase):
    """Protects PH-1, PH-2, PH-3, and PH-9."""

    def test_sea_level(self):
        s = standard_atmosphere(0.0)
        self.assertAlmostEqual(s.temperature_k, 288.15, places=10)
        self.assertAlmostEqual(s.pressure_pa, 101325.0, places=6)
        self.assertAlmostEqual(s.density_kg_m3, 1.2250, places=4)

    def test_known_layer_temperatures(self):
        expected = {
            11_000.0: 216.65,
            20_000.0: 216.65,
            32_000.0: 228.65,
            47_000.0: 270.65,
            51_000.0: 270.65,
            71_000.0: 214.65,
        }
        for H, T in expected.items():
            with self.subTest(H=H):
                self.assertAlmostEqual(standard_atmosphere(H).temperature_k, T, places=8)

    def test_pressure_is_monotonic(self):
        samples = [standard_atmosphere(H).pressure_pa for H in range(0, 84_001, 1000)]
        self.assertTrue(all(a > b for a, b in zip(samples, samples[1:])))

    def test_layer_continuity(self):
        eps = 0.01
        for H, *_ in LAYER_BASES[1:]:
            if H >= 84_852:
                continue
            with self.subTest(H=H):
                below = standard_atmosphere(H - eps)
                above = standard_atmosphere(H + eps)
                self.assertLess(abs(below.temperature_k - above.temperature_k), 0.001)
                self.assertLess(abs(below.pressure_pa - above.pressure_pa) / above.pressure_pa, 5e-6)

    def test_pressure_altitude_round_trip(self):
        for H in (0.0, 1000.0, 5000.0, 10999.0, 15000.0, 25000.0, 40000.0, 49000.0, 60000.0, 80000.0):
            with self.subTest(H=H):
                p = standard_atmosphere(H).pressure_pa
                recovered = pressure_to_geopotential_altitude(p)
                self.assertAlmostEqual(recovered, H, places=6)

    def test_state_is_physical(self):
        for H in (0.0, 20_000.0, 50_000.0, 84_000.0):
            s = standard_atmosphere(H)
            self.assertTrue(math.isfinite(s.pressure_pa) and s.pressure_pa > 0)
            self.assertTrue(math.isfinite(s.temperature_k) and s.temperature_k > 0)
            self.assertTrue(math.isfinite(s.density_kg_m3) and s.density_kg_m3 > 0)
            self.assertTrue(math.isfinite(s.speed_of_sound_m_s) and s.speed_of_sound_m_s > 0)
