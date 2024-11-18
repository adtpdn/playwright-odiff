import { PlaywrightTestConfig } from "@playwright/test";

const config: PlaywrightTestConfig = {
  testDir: "./tests",
  timeout: 30000,
  use: {
    ignoreHTTPSErrors: true, // Add this line
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "Desktop Chrome",
      use: {
        browserName: "chromium",
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: "Desktop Firefox",
      use: {
        browserName: "firefox",
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: "Desktop Safari",
      use: {
        browserName: "webkit",
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: "Tablet Firefox",
      use: {
        browserName: "firefox",
        viewport: { width: 768, height: 1024 },
      },
    },
    {
      name: "Tablet Safari",
      use: {
        browserName: "webkit",
        viewport: { width: 768, height: 1024 },
      },
    },
    {
      name: "Mobile Firefox",
      use: {
        browserName: "firefox",
        viewport: { width: 375, height: 667 },
      },
    },
    {
      name: "Mobile Safari",
      use: {
        browserName: "webkit",
        viewport: { width: 375, height: 667 },
      },
    },
  ],
};

export default config;
