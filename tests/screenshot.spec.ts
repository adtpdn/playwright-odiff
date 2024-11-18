import { test } from "@playwright/test";
import { compareImages } from "odiff-bin";
import * as fs from "fs";
import * as path from "path";

const URLs = [
  "https://example.com",
  // Add more URLs here
];

test("capture screenshots", async ({ page, browserName, viewport }) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const screenshotsDir = path.join(process.cwd(), "screenshots");
  const currentDir = path.join(screenshotsDir, timestamp);
  const baselineDir = path.join(screenshotsDir, "baseline");

  fs.mkdirSync(currentDir, { recursive: true });
  fs.mkdirSync(baselineDir, { recursive: true });

  for (const url of URLs) {
    const urlSlug = url.replace(/[^a-zA-Z0-9]/g, "-");
    const fileName = `${urlSlug}-${browserName}-${viewport.width}x${viewport.height}.png`;

    await page.goto(url);
    await page.waitForLoadState("networkidle");

    const currentPath = path.join(currentDir, fileName);
    await page.screenshot({ path: currentPath, fullPage: true });

    const baselinePath = path.join(baselineDir, fileName);
    if (fs.existsSync(baselinePath)) {
      const diffPath = path.join(currentDir, `diff-${fileName}`);
      await compareImages({
        imageA: baselinePath,
        imageB: currentPath,
        output: diffPath,
        threshold: 0.1,
      });
    } else {
      fs.copyFileSync(currentPath, baselinePath);
    }
  }
});
