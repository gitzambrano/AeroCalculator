"""Static regression checks for Android GPS MSL data provenance."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
ANDROID = (ROOT / "AeroCalculator.b4a").read_text(encoding="utf-8-sig")
REQUIREMENTS = (ROOT / "docs/software_requirements.md").read_text(encoding="utf-8")
CALCULATIONS = (ROOT / "docs/calculations.md").read_text(encoding="utf-8")


class GPSVerticalDatumTests(unittest.TestCase):
    def test_no_ellipsoidal_altitude_used_as_msl(self):
        self.assertNotIn("GPSalt = Location1.Altitude", ANDROID)
        self.assertNotIn("GPSalt=Location1.Altitude", ANDROID)
        self.assertIn('nativeLocation.RunMethod("hasMslAltitude", Null)', ANDROID)
        self.assertIn('nativeLocation.RunMethod("getMslAltitudeMeters", Null)', ANDROID)
        self.assertIn("If ph.SdkVersion >= 34 Then", ANDROID)
        self.assertIn("Dim nativeLocation As JavaObject = Location1", ANDROID)

    def test_nmea_fallback_validates_fix_and_datum(self):
        self.assertIn("Sub GPS_NMEA (TimeStamp As Long, Sentence As String)", ANDROID)
        self.assertIn('Sentence.SubString2(3, 6) <> "GGA"', ANDROID)
        self.assertIn('fields(10) <> "M"', ANDROID)
        self.assertIn("GPSnmeaValid = False", ANDROID)
        self.assertIn("NmeaMatchesLastGpsFix", ANDROID)
        self.assertIn("Abs(GPSfixLat - GPSnmeaLat) > 0.001", ANDROID)
        self.assertIn("If lonDiff > 180 Then lonDiff = 360 - lonDiff", ANDROID)
        self.assertIn("DateTime.Now - GPSnmeaTick > 8000", ANDROID)

    def test_unavailable_msl_blocks_calculation_and_clears_input(self):
        self.assertGreaterEqual(ANDROID.count("If indAltType = 2 And Not(GPSAltitudeReady) Then"), 2)
        self.assertIn('edtAlt.Hint = "Waiting for GPS MSL"', ANDROID)
        self.assertIn('edtAlt.Text = ""', ANDROID)
        self.assertIn("GPSaltValid = False", ANDROID)
        self.assertIn("GPSfixValid = False", ANDROID)
        self.assertIn("RefreshGPSAltitudeDisplay", ANDROID)

    def test_reference_gga_example_and_datum_equation(self):
        # GGA MSL 545.4 m plus geoid separation 46.9 m = WGS84 592.3 m.
        sentence = "$GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*47"
        fields = sentence.split(",")
        self.assertEqual(fields[0][3:6], "GGA")
        self.assertGreater(int(fields[6]), 0)
        self.assertEqual(fields[10], "M")
        self.assertAlmostEqual(float(fields[9]) + float(fields[11]), 592.3)
        self.assertIn("h_{\\mathrm{MSL}}=h_{\\mathrm{WGS84}}-N", CALCULATIONS)
        self.assertIn("**SE-4**", REQUIREMENTS)


if __name__ == "__main__":
    unittest.main()
