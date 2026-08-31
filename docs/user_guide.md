# User Guide

## 1. Application pages

AeroCalculator uses three main pages: Airplanes, Inputs, and Outputs.

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

The calculator can combine heading, track, sideslip, drift, TAS, and ground speed. Very strong wind can make some requested heading or track combinations physically impossible.

## 8. Sensors

Sensor-based entries depend on Android hardware and permissions. If a sensor is unavailable, select a manual input mode.

Sensor inputs do not change the underlying physics equations. They only change the source of the input value.

## 9. Units

Changing a unit changes representation, not the physical state. See `units_and_conventions.md` for the authoritative conversion table and angle conventions.

## 10. Interpreting unavailable output

The application displays an unavailable marker when a result is non-finite or cannot be represented. Do not interpret an unavailable field as zero.
