#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, "../..");
const themePath = path.join(root, "assets", "louisko-theme.css");

const finalTheme = {
  palette: "nordic-lichen",
  font: "manrope-system",
  base: "#F8F6EF",
  soft: "#F1EFE8",
  wash: "#DDE8D2",
  ink: "#26302F",
  muted: "#6F7F84",
  accent: "#A66F63",
  line: "rgba(38, 48, 47, .13)",
  background:
    "radial-gradient(circle at 50% 46%, rgba(221, 232, 210, .84) 0%, rgba(221, 232, 210, .48) 28%, rgba(248, 246, 239, .88) 64%, #F8F6EF 100%)",
  body:
    'Manrope, "Noto Sans TC", "Helvetica Neue", -apple-system, BlinkMacSystemFont, "PingFang TC", "Microsoft JhengHei", sans-serif',
  heading:
    'Manrope, "Noto Sans TC", "Helvetica Neue", -apple-system, BlinkMacSystemFont, "PingFang TC", sans-serif',
  headingWeight: "650",
  bodyWeight: "500",
  labelWeight: "760",
  buttonWeight: "700",
  cardWeight: "760",
};

const fontImport =
  '@import url("https://fonts.googleapis.com/css2?family=Manrope:wght@450;500;550;650;700;760&family=Noto+Sans+TC:wght@400;500;700;800&display=swap");';

function usage() {
  console.log(`louisko style system

Usage:
  node scripts/site-workflow/louisko-style-system.mjs final
  node scripts/site-workflow/louisko-style-system.mjs info

Final:
  palette: ${finalTheme.palette}
  font: ${finalTheme.font}
`);
}

function setVar(css, name, value) {
  const pattern = new RegExp(`(--${name}:\\s*)([^;]+)(;)`);
  if (!pattern.test(css)) throw new Error(`Missing CSS variable --${name}`);
  return css.replace(pattern, `$1${value}$3`);
}

function ensureFontImport(css) {
  if (css.includes("fonts.googleapis.com/css2?family=Manrope")) return css;
  return `${fontImport}\n\n${css}`;
}

function applyFinalTheme() {
  let css = ensureFontImport(readFileSync(themePath, "utf8"));
  css = setVar(css, "louisko-base", finalTheme.base);
  css = setVar(css, "louisko-soft", finalTheme.soft);
  css = setVar(css, "louisko-mint", finalTheme.wash);
  css = setVar(css, "louisko-ink", finalTheme.ink);
  css = setVar(css, "louisko-muted", finalTheme.muted);
  css = setVar(css, "louisko-accent", finalTheme.accent);
  css = setVar(css, "louisko-line", finalTheme.line);
  css = setVar(css, "louisko-page-background", finalTheme.background);
  css = setVar(css, "louisko-font-body", finalTheme.body);
  css = setVar(css, "louisko-font-heading", finalTheme.heading);
  css = setVar(css, "louisko-heading-weight", finalTheme.headingWeight);
  css = setVar(css, "louisko-body-weight", finalTheme.bodyWeight);
  css = setVar(css, "louisko-label-weight", finalTheme.labelWeight);
  css = setVar(css, "louisko-button-weight", finalTheme.buttonWeight);
  css = setVar(css, "louisko-card-weight", finalTheme.cardWeight);
  writeFileSync(themePath, css);
  console.log(`Applied final Louisko theme to ${themePath}`);
}

function info() {
  console.log(`Final Louisko visual theme

Palette:
  Nordic Lichen
  ${finalTheme.base} + ${finalTheme.wash}

Typography:
  Manrope + Noto Sans TC
  heading weight ${finalTheme.headingWeight}
  body weight ${finalTheme.bodyWeight}
`);
}

const command = process.argv[2] || "info";

try {
  if (command === "final") applyFinalTheme();
  else if (command === "info") info();
  else usage();
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exitCode = 1;
}
