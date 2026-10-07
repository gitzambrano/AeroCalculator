import { expect, test, type Page } from "@playwright/test";

const viewports = [
  { name: "mobile-320", width: 320, height: 568 },
  { name: "mobile-360", width: 360, height: 800 },
  { name: "mobile-375", width: 375, height: 812 },
  { name: "mobile-390", width: 390, height: 844 },
  { name: "mobile-412", width: 412, height: 915 },
  { name: "mobile-430", width: 430, height: 932 },
  { name: "small-tablet", width: 600, height: 960 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "tablet-landscape", width: 1024, height: 768 },
  { name: "laptop", width: 1366, height: 900 },
  { name: "desktop", width: 1920, height: 1080 },
] as const;

async function assertNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => ({
    viewport: window.innerWidth,
    html: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(overflow.html, JSON.stringify(overflow)).toBeLessThanOrEqual(overflow.viewport + 1);
  expect(overflow.body, JSON.stringify(overflow)).toBeLessThanOrEqual(overflow.viewport + 1);
}

async function assertCriticalTextNotClipped(page: Page): Promise<void> {
  const clipped = await page.evaluate(() => {
    const selectors = [
      ".brand", ".tab", ".field-button", ".result-name", ".result-value",
      ".popup-menu button", ".airplane-name-button strong", ".editor-toolbar button",
      ".settings-dialog label", ".dialog-buttons button",
    ];
    return [...document.querySelectorAll<HTMLElement>(selectors.join(","))]
      .filter((el) => {
        const style = getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
      })
      .filter((el) => {
        const style = getComputedStyle(el);
        const verticalIsClipped = (style.overflowY === "hidden" || style.overflowY === "clip")
          && el.scrollHeight > el.clientHeight + 2;
        return el.scrollWidth > el.clientWidth + 1 || verticalIsClipped;
      })
      .map((el) => ({
        text: el.textContent?.trim(),
        className: el.className,
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
      }));
  });
  expect(clipped).toEqual([]);
}

async function assertVisibleInteractiveElementsInsideViewport(page: Page): Promise<void> {
  const failures = await page.evaluate(() => {
    const selector = ".tab,.icon-button,.field-select,.unit-select,.profile-select,.field-button,.value-input,dialog[open] button,dialog[open] input,dialog[open] select";
    return [...document.querySelectorAll<HTMLElement>(selector)]
      .filter((el) => {
        const style = getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
      })
      .filter((el) => {
        const rect = el.getBoundingClientRect();
        return rect.left < -1 || rect.right > window.innerWidth + 1;
      })
      .map((el) => ({ id: el.id, className: el.className }));
  });
  expect(failures).toEqual([]);
}

for (const viewport of viewports) {
  test.describe(viewport.name, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test("inputs and outputs fit without clipping", async ({ page }) => {
      await page.goto("/");
      await expect(page.locator(".app-shell")).toBeVisible();
      await expect(page.locator(".input-row")).toHaveCount(14);
      await assertNoHorizontalOverflow(page);
      await assertCriticalTextNotClipped(page);
      await assertVisibleInteractiveElementsInsideViewport(page);

      if (viewport.width <= 430) {
        const widths = await page.locator(".input-row:not([hidden]) > .field-select-wrap, .input-row:not([hidden]) > .field-select, .airplane-row > .field-button").evaluateAll((elements) =>
          elements
            .filter((el) => getComputedStyle(el).display !== "none")
            .map((el) => Math.round(el.getBoundingClientRect().width * 10) / 10)
        );
        expect(widths.length).toBeGreaterThan(5);
        expect(Math.max(...widths) - Math.min(...widths)).toBeLessThanOrEqual(0.6);

        await page.locator("#spd-type").selectOption("Ground Speed");
        if (viewport.width <= 330) {
          await expect(page.locator('[data-field="spd"] .field-select-display')).toHaveText("Grnd Speed");
          await expect(page.locator('[data-field="windRef"] .field-select-display')).toHaveText("Rnwy Angle");
        } else {
          await expect(page.locator('[data-field="spd"] .field-select-display')).toHaveText("Ground Speed");
          await expect(page.locator('[data-field="windRef"] .field-select-display')).toHaveText("Runway Angle");
        }
      } else {
        await page.locator("#spd-type").selectOption("Ground Speed");
        await expect(page.locator('[data-field="spd"] .field-select-display')).toHaveText("Ground Speed");
        await expect(page.locator('[data-field="windRef"] .field-select-display')).toHaveText("Runway Angle");
      }

      await page.getByRole("button", { name: "CALCULATE" }).click();
      await expect(page.locator(".result-row")).toHaveCount(42);
      await expect(page.locator('[data-result="Pressure Altitude"]')).not.toHaveText("----");
      await expect(page.locator('[data-result="Pressure"]')).not.toHaveText("----");
      await expect(page.locator('[data-result="Density"]')).not.toHaveText("----");
      await assertNoHorizontalOverflow(page);
      await assertCriticalTextNotClipped(page);
      await assertVisibleInteractiveElementsInsideViewport(page);
    });

    test("menu, settings and aircraft editor remain usable", async ({ page }) => {
      await page.goto("/");
      await page.getByRole("button", { name: "More options" }).click();
      await expect(page.locator("#main-menu")).toBeVisible();
      await assertNoHorizontalOverflow(page);
      await assertCriticalTextNotClipped(page);

      await page.getByRole("button", { name: "Settings" }).click();
      await expect(page.locator("#settings-dialog")).toBeVisible();
      await assertNoHorizontalOverflow(page);
      await assertCriticalTextNotClipped(page);
      await assertVisibleInteractiveElementsInsideViewport(page);

      const settingsSave = page.locator('#settings-form button[type="submit"]');
      await expect(settingsSave).toBeVisible();

      if (viewport.width <= 430) {
        const scrollState = await page.locator(".settings-body").evaluate((el) => {
          const body = el as HTMLElement;
          body.scrollTop = body.scrollHeight;
          return {
            scrollTop: body.scrollTop,
            scrollHeight: body.scrollHeight,
            clientHeight: body.clientHeight,
          };
        });
        expect(scrollState.scrollHeight).toBeGreaterThan(scrollState.clientHeight);
        expect(scrollState.scrollTop).toBeGreaterThan(0);
        await expect(settingsSave).toBeVisible();

        await page.locator('[data-setting-select="setting-theme"]').click();
        await expect(page.locator("#modal-options-selector")).toBeVisible();
        await expect(page.locator("#options-selector-cancel")).toBeVisible();
        await page.locator("#options-selector-cancel").click();
        await expect(settingsSave).toBeVisible();
      }

      await page.getByRole("button", { name: "Cancel" }).click();

      await page.getByRole("button", { name: "Add airplane" }).click();
      await expect(page.locator("#profile-editor")).toBeVisible();
      await assertNoHorizontalOverflow(page);
      await assertCriticalTextNotClipped(page);
      await assertVisibleInteractiveElementsInsideViewport(page);
    });
  });
}
