# Release Checklist

Complete every applicable item before a public release.

## Source and version

- [ ] Review `#VersionCode`.
- [ ] Review `#VersionName`.
- [ ] Confirm the package name.
- [ ] Confirm that no unrelated generated files are staged.
- [ ] Review `CHANGELOG.md`.

## Verification

- [ ] Run `python tests/run_all_tests.py`.
- [ ] Run `python tools/check_repo.py`.
- [ ] Review any characterization diff.
- [ ] Confirm reference-data changes are intentional and documented.
- [ ] Check atmosphere boundary cases if atmosphere code changed.
- [ ] Check unit round trips if conversion code changed.
- [ ] Check zero-wind and crosswind cases if navigation code changed.

## B4A build

- [ ] Open the project with the documented B4A environment.
- [ ] Compile a Debug build.
- [ ] Compile the intended Release build.
- [ ] Review compiler warnings.
- [ ] Confirm required additional libraries are installed.
- [ ] Confirm assets load from a clean checkout.
- [ ] If command-line B4ABuilder is configured, run `tools/b4a_build.ps1`.

## Android smoke test

- [ ] Launch after a fresh install.
- [ ] Open Airplanes, Inputs, and Outputs.
- [ ] Create or edit an aircraft profile.
- [ ] Run an ISA sea-level calculation.
- [ ] Run a representative cruise calculation.
- [ ] Run a wind calculation.
- [ ] Test a sensor-unavailable path.
- [ ] Rotate or resize the device if the release supports that behavior.
- [ ] Confirm no calculation requires network access.

## Security and packaging

- [ ] Confirm no keystore or credential is tracked.
- [ ] Confirm production signing material is outside the repository.
- [ ] Confirm APK/AAB artifacts are not committed.
- [ ] Review third-party notices and redistribution permissions.
- [ ] Confirm the Play Store description matches major current capabilities.

## Documentation

- [ ] Update the README if build requirements changed.
- [ ] Update `docs/calculations.md` for physics changes.
- [ ] Update `docs/units_and_conventions.md` for unit or sign changes.
- [ ] Update `docs/dependencies.md` for library changes.
- [ ] Update requirements for deliberate behavior changes.
