# Changelog

## [3.36.1] - 2026-10-08

### Fixed (web only)

- Made input unit dropdowns reliably open the themed choice sheet on mouse clicks and touch taps, using an accessible button above the native select.
- Preserved long-press contextual help, keyboard access, and physical-value conversion when units change.
- Kept dimensionless inputs disabled and re-enabled the unit control when the input quantity changes back.
- Added real browser click, touch, keyboard, and long-press regression tests.


## [3.36] - 2026-10-08

### Changed

- Clarified seven physical definitions (ideal gas law for pressure/density, Sutherland viscosity, dynamic pressure, lift coefficient, maximum lift coefficient, and 1-g CAS stall speed).
- Synchronized corresponding definitions between the Android and web help catalogs, input helpers, and output helpers without altering equations or numerical physics.
- Recessed all Android dropdown triangles by 2 dp, preserving selector text width through a compensated drawable gap and left padding; matched a 4 px edge inset on web.
- Added comprehensive help-parity and selector-padding regression tests.


## [3.35] - 2026-10-08

### Changed

- Unified concise definitions across web and Android help for all input, output, and aircraft-data quantities.
- Documented true-north navigation azimuths and positive heading, track, sideslip, drift, headwind, and crosswind conventions.
- Defined CAS and EAS through ISA sea-level impact-pressure and dynamic-pressure equivalence.
- Preserved informative model physics for viscosity (Sutherland's law), compressibility, and atmospheric altitude limits.
- Defined Basic Operating Weight as manufacturer-specified and retained conventional MTOW, MLW, and MZFW weight nomenclature.
- Distinguished the input stall-speed factor from its computed output ratio.
- Exposed technical long-press help on web aircraft weight and flap coefficient fields.


All notable changes to the repository should be recorded here.

## [3.34] - 2026-10-08

### Fixed

- Android 15+ edge-to-edge: bottom sheets and help sheets are hosted in the system-bar-safe content panel. They were placed in Activity coordinates, stopped about 48 dp above the content bottom, and left the last input row visible and tappable below the sheet.
- Missing unit keys in a profile no longer crash airplane selection or the editor.
- Web: a stored input state of `null` no longer breaks startup.

### Changed

- Selecting an airplane starts from its first stored weight and flap (Android and web), so results never fall back silently to 1 kg and C_L,MAX = 1.
- The aircraft editor asks before discarding only when a field changed (Android and web).
- Android Back on INPUTS needs a second press within 2 s to close the app; Back on AIRPLANES returns to INPUTS.
- Dropdown triangles grow from 4×3 to 6×4 at 400 dp/px and wider.
- Android first launch no longer recreates the screen three times; the obsolete orientation toggle for the old settings screen is removed.
- Importing airplanes shows one notice and uses the standard row height.
- The C_L,MAX add and remove buttons are centered on their label.
- Web: iOS Safari no longer zooms into inputs on focus.

### Repository

- The Android input matrix hides the keyboard only when it is visible, and selects sheet options inside the sheet list instead of occluded rows behind it.
- Feature regression `sheet-reaches-content-bottom`.

## [3.33] - 2026-10-08

### Fixed

- Android no longer crashes on every launch after a profile weight (for example MTOW) was saved. The restore compared an integer ID with the strings read from `taglist.txt`, fell back to Custom, and then read a missing unit key. Users had to clear app data to recover.
- A stored weight or flap choice that no longer exists falls back to Custom instead of crashing.
- A fresh install shows the correct temperature selector label (OAT) instead of Δ ISA.
- Importing airplanes keeps the Heavy and Light weights and flaps 10 to 13.
- Android equation boxes use the same notation as the help text and the web (H_P, S_REF, C_L,MAX, V_S). `tools/generate_latex_assets.js` now reads the equations from `AeroNames.bas`.

### Changed

- Swipe navigation follows the finger: right to the tab on the right, left to the tab on the left.
- Wider unit column, complete speed and wind labels, and a complete +Δ control.
- One solid triangle style for every dropdown, including the aircraft editor units.
- Aircraft editor fields, units, and section labels are aligned; long airplane names end with an ellipsis.
- Input hints and close (X) buttons removed; tapping editor symbols opens help.
- New installations contain no example airplanes.
- Help text explains the model physics of each quantity.
- Results are replaced, not appended, on recalculation; incomplete numbers no longer crash.

## [3.32] - 2026-10-07

### Changed

- Changing an input unit now converts the value.
- Temperature unit and selected airplane are restored after restart.
- Crosswind unit is independent from Headwind.
- Wing area in in² is converted correctly.
- Output angles default to degrees; zero wind shows no direction.
- Swipe down to close menus; swipe sideways to change tabs.
- Labels adapt to very narrow screens without clipping.
- Airplane picker shows aircraft details; viscosity in Pa·s.
- Web selector chevrons match the smaller Android chevron.

### Repository

- Removed one-off and stale scripts: `apply_physics_fixes.py` (and its workflow), `capture_audit_apk.py`, `test_themes_and_popups.py`, `enhance_aeronames.py`, `make_web_catalog.py`.
- `check_repo.py` rejects `tools/` scripts that read `sys.argv[N]` without a fallback.
- Android CI scrolls inside sheet lists, confirms scroll targets and tab switches, and never reuses stale UI dumps.
- Merged a duplicate web width test into the control audit.

## [3.31] - 2026-10-07

### Changed

- Restored input control height and spacing to prevent clipped button text.
- Vertically centered text in all Android edit fields, including Airplanes editor.
- Geopotential Altitude now uses Hg for a more compact result label.
- Refined Brown, Blue, Red, and Orange themes with clearer borders and neutral surfaces.
- Added premium input layout with taller controls, tighter rows, highlighted values, and bottom-sheet menus.

## [3.30] - 2026-10-06

### Changed

- Altitudes: Geometric and Geopotential Altitude symbols are now clearly distinguished.
- Notation: Proper subscript typography for pressure altitude (H_p).
- Aircraft: Centered airplane selector and clean themed dropdown indicator.
- Responsive labels: Full Ground Speed and Runway Angle with compact fallbacks.
- Layout: Optimized vertical spacing and bottom padding on compact screens.

## [3.29] - 2026-10-06

### Changed

- Standardized descriptors: Concise definitions for all modal options and settings.
- American English: Unified unit spellings (meters, kilometers, millimeters).
- Clear definitions: User-defined max CL, coordinated turn load factors, and relative wind angles.
- Subtitles: Added helpful subtitles to settings pickers.

## [3.28] - 2026-10-06

### Changed

- Optimized selection sheets: Quantity pickers fit on screen without vertical scrolling.
- Standard definitions: Concise definitions for speeds (TAS, CAS, EAS, Mach, CL, Qc) and weights (MTOW, MLW, MZFW, BOW).
- Flap nomenclature: Flap 0 (clean) and detent CLmax settings.
- Inputs: Centered aircraft name and subtle themed arrow.
- Stability: Fixed app exit on theme change.

## [3.27] - 2026-10-06

### Changed

- Modern unit selectors: Airplane editor units now use sleek bottom-sheet picker dialogs.
- Dynamic icon tinting: Aircraft action icons automatically match the selected visual theme.
- Haptic feedback: Subtle touch vibrations when selecting units in the airplane editor.
- Performance and stability enhancements across all screens.

## [3.26] - 2026-10-06

### Changed

- Theme switching fix: Aircraft profiles remain fully preserved and populated across all theme changes.
- State persistence: Robust fallback and guarded storage for aircraft list ordering.
- Rapid double-tap aircraft activation with touch-and-hold reordering.
- Themed vector icons matching active color palette.

## [3.25] - 2026-10-06

### Changed

- Aircraft selection: Rapid double-tap activation prevents accidental touches with smooth navigation.
- Visual alignment: Generous typography spacing between aircraft name and area/mass metrics.
- Themed vector icons: New vector duplicate, edit, and delete glyphs matching app palette.
- Discreet active indicator: Streamlined active badge and accent bar.
- Touch-and-hold aircraft reordering.

## [3.24] - 2026-10-06

### Changed

- Technical Help: KaTeX LaTeX formulas and physical model assumptions for 74 variables.
- Modern UI: New in-app Settings overlay and proportional 3-column inputs layout.
- Scientific notation: Enhanced formatting with precise subscripts (S_REF, c_REF, CL_MAX).
- Aircraft management: Active profile badge and improved action buttons.
- Polished themes: Enhanced Red Alert and Orange Juice palettes.

## [3.23] - 2026-09-13

### Changed

- Replaced hardcoded year in About dialog with dynamic `DateTime.GetYear(DateTime.Now)`.
- Updated version metadata to 3.23 (VersionCode 28).

## [3.22] - 2026-09-13

### Added

- Traceable software requirements.
- Technical calculation, unit, architecture, dependency, verification, and user documentation.
- Agent working rules and technical-writing rules.
- Portable reference-physics verification suite.
- Repository, documentation, asset, dependency, and source sanity checks.
- Characterization and reference-data separation.
- GitHub Actions quality and multi-screen smoke test workflows.
- Release checklist and optional B4ABuilder helper.
- Automated Google Play Store upload script (`tools/upload_playstore.py`) with zero-argument fallbacks.
- Bilingual release notes (`docs/release_notes_3.22.txt`).
- Third-party notice placeholder pending license verification.

### Changed

- README expanded into a repository entry point with links to the technical documentation.
- Audited the B4A standard-atmosphere forward, inverse, and geometric-altitude error paths through 84.852 km geopotential altitude.
- Corrected high-altitude layer temperature bases, pressure relations, and inverse pressure-altitude signs.
- Changed repository artifact checks to inspect Git-tracked files only.
- Switched Markdown math to GitHub-compatible delimiters (`$$` and `$`) so equations render in the hosted documentation.
- Updated the README build prerequisites to reflect `targetSdkVersion` 36 and the RichString requirement.
- Replaced the geometric-altitude iteration with a safeguarded root solver that converges for both Delta ISA and OAT inputs.
- Reworked wind-triangle inversion so all Track/Heading and Sideslip/Drift combinations close vectorially for TAS and ground-speed inputs.
- Corrected density altitude across the documented atmosphere range.
- Corrected coordinated-turn radius and rate to use true airspeed.
- Corrected Fahrenheit display conversion for the temperature-sensor input.
- Clarified that the displayed stall speed is the 1-g reference Vs.

### Known follow-up

- Production calculation logic remains concentrated in `AeroCalculator.b4a`. Extract it incrementally only after B4A compile access is available and each block has regression coverage.
- B4A command-line compilation is available via `tools/b4a_build.ps1` (requires `B4A_BUILDER` set to `B4ABuilder.exe`). A headless Release App Bundle can be produced with the private signing key under `Key/` (not tracked); the project-local `Libraries/` folder is registered through the B4A INI `AdditionalLibrariesFolder` setting.
