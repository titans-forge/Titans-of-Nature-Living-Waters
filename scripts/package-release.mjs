import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, utimesSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const dist = join(root, "dist");
const release = join(root, "release");
const archiveName = `living-waters-html5-v${packageJson.version}.zip`;
const archive = join(release, archiveName);
const manifestPath = join(release, `${archiveName}.manifest.json`);
const checksumPath = join(release, `${archiveName}.sha256`);
if ([archive, manifestPath, checksumPath].some(existsSync)) {
  throw new Error("Release already exists; refusing to overwrite an earlier archive or its metadata");
}
const archiveTimestamp = new Date(`${packageJson.releaseDate}T00:00:00.000Z`);

function run(command, args, cwd = root) {
  const result = spawnSync(command, args, { cwd, stdio: "inherit" });
  if (result.status !== 0) throw new Error(`${basename(command)} failed with exit code ${result.status}`);
}

function listFiles(directory, prefix = "") {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const relative = join(prefix, entry.name);
    return entry.isDirectory() ? listFiles(join(directory, entry.name), relative) : [relative];
  }).sort();
}

run(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "build"]);
mkdirSync(release, { recursive: true });

const files = listFiles(dist);
if (!files.includes("index.html")) throw new Error("Production build is missing index.html");

for (const file of files) utimesSync(join(dist, file), archiveTimestamp, archiveTimestamp);
run("/usr/bin/zip", ["-X", "-q", archive, ...files], dist);
const archiveBytes = readFileSync(archive);
const sha256 = createHash("sha256").update(archiveBytes).digest("hex");
const unpackedBytes = files.reduce((total, file) => total + statSync(join(dist, file)).size, 0);
const manifest = {
  product: "Titans of Nature: Living Waters",
  version: packageJson.version,
  archive: archiveName,
  sha256,
  fileCount: files.length,
  unpackedBytes,
  generatedAt: new Date().toISOString(),
  entrypoint: "index.html",
};

writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { flag: "wx" });
writeFileSync(checksumPath, `${sha256}  ${archiveName}\n`, { flag: "wx" });

const listing = spawnSync("/usr/bin/unzip", ["-Z1", archive], { encoding: "utf8" });
if (listing.status !== 0 || !listing.stdout.split("\n").includes("index.html")) {
  throw new Error("Archive smoke test failed: index.html is not at the ZIP root");
}

console.log(`Created ${archive}`);
console.log(`SHA-256 ${sha256}`);
