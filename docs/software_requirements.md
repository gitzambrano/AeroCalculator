# AeroCalculator Software Requirements

This document states behavior that AeroCalculator must preserve. Requirement identifiers are permanent. A removed requirement leaves its identifier retired.

## 1. Scope

- **SC-1** — AeroCalculator shall provide atmospheric, altitude, airspeed, aerodynamic, maneuver, wind, and aircraft-profile calculations on Android.
- **SC-2** — The supported application remains the B4A Android project. Verification tooling may use Python, but Python is not a second user-facing calculator.
- **SC-3** — Device GPS, pressure, and temperature sensors are optional inputs. Missing sensor capability shall not break calculations that do not require that sensor.

## 2. Physics and numerical correctness

- **PH-1** — The standard-atmosphere model shall use 101325 Pa, 288.15 K, 1.225 kg/m³, and 9.80665 m/s² as sea-level reference values where applicable.
- **PH-2** — Atmosphere equations shall be continuous at each documented layer boundary to within the numerical tolerance defined by the verification suite.
- **PH-3** — Pressure-altitude conversion and its inverse shall recover the original value within the documented tolerance across the supported atmosphere range.
- **PH-4** — Geopotential and geometric altitude conversions shall use the documented Earth-radius convention.
- **PH-5** — TAS, EAS, CAS, Mach, dynamic pressure, and impact pressure shall follow the equations in `docs/calculations.md`.
- **PH-6** — Stall speed shall follow the lift-equilibrium relation with the selected mass, load factor, density, reference area, and maximum lift coefficient.
- **PH-7** — A coordinated level turn shall satisfy \(n=1/\cos\phi\).
- **PH-8** — Wind calculations shall preserve the documented heading, track, sideslip, drift, headwind, and crosswind sign conventions.
- **PH-9** — Density, absolute temperature, pressure, viscosity, and speed of sound shall remain physically valid within the documented model range.
- **PH-10** — A numerical fix shall not be accepted only because it reproduces a historical application result.

## 3. Units and conventions

- **UN-1** — Calculations shall use SI quantities internally whenever practical.
- **UN-2** — Changing only the displayed input unit shall not change the represented physical state.
- **UN-3** — Changing only the displayed output unit shall not change the underlying calculated state.
- **UN-4** — Angular calculations shall convert degrees to radians exactly once at the calculation boundary.
- **UN-5** — Unit labels and conversion factors shall agree with `docs/units_and_conventions.md`.

## 4. User interface

- **UI-1** — Invalid or unavailable numerical results shall be shown as unavailable instead of a misleading finite number.
- **UI-2** — Selecting another input type may change which quantity is solved, but it shall not silently reinterpret a retained value with incompatible units.
- **UI-3** — User-facing labels shall use consistent aerodynamic terminology.
- **UI-4** — A calculation shall not require network access.

## 5. Aircraft profiles

- **AP-1** — Aircraft profiles shall preserve name, reference area, reference chord, defined masses, defined flap CLmax values, and their unit selections.
- **AP-2** — Adding, duplicating, editing, deleting, importing, or selecting one profile shall not modify an unrelated profile.
- **AP-3** — A missing optional mass or flap entry shall remain distinguishable from a numerical zero.

## 6. Sensors

- **SE-1** — GPS altitude and speed shall be used only when the corresponding sensor input type is selected.
- **SE-2** — Pressure-sensor and temperature-sensor data shall be converted to the same internal units as manually entered values.
- **SE-3** — Lack of sensor permission or hardware shall degrade only sensor-dependent input modes.

## 7. Documentation

- **DC-1** — Every major calculator family shall have a technical section in `docs/calculations.md`.
- **DC-2** — Every supported input and output unit shall appear in `docs/units_and_conventions.md`.
- **DC-3** — Numerical models shall document assumptions and validity limits.
- **DC-4** — Repository dependencies and vendored archives shall be documented.
- **DC-5** — Internal Markdown links shall resolve.

## 8. Quality and verification

- **QR-1** — Every logic defect shall receive a regression test unless automation is technically impossible and the reason is documented.
- **QR-2** — Physics changes shall have an independent reference value, derivation, or analytical invariant.
- **QR-3** — Reference data and characterization data shall remain separate.
- **QR-4** — Golden data shall not update automatically during normal tests.
- **QR-5** — Repository sanity checks shall verify declared B4A modules, assets, vendored dependencies, documentation structure, and obvious credential files.
- **QR-6** — Pull requests and pushes shall run the portable Python verification suite in CI.
- **QR-7** — A release shall pass the release checklist.
- **QR-8** — Agent instruction mirrors shall remain identical.
- **QR-9** — Tests shall identify the requirement they protect when practical.

## 9. Build and release

- **RL-1** — The B4A project shall compile with the documented B4A environment before release.
- **RL-2** — Signing keys, credentials, generated APK/AAB files, and B4A build outputs shall not be committed.
- **RL-3** — Release version code and version name shall be reviewed together.
- **RL-4** — Production signing shall remain separate from ordinary pull-request verification.
