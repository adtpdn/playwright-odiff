// screenshot.spec.ts
import { test } from "@playwright/test";
import path from "path";
import fs from "fs";
import { devices, browsers } from "../playwright.config";
import { generateReport } from "../generate-report";
import { compareScreenshots } from "../utils/compare-screenshots";

// Configuration
const urls = [
  "https://adengroup.com/",
  "https://adengroup.com/about",
  "https://adengroup.com/contact",
];

// Utility functions
function createFileNameFromUrl(url: string): string {
  // Remove protocol and www
  const urlObj = new URL(url);
  const domain = urlObj.hostname.replace("www.", "");
  const path = urlObj.pathname.replace(/^\/|\/$/g, "");

  // Convert domain to single string
  const domainSlug = domain.replace(/\./g, "");

  // Get page name (use 'home' for root path)
  const pageName = path || "home";

  return [domainSlug, pageName];
}

function setupDirectories() {
  const screenshotsDir = path.join(process.cwd(), "screenshots");
  const currentDir = path.join(screenshotsDir);
  const baselineDir = path.join(screenshotsDir, "baseline");

  // Create main directories
  [screenshotsDir, baselineDir].forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  // Create browser-specific directories
  browsers.forEach((browser) => {
    const browserCurrentDir = path.join(currentDir, browser);
    const browserBaselineDir = path.join(baselineDir, browser);

    [browserCurrentDir, browserBaselineDir].forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  });

  return { currentDir, baselineDir };
}

const { currentDir, baselineDir } = setupDirectories();

// Test cases
test("Screenshot comparison across devices and browsers", async ({
  page,
  browserName,
}) => {
  // Test all device configs for all browsers
  const deviceConfigs = Object.entries(devices);

  for (const url of urls) {
    for (const [deviceType, viewport] of deviceConfigs) {
      // Set viewport
      await page.setViewportSize(viewport);

      const [domainSlug, pageName] = createFileNameFromUrl(url);
      const fileName = `${domainSlug}-${pageName}-${browserName}-${deviceType}-${viewport.width}x${viewport.height}.png`;

      // Navigate and wait for network idle
      await page.goto(url, {
        waitUntil: "networkidle",
        ignoreHTTPSErrors: true,
      });

      // Additional waits for dynamic content
      await page.waitForTimeout(2000);
      await page.waitForLoadState("domcontentloaded");

      // Take screenshot
      const currentPath = path.join(currentDir, browserName, fileName);
      await page.screenshot({
        path: currentPath,
        fullPage: true,
      });

      // Compare with baseline
      const baselinePath = path.join(baselineDir, browserName, fileName);

      if (fs.existsSync(baselinePath)) {
        const diffPath = path.join(currentDir, browserName, `diff-${fileName}`);
        try {
          const { imagesAreSame } = await compareScreenshots(
            baselinePath,
            currentPath,
            diffPath
          );
          console.log(
            `${imagesAreSame ? "⛓️" : "🚧"} ${fileName}: ${
              imagesAreSame ? "Match" : "Differ"
            }`
          );
        } catch (error) {
          console.error(`Error comparing screenshots for ${fileName}:`, error);
        }
      } else {
        fs.copyFileSync(currentPath, baselinePath);
        console.log(`📸 Created baseline for ${fileName}`);
      }
    }
  }
});

test.afterAll(async () => {
  await generateReport();
  console.log("📊 Visual regression report generated");
});
