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
  timeout: 30000,
  use: {
    ignoreHTTPSErrors: true,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    // Desktop Projects
    ...browsers.map((browser) => ({
      name: `Desktop ${browser}`,
      use: {
        browserName: browser,
        viewport: devices.desktop,
      },
    })),

    // Tablet Projects (excluding Chromium as per original config)
    ...browsers
      .filter((b) => b !== "chromium")
      .map((browser) => ({
        name: `Tablet ${browser}`,
        use: {
          browserName: browser,
          viewport: devices.tablet,
        },
      })),

    // Mobile Projects (excluding Chromium as per original config)
    ...browsers
      .filter((b) => b !== "chromium")
      .map((browser) => ({
        name: `Mobile ${browser}`,
        use: {
          browserName: browser,
          viewport: devices.mobile,
        },
      })),
  ],
};

export default config;
