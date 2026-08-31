# Current Behavior Inventory

This inventory describes the responsibilities visible in the current source before architectural extraction. It is a characterization document, not a statement that every existing numerical result is correct.

## Main project

`AeroCalculator.b4a` currently owns most application state, UI construction, preferences, sensor integration, input conversion, numerical calculation, and output formatting.

The main calculator exposes three pages:

1. Airplanes
2. Inputs
3. Outputs

The current input families include altitude or pressure, temperature or Delta ISA, speed or aerodynamic state, aircraft mass and geometry, CLmax, maneuver state, angular state, and wind state.

## Calculation families

### Atmosphere and altitude

The application accepts pressure altitude, geometric altitude, GPS altitude, pressure, or sensor pressure. It calculates pressure altitude, geometric altitude, geopotential altitude, density altitude, temperature altitude, pressure, density, temperature, Delta ISA, viscosity, and speed of sound.

The source uses the 1976 standard-atmosphere layer boundaries at 11, 20, 32, 47, 51, and 71 km. The production forward and inverse pressure-altitude paths use the audited layer bases through 84.852 km geopotential altitude. The geometric-altitude error function uses the same forward atmosphere path.

### Airspeed and compressibility

The application accepts or derives TAS, CAS, EAS, Mach, lift coefficient, Vs factor, ground speed, dynamic pressure, and impact pressure.

### Aircraft and stall

Aircraft profiles store reference area, reference chord, several mass definitions, and CLmax values for flap configurations.

Stall calculations combine mass, load factor, density, reference area, and CLmax.

### Maneuver

The application supports pull-up load factor, wind-up-turn load factor, and bank angle.

### Wind and navigation

The application handles heading, track, sideslip, drift, wind speed, wind direction, headwind, crosswind, and ground speed.

### Sensors

GPS, pressure, and temperature sensors can provide selected inputs.

## Supporting modules

- `Airp.bas` manages aircraft-profile editing.
- `ClsCheckList.bas` implements the custom list/checklist behavior.
- `ClsExplorer.bas` implements file/profile browsing.
- `Files/` contains runtime assets.
- `Icons/` contains app and store graphics.
- `Install/` contains third-party B4A library archives.

## Architectural boundary to introduce

The target dependency direction is:

`Android UI -> SI normalization -> pure calculation core -> output conversion -> Android UI`

The extraction must be incremental. Characterization and reference tests must protect numerical behavior before calculation blocks move out of the Activity.
