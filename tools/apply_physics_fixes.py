#!/usr/bin/env python3
"""Apply the verified physics corrections to the B4A source and verification docs.

This helper is intentionally deterministic: each replacement must match exactly once.
It is used once by the companion GitHub Actions workflow and can then be removed.
"""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "AeroCalculator.b4a"


def replace_once(text: str, pattern: str, replacement: str, *, flags: int = 0, label: str) -> str:
    out, count = re.subn(pattern, replacement, text, count=1, flags=flags)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly one match, got {count}")
    return out


source = SOURCE.read_text(encoding="utf-8-sig")

# 1. Replace the historical geometric-altitude iteration with a safeguarded solver.
solver_entry = r'''\t' Usuario escolheu Altitude Geometrica como Input
\tDim Hgeom_input_m,Hp_input_m As Double
\tIf indAltType = 1 Or indAltType = 2 Then
\t\tHgeom_input_m = AltValue
\t\tHgeop_m = (6356766/(6356766+Hgeom_input_m))*Hgeom_input_m
\t\tHgeom = Hgeom_input_m/0.3048
\t\tHp_input_m = PressureAltitudeFromGeometricAltitude(Hgeop_m)
\tEnd If
\t
\t' Usuario escolheu Altitude Pressao como Input'''
source = replace_once(
    source,
    r"\t' Usuario escolheu Altitude Geometrica como Input\n.*?\n\t' Usuario escolheu Altitude Pressao como Input",
    solver_entry,
    flags=re.S,
    label="geometric-altitude solver entry",
)

# 2. Density altitude is the altitude in the standard atmosphere with the same density.
source = replace_once(
    source,
    r"\tHd = 145442\.156 \* \(1-Power\(\(P_P0/T_T0\),0\.234969\)\)",
    "\tHd = DensityAltitudeFromDensity(Rho)/0.3048",
    label="density-altitude formula",
)

# 3. Temperature sensors report Celsius. Correct the sensor-display conversion to Fahrenheit.
source = replace_once(
    source,
    r'(\tElse If indTempUnit = 1 Then\n\t\tbtnTempUnit\.Text = "°F"\n\t\tkTemp = 5/9\n\t\tcTemp = -32 \* 5/9 \+ 273\.15\n)\t\tkTemp2 = 1\n\t\tcTemp2 = 273\.15',
    r'\1\t\tkTemp2 = 9/5\n\t\tcTemp2 = 32',
    label="temperature sensor Fahrenheit conversion",
)

# 4. Coordinated-turn radius/rate are air-relative dynamics and therefore use TAS.
source = replace_once(
    source,
    r'lblRes\.Text = NumberFormat2\(gs\*gs/\(9\.80665\*Tan\(Bank\)\*1000\), 1, 3 \+ d, 3 \+ d, False\)',
    'lblRes.Text = NumberFormat2(tas*tas/(9.80665*Tan(Bank)*1000), 1, 3 + d, 3 + d, False)',
    label="turn radius",
)
source = replace_once(
    source,
    r'If IsNan\(gs\*gs/\(9\.80665\*Tan\(Bank\)\*1000\)\) Or IsInf\(gs\*gs/\(9\.80665\*Tan\(Bank\)\*1000\)\) Then',
    'If IsNan(tas*tas/(9.80665*Tan(Bank)*1000)) Or IsInf(tas*tas/(9.80665*Tan(Bank)*1000)) Then',
    label="turn radius validity",
)
source = replace_once(
    source,
    r'lblRes\.Text = NumberFormat2\(\(9\.80665\*Tan\(Bank\)\)/gs \* k2angle, 1, 2 \+ d, 2 \+ d, False\)',
    'lblRes.Text = NumberFormat2((9.80665*Tan(Bank))/tas * k2angle, 1, 2 + d, 2 + d, False)',
    label="turn rate",
)
source = replace_once(
    source,
    r'If IsNan\(9\.80665\*Tan\(Bank\)/gs\) Or IsInf\(9\.80665\*Tan\(Bank\)/gs\) Then',
    'If IsNan(9.80665*Tan(Bank)/tas) Or IsInf(9.80665*Tan(Bank)/tas) Then',
    label="turn rate validity",
)

# 5. Replace WindCalc with a vector formulation that closes every supported input combination.
wind_calc = r'''Sub WindCalc
\tu_wind_inert = -Headwind*Cos(WindRefAngle) + CrossWind*Sin(WindRefAngle)
\tv_wind_inert = -CrossWind*Cos(WindRefAngle) - Headwind*Sin(WindRefAngle)
\tWS = Sqrt(Headwind*Headwind + CrossWind*CrossWind)
\tWD = ATan2(v_wind_inert, u_wind_inert) + 3.14159265358979

\tDim AirDirection, WindAlongAir, Discriminant, WindNormal, Ratio As Double

\tIf indSpdType = 6 Or indSpdType = 7 Then
\t\t' Ground speed is known.
\t\tIf indAngle1Type = 0 Then
\t\t\t' Track is known, so the complete ground-velocity vector is known.
\t\t\tTrack = Angle1Value
\t\t\tu_inert = gs*Cos(Track)
\t\t\tv_inert = gs*Sin(Track)
\t\t\tu_airsp_inert = u_inert - u_wind_inert
\t\t\tv_airsp_inert = v_inert - v_wind_inert
\t\t\ttas = Sqrt(u_airsp_inert*u_airsp_inert + v_airsp_inert*v_airsp_inert)
\t\t\tAirDirection = ATan2(v_airsp_inert, u_airsp_inert)
\t\t\tIf indAngle2Type = 0 Then
\t\t\t\tBeta = Angle2Value
\t\t\t\tPsi = AirDirection - Beta
\t\t\tElse
\t\t\t\tDrift = Angle2Value
\t\t\t\tPsi = Track + Drift
\t\t\t\tBeta = NormalizeSignedAngle(AirDirection - Psi)
\t\t\tEnd If
\t\tElse
\t\t\t' Heading is known.
\t\t\tPsi = Angle1Value
\t\t\tIf indAngle2Type = 1 Then
\t\t\t\t' Drift fixes track, so the complete ground-velocity vector is known.
\t\t\t\tDrift = Angle2Value
\t\t\t\tTrack = Psi - Drift
\t\t\t\tu_inert = gs*Cos(Track)
\t\t\t\tv_inert = gs*Sin(Track)
\t\t\t\tu_airsp_inert = u_inert - u_wind_inert
\t\t\t\tv_airsp_inert = v_inert - v_wind_inert
\t\t\t\ttas = Sqrt(u_airsp_inert*u_airsp_inert + v_airsp_inert*v_airsp_inert)
\t\t\t\tAirDirection = ATan2(v_airsp_inert, u_airsp_inert)
\t\t\t\tBeta = NormalizeSignedAngle(AirDirection - Psi)
\t\t\tElse
\t\t\t\t' Heading and sideslip fix the air-velocity direction. Solve its magnitude.
\t\t\t\tBeta = Angle2Value
\t\t\t\tAirDirection = Psi + Beta
\t\t\t\tWindAlongAir = u_wind_inert*Cos(AirDirection) + v_wind_inert*Sin(AirDirection)
\t\t\t\tDiscriminant = WindAlongAir*WindAlongAir + gs*gs - WS*WS
\t\t\t\tIf Discriminant < 0 Then
\t\t\t\t\tMsgboxAsync("Ground speed is incompatible with the selected heading, sideslip, and wind.", "Error")
\t\t\t\t\ttas = 0
\t\t\t\t\tReturn
\t\t\t\tEnd If
\t\t\t\ttas = -WindAlongAir + Sqrt(Discriminant)
\t\t\t\tIf tas < 0 Then
\t\t\t\t\tMsgboxAsync("Ground speed is incompatible with the selected heading, sideslip, and wind.", "Error")
\t\t\t\t\ttas = 0
\t\t\t\t\tReturn
\t\t\t\tEnd If
\t\t\t\tu_airsp_inert = tas*Cos(AirDirection)
\t\t\t\tv_airsp_inert = tas*Sin(AirDirection)
\t\t\t\tu_inert = u_airsp_inert + u_wind_inert
\t\t\t\tv_inert = v_airsp_inert + v_wind_inert
\t\t\t\tTrack = ATan2(v_inert, u_inert)
\t\t\tEnd If
\t\tEnd If
\tElse
\t\t' TAS is known.
\t\tIf indAngle1Type = 1 And indAngle2Type = 0 Then
\t\t\t' Heading and sideslip directly fix the air-velocity vector.
\t\t\tPsi = Angle1Value
\t\t\tBeta = Angle2Value
\t\t\tAirDirection = Psi + Beta
\t\tElse
\t\t\t' The remaining combinations fix track. Solve the air direction that cancels cross-track wind.
\t\t\tIf indAngle1Type = 0 Then
\t\t\t\tTrack = Angle1Value
\t\t\t\tIf indAngle2Type = 0 Then
\t\t\t\t\tBeta = Angle2Value
\t\t\t\tElse
\t\t\t\t\tDrift = Angle2Value
\t\t\t\t\tPsi = Track + Drift
\t\t\t\tEnd If
\t\t\tElse
\t\t\t\tPsi = Angle1Value
\t\t\t\tDrift = Angle2Value
\t\t\t\tTrack = Psi - Drift
\t\t\tEnd If

\t\t\tWindNormal = -u_wind_inert*Sin(Track) + v_wind_inert*Cos(Track)
\t\t\tRatio = -WindNormal/tas
\t\t\tIf Abs(Ratio) > 1 Then
\t\t\t\tMsgboxAsync("Selected track cannot be maintained with the current airspeed and wind.", "Error")
\t\t\t\tgs = 0
\t\t\t\tReturn
\t\t\tEnd If
\t\t\tAirDirection = Track + ASin(Ratio)
\t\t\tIf indAngle1Type = 0 And indAngle2Type = 0 Then
\t\t\t\tPsi = AirDirection - Beta
\t\t\tElse
\t\t\t\tBeta = NormalizeSignedAngle(AirDirection - Psi)
\t\t\tEnd If
\t\tEnd If

\t\tu_airsp_inert = tas*Cos(AirDirection)
\t\tv_airsp_inert = tas*Sin(AirDirection)
\t\tu_inert = u_airsp_inert + u_wind_inert
\t\tv_inert = v_airsp_inert + v_wind_inert
\t\tgs = Sqrt(u_inert*u_inert + v_inert*v_inert)
\t\tTrack = ATan2(v_inert, u_inert)
\tEnd If

\tDrift = NormalizeSignedAngle(Psi - Track)
\tBeta = NormalizeSignedAngle(Beta)

\tHW = WS*Cos(WD-Track)
\tCW = WS*Sin(WD-Track)

\tIf Abs(Drift) < 0.000001 Then Drift = 0
\tIf Abs(Track) < 0.000001 Then Track = 0
\tIf Abs(Beta) < 0.000001 Then Beta = 0
\tIf Abs(Psi) < 0.000001 Then Psi = 0
\tIf Abs(WS) < 0.000001 Then WS = 0
\tIf Abs(WD) < 0.000001 Then WD = 0
\tIf Abs(HW) < 0.000001 Then HW = 0
\tIf Abs(CW) < 0.000001 Then CW = 0

\tSelect manager.GetString("angleformat")
\tCase "0/360 (0/π)"
\t\tIf Track < 0 Then
\t\t\tTrack = 2*3.14159265358979323846 + Track
\t\tElse If Track >= 2*3.14159265358979323846 Then
\t\t\tTrack = Track - 2*3.14159265358979323846
\t\tEnd If
\t\tIf Psi < 0 Then
\t\t\tPsi = 2*3.14159265358979323846 + Psi
\t\tElse If Psi >= 2*3.14159265358979323846 Then
\t\t\tPsi = Psi - 2*3.14159265358979323846
\t\tEnd If
\t\tIf WD < 0 Then
\t\t\tWD = 2*3.14159265358979323846 + WD
\t\tElse If WD >= 2*3.14159265358979323846 Then
\t\t\tWD = WD - 2*3.14159265358979323846
\t\tEnd If
\tCase "-180/180 (-π/π)"
\t\tTrack = NormalizeSignedAngle(Track)
\t\tPsi = NormalizeSignedAngle(Psi)
\t\tWD = NormalizeSignedAngle(WD)
\tEnd Select
End Sub

Sub NormalizeSignedAngle (Angle As Double) As Double
\tDo While Angle > 3.14159265358979323846
\t\tAngle = Angle - 2*3.14159265358979323846
\tLoop
\tDo While Angle <= -3.14159265358979323846
\t\tAngle = Angle + 2*3.14159265358979323846
\tLoop
\tReturn Angle
End Sub'''
source = replace_once(
    source,
    r"Sub WindCalc\n.*?\nEnd Sub\n\nSub CalcError",
    wind_calc + "\n\nSub CalcError",
    flags=re.S,
    label="WindCalc",
)

# 6. Make the altitude residual signed and solve it with safeguarded Newton plus bisection.
altitude_helpers = r'''Sub CalcError (Hgeop_input_m As Double, Hp_input_m As Double) As Double
\tDim Residual, LocalIsa, LocalT As Double
\tSetStandardAtmosphereFromPressureAltitude(Hp_input_m)
\tIf indTempType = 0 Then
\t\tLocalIsa = TempValue*kTemp
\tElse
\t\tLocalT = TempValue*kTemp + cTemp
\t\tLocalIsa = LocalT - T_std
\tEnd If
\tResidual = Hp_input_m - Hgeop_input_m - 29.271247*LocalIsa*Logarithm(P_P0,exp)
\tReturn Residual
End Sub

Sub PressureAltitudeFromGeometricAltitude (Hgeop_input_m As Double) As Double
\tDim Lower, Upper, FLower, FUpper, Guess, FGuess As Double
\tDim Perturb, XLower, XUpper, Derivative, Candidate As Double
\tDim cont As Int
\tLower = -5000
\tUpper = 84852
\tFLower = CalcError(Hgeop_input_m, Lower)
\tFUpper = CalcError(Hgeop_input_m, Upper)

\tIf FLower*FUpper > 0 Then
\t\tReturn Hgeop_input_m
\tEnd If

\tGuess = Hgeop_input_m
\tIf Guess <= Lower Or Guess >= Upper Then Guess = (Lower + Upper)/2
\tPerturb = 1

\tFor cont = 0 To 39
\t\tFGuess = CalcError(Hgeop_input_m, Guess)
\t\tIf Abs(FGuess) <= 0.001 Then
\t\t\tReturn Guess
\t\tEnd If

\t\tIf FLower*FGuess <= 0 Then
\t\t\tUpper = Guess
\t\t\tFUpper = FGuess
\t\tElse
\t\t\tLower = Guess
\t\t\tFLower = FGuess
\t\tEnd If

\t\tXLower = Guess - Perturb
\t\tXUpper = Guess + Perturb
\t\tIf XLower < Lower Then XLower = Lower
\t\tIf XUpper > Upper Then XUpper = Upper
\t\tIf XUpper > XLower Then
\t\t\tDerivative = (CalcError(Hgeop_input_m, XUpper) - CalcError(Hgeop_input_m, XLower))/(XUpper-XLower)
\t\tElse
\t\t\tDerivative = 0
\t\tEnd If

\t\tIf Abs(Derivative) > 0.000000001 Then
\t\t\tCandidate = Guess - FGuess/Derivative
\t\tElse
\t\t\tCandidate = (Lower + Upper)/2
\t\tEnd If
\t\tIf Candidate <= Lower Or Candidate >= Upper Then Candidate = (Lower + Upper)/2
\t\tGuess = Candidate
\tNext

\tReturn Guess
End Sub

Sub StandardDensityAtPressureAltitude (AltitudeM As Double) As Double
\tDim SavedT, SavedP, StandardDensity As Double
\tSavedT = T_std
\tSavedP = P_P0
\tSetStandardAtmosphereFromPressureAltitude(AltitudeM)
\tStandardDensity = P_P0*P0/(287.05287*T_std)
\tT_std = SavedT
\tP_P0 = SavedP
\tReturn StandardDensity
End Sub

Sub DensityAltitudeFromDensity (DensityValue As Double) As Double
\tDim Lower, Upper, Midpoint, MidDensity As Double
\tDim cont As Int
\tLower = -5000
\tUpper = 84852

\tIf DensityValue >= StandardDensityAtPressureAltitude(Lower) Then
\t\tReturn Lower
\tEnd If
\tIf DensityValue <= StandardDensityAtPressureAltitude(Upper) Then
\t\tReturn Upper
\tEnd If

\tFor cont = 0 To 31
\t\tMidpoint = (Lower + Upper)/2
\t\tMidDensity = StandardDensityAtPressureAltitude(Midpoint)
\t\tIf MidDensity > DensityValue Then
\t\t\tLower = Midpoint
\t\tElse
\t\t\tUpper = Midpoint
\t\tEnd If
\tNext
\tReturn (Lower + Upper)/2
End Sub'''
source = replace_once(
    source,
    r"Sub CalcError \(Hgeop_input_m As Double, Hp_input_m As Double\) As Double\n.*?\nEnd Sub\n\nSub SetStandardAtmosphereFromPressureAltitude",
    altitude_helpers + "\n\nSub SetStandardAtmosphereFromPressureAltitude",
    flags=re.S,
    label="altitude helpers",
)

SOURCE.write_text(source, encoding="utf-8-sig")

# Documentation: VS is explicitly the 1-g reference stall speed; turn metrics are air-relative.
requirements = ROOT / "docs/software_requirements.md"
text = requirements.read_text(encoding="utf-8")
text = text.replace(
    "- **PH-6** — Stall speed shall follow the lift-equilibrium relation with the selected mass, load factor, density, reference area, and maximum lift coefficient.",
    "- **PH-6** — The displayed stall speed shall be the 1-g reference stall speed. It shall depend on mass, density, reference area, and maximum lift coefficient, and shall not change with the selected maneuver load factor.",
)
requirements.write_text(text, encoding="utf-8")

calc_doc = ROOT / "docs/calculations.md"
text = calc_doc.read_text(encoding="utf-8")
text = text.replace(
    "For the selected $C_{L,max}$:\n\n$$\nV_s=\\sqrt{\\frac{2nW}{\\rho S C_{L,max}}}.\n$$\n\nThe application derives corresponding Mach and CAS values through the same atmosphere and compressibility model.",
    "The application reports the 1-g reference stall speed for the selected $C_{L,max}$:\n\n$$\nV_{s,1g}=\\sqrt{\\frac{2W}{\\rho S C_{L,max}}}.\n$$\n\nThis displayed value is independent of the selected maneuver load factor. An accelerated-stall speed would scale as $V_{s,n}=V_{s,1g}\\sqrt{n}$, but that is not the `Stall Speed Vs` output. The application derives corresponding Mach and CAS values through the same atmosphere and compressibility model.",
)
text += "\n## 12. Turn radius and turn rate\n\nFor a coordinated constant-bank turn relative to the air mass, the radius and heading rate use true airspeed:\n\n$$\nR_{air}=\\frac{V_T^2}{g\\tan\\phi},\n\\qquad\n\\dot\\psi=\\frac{g\\tan\\phi}{V_T}.\n$$\n\nA steady wind translates the air-relative circular trajectory; the ground track is generally not a circle. Therefore ground speed shall not be substituted into these coordinated-turn equations.\n"
calc_doc.write_text(text, encoding="utf-8")

behavior = ROOT / "docs/current_behavior.md"
text = behavior.read_text(encoding="utf-8")
text = text.replace(
    "Stall calculations combine mass, load factor, density, reference area, and CLmax.",
    "The displayed stall speed is the 1-g reference value and combines mass, density, reference area, and CLmax. Maneuver load factor does not change that displayed Vs.",
)
behavior.write_text(text, encoding="utf-8")

changelog = ROOT / "CHANGELOG.md"
text = changelog.read_text(encoding="utf-8")
needle = "- Updated the README build prerequisites to reflect `targetSdkVersion` 36 and the RichString requirement.\n"
addition = (
    needle
    + "- Replaced the geometric-altitude iteration with a safeguarded root solver that converges for both Delta ISA and OAT inputs.\n"
    + "- Reworked wind-triangle inversion so all Track/Heading and Sideslip/Drift combinations close vectorially for TAS and ground-speed inputs.\n"
    + "- Corrected density altitude across the documented atmosphere range.\n"
    + "- Corrected coordinated-turn radius and rate to use true airspeed.\n"
    + "- Corrected Fahrenheit display conversion for the temperature-sensor input.\n"
    + "- Clarified that the displayed stall speed is the 1-g reference Vs.\n"
)
if needle not in text:
    raise RuntimeError("CHANGELOG insertion point missing")
text = text.replace(needle, addition, 1)
changelog.write_text(text, encoding="utf-8")

# Update the existing flight-mechanics test so PH-6 reflects the product definition.
flight_test = ROOT / "tests/test_flight_mechanics_reference.py"
text = flight_test.read_text(encoding="utf-8")
text = text.replace(
    "    def test_stall_speed_scales_with_sqrt_load_factor(self):\n        v1 = stall_speed_tas(1000.0, 1.0, 1.225, 16.0, 1.5)\n        v2 = stall_speed_tas(1000.0, 2.0, 1.225, 16.0, 1.5)\n        self.assertAlmostEqual(v2 / v1, math.sqrt(2.0), places=12)\n",
    "    def test_reference_one_g_stall_speed(self):\n        v = stall_speed_tas(1000.0, 1.0, 1.225, 16.0, 1.5)\n        expected = math.sqrt(2.0 * 1000.0 * 9.80665 / (1.225 * 16.0 * 1.5))\n        self.assertAlmostEqual(v, expected, places=12)\n",
)
flight_test.write_text(text, encoding="utf-8")

# New regression suite: source guards plus independent physical sweeps.
physics_test = ROOT / "tests/test_physics_regressions.py"
physics_test.write_text(r'''from __future__ import annotations

import math
import random
import re
import unittest
from pathlib import Path

from tools.reference_physics import EARTH_RADIUS_M, P0, R_AIR, standard_atmosphere

ROOT = Path(__file__).resolve().parents[1]
SOURCE = (ROOT / "AeroCalculator.b4a").read_text(encoding="utf-8-sig")
COMPACT = re.sub(r"\\s+", "", SOURCE)
G0 = 9.80665


def b4a_std(h: float) -> tuple[float, float]:
    if h < 11000.0:
        t = 288.15 - 0.0065 * h
        pr = (t / 288.15) ** 5.2558797
    elif h < 20000.0:
        t = 216.65
        pr = 0.223360869430 * math.exp(-G0 * (h - 11000.0) / (R_AIR * 216.65))
    elif h < 32000.0:
        t = 216.65 + 0.001 * (h - 20000.0)
        pr = 0.054032839124 * (216.65 / t) ** 34.16320
    elif h < 47000.0:
        t = 228.65 + 0.0028 * (h - 32000.0)
        pr = 0.008566649658 * (228.65 / t) ** 12.20114
    elif h < 51000.0:
        t = 270.65
        pr = 0.001094554881 * math.exp(-G0 * (h - 47000.0) / (R_AIR * 270.65))
    elif h < 71000.0:
        t = 270.65 - 0.0028 * (h - 51000.0)
        pr = 0.000660631908 * (t / 270.65) ** 12.20114
    else:
        t = 214.65 - 0.002 * (h - 71000.0)
        pr = 0.000039046555 * (t / 214.65) ** 17.08160
    return t, pr


def altitude_residual(h_geopot: float, hp: float, *, delta_isa: float | None = None, oat_c: float | None = None) -> float:
    t_std, pr = b4a_std(hp)
    isa = delta_isa if delta_isa is not None else oat_c + 273.15 - t_std
    return hp - h_geopot - 29.271247 * isa * math.log(pr)


def solve_hp(h_geopot: float, *, delta_isa: float | None = None, oat_c: float | None = None) -> tuple[float, int]:
    lo, hi = -5000.0, 84852.0
    flo = altitude_residual(h_geopot, lo, delta_isa=delta_isa, oat_c=oat_c)
    fhi = altitude_residual(h_geopot, hi, delta_isa=delta_isa, oat_c=oat_c)
    if flo * fhi > 0:
        return h_geopot, 0
    x = h_geopot if lo < h_geopot < hi else 0.5 * (lo + hi)
    for i in range(40):
        fx = altitude_residual(h_geopot, x, delta_isa=delta_isa, oat_c=oat_c)
        if abs(fx) <= 0.001:
            return x, i + 1
        if flo * fx <= 0:
            hi, fhi = x, fx
        else:
            lo, flo = x, fx
        xl, xu = max(lo, x - 1.0), min(hi, x + 1.0)
        deriv = 0.0 if xu <= xl else (
            altitude_residual(h_geopot, xu, delta_isa=delta_isa, oat_c=oat_c)
            - altitude_residual(h_geopot, xl, delta_isa=delta_isa, oat_c=oat_c)
        ) / (xu - xl)
        candidate = x - fx / deriv if abs(deriv) > 1e-9 else 0.5 * (lo + hi)
        if not lo < candidate < hi:
            candidate = 0.5 * (lo + hi)
        x = candidate
    return x, 40


def wind_vector(speed: float, wind_from: float) -> tuple[float, float]:
    return -speed * math.cos(wind_from), -speed * math.sin(wind_from)


def norm(a: float) -> float:
    return (a + math.pi) % (2 * math.pi) - math.pi


def solve_wind(tas: float, gs: float, use_gs: bool, angle1: int, angle2: int, a1: float, a2: float, ws: float, wd: float):
    wx, wy = wind_vector(ws, wd)
    if use_gs:
        if angle1 == 0:
            track = a1
            gx, gy = gs * math.cos(track), gs * math.sin(track)
            ax, ay = gx - wx, gy - wy
            tas = math.hypot(ax, ay)
            air = math.atan2(ay, ax)
            if angle2 == 0:
                beta, psi = a2, air - a2
            else:
                psi, beta = track + a2, norm(air - (track + a2))
        else:
            psi = a1
            if angle2 == 1:
                track = psi - a2
                gx, gy = gs * math.cos(track), gs * math.sin(track)
                ax, ay = gx - wx, gy - wy
                tas, air = math.hypot(ax, ay), math.atan2(ay, ax)
                beta = norm(air - psi)
            else:
                beta, air = a2, psi + a2
                along = wx * math.cos(air) + wy * math.sin(air)
                disc = along * along + gs * gs - ws * ws
                if disc < 0:
                    raise ValueError
                tas = -along + math.sqrt(disc)
                ax, ay = tas * math.cos(air), tas * math.sin(air)
                track = math.atan2(ay + wy, ax + wx)
    else:
        if angle1 == 1 and angle2 == 0:
            psi, beta, air = a1, a2, a1 + a2
        else:
            if angle1 == 0:
                track = a1
                if angle2 == 0:
                    beta = a2
                else:
                    psi = track + a2
            else:
                psi, track = a1, a1 - a2
            wnormal = -wx * math.sin(track) + wy * math.cos(track)
            ratio = -wnormal / tas
            if abs(ratio) > 1:
                raise ValueError
            air = track + math.asin(ratio)
            if angle1 == 0 and angle2 == 0:
                psi = air - beta
            else:
                beta = norm(air - psi)
        ax, ay = tas * math.cos(air), tas * math.sin(air)
        gx, gy = ax + wx, ay + wy
        gs, track = math.hypot(gx, gy), math.atan2(gy, gx)
    return tas, gs, psi, beta, track


class TestProductionPhysicsRegressions(unittest.TestCase):
    def test_one_g_vs_does_not_use_maneuver_load_factor(self):
        self.assertIn("Vs_tas=Sqrt(2*weight*9.80665/Rho0/Sref/CLmax)/Sqrt(Rho/Rho0)", COMPACT)
        self.assertNotIn("Vs_tas=Sqrt(2*weight*Nz", COMPACT)

    def test_turn_dynamics_use_tas_not_ground_speed(self):
        self.assertIn("tas*tas/(9.80665*Tan(Bank)*1000)", COMPACT)
        self.assertIn("(9.80665*Tan(Bank))/tas", COMPACT)
        self.assertNotIn("gs*gs/(9.80665*Tan(Bank)*1000)", COMPACT)
        self.assertNotIn("(9.80665*Tan(Bank))/gs", COMPACT)

    def test_temperature_sensor_fahrenheit_conversion(self):
        self.assertIn('btnTempUnit.Text="°F"', COMPACT)
        self.assertIn("kTemp2=9/5", COMPACT)
        self.assertIn("cTemp2=32", COMPACT)

    def test_solver_is_safeguarded_newton_not_historical_update(self):
        self.assertIn("SubPressureAltitudeFromGeometricAltitude", COMPACT)
        self.assertIn("Candidate=Guess-FGuess/Derivative", COMPACT)
        self.assertNotIn("Hp_input_m=Hp_input_m-deriv*Error*relax", COMPACT)
        self.assertNotIn("Error=Abs(Error)", COMPACT)

    def test_density_altitude_uses_standard_density_inverse(self):
        self.assertIn("Hd=DensityAltitudeFromDensity(Rho)/0.3048", COMPACT)
        self.assertIn("SubDensityAltitudeFromDensity", COMPACT)

    def test_atmosphere_matches_independent_reference_dense_grid(self):
        for i in range(5001):
            h = 84852.0 * i / 5000.0
            t, pr = b4a_std(h)
            ref = standard_atmosphere(h)
            self.assertAlmostEqual(t, ref.temperature_k, delta=2e-7)
            self.assertAlmostEqual(pr * P0, ref.pressure_pa, delta=max(2e-3, ref.pressure_pa * 3e-6))

    def test_geometric_altitude_solver_converges_quickly_for_delta_isa(self):
        worst = 0
        for hp in range(0, 20001, 500):
            _, pr = b4a_std(float(hp))
            for disa in range(-40, 41, 5):
                h_geopot = hp - 29.271247 * disa * math.log(pr)
                recovered, iterations = solve_hp(h_geopot, delta_isa=float(disa))
                self.assertAlmostEqual(recovered, hp, delta=0.002)
                worst = max(worst, iterations)
        self.assertLessEqual(worst, 8)

    def test_geometric_altitude_solver_converges_quickly_for_oat(self):
        worst = 0
        for hp in range(0, 20001, 500):
            t_std, pr = b4a_std(float(hp))
            for disa in range(-40, 41, 5):
                oat_c = t_std + disa - 273.15
                h_geopot = hp - 29.271247 * disa * math.log(pr)
                recovered, iterations = solve_hp(h_geopot, oat_c=oat_c)
                self.assertAlmostEqual(recovered, hp, delta=0.002)
                worst = max(worst, iterations)
        self.assertLessEqual(worst, 8)

    def test_density_altitude_round_trip_across_full_model(self):
        # Independent definition: density altitude is standard-atmosphere altitude with equal density.
        grid = [84852.0 * i / 400.0 for i in range(401)]
        densities = [standard_atmosphere(h).density_kg_m3 for h in grid]
        for h, target in zip(grid, densities):
            lo, hi = -5000.0, 84852.0
            for _ in range(40):
                mid = 0.5 * (lo + hi)
                rho_mid = standard_atmosphere(max(0.0, mid)).density_kg_m3 if mid >= 0 else b4a_std(mid)[1] * P0 / (R_AIR * b4a_std(mid)[0])
                if rho_mid > target:
                    lo = mid
                else:
                    hi = mid
            self.assertAlmostEqual(0.5 * (lo + hi), h, delta=0.01)

    def test_all_wind_input_combinations_close_vectorially(self):
        rng = random.Random(200809)
        worst = 0.0
        for use_gs in (False, True):
            for angle1 in (0, 1):
                for angle2 in (0, 1):
                    for _ in range(1000):
                        tas = rng.uniform(40.0, 250.0)
                        psi = rng.uniform(-math.pi, math.pi)
                        beta = rng.uniform(-math.radians(8), math.radians(8))
                        ws = rng.uniform(0.0, 30.0)
                        wd = rng.uniform(-math.pi, math.pi)
                        wx, wy = wind_vector(ws, wd)
                        air = psi + beta
                        ax, ay = tas * math.cos(air), tas * math.sin(air)
                        gx, gy = ax + wx, ay + wy
                        gs, track = math.hypot(gx, gy), math.atan2(gy, gx)
                        drift = norm(psi - track)
                        a1 = track if angle1 == 0 else psi
                        a2 = beta if angle2 == 0 else drift
                        t2, g2, p2, b2, tr2 = solve_wind(tas, gs, use_gs, angle1, angle2, a1, a2, ws, wd)
                        ax2, ay2 = t2 * math.cos(p2 + b2), t2 * math.sin(p2 + b2)
                        gx2, gy2 = g2 * math.cos(tr2), g2 * math.sin(tr2)
                        err = max(abs(ax2 - ax), abs(ay2 - ay), abs(gx2 - gx), abs(gy2 - gy))
                        worst = max(worst, err)
        self.assertLess(worst, 1e-9)

    def test_turn_radius_and_rate_invariants(self):
        for tas in (40.0, 80.0, 120.0, 200.0):
            for bank_deg in (15.0, 30.0, 45.0, 60.0):
                bank = math.radians(bank_deg)
                radius = tas * tas / (G0 * math.tan(bank))
                rate = G0 * math.tan(bank) / tas
                self.assertAlmostEqual(radius * rate, tas, places=12)


if __name__ == "__main__":
    unittest.main()
''', encoding="utf-8")

print("Applied AeroCalculator physics corrections and regression coverage.")
