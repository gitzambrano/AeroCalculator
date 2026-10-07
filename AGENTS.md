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

## Verification modes

AeroCalculator has two distinct verification modes. Do not conflate mechanical CI coverage with a visual audit.

### Quick mechanical check

This is the default and required completion gate.

It verifies compilation, unit and physics tests, calculator controls, input modes and units, navigation, Android runtime health, UI bounds, and representative phone/tablet layouts without intentionally generating the full screenshot corpus.

Automatic GitHub Actions runs use this mode. Leave `AEROCALC_FULL_VISUAL_AUDIT` unset or set it to `0`.

For web work, run:

`cd web && npm test && npm run build && npm run test:e2e`

Quick mode runs a small representative visual set (280/320/360/390/411 px) and saves only key screenshots. It does not generate the complete visual-audit corpus.

For Android work, the normal `android-build-smoke` workflow runs a reduced representative viewport matrix plus the mechanical smoke, input-matrix, and feature checks. The input matrix still exercises all calculator choices and units, but with fewer viewport profiles and only a small set of key screenshots; bulk screenshot capture remains exclusive to full mode.

A quick check must be green before reporting a normal change as complete.

### Full visual audit

This mode is optional by default. Use it when explicitly requested, for substantial UI/layout changes, before a visual release review, or when a mechanical check cannot explain a suspected rendering problem.

Enable it with:

`AEROCALC_FULL_VISUAL_AUDIT=1`

or manually dispatch the `Web` / `android-build-smoke` GitHub workflow with `full_visual_audit=true`.

Full mode expands the viewport/state matrix and captures the complete screenshot set. On Android it exercises the detailed input-state sweep at 280, 320, 360, 393, and 411 dp in addition to the broader smoke profiles. On web it enables `web/e2e/visual_audit.spec.ts` across the configured mobile, tablet, landscape, laptop, and desktop viewports.

A successful full-audit workflow is not, by itself, visual approval. When full mode is requested, inspect the generated screenshots for clipping, wrapping, alignment, spacing, inconsistent labels, modal geometry, and web/APK parity before declaring the visual audit complete.

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

## Python tooling conventions

All Python scripts under `tools/` must run without command-line arguments.

Define default or fallback parameters as explicit variables near the top of each script. Command-line flags may override these variables, but the script must execute successfully when invoked with zero arguments.

Do not commit private credentials, tokens, keystores, or service-account JSON files to Git. Keep credentials in the ignored `Key/` directory or supply them via environment variables.

## Google Play release workflow

1. Increment `#VersionCode` and update `#VersionName` in `AeroCalculator.b4a`.
2. Generate the signed release bundle (`Objects/AeroCalculator.aab`) and APK (`Objects/AeroCalculator.apk`) using `B4ABuilder.exe` with the private keystore under `Key/key_aero_calc.keystore` (key alias `b4a`).
3. Maintain release notes in `docs/release_notes_<version>.txt` using language blocks such as `<en-US>` and `<pt-BR>`.
4. Upload the release via Google Play Console manually or automatically via `tools/upload_playstore.py`.
5. For automated uploads, save the Google Cloud service-account key to `Key/play_store_service_account.json` (git-ignored) and enable the Google Play Android Developer API in the linked Google Cloud project.

## Completion

Do not report a change as complete while a required test fails, documentation is inconsistent, or a change is only partially wired into the application.
