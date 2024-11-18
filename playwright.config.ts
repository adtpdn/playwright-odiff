import { PlaywrightTestConfig } from "@playwright/test";

const config: PlaywrightTestConfig = {
  testDir: "./tests",
  timeout: 60000,
  use: {
    screenshot: "on",
  },
  projects: [
    {
      name: "Desktop Chrome",
      use: {
        browserName: "chromium",
        viewport: { width: 1920, height: 1080 },
      },
    },
    {
      name: "Desktop Firefox",
      use: {
        browserName: "firefox",
        viewport: { width: 1920, height: 1080 },
      },
    },
    {
      name: "Desktop Safari",
      use: {
        browserName: "webkit",
        viewport: { width: 1920, height: 1080 },
      },
    },
    {
      name: "Tablet Chrome",
      use: {
        browserName: "chromium",
        viewport: { width: 768, height: 1024 },
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
      name: "Mobile Chrome",
      use: {
        browserName: "chromium",
        viewport: { width: 375, height: 812 },
      },
    },
    {
      name: "Mobile Firefox",
      use: {
        browserName: "firefox",
        viewport: { width: 375, height: 812 },
      },
    },
    {
      name: "Mobile Safari",
      use: {
        browserName: "webkit",
        viewport: { width: 375, height: 812 },
      },
    },
  ],
};

export default config;
