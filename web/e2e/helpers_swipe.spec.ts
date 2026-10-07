import { expect, test, type Page } from "@playwright/test";

async function swipe(page: Page, startX: number, endX: number, startY = 420, endY = 420): Promise<void> {
  const target = page.locator(".page.active");
  await target.dispatchEvent("pointerdown", {
    pointerId: 21,
    pointerType: "touch",
    isPrimary: true,
    clientX: startX,
    clientY: startY,
    bubbles: true,
  });
  await target.dispatchEvent("pointermove", {
    pointerId: 21,
    pointerType: "touch",
    isPrimary: true,
    clientX: (startX + endX) / 2,
    clientY: (startY + endY) / 2,
    bubbles: true,
  });
  await target.dispatchEvent("pointerup", {
    pointerId: 21,
    pointerType: "touch",
    isPrimary: true,
    clientX: endX,
    clientY: endY,
    bubbles: true,
  });
}

test.describe("helpers and swipe navigation", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test("quantity selector and numeric value expose contextual helpers", async ({ page }) => {
    await page.goto("/");

    await page.locator('[data-field="spd"] .field-select-wrap').hover();
    await expect(page.locator("#field-tooltip")).toBeVisible();
    await expect(page.locator("#field-tooltip")).toContainText("Calibrated Airspeed");

    await page.locator("#spd-value").hover();
    await expect(page.locator("#field-tooltip")).toBeVisible();
    await expect(page.locator("#field-tooltip")).toContainText("Calibrated Airspeed");

    await page.locator("#spd-type").selectOption("Mach");
    await page.locator("#spd-value").focus();
    await expect(page.locator("#field-tooltip")).toBeVisible();
    await expect(page.locator("#field-tooltip")).toContainText("Mach number");

    const rect = await page.locator("#field-tooltip").boundingBox();
    expect(rect).not.toBeNull();
    expect(rect!.x).toBeGreaterThanOrEqual(0);
    expect(rect!.x + rect!.width).toBeLessThanOrEqual(390);

    await page.locator('[data-field="windRef"] .field-select-wrap').focus();
    await expect(page.locator("#field-tooltip")).toContainText("Reference direction");
  });

  test("all input type and unit choice sheets are populated and single-line", async ({ page }) => {
    await page.goto("/");

    const fieldIds = ["alt", "temp", "spd", "weight", "sref", "cref", "clmax", "nz", "angle1", "angle2", "headWind", "crossWind", "windRef"];
    for (const fieldId of fieldIds) {
      await page.locator(`[data-field="${fieldId}"] .field-select-wrap`).click();
      await expect(page.locator("#modal-options-selector")).toBeVisible();
      await expect(page.locator("#modal-options-selector .option-item").first()).toBeVisible();

      const descriptions = page.locator("#modal-options-selector .option-desc");
      if (await descriptions.count()) {
        const metrics = await descriptions.evaluateAll((elements) =>
          elements.map((el) => {
            const node = el as HTMLElement;
            return {
              whiteSpace: getComputedStyle(node).whiteSpace,
              clientHeight: node.clientHeight,
              scrollHeight: node.scrollHeight,
            };
          })
        );
        expect(metrics.every((item) => item.whiteSpace === "nowrap" && item.scrollHeight <= item.clientHeight + 1)).toBe(true);
      }
      await page.locator("#options-selector-cancel").click();
    }

    for (const fieldId of fieldIds) {
      const unit = page.locator(`#${fieldId}-unit`);
      if (await unit.isDisabled()) continue;
      await unit.click();
      await expect(page.locator("#modal-options-selector")).toBeVisible();
      await expect(page.locator("#modal-options-selector .option-item").first()).toBeVisible();
      await page.locator("#options-selector-cancel").click();
    }
  });

  test("all 42 output rows open contextual technical help", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "CALCULATE" }).click();

    const rows = page.locator(".result-row");
    await expect(rows).toHaveCount(42);
    for (let index = 0; index < 42; index += 1) {
      await rows.nth(index).click();
      await expect(page.locator("#modal-result-tooltip")).toHaveClass(/open/);
      await expect(page.locator("#result-tooltip-title")).not.toHaveText("");
      await expect(page.locator("#result-tooltip-desc")).not.toHaveText("");
      await page.locator("#modal-tooltip-close").click();
      await expect(page.locator("#modal-result-tooltip")).not.toHaveClass(/open/);
    }
  });

  test("horizontal finger swipe changes tabs like the Android ViewPager", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: "INPUTS" })).toHaveAttribute("aria-selected", "true");

    await swipe(page, 330, 70);
    await expect(page.getByRole("button", { name: "CALCULATE" })).toHaveAttribute("aria-selected", "true");

    await swipe(page, 70, 330);
    await expect(page.getByRole("button", { name: "INPUTS" })).toHaveAttribute("aria-selected", "true");

    await swipe(page, 70, 330);
    await expect(page.getByRole("button", { name: "AIRPLANES" })).toHaveAttribute("aria-selected", "true");

    await swipe(page, 70, 330);
    await expect(page.getByRole("button", { name: "AIRPLANES" })).toHaveAttribute("aria-selected", "true");

    await swipe(page, 330, 70, 300, 560);
    await expect(page.getByRole("button", { name: "AIRPLANES" })).toHaveAttribute("aria-selected", "true");
  });

  test("swipe is ignored while a dialog is open", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "More options" }).click();
    await page.getByRole("button", { name: "Settings" }).click();
    await expect(page.locator("#settings-dialog")).toBeVisible();

    await swipe(page, 330, 70);
    await expect(page.getByRole("button", { name: "INPUTS" })).toHaveAttribute("aria-selected", "true");
    await expect(page.locator("#settings-dialog")).toBeVisible();
  });
});
