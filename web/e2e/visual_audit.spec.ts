import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

const cases = [
  { name: "mobile-320", width: 320, height: 568 },
  { name: "mobile-412", width: 412, height: 915 },
  { name: "desktop-1440", width: 1440, height: 900 },
] as const;

async function shot(page: Page, dir: string, name: string, fullPage = false): Promise<void> {
  await page.screenshot({ path: join(dir, `${name}.png`), fullPage });
}

async function baseline(page: Page): Promise<void> {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.locator("#temp-type").selectOption("Δ ISA");
  await page.locator("#temp-value").fill("0");
  await page.locator("#alt-value").fill("10000");
  await page.locator("#spd-type").selectOption("CAS");
  await page.locator("#spd-value").fill("180");
  await page.locator("#weight-value").fill("10000");
  await page.locator("#sref-value").fill("30");
  await page.locator("#cref-value").fill("2");
  await page.locator("#clmax-value").fill("1.5");
  await page.locator("#nz-value").fill("1");
}

for (const viewport of cases) {
  test(`visual audit ${viewport.name}`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
    const page = await context.newPage();
    const dir = join("visual-audit", viewport.name);
    await mkdir(dir, { recursive: true });

    await baseline(page);
    await expect(page.locator(".app-shell")).toBeVisible();

    await shot(page, dir, "01-inputs-viewport");
    await shot(page, dir, "02-inputs-full", true);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await shot(page, dir, "03-inputs-bottom");
    await page.evaluate(() => window.scrollTo(0, 0));

    await page.getByRole("button", { name: "CALCULATE" }).click();
    await shot(page, dir, "04-calculate-top");
    await shot(page, dir, "05-calculate-full", true);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await shot(page, dir, "06-calculate-bottom");
    await page.evaluate(() => window.scrollTo(0, 0));

    await page.getByRole("button", { name: "INPUTS" }).click();
    await page.getByRole("button", { name: "More options" }).click();
    await shot(page, dir, "07-main-menu");

    await page.getByRole("button", { name: "Settings" }).click();
    await shot(page, dir, "08-settings");
    await page.locator("#settings-dialog").evaluate((el) => el.scrollTo(0, el.scrollHeight));
    await shot(page, dir, "09-settings-bottom");
    await page.locator("#settings-dialog").evaluate((el) => el.scrollTo(0, 0));
    await page.getByRole("button", { name: "Cancel" }).click();

    await page.getByRole("button", { name: "More options" }).click();
    await page.getByRole("button", { name: "About" }).click();
    await shot(page, dir, "10-about");
    await page.locator('[data-close-dialog="about-dialog"]').click();

    await page.getByRole("button", { name: "AIRPLANES" }).click();
    await shot(page, dir, "11-airplanes-empty");
    await page.getByRole("button", { name: "Add airplane" }).click();
    await shot(page, dir, "12-editor-collapsed");
    await page.locator("#add-flap").click();
    await shot(page, dir, "13-editor-one-flap");

    await page.locator("#profile-name").fill("Visual Audit Jet");
    await page.locator("#profile-sref").fill("42");
    await page.locator("#profile-cref").fill("3");
    await page.locator("#profile-weight-MTOW").fill("12000");
    await page.locator("#profile-flap-0").fill("1.6");
    await page.locator("#profile-save").click();
    await shot(page, dir, "14-airplanes-profile");

    await page.locator(".airplane-edit-button").click();
    await page.locator(".editor-scroll").evaluate((el) => el.scrollTo(0, el.scrollHeight));
    await shot(page, dir, "15-editor-edit-bottom");
    await page.getByRole("button", { name: "Cancel" }).click();

    await page.getByRole("button", { name: "INPUTS" }).click();
    await page.locator("#spd-type").selectOption("Vs Factor");
    await page.locator("#spd-value").fill("1.3");
    await page.locator("#spdDelta-value").fill("10");
    await shot(page, dir, "16-vs-factor-delta");

    await page.locator("#headWind-type").selectOption("Wind Speed");
    await page.locator("#headWind-value").fill("20");
    await page.locator("#windRef-value").fill("270");
    await shot(page, dir, "17-wind-speed-direction");

    if (viewport.name !== "desktop-1440") {
      await page.getByRole("button", { name: "INPUTS" }).click();
      const themes = ["Green Peace", "Ancient Brown", "Dark Shadows", "Blue Sky", "Red Alert", "Orange Juice"];
      let index = 18;
      for (const theme of themes) {
        await page.getByRole("button", { name: "More options" }).click();
        await page.getByRole("button", { name: "Settings" }).click();
        await page.locator("#setting-theme").selectOption(theme);
        await page.locator("#settings-form").getByRole("button", { name: "Save" }).click();
        await shot(page, dir, `${index}-theme-${theme.toLowerCase().replaceAll(" ", "-")}`);
        index += 1;
      }
    }

    await context.close();
  });
}
