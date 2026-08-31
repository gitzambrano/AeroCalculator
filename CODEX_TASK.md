# Codex Handoff — AeroCalculator Professionalization

Repository: `gitzambrano/AeroCalculator`

Target branch: `Full-documentation`

Do not modify or merge `main`.

## Goal

Apply this handoff package to the repository and finish the professionalization work directly on the real source tree.

The package already contains documentation, requirements, independent numerical reference tests, repository sanity checks, CI, tooling, release documentation, and agent rules.

## Mandatory workflow

1. Checkout `Full-documentation` and confirm it is based on the intended repository state.
2. Copy the files from this package into the repository, preserving paths.
3. Do not overwrite the real `AeroCalculator.b4a` with any stub or reconstructed copy.
4. Run the Python test suite and repository checks against the complete repository.
5. Inspect every failure before changing expected values.
6. Never update a golden/characterization snapshot merely to make a test pass.
7. For physics changes, add or confirm an independent reference test first.
8. Refactor the B4A source incrementally, keeping GUI behavior stable unless a documented defect is being corrected.
9. If B4A is available, compile the app after meaningful source changes and at the end.
10. Review the complete diff before committing.
11. Commit only to `Full-documentation`. Do not merge to `main`.

## Priority 0 — atmosphere audit and regression protection

The current B4A implementation requires a full audit of its standard-atmosphere equations, especially above 20 km.

A previously observed expression in the production source was equivalent to:

`T_std = 310.65 + 1 * (Hp - 20000) / 1000`

for the 20–32 km layer. The standard-atmosphere temperature at 20 km should be approximately 216.65 K, so this requires verification and correction if confirmed in the current branch.

Also audit:

- every atmospheric layer boundary;
- pressure-altitude direct and inverse equations;
- continuity at 11, 20, 32, 47, 51, 71 km and the documented upper range;
- the numerical `CalcError` path used for geometric-altitude inversion;
- algebraic signs in the inverse equations for the high-altitude layers;
- any branch that overwrites pressure ratio before solving altitude.

For each confirmed defect:

1. reproduce it;
2. add a failing independent regression/reference test;
3. fix the implementation;
4. demonstrate the focused test passing;
5. run the full suite.

## Architecture work

The central architectural improvement is to detach physical calculations from Android/UI state.

Target direction, introduced incrementally:

- `AeroCalculator.b4a`: UI, input/output orchestration and Android integration;
- `AeroConstants.bas`: constants only;
- `AeroUnits.bas`: unit normalization/conversion only;
- `AeroCore.bas`: pure physical calculations.

Split `AeroCore.bas` further only when justified, for example into atmosphere, airspeed, flight mechanics and wind modules.

Desired data flow:

`GUI input -> normalize to SI -> pure core -> SI results -> output conversion -> GUI`

Pure core functions must not depend on views, preferences, sensors, Android objects or mutable GUI globals.

## Tests to retain and expand

Keep the distinction between:

1. independent physical/math reference tests;
2. explicit software requirements;
3. invariants and identities;
4. validated historical results;
5. characterization snapshots.

Reference data must never be generated from AeroCalculator itself.

Add or expand coverage for:

- standard atmosphere by layer;
- pressure-altitude round trips;
- geometric/geopotential altitude conversion;
- TAS/CAS/EAS/Mach relations;
- dynamic and impact pressure;
- stall speed;
- load factor/bank angle;
- wind triangle and sign conventions;
- unit invariance;
- aircraft profile persistence where practical;
- source/module consistency;
- documentation and requirement coverage.

## Documentation

Keep README concise. The detailed material belongs under `docs/`.

The supplied documentation is intended to become authoritative for:

- physical equations;
- symbols and units;
- assumptions and validity ranges;
- sign conventions;
- architecture;
- verification strategy;
- dependencies;
- release process.

Improve it where the real implementation reveals missing or inaccurate details.

## Dependencies and build

Document each B4A dependency with its purpose and source. Do not commit proprietary/licensed B4A installation files unless redistribution is explicitly allowed.

If command-line B4A tooling is available, use the supplied PowerShell wrapper as a starting point and make the build reproducible. Do not put production signing credentials in CI.

## Completion criteria

Before finishing:

- all applicable Python tests pass against the real repository;
- sanity checks pass;
- no reference result was silently rewritten;
- known atmosphere defects are either fixed or explicitly documented with failing tests/blockers;
- B4A source changes are incremental and reviewed;
- B4A build is executed if the environment supports it;
- documentation matches actual behavior;
- final diff is reviewed for unrelated changes;
- commits exist on `Full-documentation` only;
- remaining limitations are listed explicitly.
