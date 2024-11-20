// config/devices.ts

// Device configurations
export const devices = {
  desktop: { width: 1280, height: 720 },
  tablet: { width: 768, height: 1024 },
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
  tablet: {
    width: 768,
    height: 1024,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  },
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
    defaultTimeout: 60000,
    navigationTimeout: 60000,
    viewport: devices.desktop,
  },
  firefox: {
    defaultTimeout: 60000,
    navigationTimeout: 60000,
    viewport: devices.desktop,
  },
  webkit: {
    defaultTimeout: 60000,
    navigationTimeout: 60000,
    viewport: devices.desktop,
  },
} as const;

// Environment-specific timeouts
export const timeouts = {
  local: {
    navigation: 60000,
    page: 100000,
    networkIdle: 10000,
    render: 10000,
  },
  ci: {
    navigation: 60000,
    page: 100000,
    networkIdle: 10000,
    render: 10000,
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
