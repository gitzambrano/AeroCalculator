# Atmosphere Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the professionalization overlay and correct verified B4A standard-atmosphere defects without changing GUI behavior.

**Architecture:** Keep the existing Activity as the product entry point. Replace its duplicated layer arithmetic with consistent standard-atmosphere layer relationships in the forward, inverse, and geometric-inversion paths. Python remains an independent reference and verifies source-level conformance because B4A is unavailable in this environment.

**Tech Stack:** B4A, Python 3 standard library, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-08-31-atmosphere-audit-design.md`

## Global Constraints

- Work only on `Full-documentation`.
- Preserve `AeroCalculator.b4a` as the production project file.
- Keep independent reference data independent of production B4A expressions.
- Do not change user-interface behavior or create unused B4A modules.
- Treat only Git-tracked signing and build artifacts as repository violations.

---

### Task 1: Add atmosphere source regressions

**Files:**
- Create: `tests/test_atmosphere_source_regression.py`
- Test: `tests/test_atmosphere_source_regression.py`

**Interfaces:**
- Consumes: `AeroCalculator.b4a` UTF-8 source text.
- Produces: source-level protection for PH-1, PH-2, PH-3, PH-9, and QR-1.

- [ ] **Step 1: Write failing tests**

```python
def test_production_uses_correct_high_altitude_temperature_bases(self):
    self.assertIn("T_std=216.65+1*(Hp-20000)/1000", self.source)
    self.assertIn("T_std=228.65+2.8*(Hp-32000)/1000", self.source)
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `python -m unittest tests.test_atmosphere_source_regression -v`

Expected: failure because `AeroCalculator.b4a` contains the historical `310.65` and `322.65` expressions.

- [ ] **Step 3: Extend the test for inverse layers and CalcError**

```python
def test_production_inverse_and_geometric_paths_use_the_audited_model(self):
    self.assertIn("Sub PressureAltitudeFromStaticPressure", self.source)
    self.assertIn("SetStandardAtmosphereFromPressureAltitude(Hp_input_m)", self.source)
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `python -m unittest tests.test_atmosphere_source_regression -v`

Expected: failure because the audited helper functions do not exist.

### Task 2: Correct the B4A atmosphere paths

**Files:**
- Modify: `AeroCalculator.b4a:3047-3143,3519-3538`
- Test: `tests/test_atmosphere_source_regression.py`

**Interfaces:**
- Consumes: pressure altitude `Hp` in m and static pressure `P` in Pa.
- Produces: global calculation values `T_std`, `P_P0`, and `Hp` with the standard-atmosphere state.

- [ ] **Step 1: Add an audited forward helper**

```basic
Sub SetStandardAtmosphereFromPressureAltitude (AltitudeM As Double)
    ' Set T_std and P_P0 from the documented geopotential layer.
End Sub
```

- [ ] **Step 2: Add an audited inverse helper**

```basic
Sub PressureAltitudeFromStaticPressure (PressurePa As Double) As Double
    ' Return the geopotential altitude in m from the documented layer.
End Sub
```

- [ ] **Step 3: Route the direct, inverse, and `CalcError` paths through the helpers**

```basic
SetStandardAtmosphereFromPressureAltitude(Hp)
Hp = PressureAltitudeFromStaticPressure(P)
SetStandardAtmosphereFromPressureAltitude(Hp_input_m)
```

- [ ] **Step 4: Run focused verification**

Run: `python -m unittest tests.test_atmosphere_source_regression tests.test_atmosphere_reference -v`

Expected: all focused tests pass.

### Task 3: Repair repository-artifact detection

**Files:**
- Modify: `tools/check_repo.py:61-68`
- Modify: `tests/test_repo_sanity.py`
- Test: `tests/test_repo_sanity.py`

**Interfaces:**
- Consumes: Git index output from `git ls-files -z`.
- Produces: an error only for a Git-tracked forbidden artifact.

- [ ] **Step 1: Write the failing test**

```python
def test_check_repo_ignores_untracked_ignored_artifacts(self):
    proc = subprocess.run([sys.executable, str(CHECK)], ...)
    self.assertEqual(proc.returncode, 0, proc.stdout + proc.stderr)
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `python -m unittest tests.test_repo_sanity -v`

Expected: failure because the checker traverses ignored artifacts in the worktree.

- [ ] **Step 3: Restrict `check_security` to Git-tracked paths**

```python
tracked = subprocess.run(
    ["git", "ls-files", "-z"], cwd=ROOT, check=True,
    capture_output=True,
).stdout.split(b"\0")
```

- [ ] **Step 4: Run the repository test to verify it passes**

Run: `python -m unittest tests.test_repo_sanity -v`

Expected: pass with the high-altitude expression warning only.

### Task 4: Align documentation and perform final verification

**Files:**
- Modify: `docs/calculations.md`
- Modify: `docs/current_behavior.md`
- Modify: `CHANGELOG.md`
- Test: `tests/run_all_tests.py`

- [ ] **Step 1: Document the corrected layer behavior and residual limitation**

Add the valid 0 km to 84.852 km geopotential range and identify B4A compilation as unavailable when no local B4ABuilder installation exists.

- [ ] **Step 2: Run the full suite and repository checks**

Run: `python tests/run_all_tests.py && python tools/check_repo.py && python tools/source_inventory.py`

Expected: all tests pass, repository sanity passes, and only documented non-fatal warnings remain.

- [ ] **Step 3: Review the diff and commit**

Run: `git diff --check && git diff --cached --check && git status --short --branch`

Commit only the reviewed files on `Full-documentation` with: `docs: professionalize and audit atmosphere model`.
