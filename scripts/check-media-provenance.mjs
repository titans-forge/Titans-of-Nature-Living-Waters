import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { isAbsolute, relative, resolve } from "node:path";
import ts from "typescript";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";

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

const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const sha = value => /^[a-f0-9]{64}$/.test(value ?? "");
const finite = value => typeof value === "number" && Number.isFinite(value);
const manifestAt = name => JSON.parse(readFileSync(resolve(root, `docs/${name}`), "utf8"));
function checkRuntime(path, expectedHash, expectedBytes, label) {
  const bytes = readFileSync(resolve(root, path));
  if (!sha(expectedHash) || hash(bytes) !== expectedHash || bytes.length !== expectedBytes) failures.push(`${label}: game file does not match its recorded hash/size (${path})`);
}
// Local verification always reads originals. CI explicitly validates a frozen
// local-verification receipt; it does not claim access to the original PNGs.
const recordedSources = process.argv.includes("--recorded-sources");
const writeReceipt = process.argv.includes("--write-source-receipt");
if (process.argv.slice(2).some(arg => !["--recorded-sources", "--write-source-receipt"].includes(arg)) || recordedSources && writeReceipt) throw new Error("Invalid source-verification mode");
const receiptPath = resolve(root, "docs/UNDERWATER_SOURCE_VERIFICATION.json");
const sourceManifests = ["UNDERWATER_FISH_ART_V2_MANIFEST.json", "UNDERWATER_HABITAT_V2_MANIFEST.json"];
const manifestHashes = Object.fromEntries(sourceManifests.map(name => [name, hash(readFileSync(resolve(root, "docs", name)))]));
const verifiedSources = new Map();
let receipt;
if (recordedSources) {
  receipt = JSON.parse(readFileSync(receiptPath, "utf8"));
  if (receipt.schema !== 1 || !receipt.verifiedAt || receipt.verification !== "Original PNG bytes read locally; SHA-256 and PNG dimensions verified" || !isDeepStrictEqual(receipt.manifestHashes, manifestHashes) || !Array.isArray(receipt.sources)) throw new Error("Source receipt is incomplete or does not bind the current manifests");
  if (new Set(receipt.sources.map(entry => entry.path)).size !== receipt.sources.length) throw new Error("Source receipt contains duplicate paths");
}
function checkSource(path, expectedHash, label, dimensions) {
  if (!isAbsolute(path ?? "") || !/^exec-[-a-f0-9]+\.png$/.test(path.split("/").at(-1) ?? "") || !sha(expectedHash)) {
    failures.push(`${label}: exact original output path/hash is missing`); return;
  }
  let entry;
  if (recordedSources) {
    entry = receipt.sources.find(item => item.path === path);
    if (!entry || entry.sha256 !== expectedHash || !Number.isInteger(entry.bytes) || entry.bytes < 24 || !Number.isInteger(entry.width) || entry.width < 1 || !Number.isInteger(entry.height) || entry.height < 1) {
      failures.push(`${label}: matching original-byte verification receipt is missing`); return;
    }
  } else {
    const bytes = readFileSync(path);
    if (bytes.length < 24 || bytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") { failures.push(`${label}: original is not a PNG`); return; }
    entry = { path, sha256: hash(bytes), bytes: bytes.length, width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
    if (entry.sha256 !== expectedHash) failures.push(`${label}: original PNG does not match its source hash`);
  }
  if (dimensions && (entry.width !== dimensions.width || entry.height !== dimensions.height)) failures.push(`${label}: original PNG dimensions disagree with the record`);
  verifiedSources.set(path, entry);
}
// Parse literal metadata with TypeScript's AST rather than executing app code.
// In particular, generated atlas rectangles must agree with the exact runtime
// frame anchors and source file used by the renderer, not just its filename.
function readLiteralRegistry(file, variable) {
  const source = ts.createSourceFile(file, readFileSync(resolve(root, file), "utf8"), ts.ScriptTarget.Latest, true);
  const imports = new Map(); let declaration;
  function find(node) {
    if (ts.isImportDeclaration(node) && node.importClause?.name && ts.isStringLiteral(node.moduleSpecifier)) {
      imports.set(node.importClause.name.text, relative(root, resolve(root, file, "..", node.moduleSpecifier.text)));
    }
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === variable) declaration = node.initializer;
    ts.forEachChild(node, find);
  }
  find(source);
  function literal(node) {
    if (ts.isStringLiteral(node) || ts.isNumericLiteral(node)) return ts.isNumericLiteral(node) ? Number(node.text) : node.text;
    if (ts.isIdentifier(node) && imports.has(node.text)) return imports.get(node.text);
    if (ts.isObjectLiteralExpression(node)) return Object.fromEntries(node.properties.map(property => {
      if (!ts.isPropertyAssignment(property)) throw new Error(`${file}: unsupported registry property`);
      return [property.name.text, literal(property.initializer)];
    }));
    throw new Error(`${file}: registry contains unsupported nonliteral metadata`);
  }
  if (!declaration) throw new Error(`${file}: ${variable} is missing`);
  return literal(declaration);
}

const oldSubjects = new Set();
const atlasSubjects = new Set();
const underwaterPlates = new Set();
// Retain each October9 batch's exact date and original clearance boundary.
try {
  for (const manifestFile of ["SUBJECT_ART_1_9_MANIFEST.json", "SUBJECT_ART_1_11_MANIFEST.json", "SUBJECT_ART_1_13_MANIFEST.json", "SUBJECT_ART_1_14_MANIFEST.json"]) {
    const manifest = manifestAt(manifestFile);
    if (manifest.created !== "2026-10-09" || manifest.provider !== "OpenAI built-in image generation in Codex") failures.push("Subject art: provider or generation date is missing.");
    if (!manifest.disclosure?.includes("reconstructions")) failures.push("Subject art: reconstruction disclosure is missing.");
    for (const asset of Array.isArray(manifest.assets) ? manifest.assets : []) {
      if (!/^src\/assets\/(encounters|fish-sprites)\/[-a-z0-9]+\.webp$/.test(asset.path ?? "") || oldSubjects.has(asset.path)) {
        failures.push("Subject art: invalid or duplicate asset path."); continue;
      }
      oldSubjects.add(asset.path);
      if (!/^exec-[-a-f0-9]+\.png$/.test(asset.generatedSource ?? "") || !sha(asset.sourceSha256)) failures.push(`Subject art original source is incomplete: ${asset.path}`);
      checkRuntime(asset.path, asset.sha256, asset.bytes, "Subject art");
    }
  }
} catch (error) { failures.push(`Subject art provenance could not be verified: ${error.message}`); }

try {
  const manifest = manifestAt("UNDERWATER_FISH_ART_V2_MANIFEST.json");
  if (manifest.date !== "2026-10-10" || manifest.provider !== "OpenAI built-in imagegen" || manifest.model !== "not reported by tool"
    || !manifest.scope?.includes("reconstructions") || !manifest.mode?.includes("transparent_background=true") || !manifest.processing?.includes("alpha preserved")) failures.push("Underwater fish: separately dated provider, model boundary, mode or reconstruction record is missing.");
  const runtime = readLiteralRegistry("src/data/underwaterFishArt.ts", "underwaterFishArtByEncounterId");
  const seenSpecies = new Set(); const assets = Array.isArray(manifest.assets) ? manifest.assets : [];
  if (assets.length !== 14) failures.push("Underwater fish: expected fourteen separately recorded atlases.");
  for (const asset of assets) {
    const path = asset.runtimePath;
    if (!/^src\/assets\/fish-sprites\/[-a-z0-9]+-underwater-atlas-v2\.webp$/.test(path ?? "") || atlasSubjects.has(path) || oldSubjects.has(path)) {
      failures.push("Underwater fish: invalid or duplicate atlas path."); continue;
    }
    atlasSubjects.add(path);
    if (!asset.prompt || !asset.inspection || !asset.alpha?.preservedExactly || asset.alpha.minimum !== 0
      || !(asset.alpha.transparentPixelFraction > 0 && asset.alpha.transparentPixelFraction < 1)) failures.push(`Underwater fish: exact prompt, inspection or alpha record is missing (${path})`);
    const dimensions = asset.dimensions;
    if (!Number.isInteger(dimensions?.width) || !Number.isInteger(dimensions?.height) || dimensions.width < 1 || dimensions.height < 1) failures.push(`Underwater fish: invalid source dimensions (${path})`);
    checkRuntime(path, asset.runtimeSha256, asset.runtimeBytes, "Underwater fish");
    checkSource(asset.sourcePath, asset.sourceSha256, `Underwater fish ${asset.water}`, dimensions);
    const history = asset.generationHistory;
    if (history) {
      if (!Array.isArray(history) || !history.some(entry => entry.sourcePath === asset.sourcePath && entry.sha256 === asset.sourceSha256)) failures.push(`Underwater fish: chosen output is absent from generation history (${path})`);
      for (const entry of Array.isArray(history) ? history : []) {
        if (!entry.prompt || !["generate", "edit"].includes(entry.mode) || entry.transparentBackground !== true
          || entry.mode === "edit" && (!Array.isArray(entry.referencedImagePaths) || entry.referencedImagePaths.length === 0)) failures.push(`Underwater fish: edit inputs or generation mode are incomplete (${path})`);
        checkSource(entry.sourcePath, entry.sha256, `Underwater fish history ${asset.water}`);
        for (const input of entry.referencedImagePaths ?? []) if (!isAbsolute(input) || !history.some(previous => previous.sourcePath === input)) failures.push(`Underwater fish: unbound edit reference (${path})`);
      }
    }
    if (!Array.isArray(asset.species) || Object.keys(asset.frameMetadata ?? {}).length !== asset.species.length) failures.push(`Underwater fish: species/frame inventory mismatch (${path})`);
    for (const id of asset.species ?? []) {
      if (seenSpecies.has(id)) failures.push(`Underwater fish: species is duplicated (${id})`);
      seenSpecies.add(id);
      const frames = asset.frameMetadata?.[id];
      if (!frames || !runtime[id] || Object.keys(frames).sort().join(",") !== "oblique,side,turn") { failures.push(`Underwater fish: genuine three-view runtime metadata is missing (${id})`); continue; }
      for (const view of ["side", "oblique", "turn"]) {
        const frame = frames[view]; const rect = frame.sourceRect; const actual = runtime[id][view];
        if (!rect || ![rect.x, rect.y, rect.width, rect.height].every(Number.isInteger) || rect.x < 0 || rect.y < 0 || rect.width < 1 || rect.height < 1
          || rect.x + rect.width > dimensions.width || rect.y + rect.height > dimensions.height) failures.push(`Underwater fish: source rectangle is outside the atlas (${id}/${view})`);
        if (!finite(frame.mouthX) || !finite(frame.mouthY) || frame.mouthX < 0 || frame.mouthX > 100 || frame.mouthY < 0 || frame.mouthY > 100
          || !finite(frame.aspectRatio) || frame.aspectRatio <= 0 || !finite(frame.widthScale) || frame.widthScale <= 0) failures.push(`Underwater fish: mouth or framing metadata is invalid (${id}/${view})`);
        if (!isDeepStrictEqual({ ...actual, src: undefined }, { ...frame, src: undefined }) || actual.src !== path) failures.push(`Underwater fish: runtime frame metadata differs from provenance (${id}/${view})`);
      }
    }
  }
  if (seenSpecies.size !== 41 || Object.keys(runtime).length !== 41) failures.push("Underwater fish: expected 41 new species with 123 genuine view frames.");
  const definitions = readFileSync(resolve(root, "src/data/underwaterFish.ts"), "utf8");
  const oldSpriteMap = readFileSync(resolve(root, "src/data/liveFishSprites.ts"), "utf8");
  const ids = [...definitions.matchAll(/fish\('([-a-z0-9]+)'/g)].map(match => match[1]);
  if (ids.length !== 45 || new Set(ids).size !== 45 || !definitions.includes("underwaterFishArtByEncounterId")) failures.push("Underwater fish: active45-species registry is missing or ambiguous.");
  for (const id of ids) if (!seenSpecies.has(id) && !new RegExp(`['\"]?${id}['\"]?\\s*:`).test(oldSpriteMap)) failures.push(`Underwater fish: active species has no existing or newly bound three-view art (${id})`);
} catch (error) { failures.push(`Underwater fish provenance could not be verified: ${error.message}`); }

// The original Amazon plate retains its own prompt/date and is now imported
// through the habitat registry; the compatibility export need not import art.
try {
  const manifest = manifestAt("AMAZON_UNDERWATER_MANIFEST.json");
  if (manifest.created !== "2026-10-10" || manifest.provider !== "OpenAI built-in image generation in Codex" || !manifest.disclosure?.includes("reconstructions")) failures.push("Amazon underwater art: dated provider/disclosure record is missing.");
  const runtime = readLiteralRegistry("src/data/underwaterHabitats.ts", "underwaterHabitatByVenue");
  for (const asset of Array.isArray(manifest.assets) ? manifest.assets : []) {
    if (!/^src\/assets\/underwater\/[-a-z0-9]+\.webp$/.test(asset.path ?? "") || underwaterPlates.has(asset.path)) { failures.push("Amazon underwater art: invalid or duplicate asset path."); continue; }
    underwaterPlates.add(asset.path);
    if (!/^exec-[-a-f0-9]+\.png$/.test(asset.generatedSource ?? "") || !sha(asset.sourceSha256) || !asset.prompt) failures.push(`Amazon underwater art original source is incomplete: ${asset.path}`);
    checkRuntime(asset.path, asset.sha256, asset.bytes, "Amazon underwater art");
    if (runtime.amazon?.src !== asset.path) failures.push("Amazon underwater art: retained plate is absent from runtime habitat inventory.");
  }
  const rollout = manifestAt("UNDERWATER_HABITAT_V2_MANIFEST.json");
  const assets = Array.isArray(rollout.assets) ? rollout.assets : [];
  if (rollout.date !== "2026-10-10" || assets.length !== 13) failures.push("Underwater habitat rollout: expected thirteen separately dated new plates.");
  const venueIds = new Set(["amazon"]);
  for (const asset of assets) {
    const path = asset.gameAsset;
    if (!/^src\/assets\/underwater\/[-a-z0-9]+-habitat-v2\.webp$/.test(path ?? "") || underwaterPlates.has(path) || venueIds.has(asset.id)) { failures.push("Underwater habitat rollout: invalid or duplicate plate/venue."); continue; }
    underwaterPlates.add(path); venueIds.add(asset.id);
    if (asset.provider !== "built-in image_gen" || asset.model !== "not reported by tool" || asset.mode !== "generate" || !asset.prompt
      || !asset.limitations?.includes("reconstruction") || !asset.processing?.includes("WebP encoding only")) failures.push(`Underwater habitat rollout: provider, exact prompt, processing or reconstruction boundary missing (${path})`);
    checkRuntime(path, asset.gameSha256, asset.gameBytes, "Underwater habitat rollout");
    checkSource(asset.source, asset.sourceSha256, `Underwater habitat ${asset.id}`, { width: asset.dimensions?.[0], height: asset.dimensions?.[1] });
    if (runtime[asset.id]?.src !== path || runtime[asset.id]?.tint !== asset.tint) failures.push(`Underwater habitat rollout: runtime plate/tint differs from provenance (${asset.id})`);
  }
  if (Object.keys(runtime).length !== 14 || venueIds.size !== 14 || runtime.galapagos) failures.push("Underwater habitat rollout: fourteen angling waters must be inventoried without converting Galapagos surveys into fights.");
  const fishing = readFileSync(resolve(root, "src/components/FishingScene.tsx"), "utf8");
  const renderer = readFileSync(resolve(root, "src/components/UnderwaterFishingScene.tsx"), "utf8");
  if (!fishing.includes("underwaterHabitatByVenue[venue.id]") || !fishing.includes("<UnderwaterFishingScene") || !fishing.includes("habitatSrc={habitat?.src}") || !renderer.includes("habitatSrc")) failures.push("Underwater habitat rollout: shared scene is not wired to the runtime habitat inventory.");
} catch (error) { failures.push(`Underwater habitat provenance could not be verified: ${error.message}`); }

// Every physical media file must belong to exactly one dated manifest AND be
// loaded by its appropriate runtime map. New atlases are not mistaken for old
// individually imported sprites, nor silently skipped by a suffix filter.
try {
  for (const family of ["encounters", "fish-sprites"]) {
    const map = readFileSync(resolve(root, `src/data/${family === "encounters" ? "encounterArtwork" : "liveFishSprites"}.ts`), "utf8");
    for (const file of readdirSync(resolve(root, `src/assets/${family}`)).filter(file => file.endsWith(".webp"))) {
      const path = `src/assets/${family}/${file}`;
      if (!oldSubjects.has(path) && !atlasSubjects.has(path)) failures.push(`Subject art missing from a dated provenance batch: ${path}`);
      if (oldSubjects.has(path) && !map.includes(`/${family}/${file}`)) failures.push(`Old subject art missing from runtime inventory: ${path}`);
    }
  }
  for (const file of readdirSync(resolve(root, "src/assets/underwater")).filter(file => file.endsWith(".webp"))) {
    const path = `src/assets/underwater/${file}`;
    if (!underwaterPlates.has(path)) failures.push(`Underwater art missing from a dated provenance batch: ${path}`);
  }
} catch (error) { failures.push(`Media inventory could not be verified: ${error.message}`); }
if (recordedSources && verifiedSources.size !== receipt.sources.length) failures.push("Source receipt contains unused or unverified originals");
if (failures.length) {
  console.error("Public release blocked by incomplete media provenance:\n");
  for (const failure of failures) console.error(`- ${failure}`);
  console.error(`\nComplete ${recordPath} before publishing the full media bundle.`);
  process.exit(1);
}

console.log("Media provenance gate passed: earlier habitat/guide/catch records, dated subject sprites, 14 underwater habitats and 41 new fish with 123 atlas views are hash-bound to runtime inventories. This check does not publish a release or extend earlier redistribution confirmations to new batches.");

if (writeReceipt) {
  writeFileSync(receiptPath, JSON.stringify({ schema: 1, verifiedAt: new Date().toISOString(), verification: "Original PNG bytes read locally; SHA-256 and PNG dimensions verified", limitation: "CI checks this retained local verification and current runtime/manifest bindings; it does not independently reread original PNGs or grant rights clearance.", manifestHashes, sources: [...verifiedSources.values()].sort((a,b) => a.path.localeCompare(b.path)) }, null, 2) + "\n");
}
console.log(recordedSources ? "Original-source mode: retained local verification receipt; originals not reread in CI." : "Original-source mode: original PNG bytes independently read locally.");
