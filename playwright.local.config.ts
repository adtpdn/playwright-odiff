// playwright.local.config.ts
import { PlaywrightTestConfig } from "@playwright/test";
import { devices, browsers, timeouts, browserConfigs } from "./config/devices";

const config: PlaywrightTestConfig = {
  testDir: "./tests",
  timeout: 180000, // 3 minutes per test
  globalTimeout: 7200000, // 2 hours total
  outputDir: "./test-results",
  workers: 3, // Optimal for local testing
  use: {
    ignoreHTTPSErrors: true,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure",
    actionTimeout: timeouts.local.page,
    navigationTimeout: timeouts.local.navigation,
  },
  expect: {
    timeout: timeouts.local.page,
  },
  retries: 1,
  reporter: [["html", { outputFolder: "playwright-report" }], ["list"]],
  preserveOutput: "failures-only",
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
