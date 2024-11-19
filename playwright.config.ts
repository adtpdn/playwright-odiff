// playwright.config.ts
import { PlaywrightTestConfig } from "@playwright/test";

// Shared configuration that can be used across all files
export const devices = {
  desktop: { width: 1280, height: 720 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 667 },
} as const;

export const browsers = ["chromium", "firefox", "webkit"] as const;

const config: PlaywrightTestConfig = {
  testDir: "./tests",
  timeout: 600000,
  use: {
    ignoreHTTPSErrors: true,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    // Desktop Projects
    {
      name: "Desktop Chrome",
      use: {
        browserName: "chromium",
        viewport: devices.desktop,
      },
    },
    {
      name: "Desktop Firefox",
      use: {
        browserName: "firefox",
        viewport: devices.desktop,
      },
    },
    {
      name: "Desktop Safari",
      use: {
        browserName: "webkit",
        viewport: devices.desktop,
      },
    },
    // Tablet Projects
    {
      name: "Tablet Chrome",
      use: {
        browserName: "chromium",
        viewport: devices.tablet,
      },
    },
    {
      name: "Tablet Firefox",
      use: {
        browserName: "firefox",
        viewport: devices.tablet,
      },
    },
    {
      name: "Tablet Safari",
      use: {
        browserName: "webkit",
        viewport: devices.tablet,
      },
    },
    // Mobile Projects
    {
      name: "Mobile Chrome",
      use: {
        browserName: "chromium",
        viewport: devices.mobile,
      },
    },
    {
      name: "Mobile Firefox",
      use: {
        browserName: "firefox",
        viewport: devices.mobile,
      },
    },
    {
      name: "Mobile Safari",
      use: {
        browserName: "webkit",
        viewport: devices.mobile,
      },
    },
  ],
};

export default config;
