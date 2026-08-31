# Changelog

All notable changes to the repository should be recorded here.

## Unreleased

### Added

- Traceable software requirements.
- Technical calculation, unit, architecture, dependency, verification, and user documentation.
- Agent working rules and technical-writing rules.
- Portable reference-physics verification suite.
- Repository, documentation, asset, dependency, and source sanity checks.
- Characterization and reference-data separation.
- GitHub Actions quality workflow.
- Release checklist and optional B4ABuilder helper.
- Third-party notice placeholder pending license verification.

### Changed

- README expanded into a repository entry point with links to the technical documentation.
- Audited the B4A standard-atmosphere forward, inverse, and geometric-altitude error paths through 84.852 km geopotential altitude.
- Corrected high-altitude layer temperature bases, pressure relations, and inverse pressure-altitude signs.
- Changed repository artifact checks to inspect Git-tracked files only.

### Known follow-up

- Production calculation logic remains concentrated in `AeroCalculator.b4a`. Extract it incrementally only after B4A compile access is available and each block has regression coverage.
- B4A compilation is not available in the current environment because `B4ABuilder.exe` is not installed or configured.
