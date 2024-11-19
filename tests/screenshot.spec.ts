// screenshot.spec.ts
import { test } from "@playwright/test";
import path from "path";
import fs from "fs";
import { devices, browsers } from "../playwright.config";
import { generateReport } from "../generate-report";
import { compareScreenshots } from "../utils/compare-screenshots";

// Configuration
const urls = [
  "https://adenenergies.com/about/",
  "https://adenenergies.com/contact/",
  "https://adenenergies.com/",
  "https://adenenergies.com/media/",
  "https://adenenergies.com/media/insights/",
  "https://adenenergies.com/media/news/",
  "https://adenenergies.com/media/videos/",
  "https://adenenergies.com/solutions/",
  "https://adenenergies.com/zh/about/",
  "https://adenenergies.com/zh/contact/",
  "https://adenenergies.com/zh/",
  "https://adenenergies.com/zh/media/",
  "https://adenenergies.com/zh/media/insights/",
  "https://adenenergies.com/zh/media/news/",
  "https://adenenergies.com/zh/media/videos/",
  "https://adenenergies.com/zh/solutions/",
  "https://adengroup.com/",
  "https://adengroup.com/about-us/",
  "https://adengroup.com/careers/",
  "https://adengroup.com/cn/about-us/",
  "https://adengroup.com/cn/careers/",
  "https://adengroup.com/cn/contact/",
  "https://adengroup.com/cn/",
  "https://adengroup.com/cn/media/",
  "https://adengroup.com/contact/",
  "https://adengroup.com/media/",
];

// Maximum retry attempts for navigation
const MAX_RETRIES = 3;
const NAVIGATION_TIMEOUT = 100000;

// Utility functions
function createFileNameFromUrl(url: string): string {
  // Remove protocol and www
  const urlObj = new URL(url);
  const domain = urlObj.hostname.replace("www.", "");
  const path = urlObj.pathname.replace(/^\/|\/$/g, "");

  // Convert domain to single string
  const domainSlug = domain.replace(/\./g, "");

  // Get page name (use 'home' for root path)
  // Replace all slashes with underscores and remove any trailing/leading underscores
  const pageName = path
    ? path.replace(/\//g, "_").replace(/^_|_$/g, "")
    : "home";

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

async function navigateWithRetry(page, url, retryCount = 0) {
  try {
    await page.goto(url, {
      waitUntil: "domcontentloaded", // Changed from networkidle to domcontentloaded
      timeout: NAVIGATION_TIMEOUT,
      ignoreHTTPSErrors: true,
    });

    // Wait for the page to be relatively stable
    await page.waitForLoadState("load", { timeout: NAVIGATION_TIMEOUT });

    // Additional wait for any remaining dynamic content
    try {
      await page.waitForLoadState("networkidle", { timeout: 10000 }); // Short timeout for networkidle
    } catch (error) {
      console.log(`Network not completely idle for ${url}, continuing anyway`);
    }
  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      console.log(
        `Retrying navigation to ${url} (attempt ${
          retryCount + 1
        }/${MAX_RETRIES})`
      );
      await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds before retry
      return navigateWithRetry(page, url, retryCount + 1);
    }
    throw error;
  }
}

const { currentDir, baselineDir } = setupDirectories();

// Test cases
test("Screenshot comparison across devices and browsers", async ({
  page,
  browserName,
}) => {
  // Set default navigation timeout
  page.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT);
  page.setDefaultTimeout(NAVIGATION_TIMEOUT);

  // Test all device configs for all browsers
  const deviceConfigs = Object.entries(devices);

  for (const url of urls) {
    for (const [deviceType, viewport] of deviceConfigs) {
      try {
        // Set viewport
        await page.setViewportSize(viewport);

        const [domainSlug, pageName] = createFileNameFromUrl(url);
        const fileName = `${domainSlug}-${pageName}-${browserName}-${deviceType}-${viewport.width}x${viewport.height}.png`;

        // Navigate with retry mechanism
        await navigateWithRetry(page, url);

        // Additional waits for dynamic content
        await page.waitForTimeout(10000);

        // Take screenshot
        const currentPath = path.join(currentDir, browserName, fileName);
        await page.screenshot({
          path: currentPath,
          fullPage: true,
          timeout: 30000,
        });

        // Compare with baseline
        const baselinePath = path.join(baselineDir, browserName, fileName);

        if (fs.existsSync(baselinePath)) {
          const diffPath = path.join(
            currentDir,
            browserName,
            `diff-${fileName}`
          );
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
            console.error(
              `Error comparing screenshots for ${fileName}:`,
              error
            );
          }
        } else {
          fs.copyFileSync(currentPath, baselinePath);
          console.log(`📸 Created baseline for ${fileName}`);
        }
      } catch (error) {
        console.error(`Error processing ${url} for ${deviceType}:`, error);
        // Continue with next iteration instead of failing the entire test
        continue;
      }
    }
  }
});

test.afterAll(async () => {
  await generateReport();
  console.log("📊 Visual regression report generated");
});
