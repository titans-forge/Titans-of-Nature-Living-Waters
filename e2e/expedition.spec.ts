import { expect, test, type Page } from "@playwright/test";

const amazonPrediction = "Fish gaining access to shelter and food among the flooded roots.";
const amazonReflectionPrompt = "A second team records fewer small fish beside a cleared bank than beside flooded forest. What would make its comparison more useful?";
const supportedReflection = "Repeat with similar water level, effort, and equipment at both banks.";
const originalReflection = "Treat the first difference as proof that clearing caused every missing fish.";
const amazonReflectionExplanation = "Forest cover can support fish habitat, but water level, sampling effort, and other conditions can also change a record. Matching those conditions helps test a habitat explanation without turning one observation into certainty.";

async function prepareAmazonCast(page: Page) {
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
  await page.getByRole("button", { name: amazonPrediction, exact: true }).click();
  await page.getByRole("button", { name: /Set up the cast/ }).click();
}

async function finishAssistedEncounter(page: Page) {
  const advance = page.locator("button.interaction-control--assist");
  const handle = page.getByRole("button", { name: /Handle the encounter/ });
  for (let step = 0; step < 20 && !(await handle.isVisible()); step += 1) {
    await advance.click();
  }
  await expect(handle).toBeVisible();
  await handle.click();
  await expect(page.getByRole("heading", { name: "How do you respond?" })).toBeVisible();
}

async function handleAmazonSafely(page: Page) {
  await page.getByRole("button", { name: /Keep steady pressure, use pliers, and release in the water/ }).click();
  await expect(page.getByRole("heading", { name: "Peacock bass", exact: true })).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem("living-waters-e2e-started")) {
      localStorage.clear();
      sessionStorage.setItem("living-waters-e2e-started", "true");
    }
  });
});

test("@desktop completes, resumes, reviews, and reports a clean assisted expedition", async ({ page }) => {
  await prepareAmazonCast(page);
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
  const catchImage = page.getByRole("img", { name: "Generated reconstruction of Peacock bass at the waterline", exact: true });
  await expect(catchImage).toBeVisible();
  await expect.poll(() => catchImage.evaluate((image) => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0 && image.naturalHeight > 0)).toBe(true);
  await handleAmazonSafely(page);
  await expect(page.getByText("Careful target record ready")).toBeVisible();
  await expect(page.getByText(/cast 1 of 3/i)).toBeVisible();
  await page.getByRole("button", { name: supportedReflection, exact: true }).click();

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

test("@desktop evidence review reveals its result and preserves the first answer when editing", async ({ page }) => {
  await prepareAmazonCast(page);
  await page.getByRole("button", { name: /Confirm cast/i }).click();
  await finishAssistedEncounter(page);
  await handleAmazonSafely(page);

  const reflection = page.locator("section.learning-panel").filter({
    has: page.getByRole("heading", { name: amazonReflectionPrompt, exact: true }),
  });
  await reflection.getByRole("button", { name: originalReflection, exact: true }).click();
  const firstAnswer = reflection.locator(".learning-feedback");
  await expect(firstAnswer.getByText(originalReflection, { exact: true })).toBeVisible();
  await expect(firstAnswer.getByText("Here is a connection to revisit.", { exact: true })).toBeVisible();

  await reflection.getByText("Review this explanation with evidence", { exact: true }).click();
  const editor = reflection.getByRole("form", { name: "Review an explanation with a local record" });
  await editor.getByRole("radio", { name: /Record #1 · Amazon · Peacock bass/ }).check();
  await editor.getByRole("radio", { name: supportedReflection, exact: true }).check();
  await editor.locator('input[type="radio"][value="sample-limits"]').check();
  await editor.getByRole("button", { name: "Save evidence review", exact: true }).click();

  const savedReview = reflection.locator(".learning-review__saved");
  const result = savedReview.getByRole("status");
  await expect(result).toContainText("This explanation fits the model; a local context record is linked.");
  await expect(result).toBeFocused();
  await expect(result).toBeInViewport({ ratio: 1 });
  await expect(savedReview.getByText(amazonReflectionExplanation, { exact: true })).toBeInViewport({ ratio: 1 });
  await expect(editor).toBeHidden();
  await expect(reflection.getByText("Edit review", { exact: true })).toBeInViewport({ ratio: 1 });
  await expect(firstAnswer.getByText(originalReflection, { exact: true })).toBeVisible();

  await page.reload();
  await expect(savedReview.getByRole("status")).toContainText("This explanation fits the model; a local context record is linked.");
  await expect(firstAnswer.getByText(originalReflection, { exact: true })).toBeVisible();
  await expect(editor).toBeHidden();
  await reflection.getByText("Edit review", { exact: true }).click();
  await expect(editor).toBeVisible();
  await expect(editor.getByRole("radio", { name: /Record #1 · Amazon · Peacock bass/ })).toBeChecked();
  await expect(editor.getByRole("radio", { name: supportedReflection, exact: true })).toBeChecked();
  await expect(editor.locator('input[type="radio"][value="sample-limits"]')).toBeChecked();
});

test("@desktop timed keyboard hold can recover with an untimed crew without losing records", async ({ page }) => {
  test.setTimeout(45_000);
  await prepareAmazonCast(page);
  await page.getByRole("button", { name: /Confirm cast/i }).click();
  await finishAssistedEncounter(page);
  await handleAmazonSafely(page);

  await page.getByRole("button", { name: "Make another field attempt", exact: true }).click();
  // Place using the still marker, then operate the same encounter with the timed control.
  await page.getByRole("button", { name: /Confirm cast/i }).click();
  await page.getByRole("button", { name: "Disable untimed controls", exact: true }).click();
  await page.getByRole("button", { name: "Start fishing", exact: true }).click();

  const control = page.locator("button.interaction-control:not(.interaction-control--assist)");
  const progress = page.getByRole("progressbar", { name: "Catch progress", exact: true });
  await expect(control).toBeFocused();
  await expect(page.getByRole("heading", { name: "Now: Hold to guide away from cover", exact: true })).toBeVisible({ timeout: 6_000 });
  await page.keyboard.down("Space");
  try {
    await expect(control).toHaveAttribute("aria-pressed", "true");
    await expect(control.getByRole("status")).toHaveText("Holding · keep holding");
    await expect.poll(async () => Number(await progress.getAttribute("aria-valuenow")), { timeout: 3_000 }).toBeGreaterThan(0);
    // Continue holding when the cue changes to release, reproducing excessive pressure.
    await expect(page.getByRole("heading", { name: "Now: Release during the roll", exact: true })).toBeVisible({ timeout: 8_000 });
    await expect(control.getByRole("status")).toHaveText("Let go now");
    await expect(page.getByRole("heading", { name: "The line broke", exact: true })).toBeVisible({ timeout: 20_000 });
  } finally {
    await page.keyboard.up("Space");
  }

  await page.getByRole("button", { name: "Retry with untimed crew", exact: true }).click();
  await expect(page.getByRole("button", { name: "Disable untimed controls", exact: true })).toHaveAttribute("aria-pressed", "true");
  await finishAssistedEncounter(page);
  await handleAmazonSafely(page);
  await expect(page.getByText(/cast 2 of 3/i)).toBeVisible();
  await expect(page.getByText("2 detailed observations", { exact: true })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { name: "Peacock bass", exact: true })).toBeVisible();
  await expect(page.getByText(/cast 2 of 3/i)).toBeVisible();
  await page.getByRole("button", { name: "Open field journal", exact: true }).click();
  const journal = page.getByRole("dialog", { name: "Living connections" });
  await expect(journal.getByText("2 recorded observations", { exact: true })).toBeVisible();
  const records = journal.locator(".observation-journal article");
  await expect(records).toHaveCount(2);
  await expect(records.getByRole("heading", { name: "Peacock bass", exact: true })).toHaveCount(2);
  await expect(records.first().getByText("Root-edge kit", { exact: true })).toBeVisible();
  await expect(records.first().getByText("Flooded forest edge", { exact: true })).toBeVisible();
  await expect(records.first().getByText(/^Untimed assistance used · [\d.]+% placement · [1-9]\d* control mistakes$/)).toBeVisible();
  await expect(records.last().getByText(/^Untimed assistance used · [\d.]+% placement · 0 control mistakes$/)).toBeVisible();
});

test("@mobile destination search and Field mode remain usable", async ({ page }) => {
  await page.goto("/");

  const search = page.getByPlaceholder("Search 15 destinations");
  await search.fill("Galapagos");
  await expect(page.getByRole("button", { name: /Galapagos Upwelling Reserve/ })).toBeVisible();
  await page.getByRole("button", { name: /Galapagos Upwelling Reserve/ }).click();
  await page.getByRole("button", { name: /Field Infer from evidence/ }).click();
  await page.getByText("Your field assignment", { exact: true }).click();

  await expect(page.getByText("Use the guide's answers, kit tradeoffs, and visible habitat signs to find the route yourself.")).toBeVisible();
  await expect(page.getByText(/^Ask:/)).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});
