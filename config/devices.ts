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
    defaultTimeout: 90000,
    navigationTimeout: 90000,
    viewport: devices.desktop,
  },
  firefox: {
    defaultTimeout: 90000,
    navigationTimeout: 90000,
    viewport: devices.desktop,
  },
  webkit: {
    defaultTimeout: 90000,
    navigationTimeout: 90000,
    viewport: devices.desktop,
  },
} as const;

// Environment-specific timeouts
export const timeouts = {
  local: {
    navigation: 90000,
    page: 100000,
    networkIdle: 60000,
    render: 60000,
  },
  ci: {
    navigation: 100000,
    page: 100000,
    networkIdle: 100000,
    render: 100000,
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

// Default exports
export default {
  devices,
  browsers,
  viewports,
  browserConfigs,
  timeouts,
  getDeviceConfig,
  getBrowserConfig,
  getTimeouts,
  getViewport,
};
