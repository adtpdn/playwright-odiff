// tests/screenshot.spec.ts
import { test } from "@playwright/test";
import path from "path";
import fs from "fs";
import {
  devices,
  browsers,
  timeouts,
  getTimeouts,
  EnvironmentType,
} from "../config/devices";
import { compareScreenshots } from "../utils/compare-screenshots";
const urlGroups = require("../url-groups");

const env: EnvironmentType = process.env.TEST_ENV === "ci" ? "ci" : "local";
const envTimeouts = getTimeouts(env);

// Constants
const MAX_RETRIES = env === "ci" ? 2 : 3;
const NAVIGATION_TIMEOUT = envTimeouts.navigation;
const PAGE_TIMEOUT = envTimeouts.page;
const NETWORK_IDLE_TIMEOUT = envTimeouts.networkIdle;
const RENDER_TIMEOUT = envTimeouts.render;
const NAVIGATION_RETRY_DELAY = 10000;
const SCREENSHOT_TIMEOUT = 30000;

// Get URLs from environment variable or use default group
const urls = process.env.TEST_URLS
  ? JSON.parse(process.env.TEST_URLS)
  : urlGroups["adenenergies-main"];

function createFileNameFromUrl(url: string): string[] {
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
  const currentDir = path.join(screenshotsDir, env);
  const baselineDir = path.join(screenshotsDir, "baseline");

  [screenshotsDir, currentDir, baselineDir].forEach((dir) => {
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

async function takeScreenshotWithRetry(page, path, retryCount = 0) {
  try {
    await page.screenshot({
      path,
      fullPage: true,
      timeout: SCREENSHOT_TIMEOUT,
    });
    return true;
  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      console.log(
        `Retrying screenshot (attempt ${retryCount + 1}/${MAX_RETRIES})`
      );
      await new Promise((resolve) => setTimeout(resolve, 5000));
      return takeScreenshotWithRetry(page, path, retryCount + 1);
    }
    throw error;
  }
}

async function navigateWithRetry(page, url, retryCount = 0) {
  try {
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: NAVIGATION_TIMEOUT,
      ignoreHTTPSErrors: true,
    });

    try {
      await page.waitForLoadState("load", { timeout: PAGE_TIMEOUT });
    } catch (error) {
      console.log(`Load state timeout for ${url}, continuing anyway`);
    }

    try {
      await page.waitForLoadState("networkidle", {
        timeout: NETWORK_IDLE_TIMEOUT,
      });
    } catch (error) {
      console.log(`Network not completely idle for ${url}, continuing anyway`);
    }

    // Additional stability check
    await page.waitForTimeout(5000);

    return true;
  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      console.log(
        `Retrying navigation to ${url} (attempt ${
          retryCount + 1
        }/${MAX_RETRIES})`
      );
      await new Promise((resolve) =>
        setTimeout(resolve, NAVIGATION_RETRY_DELAY)
      );
      return navigateWithRetry(page, url, retryCount + 1);
    }
    throw error;
  }
}

const { currentDir, baselineDir } = setupDirectories();

// Create a test for each device type
for (const [deviceType, viewport] of Object.entries(devices)) {
  test(`Screenshot comparison for ${deviceType}`, async ({ browser }) => {
    test.slow(); // Mark test as slow to increase timeouts

    const browserName = browser.browserType().name();
    const context = await browser.newContext({
      viewport,
      deviceScaleFactor: deviceType === "desktop" ? 1 : 2,
    });

    // Set default timeout for context
    context.setDefaultTimeout(PAGE_TIMEOUT);

    for (const url of urls) {
      let page = null;
      try {
        console.log(`Testing URL: ${url} on ${deviceType}`);
        page = await context.newPage();

        const navigationSuccess = await navigateWithRetry(page, url);
        if (!navigationSuccess) {
          console.log(`Skipping ${url} due to navigation failure`);
          continue;
        }

        // Take screenshot with retry mechanism
        const [domainSlug, pageName] = createFileNameFromUrl(url);
        const fileName = `${domainSlug}-${pageName}-${browserName}-${deviceType}-${viewport.width}x${viewport.height}.png`;
        const currentPath = path.join(currentDir, browserName, fileName);

        await takeScreenshotWithRetry(page, currentPath);

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
      } finally {
        if (page) {
          await page.close().catch(() => {});
        }
      }
    }

    await context.close().catch(() => {});
  });
}

test.afterAll(async () => {
  try {
    const { ReportGenerator } = require(path.join(
      process.cwd(),
      "generate-report.js"
    ));
    const reportGenerator = new ReportGenerator(env);
    await reportGenerator.generate();
    console.log("📊 Visual regression report generated");
  } catch (error) {
    console.error("Error generating report:", error);
  }
});
