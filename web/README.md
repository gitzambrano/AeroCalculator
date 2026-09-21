# AeroCalculator Web

The browser version is contained entirely under `web/` and is implemented with TypeScript and Vite.

**Browser access:** https://gitzambrano.github.io/AeroCalculator/

The Pages URL is the intended public entry point after deployment is enabled on `main`.

## Scope

The web application provides the portable AeroCalculator functionality:

- standard atmosphere and altitude calculations;
- Delta ISA and OAT;
- TAS, CAS, EAS, Mach, dynamic pressure, and impact pressure;
- lift coefficient, 1-g stall speed, Vs factor, Reynolds number;
- load factor, bank angle, turn radius, and turn rate;
- heading, track, sideslip, drift, ground speed, headwind, and crosswind;
- aircraft profiles, themes, output settings, and Android-compatible `airplanes.txt` import/export.

GPS, pressure-sensor, and temperature-sensor input modes remain Android-only.

## Structure

```text
web/
  e2e/                 Chromium end-to-end and responsive tests
  public/              Static PWA assets
  scripts/             Build-time service-worker generation
  src/                 TypeScript UI, numerical core, profiles, tests, styles
  index.html
  package.json
  playwright.config.ts
  vite.config.ts
  vitest.config.ts
```

`dist/` is generated and is not source.

## Local development

```bash
cd web
npm install
npm test
npm run dev
```

Production verification:

```bash
npm run build
npx playwright install chromium
npm run test:e2e
```

The production build is written to `web/dist/`. JavaScript, CSS, fonts, and UI images are inlined into the generated `index.html`; the remaining static files are the manifest, app icon, and generated service worker. This keeps the Pages build self-contained and allows offline reload after installation.

## Verification

The web CI runs:

- TypeScript checking;
- numerical and invariant tests;
- aircraft-profile interchange tests;
- production Vite build;
- Chromium end-to-end tests;
- responsive-layout checks at narrow mobile, mobile, tablet, laptop, and desktop widths.

The responsive tests reject horizontal overflow, clipped critical text, and visible controls that leave the viewport.
