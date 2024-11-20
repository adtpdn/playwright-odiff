// screenshot.spec.ts
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

// Get URLs from environment variable or use default group
const urls = process.env.TEST_URLS
  ? JSON.parse(process.env.TEST_URLS)
  : urlGroups["adenenergies-main"];

const CONTEXT_OPTIONS = {
  viewport: null, // Will be set per device
  bypassCSP: true,
  ignoreHTTPSErrors: true,
  serviceWorkers: "block",
  extraHTTPHeaders: {
    "Accept-Language": "en-US,en;q=0.9",
  },
  userAgent: "playwright-testing",
};

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
    if (!page.isClosed()) {
      await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: NAVIGATION_TIMEOUT,
        ignoreHTTPSErrors: true,
      });

      if (!page.isClosed()) {
        try {
          await page.waitForLoadState("load", { timeout: PAGE_TIMEOUT });
        } catch (error) {
          console.log(`Load state timeout for ${url}, continuing anyway`);
        }

        if (!page.isClosed()) {
          try {
            await page.waitForLoadState("networkidle", {
              timeout: NETWORK_IDLE_TIMEOUT,
            });
          } catch (error) {
            console.log(
              `Network not completely idle for ${url}, continuing anyway`
            );
          }
        }
      }

      return true;
    }
    return false;
  } catch (error) {
    if (retryCount < MAX_RETRIES && !page.isClosed()) {
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

// Create a test for each device type
for (const [deviceType, viewport] of Object.entries(devices)) {
  test(`Screenshot comparison for ${deviceType}`, async ({ browser }) => {
    const browserName = browser.browserType().name();
    let context;
    let page;

    try {
      // Create context with merged options
      context = await browser.newContext({
        ...CONTEXT_OPTIONS,
        viewport,
        deviceScaleFactor: deviceType === "desktop" ? 1 : 2,
        userAgent: `playwright-testing-${deviceType}`,
      });

      // Pre-create page to avoid context switching issues
      page = await context.newPage();
      await page.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT);
      await page.setDefaultTimeout(PAGE_TIMEOUT);

      for (const url of urls) {
        console.log(`Testing URL: ${url} on ${deviceType}`);

        try {
          // Clear memory and cache between URLs
          await page.evaluate(() => {
            window.performance?.memory &&
              console.log("Memory:", window.performance.memory);
            if (window.gc) window.gc();
          });

          const navigationSuccess = await navigateWithRetry(page, url);
          if (!navigationSuccess) continue;

          // Wait for network and animations to settle
          await Promise.race([
            Promise.all([
              page
                .waitForLoadState("networkidle", {
                  timeout: NETWORK_IDLE_TIMEOUT,
                })
                .catch(() => {}),
              page
                .waitForLoadState("domcontentloaded", { timeout: PAGE_TIMEOUT })
                .catch(() => {}),
            ]),
            page.waitForTimeout(RENDER_TIMEOUT),
          ]);

          // Take and compare screenshots
          const [domainSlug, pageName] = createFileNameFromUrl(url);
          const fileName = `${domainSlug}-${pageName}-${browserName}-${deviceType}-${viewport.width}x${viewport.height}.png`;

          if (!page.isClosed()) {
            const currentPath = path.join(currentDir, browserName, fileName);
            await page.screenshot({
              path: currentPath,
              fullPage: true,
              timeout: PAGE_TIMEOUT * 2,
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
                  `${imagesAreSame ? "⛓️ " : "🚧 "} ${fileName}: ${
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
          }
        } catch (error) {
          console.error(`Error processing ${url} for ${deviceType}:`, error);
          // Don't exit, continue with next URL
        }
      }
    } finally {
      if (page && !page.isClosed()) await page.close().catch(() => {});
      if (context) await context.close().catch(() => {});
    }
  });
}

test.afterAll(async () => {
  try {
    const ReportGenerator = require("../generate-report").ReportGenerator;
    const reportGenerator = new ReportGenerator();
    reportGenerator.generate();
    console.log("📊 Visual regression report generated");
  } catch (error) {
    console.error("Error generating report:", error);
  }
});
