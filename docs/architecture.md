# Architecture

## Current state

The current project is a compact B4A application. `AeroCalculator.b4a` owns both Android interaction and a large fraction of the numerical calculation. This coupling is the main maintainability risk because a UI edit can affect physics and calculation logic is difficult to exercise outside the Activity.

## Target dependency direction

```text
Android UI and sensors
        |
        v
Input parsing and SI normalization
        |
        v
Pure B4A calculation core
        |
        v
Results in SI
        |
        v
Output conversion and formatting
        |
        v
Android UI
```

The calculation core must not read EditText controls, preferences, files, permissions, or Android sensors directly.

## Planned B4A modules

The extraction should proceed only with tests protecting each block.

- `AeroConstants.bas` — physical constants and shared numerical tolerances.
- `AeroUnits.bas` — input and output conversions.
- `Atmosphere.bas` — standard atmosphere and altitude conversions.
- `Airspeed.bas` — TAS, EAS, CAS, Mach, pressure quantities.
- `FlightMechanics.bas` — lift, stall, Reynolds number, load factor, bank.
- `WindTriangle.bas` — horizontal velocity-vector relationships.

Do not create a module until production code actually calls it. Dead architectural scaffolding is not an improvement.

## Verification architecture

Python under `tools/` provides an independent executable specification and repository tooling. It intentionally does not import B4A code.

The verification hierarchy is:

1. independent physics reference values;
2. analytical invariants;
3. source and repository sanity;
4. characterization snapshots.

This separation prevents a copied implementation error from validating itself.

## Aircraft profiles

Profile persistence belongs outside the calculation core. Parsing and storage can stay in the Android/B4A layer while pure calculations receive already normalized numeric values.

## Sensors

Sensor collection stays in the Android layer. Sensor values must pass through the same unit-normalization functions as manual values.

## Migration rule

Extract one calculation family at a time. For each family:

1. add independent reference coverage;
2. add characterization coverage for current user paths;
3. create the pure B4A function;
4. route one UI path through it;
5. compare outputs;
6. remove the duplicated formula only after parity is demonstrated.
