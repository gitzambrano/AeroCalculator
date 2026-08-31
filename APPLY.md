# Apply this overlay to `Full-documentation`

This archive contains the implemented professionalization layer for AeroCalculator.

## Contents

- repository and agent working rules;
- technical-writing rules;
- traceable software requirements;
- current-behavior inventory;
- technical calculation documentation;
- units and conventions;
- architecture documentation;
- verification strategy;
- dependency documentation;
- user guide;
- release checklist;
- Python reference-physics implementation;
- atmosphere, airspeed, maneuver, wind, unit, documentation, requirement, source-characterization, and repository sanity tests;
- source inventory and snapshot tools;
- B4ABuilder PowerShell helper;
- GitHub Actions quality workflow;
- changelog and third-party notices;
- rewritten README.

## Apply

From a checkout of the `Full-documentation` branch, copy the archive contents into the repository root, preserving paths.

Then run:

```bash
python tests/run_all_tests.py
python tools/check_repo.py
python tools/source_inventory.py
```

## Important limitation

`AeroCalculator.b4a` is intentionally not replaced by this overlay.

The ChatGPT GitHub connector exposed the file only through truncated reads and rejected every write operation with `403 Resource not accessible by integration`. Replacing a 140 kB B4A project from incomplete content would risk corrupting the project.

The overlay therefore establishes the test and documentation boundary required before the production calculation-core extraction. `docs/architecture.md` defines the incremental extraction sequence.

## Numerical audit finding

The current production source contains a high-altitude atmosphere expression beginning with `T_std=310.65+1*(Hp-20000)/1000`. The independent reference suite expects 216.65 K at 20 km and 228.65 K at 32 km. `tools/check_repo.py` reports this as a warning so that historical output is not silently promoted to validated reference behavior.
