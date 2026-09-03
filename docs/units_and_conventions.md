# Units and Conventions

This document is the authoritative repository definition for symbols, units, and sign conventions.

## Internal units

Use SI values at calculation boundaries whenever practical.

| Quantity | Internal unit | Supported display/input units |
|---|---|---|
| Altitude and length | m | ft, m, km, nm, mi, in |
| Pressure | Pa | mbar, Pa, hPa, atm, mmHg, psi |
| Temperature | K | °C, °F, K |
| Speed | m/s | kt, m/s, km/h, mph, ft/s |
| Mass | kg | kg, lb, ton, slug, oz |
| Area | m² | m², ft², in², cm², mm² |
| Angle | rad | deg, rad |

## Reference conversions

- 1 ft = 0.3048 m.
- 1 in = 0.0254 m.
- 1 nmi = 1852 m.
- 1 mi = 1609.344 m.
- 1 kt = 1852/3600 m/s.
- 1 mph = 0.44704 m/s.
- 1 atm = 101325 Pa.
- 1 mmHg = 133.322387415 Pa.
- 1 psi = 6894.757293168 Pa.
- 1 lb = 0.45359237 kg.
- 1 slug = 14.59390294 kg.

## Altitude definitions

**Pressure altitude, $H_p$** is the altitude in the adopted standard atmosphere that corresponds to the local static pressure.

**Geopotential altitude, $H$** accounts for the reduction of gravitational acceleration with geometric height.

**Geometric altitude, $h$** is geometric distance above the reference surface.

The adopted Earth-radius conversion shall be stated in the atmosphere implementation and its tests.

## Airspeed definitions

**TAS** is true airspeed relative to the air mass.

**EAS** is the sea-level-equivalent speed that preserves dynamic pressure:

$$
V_E = V_T\sqrt{\rho/\rho_0}.
$$

**CAS** is the calibrated speed obtained from impact pressure through the adopted compressible-flow relation.

**Mach** is $M=V_T/a$.

## Navigation angles

Angles are converted to radians before trigonometric evaluation.

**Heading, $\psi$** is the aircraft-body reference direction in the horizontal plane.

**Track, $\chi$** is the inertial horizontal velocity direction.

**Drift** is defined by the application as:

$$
\text{drift}=\psi-\chi.
$$

**Sideslip, $\beta$** follows the existing application relationship between heading, track, and air-relative velocity. Any future sign change requires a requirement update and regression tests.

## Wind

The application uses **wind-from direction**, consistent with the usual meteorological convention.

For wind speed $W$, wind-from direction $\psi_w$, and reference track $\chi$:

$$
HW=W\cos(\psi_w-\chi),
\qquad
CW=W\sin(\psi_w-\chi).
$$

Positive headwind means wind from ahead. Positive crosswind follows the application's positive normal-direction convention.

Manual headwind/crosswind inputs and wind-speed/direction outputs must use the same convention. Tests cover zero wind, pure headwind, pure crosswind, and oblique wind.

## Numerical comparison

Use absolute tolerance near zero and relative tolerance away from zero. Each reference case can override the default tolerance when the underlying source justifies it.
