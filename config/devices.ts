// config/devices.ts

// Device configurations
export const devices = {
  desktop: { width: 1280, height: 720 },
  // tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 667 },
} as const;

// Browser configurations
export const browsers = ["chromium", "firefox", "webkit"] as const;

// Device-specific viewport settings
export const viewports = {
  desktop: {
    width: 1280,
    height: 720,
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
  },
  // tablet: {
  //   width: 768,
  //   height: 1024,
  //   deviceScaleFactor: 2,
  //   isMobile: true,
  //   hasTouch: true,
  // },
  mobile: {
    width: 375,
    height: 667,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  },
} as const;

// Browser-specific configurations
export const browserConfigs = {
  chromium: {
    defaultTimeout: 60000, // 60 seconds
    navigationTimeout: 90000, // 90 seconds
    viewport: devices.desktop,
    launchOptions: {
      args: [
        "--disable-dev-shm-usage",
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-gpu",
        "--disable-software-rasterizer",
      ],
    },
  },
  firefox: {
    defaultTimeout: 60000,
    navigationTimeout: 90000,
    viewport: devices.desktop,
    launchOptions: {
      firefoxUserPrefs: {
        "browser.cache.disk.enable": false,
        "browser.cache.memory.enable": false,
        "browser.cache.offline.enable": false,
        "network.http.use-cache": false,
      },
    },
  },
  webkit: {
    defaultTimeout: 60000,
    navigationTimeout: 90000,
    viewport: devices.desktop,
    launchOptions: {
      args: ["--no-startup-window"],
    },
  },
} as const;

// Environment-specific timeouts
export const timeouts = {
  local: {
    navigation: 90000, // 90 seconds
    page: 60000, // 60 seconds
    networkIdle: 30000, // 30 seconds
    render: 30000, // 30 seconds
    action: 30000, // 30 seconds
    test: 300000, // 5 minutes
    launch: 60000, // 60 seconds
    context: 30000, // 30 seconds
  },
  ci: {
    navigation: 90000, // 90 seconds
    page: 60000, // 60 seconds
    networkIdle: 30000, // 30 seconds
    render: 30000, // 30 seconds
    action: 30000, // 30 seconds
    test: 300000, // 5 minutes
    launch: 60000, // 60 seconds
    context: 30000, // 30 seconds
    retryDelay: 5000, // 5 seconds
    globalTimeout: 5400000, // 90 minutes
  },
} as const;

// Types
export type DeviceType = keyof typeof devices;
export type BrowserType = (typeof browsers)[number];
export type ViewportType = keyof typeof viewports;
export type EnvironmentType = keyof typeof timeouts;

// Helper functions
export function getDeviceConfig(deviceType: DeviceType) {
  return devices[deviceType];
}

export function getBrowserConfig(browserType: BrowserType) {
  return browserConfigs[browserType];
}

export function getTimeouts(env: EnvironmentType) {
  return timeouts[env];
}

export function getViewport(deviceType: DeviceType) {
  return viewports[deviceType];
}

// Retry strategy configuration
export const retryStrategy = {
  maxRetries: 3,
  backoffMultiplier: 1.5,
  initialDelay: 5000,
} as const;

// Performance thresholds
export const performanceThresholds = {
  slowTestThreshold: 60000, // 60 seconds
  maxTestDuration: 300000, // 5 minutes
  maxSetupTime: 30000, // 30 seconds
} as const;

// Resource management
export const resourceLimits = {
  maxMemoryMB: 4096, // 4GB
  maxCPUPercentage: 80, // 80%
  maxConcurrentConnections: 10,
} as const;

// Default exports
export default {
  devices,
  browsers,
  viewports,
  browserConfigs,
  timeouts,
  retryStrategy,
  performanceThresholds,
  resourceLimits,
  getDeviceConfig,
  getBrowserConfig,
  getTimeouts,
  getViewport,
};
