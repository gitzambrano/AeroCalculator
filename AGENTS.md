# AGENTS.md

Working rules for AeroCalculator.

## Source of truth

`docs/software_requirements.md` defines the behavior that the software must preserve. Requirements use permanent identifiers such as `PH-1`, `UN-2`, and `QR-3`.

Before changing numerical behavior, check the applicable requirement. If the required behavior changes, update the requirement deliberately in the same change.

## Language and writing

Write new code comments, documentation, tests, commit messages, and user-facing text in technical English.

Follow `.agents/skills/writing-rules/SKILL.md` for prose. Keep the mirrored Claude skill identical.

## Core workflow

1. Reproduce a logic defect before the fix.
2. Add a regression test for each logic defect. Pure layout changes are exempt.
3. For physics changes, add or update an independent reference case.
4. Make the smallest change that solves the problem.
5. Run focused tests during development.
6. Run `python tests/run_all_tests.py` before completion.
7. Run `python tools/check_repo.py`.
8. Inspect the final diff. Do not accept changed golden values without reading the numerical diff.
9. Update documentation when behavior, assumptions, conventions, dependencies, or limits change.

## Numerical changes

Do not treat historical output as physical truth.

Use this precedence when evidence conflicts:

1. accepted physical or mathematical reference;
2. documented software requirement;
3. analytical invariant;
4. validated historical result;
5. unvalidated characterization snapshot.

Every change to an equation, constant, correlation, atmosphere layer, compressibility relation, or coordinate convention requires a reference or derivation and an explicit tolerance.

## Golden and characterization data

`tests/data/reference_cases.json` contains independent reference values.

`tests/data/characterization_cases.json` contains historical or source-characterization checks. Characterization data detects accidental change but cannot override a validated reference.

Never update either file merely because a test failed. Explain each intentional numerical change.

## Scope control

Do not combine unrelated cleanup with a bug fix.

Do not redesign the GUI during infrastructure work.

Do not migrate the application away from B4A unless a separate project explicitly requests that migration.

## B4A project

`AeroCalculator.b4a` remains the product entry point. The Python code under `tools/` is verification and repository tooling. It must not silently become a second product implementation.

The desired long-term boundary is:

`GUI -> SI normalization -> calculation core -> output conversion -> GUI`

New calculation logic should move toward pure B4A modules that do not read controls, preferences, files, or Android APIs directly.

## Completion

Do not report a change as complete while a required test fails, documentation is inconsistent, or a change is only partially wired into the application.
