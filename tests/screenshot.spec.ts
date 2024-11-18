import { test } from "@playwright/test";
import path from "path";
import fs from "fs";

// Simple URL to filename conversion function
function createFileNameFromUrl(url: string): string {
  return url
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "")
    .replace(/[^a-zA-Z0-9]/g, "-")
    .toLowerCase();
}

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const currentDir = path.join(process.cwd(), "screenshots", timestamp);
const baselineDir = path.join(process.cwd(), "screenshots", "baseline");

if (!fs.existsSync(currentDir)) {
  fs.mkdirSync(currentDir, { recursive: true });
}

test("capture screenshots", async ({ page, browserName, viewport }) => {
  const url = "https://adengroup.com/";
  const urlSlug = createFileNameFromUrl(url);
  const fileName = `${urlSlug}-${browserName}-${viewport.width}x${viewport.height}.png`;

  // Configure page to ignore HTTPS errors
  await page.goto(url, {
    waitUntil: "load",
    ignoreHTTPSErrors: true,
  });
  await page.waitForLoadState("networkidle");

  const currentPath = path.join(currentDir, fileName);
  await page.screenshot({
    path: currentPath,
    fullPage: true,
  });

  // Compare with baseline if it exists
  const baselinePath = path.join(baselineDir, fileName);
  if (fs.existsSync(baselinePath)) {
    const diffPath = path.join(currentDir, `diff-${fileName}`);
    const { imagesAreSame } = await compareScreenshots(
      baselinePath,
      currentPath,
      diffPath
    );
    if (!imagesAreSame) {
      console.log(`Screenshots differ for ${fileName}`);
    }
  } else {
    // Create baseline if it doesn't exist
    if (!fs.existsSync(baselineDir)) {
      fs.mkdirSync(baselineDir, { recursive: true });
    }
    fs.copyFileSync(currentPath, baselinePath);
  }
});
