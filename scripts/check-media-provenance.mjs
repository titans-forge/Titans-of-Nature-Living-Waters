import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const recordPath = resolve(root, "docs/MEDIA_PROVENANCE_RECORD.md");
const record = readFileSync(recordPath, "utf8");
const requiredRows = ["Habitat panoramas", "Guide portraits"];
const failures = [];

for (const label of requiredRows) {
  const row = record.split("\n").find((line) => line.startsWith(`| ${label}`));
  if (!row) {
    failures.push(`${label}: record row is missing`);
    continue;
  }

  const cells = row.split("|").slice(1, -1).map((cell) => cell.trim());
  const [, provider, accountHolder, generationWindow, terms, authorization, confirmationDate] = cells;
  if (!provider) failures.push(`${label}: provider is missing`);
  if (!accountHolder || /confirmation required|pending|unknown/i.test(accountHolder)) failures.push(`${label}: confirmed account holder is missing`);
  if (!generationWindow) failures.push(`${label}: generation date or window is missing`);
  if (!/^https:\/\//.test(terms ?? "")) failures.push(`${label}: applicable terms URL is missing`);
  if (!/^yes$/i.test(authorization ?? "")) failures.push(`${label}: owner redistribution confirmation must be Yes`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(confirmationDate ?? "")) failures.push(`${label}: confirmation date must use YYYY-MM-DD`);
}

// Catch reconstructions have an existing separate rights record, not a fabricated owner row.
const rights = readFileSync(resolve(root, "MEDIA_RIGHTS.md"), "utf8");
const catchRow = rights.split("\n").find(line => line.startsWith("| Catch reconstructions"));
if (!catchRow || !catchRow.includes("OpenAI") || !/(2026-08-14|August 14, 2026)/.test(catchRow) || !catchRow.includes("Cleared for use")) failures.push("Catch reconstructions: existing provider/date/clearance record is missing.");
const catchMap = readFileSync(resolve(root, "src/data/catchPhotos.ts"), "utf8");
const catchFiles = readdirSync(resolve(root, "src/assets/catches")).filter(file => file.endsWith(".webp"));
for (const file of catchFiles) if (!catchMap.includes(`/catches/${file}`)) failures.push(`Catch reconstruction missing from inventory: ${file}`);
if (failures.length) {
  console.error("Public release blocked by incomplete media provenance:\n");
  for (const failure of failures) console.error(`- ${failure}`);
  console.error(`\nComplete ${recordPath} before publishing the full media bundle.`);
  process.exit(1);
}

console.log("Media provenance gate passed for habitat panoramas, guide portraits, and inventoried catch reconstructions.");
