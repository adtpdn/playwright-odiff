// screenshot.spec.ts
import { test } from "@playwright/test";
import path from "path";
import fs from "fs";
import { devices, browsers } from "../playwright.config";
import { generateReport } from "../generate-report";
import { compareScreenshots } from "../utils/compare-screenshots";

// Configuration
const urls = [
  "https://adenenergies.com/",
  "https://adenenergies.com/about/",
  "https://adenenergies.com/contact/",
  "https://adenenergies.com/media/",
  "https://adenenergies.com/media/insights/",
  "https://adenenergies.com/media/news/",
  "https://adenenergies.com/media/videos/",
  "https://adenenergies.com/solutions/",
  "https://adenenergies.com/zh/",
  "https://adenenergies.com/zh/about/",
  "https://adenenergies.com/zh/contact/",
  "https://adenenergies.com/zh/media/",
  "https://adenenergies.com/zh/media/insights/",
  "https://adenenergies.com/zh/media/news/",
  "https://adenenergies.com/zh/media/videos/",
  "https://adenenergies.com/zh/solutions/",
  "https://adengroup.com/",
  "https://adengroup.com/about-us/",
  "https://adengroup.com/careers/",
  "https://adengroup.com/contact/",
  "https://adengroup.com/media/",
  "https://adengroup.com/cn/",
  "https://adengroup.com/cn/about-us/",
  "https://adengroup.com/cn/careers/",
  "https://adengroup.com/cn/contact/",
  "https://adengroup.com/cn/media/",
];

// Constants
const MAX_RETRIES = 3;
const NAVIGATION_TIMEOUT = 60000; // Reduced from 100000
const PAGE_TIMEOUT = 30000;
const NETWORK_IDLE_TIMEOUT = 10000;
const RENDER_TIMEOUT = 10000;
const CHUNK_SIZE = 5;

// Utility functions
function createFileNameFromUrl(url: string): string {
  const urlObj = new URL(url);
  const domain = urlObj.hostname.replace("www.", "");
  const path = urlObj.pathname.replace(/^\/|\/$/g, "");
  const domainSlug = domain.replace(/\./g, "");
  const pageName = path
    ? path.replace(/\//g, "_").replace(/^_|_$/g, "")
    : "home";
  return [domainSlug, pageName];
}

function setupDirectories() {
  const screenshotsDir = path.join(process.cwd(), "screenshots");
  const currentDir = path.join(screenshotsDir);
  const baselineDir = path.join(screenshotsDir, "baseline");

  [screenshotsDir, baselineDir].forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

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
      waitUntil: "domcontentloaded",
      timeout: NAVIGATION_TIMEOUT,
      ignoreHTTPSErrors: true,
    });

    // Wait for load state with timeout
    try {
      await page.waitForLoadState("load", { timeout: PAGE_TIMEOUT });
    } catch (error) {
      console.log(`Load state timeout for ${url}, continuing anyway`);
    }

    // Wait for network idle with shorter timeout
    try {
      await page.waitForLoadState("networkidle", {
        timeout: NETWORK_IDLE_TIMEOUT,
      });
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
      await new Promise((resolve) => setTimeout(resolve, 5000));
      return navigateWithRetry(page, url, retryCount + 1);
    }
    throw error;
  }
}

const { currentDir, baselineDir } = setupDirectories();

// Test cases
test("Screenshot comparison across devices and browsers", async ({
  browser,
}) => {
  // Process URLs in chunks
  const urlChunks = [];
  for (let i = 0; i < urls.length; i += CHUNK_SIZE) {
    urlChunks.push(urls.slice(i, i + CHUNK_SIZE));
  }

  const deviceConfigs = Object.entries(devices);
  const browserName = browser.browserType().name();

  for (const urlChunk of urlChunks) {
    // Create new context for each chunk
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // Set timeouts
      page.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT);
      page.setDefaultTimeout(PAGE_TIMEOUT);

      for (const url of urlChunk) {
        for (const [deviceType, viewport] of deviceConfigs) {
          try {
            await page.setViewportSize(viewport);

            const [domainSlug, pageName] = createFileNameFromUrl(url);
            const fileName = `${domainSlug}-${pageName}-${browserName}-${deviceType}-${viewport.width}x${viewport.height}.png`;

            await navigateWithRetry(page, url);

            // Wait for final renders with reasonable timeout
            await page.waitForTimeout(RENDER_TIMEOUT);

            // Take screenshot
            const currentPath = path.join(currentDir, browserName, fileName);
            await page.screenshot({
              path: currentPath,
              fullPage: true,
              timeout: PAGE_TIMEOUT,
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
            continue;
          }
        }
      }
    } finally {
      // Clean up context after each chunk
      await context.close();
    }
  }
});

test.afterAll(async () => {
  await generateReport();
  console.log("📊 Visual regression report generated");
});
