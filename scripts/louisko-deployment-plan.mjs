#!/usr/bin/env node

import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { access, readFile } from "node:fs/promises";
import https from "node:https";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const scriptsDir = path.dirname(__filename);
const aiWebRoot = path.resolve(scriptsDir, "..");
const rootLooksLikeProject = existsSync(path.join(aiWebRoot, "package.json")) &&
  existsSync(path.join(aiWebRoot, "server.js")) &&
  existsSync(path.join(aiWebRoot, "apps", "photo", "index.html"));
const futureProject = aiWebRoot;
const manualPath = path.join(aiWebRoot, "scripts", "site-workflow", "WEB_CHANGE_DEPLOYMENT_WORKFLOW.md");
const wranglerBin = "/opt/homebrew/bin/npx";
const wranglerArgs = ["-y", "wrangler@latest"];

const targets = {
  productionHome: "https://louisko.com/",
  productionPhoto: "https://louisko.com/apps/photo/",
  productionApi: "https://louisko.com/api/photo-cloud/albums",
  productionObjectApi: "https://louisko.com/api/photo-cloud/object",
  nodePhoto: "https://louisko-node-photo.zeabur.app/apps/photo/",
  nodeApi: "https://louisko-node-photo.zeabur.app/api/photo-cloud/albums",
  r2DevUrl: "https://pub-29ba83bd8460480a94bbda4833669d2e.r2.dev",
  r2Metadata: "https://pub-29ba83bd8460480a94bbda4833669d2e.r2.dev/_metadata/photo-cloud.json",
};

const cliArgs = process.argv.slice(2);
const mode = cliArgs.find((arg) => !arg.startsWith("-")) || "check";
const online = cliArgs.includes("--online");

if (cliArgs.includes("-h") || cliArgs.includes("--help") || mode === "help") {
  printHelp();
  process.exit(0);
}

if (mode === "plan") {
  printPlan();
  process.exit(0);
}

if (mode === "next") {
  printNextSteps();
  process.exit(0);
}

if (mode !== "check") {
  fail(`Unknown mode: ${mode}`);
}

await runCheck();

function printHelp() {
  console.log(`louisko deployment plan helper

Usage:
  node scripts/louisko-deployment-plan.mjs check
  node scripts/louisko-deployment-plan.mjs check --online
  node scripts/louisko-deployment-plan.mjs plan
  node scripts/louisko-deployment-plan.mjs next

Modes:
  check  Check local docs and print the deployment status checklist.
  check --online  Also check Zeabur URLs, Cloudflare Wrangler, and R2 state.
  plan   Print the recommended GitHub / Zeabur / Cloudflare / R2 layout.
  next   Print the next human and Codex actions.
`);
}

function printPlan() {
  console.log(`# louisko.com recommended layout

GitHub:
  - Saves code, README, AGENTS, and change history.

Zeabur:
  - Runs louisko.com pages and Node APIs from louisko-node-photo.
  - Handles HEIC conversion, image resize, cloud sync API.
  - Photo deletes must clean local IndexedDB records, cloud metadata, and R2/local object paths.
  - Provides same-origin cloud photo downloads at /api/photo-cloud/object.

Cloudflare DNS:
  - Routes louisko.com and www.louisko.com to Zeabur.
  - Routes media.louisko.com to Cloudflare R2.

Cloudflare R2:
  - Stores uploaded album photos long-term as single optimized JPG objects.
  - Stores album metadata at _metadata/photo-cloud.json.
  - Does not store separate thumbnails.
  - An empty clean state is valid: 0 albums / 0 photos, with no object proxy sample to test.

Current services:
  - louisko-node-photo: production Node service for louisko.com pages and APIs.
  - bazi-website: legacy static backup service, not bound to louisko.com.

Manual:
  ${manualPath}
`);
}

function printNextSteps() {
  console.log(`# Next steps

Human owner:
  1. Confirm louisko.com DNS can move to Cloudflare when ready.
  2. If yes, update nameservers at the domain registrar to Cloudflare nameservers.
  3. Keep Cloudflare, Zeabur, and GitHub login / 2FA safe.
  4. Use Photo page "讀取雲端" after cloud-side album deletes so local browsers prune removed albums and photos.

Codex:
  1. Re-run this script: node scripts/louisko-deployment-plan.mjs check --online
  2. Verify louisko.com home, Photo page, Photo API, and same-origin object API.
  3. Verify Photo source no longer auto-creates "Louis Album".
  4. Verify R2 metadata has no ghost Louis Album, no thumbnail references, and no missing storageKey.
  5. Confirm Cloudflare has a louisko.com zone and obtain zone id.
  6. Connect media.louisko.com to R2 bucket louisko-photo.
  7. Update Zeabur R2_PUBLIC_BASE_URL to https://media.louisko.com.
  8. Verify mobile upload / sync / download / delete flow.
`);
}

async function runCheck() {
  printHeader("Louisko Deployment Check");
  console.log(`AI_Web: ${aiWebRoot}`);
  console.log(`Project root: ${futureProject}`);
  console.log("");

  const results = [];

  results.push(await checkPath("Owner manual", manualPath));
  results.push(await checkPath("Project package.json", path.join(futureProject, "package.json")));
  results.push(await checkPath("Project server.js", path.join(futureProject, "server.js")));
  results.push(await checkPath("Photo app", path.join(futureProject, "apps", "photo", "index.html")));
  results.push(await checkPhotoSourceRules());

  if (online) {
    results.push(await runCommandCheck("Wrangler version", wranglerBin, [...wranglerArgs, "--version"], { sensitive: false }));
    results.push(await runCommandCheck("Wrangler login", wranglerBin, [...wranglerArgs, "whoami"], { summarize: summarizeWranglerWhoami }));
    results.push(await runCommandCheck("R2 bucket list", wranglerBin, [...wranglerArgs, "r2", "bucket", "list"], { summarize: summarizeBucketList }));
    results.push(await runCommandCheck("R2 bucket info", wranglerBin, [...wranglerArgs, "r2", "bucket", "info", "louisko-photo"], { summarize: summarizeBucketInfo }));
    results.push(await runCommandCheck("R2 dev URL", wranglerBin, [...wranglerArgs, "r2", "bucket", "dev-url", "get", "louisko-photo"], { summarize: summarizePlain }));
    results.push(await runCommandCheck("R2 custom domains", wranglerBin, [...wranglerArgs, "r2", "bucket", "domain", "list", "louisko-photo"], { summarize: summarizePlain }));

    results.push(await checkUrl("Production home", targets.productionHome, { expect: 200 }));
    results.push(await checkUrl("Production Photo page", targets.productionPhoto, { expect: 200 }));
    results.push(await checkUrl("Production Photo API", targets.productionApi, { expect: 200, json: true, strict: true }));
    results.push(await checkPhotoMetadata());
    results.push(await checkFirstCloudObject());
    results.push(await checkUrl("Node generated Photo page", targets.nodePhoto, { expect: 200 }));
    results.push(await checkUrl("Node generated Photo API", targets.nodeApi, { expect: 200, json: true }));
  } else {
    results.push(warn("Online checks", "Skipped. Run `node scripts/louisko-deployment-plan.mjs check --online` to query Wrangler, R2, and live URLs."));
  }

  printSummary(results);
  printNextSteps();

  const failed = results.filter((result) => result.level === "fail");
  process.exitCode = failed.length > 0 ? 1 : 0;
}

async function checkPhotoMetadata() {
  try {
    const { status, contentType, body } = await fetchUrl(targets.productionApi);
    if (status !== 200 || !contentType.includes("application/json")) {
      return failResult("Photo metadata integrity", `${status} ${contentType}`);
    }
    const data = JSON.parse(body);
    const albums = Array.isArray(data.albums) ? data.albums : [];
    const photos = Array.isArray(data.photos) ? data.photos : [];
    const ghostLouis = albums.some((album) => album.name === "Louis Album");
    const thumbnailRefs = photos.filter((photo) => photo.thumbnailKey || photo.thumbnailUrl).length;
    const missingStorageKeys = photos.filter((photo) => !photo.storageKey).length;
    const emptyClean = albums.length === 0 && photos.length === 0;
    const summary = `${albums.length} albums, ${photos.length} photos, thumbnailRefs=${thumbnailRefs}, missingStorageKeys=${missingStorageKeys}${emptyClean ? ", emptyClean=true" : ""}`;
    if (ghostLouis) return failResult("Photo metadata integrity", `${summary}, ghost Louis Album still present`);
    if (thumbnailRefs || missingStorageKeys) return warn("Photo metadata integrity", summary);
    return pass("Photo metadata integrity", summary);
  } catch (error) {
    return warn("Photo metadata integrity", error.message);
  }
}

async function checkFirstCloudObject() {
  try {
    const { status, contentType, body } = await fetchUrl(targets.productionApi);
    if (status !== 200 || !contentType.includes("application/json")) {
      return warn("Photo object proxy", `Photo API unavailable: ${status} ${contentType}`);
    }
    const data = JSON.parse(body);
    const photo = (Array.isArray(data.photos) ? data.photos : []).find((item) => item.storageKey);
    if (!photo) return pass("Photo object proxy", "Skipped: no cloud photo with storageKey in current clean state");
    const url = `${targets.productionObjectApi}?key=${encodeURIComponent(photo.storageKey)}&name=${encodeURIComponent(photo.outputName || "photo.jpg")}`;
    const object = await fetchUrl(url, { method: "HEAD" });
    if (object.status === 200 && object.contentType.includes("image/jpeg")) {
      return pass("Photo object proxy", `${object.status} ${object.contentType}; key=${photo.storageKey}`);
    }
    return failResult("Photo object proxy", `${object.status} ${object.contentType}; key=${photo.storageKey}`);
  } catch (error) {
    return warn("Photo object proxy", error.message);
  }
}

async function checkPhotoSourceRules() {
  try {
    const appPath = path.join(futureProject, "apps", "photo", "app.js");
    const serverPath = path.join(futureProject, "server.js");
    const appSource = await readFile(appPath, "utf8");
    const serverSource = await readFile(serverPath, "utf8");
    const autoCreatesLouis = /ensureDefaultAlbum|putRecord\(\s*["']albums["'][\s\S]{0,180}Louis Album/.test(appSource);
    const removesLegacyLouis = /removeLegacyDefaultAlbums/.test(appSource) && /name\s*===\s*["']Louis Album["']/.test(appSource);
    const fallbackLouis = /(?:name|albumName)\s*=\s*String\([^)]*Louis Album/.test(serverSource) || /albumName["']\s*,\s*album\?\.name\s*\|\|\s*["']Louis Album/.test(appSource);
    const deleteCleansPrefix = /deleteAlbumObjects\(albumId\)/.test(serverSource) && /ListObjectsV2Command/.test(serverSource);
    const pruneDeletesLocalBlobs = /cloudSyncedAt && !cloudAlbumIds\.has\(album\.id\)[\s\S]{0,180}deleteRecord\("photos"/.test(appSource) && !/hasLocalBlob/.test(appSource);

    const problems = [];
    if (autoCreatesLouis) problems.push("auto-create Louis Album still present");
    if (!removesLegacyLouis) problems.push("legacy Louis Album local prune missing");
    if (fallbackLouis) problems.push("Louis Album fallback still present");
    if (!deleteCleansPrefix) problems.push("album delete does not clean storage prefix");
    if (!pruneDeletesLocalBlobs) problems.push("cloud prune may preserve local blobs");
    if (problems.length) return failResult("Photo source cleanup rules", problems.join("; "));
    return pass("Photo source cleanup rules", "no auto Louis Album, legacy local prune enabled, delete cleans storage prefix");
  } catch (error) {
    return warn("Photo source cleanup rules", error.message);
  }
}

async function checkPath(label, targetPath, options = {}) {
  try {
    await access(targetPath);
    return pass(label, targetPath);
  } catch {
    if (options.optional) return warn(label, `Optional in project-root checkout: ${targetPath}`);
    return failResult(label, `Missing: ${targetPath}`);
  }
}

async function runCommandCheck(label, command, args, options = {}) {
  if (command === wranglerBin && !existsSync(command)) {
    return warn(label, `Command not found: ${command}`);
  }

  try {
    const { stdout, stderr } = await execFileAsync(command, args, { cwd: aiWebRoot, timeout: 12_000 });
    const output = `${stdout}${stderr}`.trim();
    const summary = options.summarize ? options.summarize(output) : output.split("\n")[0];
    return pass(label, summary || "OK");
  } catch (error) {
    const output = `${error.stdout || ""}${error.stderr || ""}`.trim();
    return warn(label, redact(output || error.message));
  }
}

function checkUrl(label, url, options = {}) {
  return new Promise((resolve) => {
    const request = https.get(url, { timeout: 15_000, headers: { "user-agent": "louisko-deployment-check/1.0" } }, (response) => {
      let body = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => {
        if (body.length < 2000) body += chunk;
      });
      response.on("end", () => {
        const status = response.statusCode || 0;
        const contentType = response.headers["content-type"] || "";
        const okStatus = status === options.expect;
        const okJson = !options.json || contentType.includes("application/json");
        const message = `${status} ${contentType}`.trim();

        if (okStatus && okJson) {
          resolve(pass(label, message));
          return;
        }

        if (options.allowFail || !options.strict) {
          resolve(warn(label, `${message} (expected during pre-switch if production is still static)`));
          return;
        }

        resolve(failResult(label, `${message}; body: ${body.slice(0, 160).replace(/\s+/g, " ")}`));
      });
    });

    request.on("timeout", () => {
      request.destroy(new Error("timeout"));
    });

    request.on("error", (error) => {
      const result = options.strict ? failResult(label, error.message) : warn(label, `${error.message} (external network may be blocked)`);
      resolve(result);
    });
  });
}

function fetchUrl(url, options = {}) {
  return new Promise((resolve, reject) => {
    const request = https.request(url, {
      method: options.method || "GET",
      timeout: 15_000,
      headers: { "user-agent": "louisko-deployment-check/1.0" },
    }, (response) => {
      let body = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => {
        if (body.length < 1_000_000) body += chunk;
      });
      response.on("end", () => {
        resolve({
          status: response.statusCode || 0,
          contentType: response.headers["content-type"] || "",
          body,
        });
      });
    });
    request.on("timeout", () => request.destroy(new Error("timeout")));
    request.on("error", reject);
    request.end();
  });
}

function execFileAsync(command, args, options) {
  return new Promise((resolve, reject) => {
    execFile(command, args, options, (error, stdout, stderr) => {
      if (error) {
        error.stdout = stdout;
        error.stderr = stderr;
        reject(error);
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

function summarizeWranglerWhoami(output) {
  const account = output.match(/Account ID\s+│\s+([a-f0-9]+)/i);
  const email = output.match(/associated with the email ([^.\n]+(?:\.[^.\n]+)*@[^.\n]+\.[^.\n]+)/i);
  const accountText = account ? `account ${account[1]}` : "account found";
  const emailText = email ? `logged in as ${email[1]}` : "logged in";
  return `${emailText}; ${accountText}`;
}

function summarizeBucketList(output) {
  return output.includes("louisko-photo") ? "louisko-photo found" : "louisko-photo not found";
}

function summarizeBucketInfo(output) {
  return output
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /name:|location:|object_count:|bucket_size:/i.test(line))
    .join("; ");
}

function summarizePlain(output) {
  return output.replace(/\s+/g, " ").trim();
}

function printHeader(title) {
  console.log(`\n# ${title}\n`);
}

function printSummary(results) {
  console.log("\n# Check Summary\n");
  for (const result of results) {
    const icon = result.level === "pass" ? "PASS" : result.level === "warn" ? "WARN" : "FAIL";
    console.log(`[${icon}] ${result.label}: ${result.message}`);
  }
  console.log("");
}

function pass(label, message) {
  return { level: "pass", label, message: redact(String(message || "OK")) };
}

function warn(label, message) {
  return { level: "warn", label, message: redact(String(message || "Warning")) };
}

function failResult(label, message) {
  return { level: "fail", label, message: redact(String(message || "Failed")) };
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function redact(value) {
  return value
    .replace(/R2_SECRET_ACCESS_KEY=\S+/gi, "R2_SECRET_ACCESS_KEY=<redacted>")
    .replace(/R2_ACCESS_KEY_ID=\S+/gi, "R2_ACCESS_KEY_ID=<redacted>")
    .replace(/ZEABUR_TOKEN=\S+/gi, "ZEABUR_TOKEN=<redacted>")
    .replace(/Bearer\s+[A-Za-z0-9._-]+/g, "Bearer <redacted>");
}
