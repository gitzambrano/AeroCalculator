import math
import unittest

from tools.reference_physics import wind_components


class TestWindReference(unittest.TestCase):
    """Protects PH-8."""

    def test_zero_wind(self):
        hw, cw = wind_components(0.0, 1.2, 0.3)
        self.assertEqual(hw, 0.0)
        self.assertEqual(cw, 0.0)

    def test_aligned_component(self):
        hw, cw = wind_components(20.0, math.radians(45.0), math.radians(45.0))
        self.assertAlmostEqual(hw, 20.0, places=12)
        self.assertAlmostEqual(cw, 0.0, places=12)

    def test_pure_cross_component(self):
        hw, cw = wind_components(20.0, math.radians(90.0), 0.0)
        self.assertAlmostEqual(hw, 0.0, places=12)
        self.assertAlmostEqual(cw, 20.0, places=12)
