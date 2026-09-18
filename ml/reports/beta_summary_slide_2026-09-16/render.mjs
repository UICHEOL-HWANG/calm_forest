import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "/Users/uicheol_hwang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";

const dir = "/Users/uicheol_hwang/calm_forest/ml/reports/beta_summary_slide_2026-09-16";
const jobs = [
  ["index.html", "beta_ab_summary_slide.png"],
  ["hypothesis_testing.html", "beta_ab_hypothesis_testing_slide.png"],
];

const browser = await chromium.launch({ headless: true });

for (const [inputName, outputName] of jobs) {
  const page = await browser.newPage({
    viewport: { width: 1600, height: 900 },
    deviceScaleFactor: 1,
  });
  await page.goto(pathToFileURL(path.join(dir, inputName)).href, { waitUntil: "networkidle" });
  const output = path.join(dir, outputName);
  await page.screenshot({ path: output, fullPage: false });
  await page.close();
  console.log(output);
}

await browser.close();
