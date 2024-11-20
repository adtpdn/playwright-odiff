// playwright.ci.config.ts
import { PlaywrightTestConfig } from "@playwright/test";
import { devices, browsers, timeouts, browserConfigs } from "./config/devices";

const config: PlaywrightTestConfig = {
  testDir: "./tests",
  timeout: timeouts.ci.navigation,
  globalTimeout: 1800000, // 30 minutes total
  outputDir: "./test-results/ci",
  workers: 1, // Limited for CI
  use: {
    ignoreHTTPSErrors: true,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure",
    actionTimeout: timeouts.ci.page,
    navigationTimeout: timeouts.ci.navigation,
  },
  expect: {
    timeout: timeouts.ci.page,
  },
  retries: 2, // More retries for CI
  reporter: [
    ["html", { outputFolder: "playwright-report/ci" }],
    ["list"],
    ["github"],
  ],
  preserveOutput: "failures-only",
  forbidOnly: true, // Fail if test.only is present
  maxFailures: 10, // Stop after 10 failures
  projects: [
    // Desktop Projects
    {
      name: "Desktop Chrome",
      use: {
        browserName: "chromium",
        viewport: devices.desktop,
        ...browserConfigs.chromium,
      },
    },
    {
      name: "Desktop Firefox",
      use: {
        browserName: "firefox",
        viewport: devices.desktop,
        ...browserConfigs.firefox,
      },
    },
    {
      name: "Desktop Safari",
      use: {
        browserName: "webkit",
        viewport: devices.desktop,
        ...browserConfigs.webkit,
      },
    },
    // Tablet Projects
    {
      name: "Tablet Chrome",
      use: {
        browserName: "chromium",
        viewport: devices.tablet,
        ...browserConfigs.chromium,
      },
    },
    {
      name: "Tablet Firefox",
      use: {
        browserName: "firefox",
        viewport: devices.tablet,
        ...browserConfigs.firefox,
      },
    },
    {
      name: "Tablet Safari",
      use: {
        browserName: "webkit",
        viewport: devices.tablet,
        ...browserConfigs.webkit,
      },
    },
    // Mobile Projects
    {
      name: "Mobile Chrome",
      use: {
        browserName: "chromium",
        viewport: devices.mobile,
        ...browserConfigs.chromium,
      },
    },
    {
      name: "Mobile Firefox",
      use: {
        browserName: "firefox",
        viewport: devices.mobile,
        ...browserConfigs.firefox,
      },
    },
    {
      name: "Mobile Safari",
      use: {
        browserName: "webkit",
        viewport: devices.mobile,
        ...browserConfigs.webkit,
      },
    },
  ],
};

export default config;
