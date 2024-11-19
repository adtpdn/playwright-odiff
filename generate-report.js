// generate-report.js
const fs = require("fs");
const path = require("path");

function generateReport() {
  console.log("Starting report generation...");

  const screenshotsDir = path.join(process.cwd(), "screenshots");
  const publicDir = path.join(process.cwd(), "public");

  // Create public directory if it doesn't exist
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir);
  }

  const timestamps = fs
    .readdirSync(screenshotsDir)
    .filter((f) => f !== "baseline")
    .sort()
    .reverse();

  console.log("Found timestamp directories:", timestamps);

  if (timestamps.length === 0) {
    console.log("No screenshots found to generate report");
    return;
  }

  const latestDir = timestamps[0];
  const baselineDir = path.join(screenshotsDir, "baseline");
  const currentDir = path.join(screenshotsDir, latestDir);

  function parseScreenshotName(filename) {
    const parts = filename.replace(".png", "").split("-");
    const resolution = parts.pop();
    const device = parts.pop();
    const browserRaw = parts.pop();
    const page = parts.pop();
    const domain = parts.join("-");

    // Map browser names to proper display names
    const browserMap = {
      chromium: "Chrome",
      webkit: "Safari",
      firefox: "Firefox",
      chrome: "Chrome",
      mozilla: "Firefox",
    };

    const browser = browserMap[browserRaw] || browserRaw;

    const displayUrl =
      page === "home" ? `${domain}.com` : `${domain}.com/${page}`;

    return {
      url: displayUrl,
      browser,
      device,
      resolution,
      fullName: filename,
    };
  }

  const screenshots = fs
    .readdirSync(currentDir)
    .filter((f) => !f.startsWith("diff-"));

  console.log("Processing screenshots:", screenshots);

  const groupedByUrl = {};

  screenshots.forEach((screenshot) => {
    const metadata = parseScreenshotName(screenshot);
    if (!groupedByUrl[metadata.url]) {
      groupedByUrl[metadata.url] = {
        browsers: new Set(),
        devices: new Set(),
        screenshots: [],
      };
    }

    const diffFile = `diff-${screenshot}`;
    const hasDiff = fs.existsSync(path.join(currentDir, diffFile));

    groupedByUrl[metadata.url].browsers.add(metadata.browser);
    groupedByUrl[metadata.url].devices.add(metadata.device);
    groupedByUrl[metadata.url].screenshots.push({
      ...metadata,
      baseline: path.join("screenshots/baseline", screenshot),
      current: path.join(`screenshots/${latestDir}`, screenshot),
      diff: hasDiff ? path.join(`screenshots/${latestDir}`, diffFile) : null,
    });
  });

  const htmlTemplate = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Visual Regression Test Report</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <script src="https://unpkg.com/img-comparison-slider@7/dist/index.js"></script>
      <link rel="stylesheet" href="https://unpkg.com/img-comparison-slider@7/dist/styles.css">
      <style>
          .screenshot-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
              gap: 1.5rem;
          }
          .view-modes {
              display: flex;
              gap: 0.5rem;
              margin-bottom: 1rem;
          }
          .view-mode-btn {
              padding: 0.25rem 0.75rem;
              border-radius: 0.375rem;
              font-size: 0.875rem;
              cursor: pointer;
              transition: all 0.2s;
          }
          .view-mode-btn.active {
              background-color: #4f46e5;
              color: white;
          }
          .view-mode-btn:not(.active) {
              background-color: #e5e7eb;
              color: #374151;
          }
          .view-mode-btn:hover:not(.active) {
              background-color: #d1d5db;
          }
          .comparison-view, .diff-view {
              width: 100%;
          }
          .diff-view {
              display: none;
          }
          .view-diff .comparison-view {
              display: none;
          }
          .view-diff .diff-view {
              display: block;
          }
          .browser-section {
              margin-bottom: 1rem;
          }
          .browser-content {
              display: none;
          }
          .browser-content.active {
              display: block;
          }
      </style>
  </head>
  <body class="bg-gray-50">
      <div class="container mx-auto px-4 py-8 max-w-7xl">
          <h1 class="text-3xl font-bold text-gray-800 mb-8">Visual Regression Test Report</h1>
          <div class="space-y-6">
              ${Object.entries(groupedByUrl)
                .map(
                  ([url, data], urlIndex) => `
                  <div class="bg-white rounded-lg shadow-md overflow-hidden">
                      <button 
                          class="w-full px-6 py-4 text-left hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          onclick="toggleCollapse(${urlIndex})"
                      >
                          <div class="flex items-center justify-between">
                              <div>
                                  <h2 class="text-lg font-semibold text-gray-700">${url}</h2>
                                  <div class="mt-1 text-sm text-gray-500">
                                      ${Array.from(data.browsers).join(", ")} | 
                                      ${Array.from(data.devices).join(", ")}
                                  </div>
                              </div>
                              <svg class="w-5 h-5 text-gray-500 transform transition-transform duration-200" 
                                  id="arrow-${urlIndex}" 
                                  fill="none" 
                                  stroke="currentColor" 
                                  viewBox="0 0 24 24"
                              >
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                              </svg>
                          </div>
                      </button>
                      
                      <div class="hidden" id="collapse-${urlIndex}">
                          ${Array.from(data.browsers)
                            .map(
                              (browser, browserIndex) => `
                              <div class="browser-section border-t border-gray-200">
                                  <button 
                                      class="w-full px-6 py-3 text-left bg-gray-50 hover:bg-gray-100 focus:outline-none"
                                      onclick="toggleBrowser(${urlIndex}, ${browserIndex})"
                                  >
                                      <div class="flex items-center justify-between">
                                          <h3 class="text-md font-medium text-gray-700">${browser}</h3>
                                          <svg class="w-4 h-4 text-gray-500 transform transition-transform duration-200" 
                                              id="browser-arrow-${urlIndex}-${browserIndex}"
                                              fill="none" 
                                              stroke="currentColor" 
                                              viewBox="0 0 24 24"
                                          >
                                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                                          </svg>
                                      </div>
                                  </button>
                                  <div class="browser-content" id="browser-content-${urlIndex}-${browserIndex}">
                                      ${Array.from(data.devices)
                                        .map(
                                          (device) => `
                                          <div class="px-6 py-4">
                                              <h4 class="text-sm font-medium text-gray-600 mb-4">${device}</h4>
                                              ${data.screenshots
                                                .filter(
                                                  (s) =>
                                                    s.device === device &&
                                                    s.browser === browser
                                                )
                                                .map(
                                                  (
                                                    screenshot,
                                                    screenshotIndex
                                                  ) => `
                                                      <div class="space-y-2 mb-8">
                                                          <div class="flex justify-between items-center">
                                                              <div class="text-sm font-medium text-gray-600">
                                                                  ${
                                                                    screenshot.resolution
                                                                  }
                                                              </div>
                                                              <div class="view-modes">
                                                                  <button class="view-mode-btn active" 
                                                                          onclick="switchView(${urlIndex}, ${browserIndex}, ${screenshotIndex}, 'comparison')">
                                                                      Slider
                                                                  </button>
                                                                  ${
                                                                    screenshot.diff
                                                                      ? `
                                                                      <button class="view-mode-btn" 
                                                                              onclick="switchView(${urlIndex}, ${browserIndex}, ${screenshotIndex}, 'diff')">
                                                                          Diff
                                                                      </button>
                                                                  `
                                                                      : ""
                                                                  }
                                                              </div>
                                                          </div>
                                                          <div class="comparison-container" id="container-${urlIndex}-${browserIndex}-${screenshotIndex}">
                                                              <div class="comparison-view">
                                                                  <img-comparison-slider class="rounded-lg shadow-sm">
                                                                      <img slot="first" src="${
                                                                        screenshot.baseline
                                                                      }" alt="Baseline" loading="lazy">
                                                                      <img slot="second" src="${
                                                                        screenshot.current
                                                                      }" alt="Current" loading="lazy">
                                                                  </img-comparison-slider>
                                                              </div>
                                                              ${
                                                                screenshot.diff
                                                                  ? `
                                                                  <div class="diff-view">
                                                                      <img src="${screenshot.diff}" alt="Diff" class="w-full rounded-lg shadow-sm" loading="lazy">
                                                                  </div>
                                                              `
                                                                  : ""
                                                              }
                                                          </div>
                                                      </div>
                                                  `
                                                )
                                                .join("")}
                                          </div>
                                      `
                                        )
                                        .join("")}
                                  </div>
                              </div>
                          `
                            )
                            .join("")}
                      </div>
                  </div>
              `
                )
                .join("")}
          </div>
      </div>

      <script>
          function toggleCollapse(index) {
              const content = document.getElementById('collapse-' + index);
              const arrow = document.getElementById('arrow-' + index);
              
              if (content.classList.contains('hidden')) {
                  content.classList.remove('hidden');
                  arrow.style.transform = 'rotate(180deg)';
              } else {
                  content.classList.add('hidden');
                  arrow.style.transform = 'rotate(0deg)';
              }
          }

          function toggleBrowser(urlIndex, browserIndex) {
              const content = document.getElementById('browser-content-' + urlIndex + '-' + browserIndex);
              const arrow = document.getElementById('browser-arrow-' + urlIndex + '-' + browserIndex);
              
              if (content.classList.contains('active')) {
                  content.classList.remove('active');
                  arrow.style.transform = 'rotate(0deg)';
              } else {
                  content.classList.add('active');
                  arrow.style.transform = 'rotate(180deg)';
              }
          }

          function switchView(urlIndex, browserIndex, screenshotIndex, mode) {
              const container = document.getElementById('container-' + urlIndex + '-' + browserIndex + '-' + screenshotIndex);
              if (!container) return;

              const parentElement = container.closest('.space-y-2');
              if (!parentElement) return;

              const buttons = parentElement.querySelectorAll('.view-mode-btn');
              
              buttons.forEach(btn => {
                  btn.classList.remove('active');
                  if (
                      (mode === 'comparison' && btn.textContent.trim() === 'Slider') ||
                      (mode === 'diff' && btn.textContent.trim() === 'Diff')
                  ) {
                      btn.classList.add('active');
                  }
              });

              if (mode === 'diff') {
                  container.classList.add('view-diff');
              } else {
                  container.classList.remove('view-diff');
              }
          }
      </script>
  </body>
  </html>
  `;

  fs.writeFileSync(path.join(publicDir, "index.html"), htmlTemplate);

  fs.cpSync(screenshotsDir, path.join(publicDir, "screenshots"), {
    recursive: true,
  });

  console.log("Report generated successfully!");
}

module.exports = { generateReport };
