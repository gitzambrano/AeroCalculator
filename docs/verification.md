# Verification Strategy

AeroCalculator uses several kinds of tests because they answer different questions.

## Reference tests

Reference tests ask: **Is the equation physically correct?**

Expected values come from an independent equation, published standard, or analytical derivation. They do not come from AeroCalculator output.

Reference cases live in `tests/data/reference_cases.json`.

## Invariant tests

Invariant tests ask: **Does the result obey a relationship that must remain true?**

Examples include:

- unit-conversion round trips;
- pressure-altitude round trips;
- $n=1/\cos\phi$;
- zero-wind vector identities;
- positive pressure, density, and temperature;
- monotonic standard-atmosphere pressure.

These tests often detect bugs that a fixed table of golden numbers misses.

## Characterization tests

Characterization tests ask: **Did existing behavior change during refactoring?**

They can describe source structure or selected historical results. They are lower authority than validated physics.

Characterization data lives in `tests/data/characterization_cases.json`.

## Repository tests

Repository tests verify project declarations, assets, dependencies, agent rules, requirements, and documentation links. They do not validate aerodynamic equations.

## Tolerances

Use tolerances that reflect the source and model rather than display rounding.

Default reference tolerances are intentionally tighter than the Android UI formatting. A case can define its own absolute or relative tolerance.

## Atmosphere audit

The B4A source contains its own layered atmosphere equations. Compare every layer against the independent standard-atmosphere implementation. `tests/test_atmosphere_source_regression.py` protects the audited production layer bases, lapse-rate signs, high-altitude pressure relations, and geometric-altitude error path. The source test does not replace the independent physical reference tests.

Check both sides of:

- 11 km;
- 20 km;
- 32 km;
- 47 km;
- 51 km;
- 71 km;
- 84.852 km where applicable.

Also test pressure-to-altitude inversion at representative points inside every layer.

## Required local commands

```bash
python tests/run_all_tests.py
python tools/check_repo.py
python tools/source_inventory.py
```

`golden_snapshot.py` never overwrites characterization data unless `--write` is supplied explicitly.

## B4A verification

Portable CI cannot prove that the Android project compiles unless a B4A environment is available. Before release, run the B4A compile step in `docs/release_checklist.md`.

When a licensed and reproducible Windows runner is available, use `tools/b4a_build.ps1` to add a compile smoke test without production signing.
