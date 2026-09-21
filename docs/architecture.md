# Architecture

## Current state

The repository contains two supported user-facing frontends. The Android application remains B4A-based, with `AeroCalculator.b4a` owning Android interaction and a large fraction of the historical numerical calculation. The browser application under `web/` is a TypeScript/Vite implementation of the portable calculator behavior and aircraft-profile workflow. The two implementations are verified against independent physics references and documented invariants rather than by importing one implementation into the other.

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

## Browser application

The browser dependency direction is:

```text
Browser UI
    |
    v
Input parsing and SI normalization
    |
    v
Pure TypeScript calculation core
    |
    v
Results in SI
    |
    v
Output conversion and formatting
    |
    v
Responsive browser UI
```

Browser persistence, PWA caching, and aircraft-profile import/export stay outside the numerical core. The browser imports and exports the Android-compatible `airplanes.txt` Java Properties format for profile interchange.

## Sensors

Sensor collection stays in the Android layer. Sensor values must pass through the same unit-normalization functions as manual values. Device GPS, pressure, and temperature sensor input modes are intentionally not part of the browser product.

## Migration rule

Extract one calculation family at a time. For each family:

1. add independent reference coverage;
2. add characterization coverage for current user paths;
3. create the pure B4A function;
4. route one UI path through it;
5. compare outputs;
6. remove the duplicated formula only after parity is demonstrated.
