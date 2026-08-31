# Atmosphere Audit Design

## Scope

This change applies the supplied professionalization overlay. It also corrects confirmed standard-atmosphere defects in the existing B4A calculation path. It does not extract a new B4A calculation module in this delivery.

## Behavior

The B4A calculation path shall use the 1976 United States Standard Atmosphere layer bases and lapse rates from 0 km through 84.852 km geopotential altitude. The forward pressure-altitude path and the inverse static-pressure path shall use the same layer data. The temperature, pressure, density, and speed-of-sound outputs shall remain continuous at the documented layer boundaries.

The existing geometric-altitude inversion remains in the Activity. Its error function shall evaluate the same standard-atmosphere pressure relationship over the full supported range. The iteration shall retain its existing user-interface behavior.

## Verification

Independent Python reference tests remain the physical authority. A source regression test shall verify that the production B4A file contains the audited layer bases, lapse rates, and high-altitude inverse-pressure formulas. The test shall fail against the historical expressions before the source correction.

The repository check shall report forbidden files only when Git tracks them. Ignored local build products and local signing material shall not cause a false failure. A tracked forbidden artifact shall remain an error.

## Constraints

- Modify only the `Full-documentation` branch.
- Do not replace `AeroCalculator.b4a` with a reconstructed file.
- Do not update reference or characterization snapshots to hide a failure.
- Keep the GUI and its selected-input behavior unchanged.
- Do not add a B4A module until the application calls it.
- Do not run a B4A build when no B4ABuilder executable is available.
