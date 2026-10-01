import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem("living-waters-e2e-started")) {
      localStorage.clear();
      sessionStorage.setItem("living-waters-e2e-started", "true");
    }
  });
});

test("@desktop completes, resumes, reviews, and reports a clean assisted expedition", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: /Amazon Flooded Forest/ }).click();
  await page.getByRole("button", { name: "Enable untimed controls" }).click();
  await page.getByRole("button", { name: /Meet your guide/ }).click();

  await page.getByRole("button", { name: /Where did the water rise overnight/ }).click();
  await page.getByRole("button", { name: /Which gear causes the least trouble here/ }).click();
  await page.getByRole("button", { name: /Prepare the field kit/ }).click();

  await page.getByRole("button", { name: /Root-edge kit/ }).click();
  await page.getByRole("button", { name: /Push away from the landing/ }).click();
  await page.getByRole("button", { name: /Select Flooded forest edge/ }).click();
  await page.getByRole("button", { name: "Fish gaining access to shelter and food among the flooded roots.", exact: true }).click();
  await page.getByRole("button", { name: /Set up the cast/ }).click();
  await page.getByRole("button", { name: /Confirm cast/i }).click();

  const advance = page.locator("button.interaction-control--assist");
  const handle = page.getByRole("button", { name: /Handle the encounter/ });
  for (let step = 0; step < 20 && !(await handle.isVisible()); step += 1) {
    await advance.click();
  }
  await expect(handle).toBeVisible();
  await expect(page.getByText("Clean", { exact: true })).toBeVisible();
  await expect(page.getByText("Controlled", { exact: true })).toBeVisible();
  await handle.click();

  await expect(page.getByRole("heading", { name: "How do you respond?" })).toBeVisible();
  const catchImage = page.getByRole("img", { name: /Peacock bass supported after capture/ });
  await expect(catchImage).toBeVisible();
  expect(await catchImage.evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await page.getByRole("button", { name: /Keep steady pressure, use pliers, and release in the water/ }).click();
  await expect(page.getByText("Target observation reached")).toBeVisible();
  await expect(page.getByText(/cast 1 of 3/i)).toBeVisible();
  await page.getByRole("button", { name: "Repeat with similar water level, effort, and equipment at both banks.", exact: true }).click();

  await page.reload();
  await expect(page.getByRole("heading", { name: "Peacock bass" })).toBeVisible();
  await expect(page.getByText(/cast 1 of 3/i)).toBeVisible();

  const journalButton = page.getByRole("button", { name: /Explore ecosystem web/ });
  await journalButton.click();
  const dialog = page.getByRole("dialog", { name: "Living connections" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Close journal" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(journalButton).toBeFocused();

  await page.getByRole("button", { name: /Return to community/ }).click();
  await page.getByRole("button", { name: /Share the full field record/ }).click();
  await expect(page.getByText("Assignment complete.")).toBeVisible();
});

test("@mobile destination search and Field mode remain usable", async ({ page }) => {
  await page.goto("/");

  const search = page.getByPlaceholder("Search 15 destinations");
  await search.fill("Galapagos");
  await expect(page.getByRole("button", { name: /Galapagos Upwelling Reserve/ })).toBeVisible();
  await page.getByRole("button", { name: /Galapagos Upwelling Reserve/ }).click();
  await page.getByRole("button", { name: /Field Infer from evidence/ }).click();

  await expect(page.getByText("Use the guide's answers, kit tradeoffs, and visible habitat signs to find the route yourself.")).toBeVisible();
  await expect(page.getByText(/^Ask:/)).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});
