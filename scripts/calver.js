/**
 * CalVer version bump for smyrnatools.com.
 *
 * Format: YYYY.WW.PATCH
 *   YYYY  - four-digit year
 *   WW    - ISO week number, zero-padded
 *   PATCH - sequential counter within the week, starting at 0
 *
 * Computes the next CalVer version and writes it to package.json
 * and public/release.json. Called by the /release skill during the
 * version bump step.
 *
 * Usage: node scripts/calver.js          (bump and write)
 *        node scripts/calver.js --dry-run (print without writing)
 */

const { readFileSync, writeFileSync } = require("fs");
const { join } = require("path");

const ROOT = join(__dirname, "..");
const PACKAGE_JSON = join(ROOT, "package.json");
const RELEASE_JSON = join(ROOT, "public", "release.json");

function isoWeek(date) {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

function isoWeekYear(date) {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  return d.getUTCFullYear();
}

function nextCalVer(currentVersion) {
  const now = new Date();
  const year = isoWeekYear(now);
  const week = isoWeek(now);
  const weekStr = String(week).padStart(2, "0");

  const parts = currentVersion.split(".").map(Number);
  const sameWeek = parts[0] === year && parts[1] === week;

  if (sameWeek) {
    const curPatch = parts[2] || 0;
    return `${year}.${weekStr}.${curPatch + 1}`;
  }

  return `${year}.${weekStr}.0`;
}

const pkg = JSON.parse(readFileSync(PACKAGE_JSON, "utf-8"));
const oldVersion = pkg.version;
const newVersion = nextCalVer(oldVersion);
const dryRun = process.argv.includes("--dry-run");

console.log(`[calver] ${oldVersion} -> ${newVersion}`);

if (dryRun) {
  process.exit(0);
}

pkg.version = newVersion;
writeFileSync(PACKAGE_JSON, JSON.stringify(pkg, null, 2) + "\n");

const versionManifest = JSON.parse(readFileSync(RELEASE_JSON, "utf-8"));
versionManifest.version = newVersion;
writeFileSync(RELEASE_JSON, JSON.stringify(versionManifest, null, 2) + "\n");
