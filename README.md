# AeroCalculator

**AeroCalculator** is an aeronautics and flight-dynamics calculator for Android built with **Basic4android (B4A)**. It provides atmosphere and altitude calculations, airspeed conversions, aerodynamic quantities, maneuver relations, wind calculations, sensor-assisted inputs, and aircraft profiles.

Developed by Gustavo José Zambrano.

[![Google Play](https://img.shields.io/badge/Google_Play-AeroCalculator-green?logo=googleplay&logoColor=white)](https://play.google.com/store/apps/details?id=flightdyn.aerocalculator)

## Capabilities

- Standard-atmosphere and altitude calculations.
- Pressure, density, temperature, Delta ISA, viscosity, and speed of sound.
- TAS, CAS, EAS, Mach, dynamic pressure, and impact pressure.
- Lift coefficient, stall speed, Vs factor, and Reynolds number.
- Load-factor and bank-angle calculations.
- Heading, track, sideslip, drift, ground-speed, headwind, and crosswind calculations.
- Aircraft profiles with reference geometry, masses, and flap CLmax values.
- Optional GPS, pressure-sensor, and temperature-sensor inputs.

## Repository quality model

The repository separates four kinds of evidence:

1. **Independent reference tests** verify physical equations.
2. **Invariant tests** verify relationships such as unit and inverse-function round trips.
3. **Characterization tests** protect historical behavior during refactoring.
4. **Repository sanity tests** verify B4A declarations, assets, documentation, dependencies, and security hygiene.

Historical application output is not automatically treated as physical truth.

## Documentation

- [User guide](docs/user_guide.md)
- [Technical calculation reference](docs/calculations.md)
- [Units and conventions](docs/units_and_conventions.md)
- [Software requirements](docs/software_requirements.md)
- [Architecture](docs/architecture.md)
- [Verification strategy](docs/verification.md)
- [Dependencies](docs/dependencies.md)
- [Release checklist](docs/release_checklist.md)
- [Current behavior inventory](docs/current_behavior.md)

## Project structure

```text
AeroCalculator.b4a         Main B4A project and current application logic
Airp.bas                   Aircraft-profile activity
ClsCheckList.bas           Custom checklist/list class
ClsExplorer.bas            File and profile explorer
Files/                     Runtime assets
Icons/                     App and store graphics
Install/                   Vendored B4A library archives

docs/                      User, physics, architecture, and process documentation
tests/                     Portable reference, invariant, and sanity tests
tools/                     Repository and numerical verification tools
.github/workflows/         Continuous integration
AGENTS.md                  Working rules for coding agents
```

## Build prerequisites

The current project metadata targets Android SDK 34 and B4A project version 13. A release environment also needs the additional B4A libraries declared by `AeroCalculator.b4a`.

The repository currently includes archives for:

- `AHViewPager`
- `RSPopupMenu`

Other declared libraries are installed through the B4A environment.

Open `AeroCalculator.b4a` in B4A and compile the project normally. Configure your own private signing key outside the repository for release builds.

For an installed command-line B4A environment, `tools/b4a_build.ps1` provides a small wrapper around `B4ABuilder.exe`.

## Portable verification

Python 3.10 or newer is sufficient for the repository verification suite. No third-party Python packages are required.

```bash
python tests/run_all_tests.py
python tools/check_repo.py
python tools/source_inventory.py
```

The portable suite is also run by GitHub Actions.

## Numerical-development rule

For a logic defect:

1. reproduce the defect;
2. add a regression test;
3. fix the smallest responsible block;
4. run the focused tests;
5. run the complete suite;
6. inspect any numerical diff;
7. update the technical documentation when behavior changes.

A change to an equation, constant, atmosphere layer, compressibility relation, unit convention, or sign convention requires independent numerical evidence.

See [AGENTS.md](AGENTS.md) for the complete working rules.

## Security

Signing keys, certificates, credentials, build outputs, APK/AAB files, and common secret files are excluded by `.gitignore`. `tools/check_repo.py` adds a repository-level sanity check.

## Third-party software

See [Dependencies](docs/dependencies.md) and [Third-Party Notices](THIRD_PARTY_NOTICES.md). The redistribution terms for vendored B4A archives must be verified before a public source package relies on them.

## License

See [LICENSE.txt](LICENSE.txt).

## Google Play

[AeroCalculator on Google Play](https://play.google.com/store/apps/details?id=flightdyn.aerocalculator)
