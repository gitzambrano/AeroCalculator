# AGENTS.md

Working rules for AeroCalculator.

## Source of truth

`docs/software_requirements.md` defines the behavior that the software must preserve. Requirements use permanent identifiers such as `PH-1`, `UN-2`, and `QR-3`.

Before changing numerical behavior, check the applicable requirement. If the required behavior changes, update the requirement deliberately in the same change.

## Language and writing

Write new code comments, documentation, tests, commit messages, and user-facing text in technical English.

Follow `.agents/skills/writing-rules/SKILL.md` for prose. Keep the mirrored Claude skill identical (`.claude/skills/writing-rules/SKILL.md`).

## Core workflow

1. Reproduce a logic defect before the fix.
2. Add a regression test for each logic defect. Pure layout changes are exempt.
3. For physics changes, add or update an independent reference case.
4. Make the smallest change that solves the problem.
5. Run focused tests during development.
6. Run `python tests/run_all_tests.py` before completion.
7. Run `python tools/check_repo.py --strict-warnings`.
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

or manually dispatch the `Web` / `android-build-smoke` GitHub workflow with `full_visual_audit=true`. A push whose head commit message contains `[visual-audit]` is also an explicit opt-in and runs the full visual audit for that commit.

Full mode expands the viewport/state matrix and captures the complete screenshot set. On Android it exercises the detailed input-state sweep at 260, 280, 320, 360, 379, 380, 390, 393, and 411 dp in addition to the broader smoke profiles. On web it enables `web/e2e/visual_audit.spec.ts` across the configured mobile, tablet, landscape, laptop, and desktop viewports.

Android UI tests drive the emulator with `adb input`. Swipe inside the bounds of the target scroll container, not at fixed screen fractions, and confirm the expected text after scrolling instead of trusting a fixed swipe count. Older emulator images can drop input events after a display-size change.

A successful full-audit workflow is not, by itself, visual approval. When full mode is requested, inspect the generated screenshots for clipping, wrapping, alignment, spacing, inconsistent labels, modal geometry, and web/APK parity before declaring the visual audit complete.

## Workspace cleanliness and scratch files

Do not create arbitrary temporary directories or ad-hoc folders across the repository.

1. Use the designated project directory `scratch/` for temporary scripts, dumps, inspection files, and ad-hoc test artifacts.
2. `scratch/` is git-ignored and must never be committed.
3. Clean out or prune files in `scratch/` periodically so the workspace stays tidy.
4. Keep the repository root and git working tree clean of untracked scratch files.

## UI standards and layout safety

1. Do not reduce control heights or paddings below safe touch and font metric limits (minimum button height 40 dip / 44 px). Responsive compact layouts must preserve full glyph visibility for descenders (`g`, `y`, `p`), subscripts, and units.
2. Maintain standard aerodynamic subscript conventions:
   - Uppercase subscript notation for aerodynamic and atmospheric parameters ($H_P$, $H_{\mathrm{GEOM}}$, $H_G$, $H_\rho$, $H_T$, $S_{\mathrm{REF}}$, $c_{\mathrm{REF}}$, $C_{L,\mathrm{MAX}}$, $N_Z$, $V_S$).
   - Lowercase subscript preserved only for compressible dynamic impact pressure ($q_c$).
3. Keep feature parity and synchronization between Android (B4A) and Web (TypeScript/Vite) clients for layouts, bottom sheets, options, and long-press technical help.
4. Width-driven label fallbacks use the same thresholds on both clients. Below 340 dp/px, altitude and TAT output labels drop their symbols (Android `UseOutputSymbols`, web `.result-symbol`). Prefer dropping a redundant symbol to abbreviating the quantity name.

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

Define default or fallback parameters as explicit variables near the top of each script. Command-line flags may override these variables, but the script must execute successfully when invoked with zero arguments. `tools/check_repo.py` rejects a `sys.argv[N]` read without a length guard.

Delete one-off migration or fix-up scripts after they run. Delete a generator when its output has been edited by hand and the generator no longer reproduces the committed file.

Do not commit private credentials, tokens, keystores, or service-account JSON files to Git. Keep credentials in the ignored `Key/` directory or supply them via environment variables.

## Google Play release workflow

1. Increment `#VersionCode` and update `#VersionName` in `AeroCalculator.b4a`.
2. Generate the signed release bundle (`Objects/AeroCalculator.aab`) and APK (`Objects/AeroCalculator.apk`) using `B4ABuilder.exe` with the private keystore under `Key/key_aero_calc.keystore` (key alias `b4a`).
3. Maintain release notes in `docs/release_notes_<version>.txt` using language blocks such as `<en-US>` and `<pt-BR>`.
4. Ensure Google Play release notes do not exceed Google Play's 500-character limit per localized block.
5. Avoid raw internal markup or unprocessed formatting tokens in public store release notes.
6. Upload the release via Google Play Console manually or automatically via `python tools/upload_playstore.py`.
7. For automated uploads, save the Google Cloud service-account key to `Key/play_store_service_account.json` (git-ignored) and enable the Google Play Android Developer API in the linked Google Cloud project.

## Web release workflow

1. Sync web version in `web/package.json` with the current release version.
2. Run `cd web && npm test` and `npm run build`.
3. Run end-to-end and visual regression tests: `cd web && npx playwright test`.
4. Ensure deployed GitHub Pages at `https://gitzambrano.github.io/AeroCalculator/` matches `main`.

## Completion

Do not report a change as complete while a required test fails, documentation is inconsistent, or a change is only partially wired into the application.
