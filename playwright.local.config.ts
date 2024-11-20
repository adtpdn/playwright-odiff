// playwright.local.config.ts
import { PlaywrightTestConfig } from "@playwright/test";
import { devices, browsers, timeouts, browserConfigs } from "./config/devices";

const config: PlaywrightTestConfig = {
  testDir: "./tests",
  timeout: 180000, // 3 minutes per test
  globalTimeout: 7200000, // 2 hours total
  outputDir: "./test-results/local",
  workers: 3, // Reduce from default to improve stability
  use: {
    ignoreHTTPSErrors: true,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure",
    actionTimeout: 60000,
    navigationTimeout: 120000,
    viewport: devices.desktop, // Default viewport
  },
  expect: {
    timeout: 30000,
  },
  retries: 2, // Increase retries
  reporter: [["html", { outputFolder: "playwright-report/local" }], ["list"]],
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
