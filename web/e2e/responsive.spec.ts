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
      ".sheet-item span", ".sheet-item small", ".airplane-name-button strong", ".editor-toolbar button",
      ".setting-title", ".setting-desc", ".setting-choice", ".dialog-buttons button",
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

async function assertResultValuesSingleLine(page: Page): Promise<void> {
  const failures = await page.locator(".result-value").evaluateAll((elements) =>
    elements.map((el) => {
      const node = el as HTMLElement;
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return {
        text: node.textContent?.trim() ?? "",
        whiteSpace: style.whiteSpace,
        scrollWidth: node.scrollWidth,
        clientWidth: node.clientWidth,
        scrollHeight: node.scrollHeight,
        clientHeight: node.clientHeight,
        height: rect.height,
      };
    }).filter((item) =>
      item.whiteSpace !== "nowrap"
      || item.scrollWidth > item.clientWidth + 1
      || item.scrollHeight > item.clientHeight + 1
    )
  );
  expect(failures).toEqual([]);
}

async function assertVisibleInteractiveElementsInsideViewport(page: Page): Promise<void> {
  const failures = await page.evaluate(() => {
    const selector = ".tab,.icon-button,.field-select,.unit-select,.profile-select,.field-button,.value-input,dialog[open] button,dialog[open] input,dialog[open] select,.modal-overlay.open button,.modal-overlay.open input";
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

      // Vs Factor must preserve the same first two columns as every standard input row.
      await page.locator("#spd-type").selectOption("Vs Factor");
      await expect(page.locator("#spd-unit")).toBeHidden();
      await expect(page.locator("#spdDelta-label")).toBeVisible();
      await expect(page.locator("#spdDelta-value")).toBeVisible();
      await expect(page.locator("#spdDelta-value")).toHaveAttribute("placeholder", "kt");
      const vsLayout = await page.evaluate(() => {
        const rect = (selector: string) => {
          const el = document.querySelector<HTMLElement>(selector);
          if (!el) throw new Error(`Missing ${selector}`);
          return el.getBoundingClientRect();
        };
        const altType = rect('[data-field="alt"] .field-select-wrap');
        const altValue = rect("#alt-value");
        const spdType = rect('[data-field="spd"] .field-select-wrap');
        const spdValue = rect("#spd-value");
        const deltaButton = rect("#spdDelta-label");
        const deltaValue = rect("#spdDelta-value");
        return {
          typeWidthDiff: Math.abs(spdType.width - altType.width),
          typeLeftDiff: Math.abs(spdType.left - altType.left),
          valueWidthDiff: Math.abs(spdValue.width - altValue.width),
          valueLeftDiff: Math.abs(spdValue.left - altValue.left),
          spdValueWidth: spdValue.width,
          deltaButtonWidth: deltaButton.width,
          deltaValueWidth: deltaValue.width,
        };
      });
      expect(vsLayout.typeWidthDiff).toBeLessThanOrEqual(0.6);
      expect(vsLayout.typeLeftDiff).toBeLessThanOrEqual(0.6);
      expect(vsLayout.valueLeftDiff).toBeLessThanOrEqual(0.6);
      expect(vsLayout.spdValueWidth).toBeGreaterThan(vsLayout.deltaValueWidth);
      expect(vsLayout.deltaValueWidth).toBeGreaterThan(vsLayout.deltaButtonWidth);
      expect(vsLayout.deltaButtonWidth).toBeLessThan(vsLayout.spdValueWidth * 0.5);
      await assertNoHorizontalOverflow(page);
      await assertVisibleInteractiveElementsInsideViewport(page);

      await page.locator('[data-field="crossWind"] .field-select-wrap').click();
      await expect(page.locator("#modal-options-selector")).toBeVisible();
      await expect(page.locator("#options-selector-title")).toHaveText("Wind Input Type");
      await expect(page.locator("#modal-options-selector .option-item")).toHaveCount(2);
      await expect(page.locator("#modal-options-selector")).toContainText("Headwind / Crosswind");
      await expect(page.locator("#modal-options-selector")).toContainText("WindSpeed / WindDirection");
      await page.locator("#options-selector-cancel").click();

      await page.locator("#alt-unit").click();
      await expect(page.locator("#modal-options-selector")).toBeVisible();
      await expect(page.locator("#options-selector-title")).toHaveText("Altitude Unit");
      await expect(page.locator("#modal-options-selector .option-item")).toHaveCount(6);
      await page.locator("#options-selector-cancel").click();

      if (viewport.width <= 430) {
        const widths = await page.locator(".input-row:not([hidden]) > .field-select-wrap, .input-row:not([hidden]) > .field-select, .airplane-row > .field-button").evaluateAll((elements) =>
          elements
            .filter((el) => getComputedStyle(el).display !== "none")
            .map((el) => Math.round(el.getBoundingClientRect().width * 10) / 10)
        );
        expect(widths.length).toBeGreaterThan(5);
        expect(Math.max(...widths) - Math.min(...widths)).toBeLessThanOrEqual(0.6);

        await page.locator("#spd-type").selectOption("Ground Speed");
        await expect(page.locator('[data-field="spd"] .field-select-display')).toHaveText(viewport.width < 320 ? "Grnd Speed" : "Ground Speed");
        await expect(page.locator('[data-field="windRef"] .field-select-display')).toHaveText(viewport.width < 340 ? "Rnwy Angle" : "Runway Angle");
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
      await assertResultValuesSingleLine(page);
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

      await page.locator('[data-setting-select="setting-theme"]').click();
      await expect(page.locator("#modal-options-selector")).toBeVisible();
      await expect(page.locator("#options-selector-cancel")).toBeVisible();
      const optionDescriptions = await page.locator("#modal-options-selector .option-desc").evaluateAll((elements) =>
        elements.map((el) => {
          const node = el as HTMLElement;
          const style = getComputedStyle(node);
          return {
            whiteSpace: style.whiteSpace,
            clientHeight: node.clientHeight,
            scrollHeight: node.scrollHeight,
          };
        })
      );
      expect(optionDescriptions.length).toBeGreaterThan(0);
      expect(optionDescriptions.every((item) =>
        item.whiteSpace === "nowrap" && item.scrollHeight <= item.clientHeight + 1
      )).toBe(true);
      await assertNoHorizontalOverflow(page);
      await assertVisibleInteractiveElementsInsideViewport(page);
      await page.locator("#options-selector-cancel").click();

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


test("output values stay on one line across mobile widths with long formatting", async ({ browser }) => {
  const widths = [280, 300, 319, 320, 339, 340, 360, 375, 390, 412, 430, 480];
  const context = await browser.newContext({ viewport: { width: 480, height: 900 } });
  const page = await context.newPage();
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem("aerocalculator.settings.v1", JSON.stringify({
      altitude: "nm",
      pressure: "mmHg",
      temperature: "°F",
      speed: "km/h",
      angle: "deg",
      angleFormat: "-180/180",
      extraDecimal: true,
      theme: "Green Peace",
    }));
  });
  await page.reload();

  await page.locator("#alt-value").fill("12345");
  await page.locator("#temp-type").selectOption("OAT");
  await page.locator("#temp-value").fill("21.5");
  await page.locator("#spd-type").selectOption("CAS");
  await page.locator("#spd-value").fill("321.4");
  await page.locator("#weight-value").fill("12345");
  await page.locator("#sref-value").fill("27.3");
  await page.locator("#cref-value").fill("3.14");
  await page.locator("#clmax-value").fill("1.789");
  await page.locator("#nz-value").fill("2.5");
  await page.getByRole("button", { name: "CALCULATE" }).click();
  await expect(page.locator(".result-row")).toHaveCount(42);

  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    await assertNoHorizontalOverflow(page);
    await assertResultValuesSingleLine(page);
  }
  await context.close();
});

test("every input type stays readable across mobile widths", async ({ browser }) => {
  test.setTimeout(180_000);
  const widths = [280, 300, 319, 320, 339, 340, 360, 375, 390, 412, 430, 480];
  const typeCases: Record<string, readonly string[]> = {
    alt: ["Hp", "Hg", "P"],
    temp: ["Δ ISA", "OAT"],
    spd: ["TAS", "CAS", "EAS", "Mach", "CL", "Vs Factor", "Ground Speed", "Qdyn", "Qc"],
    nz: ["NzPullup", "NzTurn", "BankTurn"],
    angle1: ["Track", "Heading"],
    angle2: ["Sideslip", "Drift"],
    headWind: ["HeadWind", "Wind Speed"],
  };
  const context = await browser.newContext({ viewport: { width: 480, height: 900 } });
  const page = await context.newPage();
  await page.goto("/");

  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    for (const [field, values] of Object.entries(typeCases)) {
      for (const value of values) {
        await page.locator(`#${field}-type`).selectOption(value);
        const row = page.locator(`[data-field="${field}"]`);
        await expect(row).toBeVisible();
        const display = row.locator(".field-select-display");
        const metrics = await display.evaluate((el) => {
          const node = el as HTMLElement;
          const style = getComputedStyle(node);
          return {
            text: node.textContent?.trim() ?? "",
            whiteSpace: style.whiteSpace,
            scrollWidth: node.scrollWidth,
            clientWidth: node.clientWidth,
            scrollHeight: node.scrollHeight,
            clientHeight: node.clientHeight,
          };
        });
        expect(metrics.scrollWidth, `${width}px ${field}=${value}: ${metrics.text}`).toBeLessThanOrEqual(metrics.clientWidth + 1);
        expect(metrics.scrollHeight, `${width}px ${field}=${value}: ${metrics.text}`).toBeLessThanOrEqual(metrics.clientHeight + 1);
        await assertNoHorizontalOverflow(page);
        await assertVisibleInteractiveElementsInsideViewport(page);

        if (field === "spd" && value === "Vs Factor") {
          await expect(page.locator("#spdDelta-label")).toBeVisible();
          await expect(page.locator("#spdDelta-value")).toBeVisible();
          const delta = await page.locator("#spdDelta-label").evaluate((el) => ({
            text: el.textContent?.trim(),
            scrollWidth: (el as HTMLElement).scrollWidth,
            clientWidth: (el as HTMLElement).clientWidth,
            scrollHeight: (el as HTMLElement).scrollHeight,
            clientHeight: (el as HTMLElement).clientHeight,
          }));
          expect(delta.scrollWidth, `${width}px +Δ`).toBeLessThanOrEqual(delta.clientWidth + 1);
          expect(delta.scrollHeight, `${width}px +Δ`).toBeLessThanOrEqual(delta.clientHeight + 1);
        }
      }
    }
  }
  await context.close();
});
