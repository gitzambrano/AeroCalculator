# Test Status Before Codex Handoff

## Validated locally

The independent numerical test subset was executed successfully in the available Python environment.

Result:

- 22 test cases passed;
- 31 subtests passed;
- 0 failures in the independent numerical subset.

Coverage includes:

- standard-atmosphere layer calculations;
- atmospheric layer continuity checks;
- pressure monotonicity;
- pressure-altitude round trips;
- TAS/CAS/EAS/Mach relations;
- dynamic pressure;
- stall speed;
- load factor and bank-angle identities;
- unit conversion invariance;
- geometric/geopotential altitude relations;
- wind component identities;
- software-requirement ID integrity.

## Important qualification

A previous simulated full-repository run used a reduced local B4A stub. That result must not be treated as validation of the real Android application.

The GitHub connector available during preparation could read the real `AeroCalculator.b4a`, but large-file responses were truncated. It also returned HTTP 403 for all write operations. Therefore the real B4A source was not modified in this handoff package.

Codex must run the complete suite after this package is applied to the actual repository checkout.

## Known audit target

The production B4A source exposed during review contains suspicious standard-atmosphere expressions above 20 km. In particular, a 20–32 km temperature expression appeared to use 310.65 K at the lower boundary rather than approximately 216.65 K.

This is an audit finding, not a silently accepted baseline. Verify it against the real branch, create/retain an independent failing regression test, and fix the production equation if confirmed.
