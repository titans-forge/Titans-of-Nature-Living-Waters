import { readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
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

// New subject assets belong to their own dated batch; never borrow the old
// catch batch's date or clearance. Bind every included file to its exact output.
try {
  const seen = new Set();
  for (const manifestFile of ["SUBJECT_ART_1_9_MANIFEST.json", "SUBJECT_ART_1_11_MANIFEST.json", "SUBJECT_ART_1_13_MANIFEST.json", "SUBJECT_ART_1_14_MANIFEST.json"]) {
    const manifest = JSON.parse(readFileSync(resolve(root, `docs/${manifestFile}`), "utf8"));
    if (manifest.created !== "2026-10-09" || manifest.provider !== "OpenAI built-in image generation in Codex") failures.push("Subject art: provider or generation date is missing.");
    if (!manifest.disclosure?.includes("reconstructions")) failures.push("Subject art: reconstruction disclosure is missing.");
    const assets = Array.isArray(manifest.assets) ? manifest.assets : [];
    for (const asset of assets) {
      if (!/^src\/assets\/(encounters|fish-sprites)\/[-a-z0-9]+\.webp$/.test(asset.path ?? "") || seen.has(asset.path)) {
        failures.push("Subject art: invalid or duplicate asset path."); continue;
      }
      seen.add(asset.path);
      if (!/^exec-[-a-f0-9]+\.png$/.test(asset.generatedSource ?? "") || !/^[a-f0-9]{64}$/.test(asset.sourceSha256 ?? "")) failures.push(`Subject art original source is incomplete: ${asset.path}`);
      const bytes = readFileSync(resolve(root, asset.path));
      if (createHash("sha256").update(bytes).digest("hex") !== asset.sha256 || bytes.length !== asset.bytes) failures.push(`Subject art file does not match provenance: ${asset.path}`);
    }
  }
  for (const family of ["encounters", "fish-sprites"]) {
    const map = readFileSync(resolve(root, `src/data/${family === "encounters" ? "encounterArtwork" : "liveFishSprites"}.ts`), "utf8");
    for (const file of readdirSync(resolve(root, `src/assets/${family}`)).filter(file => file.endsWith(".webp"))) {
      const path = `src/assets/${family}/${file}`;
      if (!seen.has(path) || !map.includes(`/${family}/${file}`)) failures.push(`Subject art missing from provenance or runtime inventory: ${path}`);
    }
  }
} catch (error) { failures.push(`Subject art provenance could not be verified: ${error.message}`); }
if (failures.length) {
  console.error("Public release blocked by incomplete media provenance:\n");
  for (const failure of failures) console.error(`- ${failure}`);
  console.error(`\nComplete ${recordPath} before publishing the full media bundle.`);
  process.exit(1);
}

console.log("Media provenance gate passed for habitat panoramas, guide portraits, catch reconstructions and hash-bound subject art. This check does not publish a release.");
