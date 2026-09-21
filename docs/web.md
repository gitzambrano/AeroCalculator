# Web application

The browser version lives under `web/` and is a TypeScript/Vite implementation of the AeroCalculator user interface and portable numerical core.

## Design goal

The web UI deliberately preserves the Android application's visual language:

- the same teal title color;
- the same AeroCalculator icon and Xenara title face;
- the three top sections `AIRPLANES`, `INPUTS`, and `CALCULATE`;
- the input-row structure used by the B4A application;
- the Android result names and ordering.

Browser-native select controls replace the Android click-to-cycle quantity and unit buttons. This is an interaction adaptation, not a visual redesign.

## Numerical boundary

The initial web core implements the independently documented blocks for:

- standard atmosphere through 84.852 km geopotential altitude;
- geometric/geopotential and pressure-altitude conversion;
- Delta ISA / OAT density and speed of sound;
- TAS, CAS, EAS, Mach, dynamic pressure, and impact pressure;
- lift coefficient, 1-g stall speed, load factor/bank, turn radius/rate, Reynolds number;
- wind component resolution.

The implementation is intentionally subsonic where the repository documentation only claims the subsonic isentropic CAS relation.

Android sensors and Android profile-file APIs are not used by the browser build.

## Local development

```bash
cd web
npm install
npm test
npm run dev
```

Production build:

```bash
npm run build
```

The generated static site is written to `web/dist/` and requires no backend.

## Verification

`.github/workflows/web.yml` runs TypeScript checking, numerical tests, and the production Vite build. The test cases include the same independent atmosphere and turn references used by the repository's portable verification strategy.
