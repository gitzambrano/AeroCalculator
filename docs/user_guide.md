# User Guide

AeroCalculator is available on Android and in the browser at https://gitzambrano.github.io/AeroCalculator/ when Pages deployment is enabled. The portable calculator behavior is shared by both products; device sensor inputs are Android-only.

## 1. Application pages

AeroCalculator uses three main pages: Airplanes, Inputs, and Outputs.

A horizontal swipe to the right selects the adjacent tab on the right; a swipe to the left selects the adjacent tab on the left, in the Airplanes, Inputs, Outputs order. Swipes at the first or last page remain on that page. Open dialogs and settings block page swipes.

Use **Airplanes** to manage aircraft data. Use **Inputs** to select the physical quantities and units for a calculation. Use **Calculate** to update **Outputs**.

## 2. Aircraft profiles

An aircraft profile can store:

- wing reference area;
- reference chord;
- named mass values;
- CLmax values for flap configurations;
- the units associated with stored geometry and mass values.

Select a profile before a calculation when you want the stored values to populate the corresponding inputs. Use custom values when a profile value does not apply.

## 3. Altitude or pressure input

Select one altitude-family input:

- pressure altitude;
- geometric altitude;
- GPS altitude;
- pressure;
- pressure from the device sensor.

Then select the corresponding unit.

Pressure altitude and geometric altitude are different physical quantities. See `calculations.md` for the definitions.

## 4. Temperature input

Select Delta ISA, outside-air temperature, or device temperature when available.

Delta ISA is a temperature difference from the standard atmosphere at the calculated pressure altitude.

## 5. Speed input

The calculator supports several ways to define the aerodynamic state, including TAS, CAS, EAS, Mach, lift coefficient, Vs factor, ground speed, dynamic pressure, and impact pressure.

Some selections require aircraft mass, reference area, CLmax, or maneuver state to produce meaningful derived values.

## 6. Maneuver input

Select load factor or bank angle according to the desired maneuver definition. For a coordinated level turn, load factor and bank angle follow the relation documented in `calculations.md`.

## 7. Wind and navigation

Wind can be represented by components or by speed and direction depending on the selected mode.

The Inputs page shows the full Wind Speed and Wind Direction labels at widths of 360 dp on Android or 360 px in the browser and above. Smaller screens use abbreviated labels.

The calculator can combine heading, track, sideslip, drift, TAS, and ground speed. Very strong wind can make some requested heading or track combinations physically impossible.

## 8. Sensors

Sensor-based entries are available only in the Android application and depend on Android hardware and permissions. The browser uses manual inputs for these quantities.

Sensor inputs do not change the underlying physics equations. They only change the source of the input value.

## 9. Units

Changing a unit changes representation, not the physical state. See `units_and_conventions.md` for the authoritative conversion table and angle conventions.

## 10. Interpreting unavailable output

The application displays an unavailable marker when a result is non-finite or cannot be represented. Do not interpret an unavailable field as zero.

Aircraft editor values share column widths across area, chord, weights, and flaps. Add and remove flap controls sit side by side in the lift coefficient header. Editor captions remain on one line; the chord caption falls back to cREF only when the full caption cannot fit. Modal headers omit close icons; use the existing Cancel, OK, Back, or outside-tap action to dismiss them.

Ground Speed uses its full caption from 360 dp, matching the wind-vector labels; narrower layouts retain their existing abbreviation and symbol fallbacks. Empty inputs have no hint text. Tap the reference-area, reference-chord, mass, or maximum-lift symbol in the aircraft editor to open technical help.

Fresh installations start with zero saved airplanes. No example profiles are bundled or recreated when the library is empty. Add or import your own aircraft; existing saved profiles remain available after an upgrade.

Incomplete numeric entries such as a lone decimal point are treated as empty when leaving or calculating. The aircraft editor rejects malformed numeric entries before saving, so they cannot prevent reopening the app.

Technical help uses **Model Physics** to describe the physical process behind each equation. Reference values, conventions, and specific model boundaries are stated where relevant; generic assumption text is omitted.
