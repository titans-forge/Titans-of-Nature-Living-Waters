import { expect, test, type Page } from "@playwright/test";
import legacyMidcast from "../tests/fixtures/v11-midcast-reviewed-journey.json";

const amazonPrediction = "Fish gaining access to shelter and food among the flooded roots.";
const amazonReflectionPrompt = "A second team records fewer small fish beside a cleared bank than beside flooded forest. What would make its comparison more useful?";
const supportedReflection = "Repeat with similar water level, effort, and equipment at both banks.";
const originalReflection = "Treat the first difference as proof that clearing caused every missing fish.";
const amazonReflectionExplanation = "Forest cover can support fish habitat, but water level, sampling effort, and other conditions can also change a record. Matching those conditions helps test a habitat explanation without turning one observation into certainty.";

async function prepareAmazonCast(page: Page, assisted = true) {
  await page.goto("/");
  await page.getByRole("button", { name: /Amazon Flooded Forest/ }).click();
  if (assisted) await page.getByRole("button", { name: "Enable untimed controls" }).click();
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

async function confirmTimedAmazonCast(page: Page) {
  // Read the same visible accuracy feedback available to a player. Neither the
  // route nor the cast result is supplied through storage or an engine call.
  await expect.poll(async () => Number(await page.locator(".cast-placement__feedback").getAttribute("data-accuracy")), {
    timeout: 10_000, intervals: [50],
  }).toBeGreaterThanOrEqual(90);
  await page.getByRole("button", { name: /Confirm cast/i }).click();
  await expect(page.locator(".fishing-scene--underwater")).toHaveAttribute("data-species", "peacock-bass");
  await expect(page.getByRole("button", { name: "Enable untimed controls", exact: true })).toHaveAttribute("aria-pressed", "false");
}

async function finishTimedFish(page: Page) {
  const control = page.locator("button.interaction-control:not(.interaction-control--assist)");
  const handle = page.getByRole("button", { name: "Handle the encounter", exact: true });
  let held = false;
  let holds = 0;
  let releases = 0;
  const deadline = Date.now() + 80_000;
  try {
    while (!(await handle.isVisible()) && Date.now() < deadline) {
      // Read visible DOM atomically so landing or a window transition cannot
      // leave a locator waiting for a control that has already disappeared.
      const reading = await page.locator(".cast-game--interaction").evaluate(root => ({
        complete: root.classList.contains("cast-game--complete"),
        lost: Boolean(root.querySelector(".interaction-retries")),
        cue: root.querySelector(".skill-live-cue strong")?.textContent,
        rodInstruction: root.querySelector(".rod-side-controls span")?.textContent,
        selectedRod: root.querySelector('.rod-side-controls button[aria-pressed="true"]')?.textContent,
      }));
      if (reading.complete) break;
      expect(reading.lost).toBe(false);
      expect(reading.cue).toBeTruthy();
      const cue = reading.cue;
      if (reading.rodInstruction) {
        const instruction = reading.rodInstruction;
        const right = instruction?.includes("guide right");
        const left = instruction?.includes("guide left");
        expect(right || left).toBe(true);
        if (reading.selectedRod?.trim() !== (right ? "Right →" : "← Left")) {
          await page.keyboard.press(right ? "ArrowRight" : "ArrowLeft");
          await expect(page.locator(".fishing-scene--underwater")).toHaveAttribute("data-rod-side", right ? "right" : "left");
          await expect(page.locator(".fishing-scene--underwater")).toHaveAttribute("data-steering", "away-from-cover");
        }
      }
      // Hysteresis follows the displayed pressure cue. A release during
      // recovery is intentional; do not replace this with the former policy
      // of holding through every recovery window or a hidden reference policy.
      const nextHeld: boolean = cue?.startsWith("Release") ? false : cue?.startsWith("Hold") ? true : held;
      if (nextHeld !== held) {
        if (nextHeld) { await page.keyboard.down("Space"); holds += 1; }
        else { await page.keyboard.up("Space"); releases += 1; }
        held = nextHeld;
        await expect(control).toHaveAttribute("aria-pressed", String(held));
      }
      await page.waitForTimeout(200);
    }
  } finally {
    await page.keyboard.up("Space");
  }
  await expect(handle).toBeVisible();
  expect(holds).toBeGreaterThan(2);
  expect(releases).toBeGreaterThan(2);
  await expect(page.locator(".fishing-scene--underwater")).toHaveAttribute("data-underwater-phase", "landed");
  await expect(page.locator(".fishing-scene--underwater")).toHaveAttribute("data-line-visible", "false");
  await expect(page.getByRole("progressbar", { name: "Catch progress", exact: true })).toHaveAttribute("aria-valuenow", "100");
}

async function exportJourney(page: Page) {
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export journey", exact: true }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toBe("living-waters-journey.json");
  const stream = await download.createReadStream();
  if (!stream) throw new Error("Journey export did not provide a readable download.");
  let raw = "";
  for await (const chunk of stream) raw += String(chunk);
  return JSON.parse(raw) as { version: number; state: Record<string, unknown> };
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
  await expect(page.getByRole("progressbar", { name: "Catch progress", exact: true })).toHaveAttribute("aria-valuenow", "100");
  await expect(page.locator(".fishing-scene--underwater")).toHaveAttribute("data-underwater-phase", "landed");
  await expect(page.locator(".fishing-scene--underwater")).toHaveAttribute("data-line-visible", "false");
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

test("@desktop continuous reeling breaks the line and an untimed retry preserves mistakes and records", async ({ page }) => {
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
  await expect(control).toBeFocused();
  await expect(page.getByRole("heading", { name: "Now: Release through the surge", exact: true })).toBeVisible();
  await page.keyboard.down("Space");
  try {
    await expect(control).toHaveAttribute("aria-pressed", "true");
    await expect(control.getByRole("status")).toHaveText("Reeling · release before pressure rises too far");
    // Overload the real pressure meter rather than waiting for an obsolete
    // habitat-v1 roll cue. New rules never silently clamp a held reel safely.
    await expect(page.getByRole("heading", { name: "The line broke", exact: true })).toBeVisible({ timeout: 10_000 });
    await expect(page.locator(".fishing-scene--underwater")).toHaveAttribute("data-underwater-phase", "lost");
    await expect(page.locator(".fishing-scene--underwater")).toHaveAttribute("data-line-visible", "false");
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

test("@desktop timed pressure pulses and rod steering land a fish after pause and reload", async ({ page }) => {
  test.setTimeout(120_000);
  await prepareAmazonCast(page, false);
  await confirmTimedAmazonCast(page);

  const scene = page.locator(".fishing-scene--underwater");
  const progress = page.locator('[role="progressbar"][aria-label="Catch progress"]');
  const pressure = page.locator('[role="meter"][aria-label="Line pressure"]');
  const control = page.locator("button.interaction-control:not(.interaction-control--assist)");
  const readSavedView = async () => ({
    beat: await scene.getAttribute("data-beat"),
    mouthX: await scene.getAttribute("data-mouth-x"),
    mouthY: await scene.getAttribute("data-mouth-y"),
    progress: await progress.getAttribute("aria-valuenow"),
    pressure: await pressure.getAttribute("aria-valuenow"),
  });

  await expect(scene).toHaveAttribute("data-underwater-phase", "ready");
  const beforeStart = await readSavedView();
  await page.waitForTimeout(750);
  expect(await readSavedView()).toEqual(beforeStart);
  await page.getByRole("button", { name: "Start fishing", exact: true }).click();
  await expect(control).toBeFocused();
  const side = page.getByRole("group", { name: "Rod side away from cover", exact: true });
  await expect(side).toBeVisible({ timeout: 6_000 });
  await expect(side).toContainText("Cover left · guide right");
  await page.keyboard.press("ArrowRight");
  await expect(side.getByRole("button", { name: "Right →", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(scene).toHaveAttribute("data-steering", "away-from-cover");
  await page.keyboard.down("Space");
  try {
    await expect(control).toHaveAttribute("aria-pressed", "true");
    await expect.poll(async () => Number(await progress.getAttribute("aria-valuenow")), { timeout: 2_500 }).toBeGreaterThanOrEqual(2);
  } finally {
    await page.keyboard.up("Space");
  }
  await page.getByRole("button", { name: "Pause expedition", exact: true }).click();
  await expect(control).toHaveAttribute("aria-pressed", "false");
  const pausedView = await readSavedView();
  await page.waitForTimeout(750);
  expect(await readSavedView()).toEqual(pausedView);

  await page.reload();
  await expect(page.getByRole("button", { name: "Continue expedition", exact: true })).toBeVisible();
  await expect(scene).toHaveAttribute("data-underwater-phase", "ready");
  expect(await readSavedView()).toEqual(pausedView);
  await expect(scene).toHaveAttribute("data-rod-side", "right");
  await page.getByRole("button", { name: "Continue expedition", exact: true }).click();
  await page.getByRole("button", { name: "Start fishing", exact: true }).click();
  await expect(control).toBeFocused();
  await finishTimedFish(page);
  await expect(page.getByText("Clean", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Handle the encounter", exact: true }).click();
  await handleAmazonSafely(page);
  await page.getByRole("button", { name: "Open field journal", exact: true }).click();
  const records = page.getByRole("dialog", { name: "Living connections" }).locator(".observation-journal article");
  await expect(records).toHaveCount(1);
  await expect(records.getByText(/^Timed controls · [\d.]+% placement · 0 control mistakes$/)).toBeVisible();
});

test("@desktop @mobile pointer release outside the reel clears held input and keeps rod steering", async ({ page }) => {
  await prepareAmazonCast(page, false);
  await confirmTimedAmazonCast(page);
  await page.getByRole("button", { name: "Start fishing", exact: true }).click();
  const side = page.getByRole("group", { name: "Rod side away from cover", exact: true });
  const right = side.getByRole("button", { name: "Right →", exact: true });
  await expect(side).toBeVisible({ timeout: 6_000 });
  await right.click();
  const control = page.locator("button.interaction-control:not(.interaction-control--assist)");
  const pressure = page.getByRole("meter", { name: "Line pressure", exact: true });
  await expect(control).toBeInViewport({ ratio: 1 });
  await expect(pressure).toBeInViewport({ ratio: 1 });
  await expect(right).toBeInViewport({ ratio: 1 });
  const before = Number(await pressure.getAttribute("aria-valuenow"));
  const box = await control.boundingBox();
  if (!box) throw new Error("The reel control has no visible hit target.");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  try {
    await expect(control).toHaveAttribute("aria-pressed", "true");
    await expect.poll(async () => Number(await pressure.getAttribute("aria-valuenow")), { timeout: 1_500 }).toBeGreaterThan(before);
    await page.mouse.move(4, 4);
  } finally {
    await page.mouse.up();
  }
  await expect(control).toHaveAttribute("aria-pressed", "false");
  await expect(control.getByRole("status")).toHaveText("Released · pressure easing");
  await expect(page.locator(".fishing-scene--underwater")).toHaveAttribute("data-rod-side", "right");
  const released = Number(await pressure.getAttribute("aria-valuenow"));
  await expect.poll(async () => Number(await pressure.getAttribute("aria-valuenow")), { timeout: 1_500 }).toBeLessThan(released);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test("@desktop importing an older active fight needs confirmation and preserves its classic rules and records", async ({ page }) => {
  await prepareAmazonCast(page);
  await page.getByRole("button", { name: /Confirm cast/i }).click();
  await finishAssistedEncounter(page);
  await handleAmazonSafely(page);
  await page.getByRole("button", { name: "Open field journal", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Living connections" });
  await dialog.getByRole("button", { name: "Save & settings", exact: true }).click();
  const save = dialog.getByRole("region", { name: "Save and restore journey", exact: true });
  // This file is an array of regression snapshots, not a portable journey.
  // Invalid input must leave the playable record untouched.
  await save.getByLabel("Choose save file").setInputFiles("tests/fixtures/skill-v12-frozen-encounters.json");
  await expect(save.getByRole("status")).toHaveText("Choose a Living Waters save file.");
  await expect(save.getByRole("region", { name: "Imported journey preview", exact: true })).toHaveCount(0);
  expect((await exportJourney(page)).state.observations).toHaveLength(1);
  await save.getByLabel("Choose save file").setInputFiles("tests/fixtures/v11-midcast-reviewed-journey.json");
  const preview = save.getByRole("region", { name: "Imported journey preview", exact: true });
  await expect(preview).toContainText("2 detailed observations");
  await preview.getByRole("button", { name: "Cancel import", exact: true }).click();
  await expect(preview).toBeHidden();
  const cancelled = await exportJourney(page);
  expect(cancelled.state.observations).toHaveLength(1);
  expect(cancelled.state.stage).toBe("journal");

  await save.getByLabel("Choose save file").setInputFiles("tests/fixtures/v11-midcast-reviewed-journey.json");
  await preview.getByRole("button", { name: "Replace current journey", exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("button", { name: "Continue expedition", exact: true })).toBeVisible();
  await expect(page.locator(".fishing-scene--underwater")).toHaveCount(0);
  await expect(page.locator(".skill-fight-instruments")).toHaveCount(0);
  await page.getByRole("button", { name: "Open field journal", exact: true }).click();
  await dialog.getByRole("button", { name: "Save & settings", exact: true }).click();
  const restored = await exportJourney(page);
  expect(restored.version).toBe(13);
  expect(restored.state).toEqual({ ...legacyMidcast.state, version: 13, anglingRules: "classic", anglingBeat: 0, rodSide: "center" });
  await dialog.getByRole("button", { name: "Close journal", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "Continue expedition", exact: true }).click();
  await expect(page.getByRole("button", { name: "Start fishing", exact: true })).toBeVisible();
  await expect(page.locator(".skill-fight-instruments")).toHaveCount(0);
  await expect(page.getByRole("meter", { name: "Line pressure", exact: true })).toHaveAttribute("aria-valuenow", String(legacyMidcast.state.lineTension));
  await page.getByRole("button", { name: "Start fishing", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Now: Let it run", exact: true })).toBeVisible();
});

for (const survey of [
  { kit: "Lava-shore camera survey", habitat: "Black lava shore", setup: "Position the camera", deploy: "POSITION CAMERA", progress: "Image record", metric: "Image disturbance", next: "Review the observation", subject: "Marine iguana", response: "Hold position, log feeding and warming behavior, and keep the required wildlife distance" },
  { kit: "Pelagic acoustic watch", habitat: "Bolivar upwelling channel", setup: "Set the receiver", deploy: "SET RECEIVER", progress: "Tag evidence", metric: "Receiver disturbance", next: "Review the detection", subject: "Scalloped hammerhead", response: "Record receiver, time, depth, and current without steering toward the shark" },
]) {
  test(`@desktop ${survey.subject} keeps its non-angling survey controls and record`, async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Galapagos Upwelling Reserve/ }).click();
    await page.getByRole("button", { name: "Enable untimed controls", exact: true }).click();
    await page.getByRole("button", { name: "Meet your guide", exact: true }).click();
    await page.getByRole("button", { name: /Why can equatorial Galapagos water support penguins/ }).click();
    await page.getByRole("button", { name: /Why keep distance even when Galapagos wildlife/ }).click();
    await page.getByRole("button", { name: "Prepare the field kit", exact: true }).click();
    await page.getByRole("button", { name: new RegExp(survey.kit) }).click();
    await page.getByRole("button", { name: "Push away from the landing", exact: true }).click();
    await page.getByRole("button", { name: new RegExp(`Select ${survey.habitat}`) }).click();
    await page.getByRole("button", { name: "Reduced production and food availability, with possible effects on feeding and breeding.", exact: true }).click();
    await page.getByRole("button", { name: survey.setup, exact: true }).click();
    await page.getByRole("button", { name: survey.deploy, exact: true }).click();
    await expect(page.locator(".fishing-scene--underwater")).toHaveCount(0);
    await expect(page.locator(".skill-fight-instruments")).toHaveCount(0);
    await expect(page.getByRole("group", { name: "Rod side away from cover", exact: true })).toHaveCount(0);
    await expect(page.getByRole("progressbar", { name: survey.progress, exact: true })).toBeVisible();
    await expect(page.getByRole("meter", { name: survey.metric, exact: true })).toBeVisible();
    await expect(page.getByRole("progressbar", { name: "Catch progress", exact: true })).toHaveCount(0);
    const review = page.getByRole("button", { name: survey.next, exact: true });
    for (let step = 0; step < 20 && !(await review.isVisible()); step += 1) {
      await page.locator("button.interaction-control--assist").click();
    }
    await expect(review).toBeVisible();
    await review.click();
    await page.getByRole("button", { name: new RegExp(survey.response) }).click();
    await expect(page.getByRole("heading", { name: survey.subject, exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { name: survey.subject, exact: true })).toBeVisible();
    await expect(page.getByText("1 detailed observation", { exact: true })).toBeVisible();
  });
}

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
