import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";

const B737_PROFILE = {
  id: "b737-800",
  name: "Boeing 737-800",
  sref: 124.6,
  srefUnit: "m²",
  cref: 3.8,
  crefUnit: "m",
  weightUnit: "kg",
  weights: {
    MTOW: 79015,
    MLW: 66360,
    MZFW: 62731,
    BOW: 41413,
    Heavy: 75000,
    Light: 55000,
  },
  clmax: [1.45, 1.8, 2.05, 2.3, 2.75, 2.95, null, null, null, null, null, null, null, null],
};

const C172_PROFILE = {
  id: "c172",
  name: "Cessna 172 Skyhawk",
  sref: 16.2,
  srefUnit: "m²",
  cref: 1.49,
  crefUnit: "m",
  weightUnit: "kg",
  weights: {
    MTOW: 1157,
    MLW: 1157,
    MZFW: 1157,
    BOW: 744,
    Heavy: 1050,
    Light: 900,
  },
  clmax: [1.5, 1.75, 2.1, null, null, null, null, null, null, null, null, null, null, null],
};

const PROFILES = [B737_PROFILE, C172_PROFILE];

const CRUISE_INPUTS = {
  "alt-type": "Pressure Altitude",
  "alt-value": "35000",
  "alt-unit": "ft",
  "temp-type": "OAT",
  "temp-value": "-54",
  "temp-unit": "°C",
  "spd-type": "Mach",
  "spd-value": "0.82",
  "spd-unit": "Mach",
  "maneuver-type": "Bank Angle",
  "maneuver-value": "30",
  "maneuver-unit": "°",
  "headWind-type": "Wind Speed",
  "headWind-value": "45",
  "headWind-unit": "kts",
  "crossWind-type": "Wind Dir",
  "crossWind-value": "270",
  "crossWind-unit": "°",
  "course-type": "Runway / Track",
  "course-value": "240",
  "course-unit": "°",
  "weight-value": "65000",
  "weight-unit": "kg",
  "sref-value": "124.6",
  "sref-unit": "m²",
  "cref-value": "3.80",
  "cref-unit": "m",
  "clmax-value": "1.45",
  "clmax-unit": "—",
};

const APPROACH_INPUTS = {
  "alt-type": "Pressure Altitude",
  "alt-value": "2500",
  "alt-unit": "ft",
  "temp-type": "OAT",
  "temp-value": "15",
  "temp-unit": "°C",
  "spd-type": "CAS",
  "spd-value": "75",
  "spd-unit": "kts",
  "maneuver-type": "Bank Angle",
  "maneuver-value": "45",
  "maneuver-unit": "°",
  "headWind-type": "Wind Speed",
  "headWind-value": "18",
  "headWind-unit": "kts",
  "crossWind-type": "Wind Dir",
  "crossWind-value": "310",
  "crossWind-unit": "°",
  "course-type": "Runway / Track",
  "course-value": "360",
  "course-unit": "°",
  "weight-value": "1050",
  "weight-unit": "kg",
  "sref-value": "16.2",
  "sref-unit": "m²",
  "cref-value": "1.49",
  "cref-unit": "m",
  "clmax-value": "2.10",
  "clmax-unit": "—",
};

const DEVICE_CONFIGS = [
  {
    name: "phone",
    viewport: { width: 360, height: 800 },
    scale: 3, // renders 1080 x 2400
    dir: "../scratch/store_assets/phone",
  },
  {
    name: "tablet_7",
    viewport: { width: 600, height: 960 },
    scale: 2, // renders 1200 x 1920
    dir: "../scratch/store_assets/tablet_7",
  },
  {
    name: "tablet_10",
    viewport: { width: 800, height: 1280 },
    scale: 2, // renders 1600 x 2560
    dir: "../scratch/store_assets/tablet_10",
  },
];

async function captureAll() {
  const browser = await chromium.launch({ headless: true });
  const htmlPath = path.resolve("dist/index.html").replace(/\\/g, "/");
  const fileUrl = "file:///" + htmlPath;

  for (const dev of DEVICE_CONFIGS) {
    console.log(`\n=== Generating screenshots for ${dev.name} (${dev.viewport.width * dev.scale}x${dev.viewport.height * dev.scale}) ===`);
    const outDir = path.resolve(dev.dir);
    fs.mkdirSync(outDir, { recursive: true });

    const context = await browser.newContext({
      viewport: dev.viewport,
      deviceScaleFactor: dev.scale,
    });

    // Helper to setup page state
    async function preparePage(theme, inputs, selectedProfileId = "b737-800") {
      const page = await context.newPage();
      await page.addInitScript(
        ({ profiles, selectedProfileId, theme, inputs }) => {
          localStorage.clear();
          localStorage.setItem("aerocalculator.profiles.v1", JSON.stringify(profiles));
          localStorage.setItem("aerocalculator.selected-profile.v1", selectedProfileId);
          localStorage.setItem(
            "aerocalculator.settings.v1",
            JSON.stringify({
              theme,
              altitude: "ft",
              pressure: "hPa",
              speed: "kts",
              density: "kg/m³",
              temperature: "°C",
              bankAngle: "°",
              turnRate: "°/s",
              turnRadius: "NM",
              cl: "0.00",
              re: "1e6",
              weight: "kg",
              area: "m²",
              length: "m",
              time: "min",
              soundSpeed: "m/s",
              viscosity: "μPa·s",
              dynamicPressure: "kPa",
              impactPressure: "kPa",
              vsFactor: "0.00",
              angleOutput: "°",
              windComponents: "kts",
              groundSpeed: "kts",
            })
          );
          localStorage.setItem("aerocalculator.inputs.v1", JSON.stringify(inputs));
        },
        { profiles: PROFILES, selectedProfileId, theme, inputs }
      );

      await page.goto(fileUrl);
      await page.waitForTimeout(400);
      return page;
    }

    // Shot 1: Inputs Tab — Theme: Green Peace (Cruise B737-800)
    {
      const page = await preparePage("Green Peace", CRUISE_INPUTS, "b737-800");
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(outDir, "01_inputs_cruise_green.png") });
      console.log("  Saved 01_inputs_cruise_green.png");
      await page.close();
    }

    // Shot 2: Calculate Tab (Top - Atmosphere & Airspeeds) — Theme: Dark Shadows
    {
      const page = await preparePage("Dark Shadows", CRUISE_INPUTS, "b737-800");
      await page.getByRole("button", { name: "CALCULATE" }).click();
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(outDir, "02_calculate_atmosphere_dark.png") });
      console.log("  Saved 02_calculate_atmosphere_dark.png");
      await page.close();
    }

    // Shot 3: Calculate Tab (Scrolled to Turn & Wind) — Theme: Blue Sky
    {
      const page = await preparePage("Blue Sky", CRUISE_INPUTS, "b737-800");
      await page.getByRole("button", { name: "CALCULATE" }).click();
      await page.waitForTimeout(200);
      await page.evaluate(() => {
        const out = document.querySelector(".calc-output-group") || document.querySelector(".page-content");
        if (out) out.scrollTop = 520;
        window.scrollTo(0, 520);
      });
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(outDir, "03_calculate_turn_wind_blue.png") });
      console.log("  Saved 03_calculate_turn_wind_blue.png");
      await page.close();
    }

    // Shot 4: Aircraft Profiles & Flap Configurations — Theme: Orange Juice
    {
      const page = await preparePage("Orange Juice", CRUISE_INPUTS, "b737-800");
      await page.getByRole("button", { name: "AIRPLANES" }).click();
      await page.waitForTimeout(300);
      const editBtn = page.locator(".airplane-edit-button").first();
      if (await editBtn.isVisible()) {
        await editBtn.click();
        await page.waitForTimeout(350);
      }
      await page.screenshot({ path: path.join(outDir, "04_airplanes_profile_editor_amber.png") });
      console.log("  Saved 04_airplanes_profile_editor_amber.png");
      await page.close();
    }

    // Shot 5: Aerodynamic Technical Help / KaTeX Math Modal — Theme: Dark Shadows
    {
      const page = await preparePage("Dark Shadows", CRUISE_INPUTS, "b737-800");
      await page.getByRole("button", { name: "CALCULATE" }).click();
      await page.waitForTimeout(200);
      await page.evaluate(() => {
        const ev = new MouseEvent("contextmenu", { bubbles: true, cancelable: true });
        const target = document.querySelector('[data-helper="Calibrated Airspeed"]') || document.querySelector(".output-label");
        if (target) target.dispatchEvent(ev);
      });
      await page.waitForTimeout(350);
      await page.screenshot({ path: path.join(outDir, "05_technical_help_formulas_dark.png") });
      console.log("  Saved 05_technical_help_formulas_dark.png");
      await page.close();
    }

    // Shot 6: Settings & Theme Selector Sheet — Theme: Ancient Brown
    {
      const page = await preparePage("Ancient Brown", CRUISE_INPUTS, "b737-800");
      await page.getByRole("button", { name: "More options" }).click();
      await page.waitForTimeout(250);
      await page.getByRole("button", { name: "Settings" }).click();
      await page.waitForTimeout(300);
      const themeBtn = page.locator('[data-setting-select="setting-theme"]');
      if (await themeBtn.isVisible()) {
        await themeBtn.click();
        await page.waitForTimeout(350);
      }
      await page.screenshot({ path: path.join(outDir, "06_settings_theme_picker_sepia.png") });
      console.log("  Saved 06_settings_theme_picker_sepia.png");
      await page.close();
    }

    // Shot 7: Approach & Steep Turn / Crosswind Scenario — Theme: Red Alert
    {
      const page = await preparePage("Red Alert", APPROACH_INPUTS, "c172");
      await page.getByRole("button", { name: "CALCULATE" }).click();
      await page.waitForTimeout(200);
      await page.evaluate(() => {
        const out = document.querySelector(".calc-output-group") || document.querySelector(".page-content");
        if (out) out.scrollTop = 380;
        window.scrollTo(0, 380);
      });
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(outDir, "07_approach_crosswind_red.png") });
      console.log("  Saved 07_approach_crosswind_red.png");
      await page.close();
    }

    // Shot 8: Interactive Unit Conversion Sheet — Theme: Green Peace
    {
      const page = await preparePage("Green Peace", CRUISE_INPUTS, "b737-800");
      const unitTrigger = page.locator("#alt-unit-trigger");
      if (await unitTrigger.isVisible()) {
        await unitTrigger.click();
        await page.waitForTimeout(350);
      }
      await page.screenshot({ path: path.join(outDir, "08_unit_picker_sheet_green.png") });
      console.log("  Saved 08_unit_picker_sheet_green.png");
      await page.close();
    }

    await context.close();
  }

  await browser.close();
  console.log("\nAll screenshots generated successfully!");
}

captureAll().catch((err) => {
  console.error("Capture failed:", err);
  process.exit(1);
});
