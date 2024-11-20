import { PlaywrightTestConfig } from "@playwright/test";
import { devices } from "./config/devices";

const config: PlaywrightTestConfig = {
  testDir: "./tests",
  timeout: 5 * 60 * 1000, // 5 minutes
  expect: {
    timeout: 30000,
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "dot" : "list",
  use: {
    actionTimeout: 30000,
    navigationTimeout: 90000,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["desktop"],
        browserName: "chromium",
        launchOptions: {
          args: [
            "--disable-dev-shm-usage",
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-gpu",
            "--headless=new",
          ],
        },
      },
    },
    {
      name: "firefox",
      use: {
        ...devices["desktop"],
        browserName: "firefox",
        launchOptions: {
          firefoxUserPrefs: {
            "browser.cache.disk.enable": false,
            "browser.cache.memory.enable": false,
          },
        },
      },
    },
    {
      name: "webkit",
      use: {
        ...devices["desktop"],
        browserName: "webkit",
      },
    },
  ],
  maxFailures: 10, // Stop after 10 failures
  reportSlowTests: {
    max: 5,
    threshold: 60000,
  },
  globalSetup: require.resolve("./global-setup"),
  globalTeardown: require.resolve("./global-teardown"),
};

export default config;
