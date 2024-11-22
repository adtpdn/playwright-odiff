// generate-report.js
const fs = require("fs");
const path = require("path");

class ReportGenerator {
  constructor(env = "ci") {
    this.env = env;
    this.publicDir = path.join(process.cwd(), "public");
    this.reportsDir = path.join(this.publicDir, "reports");
    this.historyDir = path.join(this.publicDir, "history");
    this.screenshotsDir = path.join(process.cwd(), "screenshots");
    this.currentDir = path.join(this.screenshotsDir, this.env);
    this.baselineDir = path.join(this.screenshotsDir, "baseline");
    this.artifactsDir = path.join(process.cwd(), "artifacts");
    this.historyDataPath = path.join(this.historyDir, "history.json");
    this.reportDataPath = path.join(this.publicDir, "report-data.json");
    this.browsers = ["chromium", "firefox", "webkit"];
  }

  initialize() {
    [
      this.publicDir,
      this.reportsDir,
      this.historyDir,
      path.join(this.publicDir, "screenshots"),
    ].forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  loadHistoricalData() {
    if (fs.existsSync(this.historyDataPath)) {
      return JSON.parse(fs.readFileSync(this.historyDataPath, "utf8"));
    }
    return [];
  }

  saveHistoricalData(historicalData) {
    fs.writeFileSync(
      this.historyDataPath,
      JSON.stringify(historicalData, null, 2)
    );
  }

  findScreenshotsDir() {
    const possiblePaths = [
      this.currentDir,
      path.join(this.artifactsDir, "screenshots", this.env),
      path.join(process.cwd(), "downloaded-artifacts", "screenshots", this.env),
    ];

    for (const dir of possiblePaths) {
      if (fs.existsSync(dir)) {
        console.log(`Found screenshots directory at: ${dir}`);
        return dir;
      }
    }

    console.log(
      "No screenshots directory found in these locations:",
      possiblePaths
    );
    return null;
  }

  parseScreenshotName(filename) {
    const parts = filename.replace(".png", "").split("-");
    const resolution = parts.pop();
    const device = parts.pop();
    const browserRaw = parts[parts.length - 1].toLowerCase();

    const browserMap = {
      chromium: "Chrome",
      webkit: "Safari",
      firefox: "Firefox",
      chrome: "Chrome",
      mozilla: "Firefox",
      safari: "Safari",
    };

    const browser = browserMap[browserRaw] || browserRaw;
    const pageName = parts[1];
    const domain = parts[0];
    const displayUrl =
      pageName === "home" ? `${domain}` : `${domain}/${pageName}`;

    return {
      url: displayUrl,
      browser,
      device,
      resolution,
      fullName: filename,
      timestamp: new Date().toISOString(),
    };
  }

  processScreenshots() {
    const screenshots = [];
    const screenshotsDir = this.findScreenshotsDir();

    if (!screenshotsDir) {
      console.log("No screenshots directory found");
      return {};
    }

    this.browsers.forEach((browser) => {
      const browserDir = path.join(screenshotsDir, browser);
      if (fs.existsSync(browserDir)) {
        console.log(`Processing browser directory: ${browserDir}`);
        const browserScreenshots = fs
          .readdirSync(browserDir)
          .filter((f) => !f.startsWith("diff-"))
          .map((filename) => ({
            filename,
            browser,
            path: path.join(browser, filename),
          }));
        screenshots.push(...browserScreenshots);
        console.log(
          `Found ${browserScreenshots.length} screenshots for ${browser}`
        );
      }
    });

    const groupedByUrl = {};

    screenshots.forEach(({ filename, browser, path: screenshotPath }) => {
      const metadata = this.parseScreenshotName(filename);

      if (!groupedByUrl[metadata.url]) {
        groupedByUrl[metadata.url] = {
          browsers: new Set(),
          devices: new Set(),
          screenshots: [],
          lastUpdated: metadata.timestamp,
        };
      }

      groupedByUrl[metadata.url].browsers.add(metadata.browser);
      groupedByUrl[metadata.url].devices.add(metadata.device);
      groupedByUrl[metadata.url].screenshots.push({
        ...metadata,
        baseline: path.join("screenshots/baseline", browser, filename),
        current: path.join(`screenshots/${this.env}`, browser, filename),
        diff: fs.existsSync(
          path.join(screenshotsDir, browser, `diff-${filename}`)
        )
          ? path.join(`screenshots/${this.env}`, browser, `diff-${filename}`)
          : null,
      });
    });

    return groupedByUrl;
  }

  archiveCurrentRun(data) {
    const timestamp = new Date().toISOString();
    const runId = timestamp.replace(/[:.]/g, "-");

    // Create directory for this run
    const runDir = path.join(this.historyDir, runId);
    fs.mkdirSync(runDir, { recursive: true });

    // Copy screenshots to historical directory
    const screenshotsDir = this.findScreenshotsDir();
    if (screenshotsDir) {
      fs.cpSync(screenshotsDir, path.join(runDir, "screenshots"), {
        recursive: true,
        force: true,
      });
    }

    return {
      runId,
      timestamp,
      data,
      totalUrls: Object.keys(data).length,
      totalScreenshots: Object.values(data).reduce(
        (acc, curr) => acc + curr.screenshots.length,
        0
      ),
      browsers: [
        ...new Set(Object.values(data).flatMap((item) => [...item.browsers])),
      ],
      devices: [
        ...new Set(Object.values(data).flatMap((item) => [...item.devices])),
      ],
    };
  }

  generateHTML(currentData) {
    const historicalData = this.loadHistoricalData();
    const currentRun = this.archiveCurrentRun(currentData);

    // Add current run to historical data
    historicalData.unshift(currentRun);

    // Keep only last 30 runs
    const maxHistory = 30;
    if (historicalData.length > maxHistory) {
      historicalData.slice(maxHistory).forEach((run) => {
        const oldRunDir = path.join(this.historyDir, run.runId);
        if (fs.existsSync(oldRunDir)) {
          fs.rmSync(oldRunDir, { recursive: true, force: true });
        }
      });
      historicalData.length = maxHistory;
    }

    this.saveHistoricalData(historicalData);

    const htmlTemplate = `<!DOCTYPE html>
    <html lang="en" class="dark">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Visual Regression Test Report</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css">
        <script src="https://unpkg.com/img-comparison-slider@7/dist/index.js"></script>
        <link rel="stylesheet" href="https://unpkg.com/img-comparison-slider@7/dist/styles.css">
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        * {
            font-family: 'JetBrains Mono', monospace;
        }
        body {
            font-family: 'JetBrains Mono', monospace;
            background-color: #111827;
            color: #f3f4f6;
            padding-top: 80px;
        }
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
            background-color: #4b5563;
            color: #f3f4f6;
        }
        .view-mode-btn.active {
            background-color: #4f46e5;
            color: white;
        }
        .view-mode-btn:hover:not(.active) {
            background-color: #6b7280;
            opacity: 0.9;
        }
        .comparison-view, .diff-view {
            width: 100%;
        }
        .comparison-view {
            display: flex;
            justify-content: center;
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
            border-color: #374151;
        }
        .browser-content {
            display: none;
        }
        .browser-content.active {
            display: block;
        }
        .viewport-section {
            border-top: 1px solid #374151;
        }
        .viewport-content {
            display: none;
            padding: 1rem;
            background-color: #1f2937;
        }
        .viewport-content.active {
            display: block;
        }
        #goToTopBtn {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background-color: #6366f1;
            color: white;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.3s;
            opacity: 0;
            z-index: 1000;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        #goToTopBtn.visible {
            opacity: 1;
        }
        #goToTopBtn:hover {
            background-color: #4f46e5;
            transform: translateY(-2px);
        }
        .browser-icon {
            margin-right: 8px;
            font-size: 1.2em;
            color: #e5e7eb;
        }
        .device-icon {
            margin-right: 8px;
            font-size: 1.1em;
            color: #e5e7eb;
        }
        .hover-transform {
            transition: transform 0.2s;
        }
        .hover-transform:hover {
            transform: translateY(-1px);
        }
        button {
            transition: all 0.2s;
        }
        button:hover {
            opacity: 0.9;
        }
        .search-bar {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            z-index: 50;
            background-color: #1f2937;
            padding: 1rem;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        .search-input {
            width: 100%;
            max-width: 800px;
            margin: 0 auto;
            display: block;
            padding: 0.75rem 1rem;
            border-radius: 0.5rem;
            background-color: #374151;
            color: #f3f4f6;
            border: 1px solid #4b5563;
        }
        .search-input:focus {
            outline: none;
            border-color: #6366f1;
            box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
        }
        .lazy-image {
            opacity: 0;
            transition: opacity 0.3s ease-in-out;
        }
        .lazy-image.loaded {
            opacity: 1;
        }
        .timestamp {
            font-size: 0.8rem;
            color: #9ca3af;
        }
        .history-section {
            margin-bottom: 2rem;
            border-radius: 0.5rem;
            overflow: hidden;
        }
        .history-header {
            background-color: #374151;
            padding: 1rem;
            cursor: pointer;
            transition: background-color 0.2s;
        }
        .history-header:hover {
            background-color: #4B5563;
        }
        .history-content {
            display: none;
            background-color: #1F2937;
            border-top: 1px solid #4B5563;
        }
        .history-content.active {
            display: block;
        }
        .run-stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
            padding: 1rem;
            background-color: #111827;
            border-radius: 0.5rem;
            margin-bottom: 1rem;
        }
        .stat-item {
            padding: 1rem;
            background-color: #374151;
            border-radius: 0.5rem;
            text-align: center;
        }
        .stat-value {
            font-size: 1.5rem;
            font-weight: bold;
            color: #6366F1;
        }
        .stat-label {
            font-size: 0.875rem;
            color: #9CA3AF;
        }
        .hidden {
            display: none;
        }
    </style>
    </head>
<body>
    <div class="search-bar">
        <input 
            type="search" 
            id="urlSearch" 
            placeholder="Search URLs..."
            class="search-input"
        >
    </div>

    <div class="container mx-auto px-4 py-8 max-w-7xl">
        <h1 class="text-3xl font-bold text-gray-100 mb-8">Visual Regression Test History</h1>
        
        <div class="mb-8 flex space-x-4">
            <select id="historyFilter" class="bg-gray-700 text-white px-4 py-2 rounded-lg">
                <option value="all">All Results</option>
                <option value="latest">Latest Run Only</option>
                <option value="last7">Last 7 Days</option>
                <option value="last30">Last 30 Days</option>
            </select>

            <button id="expandAllBtn" class="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">
                Expand All
            </button>
        </div>

        <div class="space-y-6">
            ${historicalData
              .map(
                (run, runIndex) => `
                <div class="history-section" data-timestamp="${run.timestamp}">
                    <div class="history-header" onclick="toggleHistory(${runIndex})">
                        <div class="flex justify-between items-center">
                            <div>
                                <h2 class="text-lg font-semibold text-gray-100">
                                    Test Run #${
                                      historicalData.length - runIndex
                                    }
                                </h2>
                                <div class="text-sm text-gray-400">
                                    ${new Date(run.timestamp).toLocaleString()}
                                </div>
                            </div>
                            <svg class="w-6 h-6 text-gray-400 transform transition-transform duration-200 history-arrow" 
                                id="history-arrow-${runIndex}"
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                            >
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                            </svg>
                        </div>
                    </div>
                    
                    <div class="history-content p-4" id="history-content-${runIndex}">
                        <div class="run-stats">
                            <div class="stat-item">
                                <div class="stat-value">${run.totalUrls}</div>
                                <div class="stat-label">URLs Tested</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-value">${
                                  run.totalScreenshots
                                }</div>
                                <div class="stat-label">Screenshots</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-value">${
                                  run.browsers.length
                                }</div>
                                <div class="stat-label">Browsers</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-value">${
                                  run.devices.length
                                }</div>
                                <div class="stat-label">Devices</div>
                            </div>
                        </div>

                        ${Object.entries(run.data)
                          .sort(
                            ([, a], [, b]) =>
                              new Date(b.lastUpdated) - new Date(a.lastUpdated)
                          )
                          .map(
                            ([url, data], urlIndex) => `
                                <div class="url-container bg-gray-800 rounded-lg shadow-md overflow-hidden hover-transform mb-4" data-url="${url}">
                                    <button 
                                        class="w-full px-6 py-4 text-left hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                        onclick="toggleUrlContent(${runIndex}, ${urlIndex})"
                                    >
                                        <div class="flex items-center justify-between">
                                            <div>
                                                <h2 class="text-lg font-semibold text-gray-100 url-text">${url}</h2>
                                                <div class="mt-1 text-sm text-gray-300">
                                                    ${Array.from(
                                                      data.browsers
                                                    ).join(", ")} | 
                                                    ${Array.from(
                                                      data.devices
                                                    ).join(", ")}
                                                </div>
                                                <div class="timestamp mt-1">
                                                    Last updated: ${new Date(
                                                      data.lastUpdated
                                                    ).toLocaleString()}
                                                </div>
                                            </div>
                                            <svg class="w-5 h-5 text-gray-400 transform transition-transform duration-200 url-arrow" 
                                                id="url-arrow-${runIndex}-${urlIndex}" 
                                                fill="none" 
                                                stroke="currentColor" 
                                                viewBox="0 0 24 24"
                                            >
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                                            </svg>
                                        </div>
                                    </button>
                                    
                                    <div class="hidden url-content" id="url-content-${runIndex}-${urlIndex}">
                                        ${Array.from(data.browsers)
                                          .map(
                                            (browser, browserIndex) => `
                                                <div class="browser-section border-t border-gray-700">
                                                    <button 
                                                        class="w-full px-6 py-3 text-left bg-gray-900 hover:bg-gray-800 focus:outline-none transition-all"
                                                        onclick="toggleBrowser(${runIndex}, ${urlIndex}, ${browserIndex})"
                                                    >
                                                        <div class="flex items-center justify-between">
                                                            <div class="flex items-center">
                                                                <i class="browser-icon fa-brands fa-${browser.toLowerCase()}"></i>
                                                                <h3 class="text-md font-medium text-gray-300">${browser}</h3>
                                                            </div>
                                                            <svg class="w-4 h-4 text-gray-400 transform transition-transform duration-200" 
                                                                id="browser-arrow-${runIndex}-${urlIndex}-${browserIndex}"
                                                                fill="none" 
                                                                stroke="currentColor" 
                                                                viewBox="0 0 24 24"
                                                            >
                                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                                                            </svg>
                                                        </div>
                                                    </button>
                                                    <div class="browser-content" id="browser-content-${runIndex}-${urlIndex}-${browserIndex}">
                                                        ${Array.from(
                                                          data.devices
                                                        )
                                                          .map(
                                                            (
                                                              device,
                                                              deviceIndex
                                                            ) => `
                                                                <div class="viewport-section">
                                                                    <button 
                                                                        class="w-full px-6 py-3 text-left bg-gray-800 hover:bg-gray-700 focus:outline-none transition-all"
                                                                        onclick="toggleViewport(${runIndex}, ${urlIndex}, ${browserIndex}, ${deviceIndex})"
                                                                    >
                                                                        <div class="flex items-center justify-between">
                                                                            <div class="flex items-center">
                                                                                <i class="device-icon fa-solid ${
                                                                                  device ===
                                                                                  "desktop"
                                                                                    ? "fa-desktop"
                                                                                    : device ===
                                                                                      "tablet"
                                                                                    ? "fa-tablet-screen-button"
                                                                                    : "fa-mobile-screen"
                                                                                }"></i>
                                                                                <h4 class="text-sm font-medium text-gray-300">${device}</h4>
                                                                            </div>
                                                                            <svg class="w-4 h-4 text-gray-400 transform transition-transform duration-200" 
                                                                                id="viewport-arrow-${runIndex}-${urlIndex}-${browserIndex}-${deviceIndex}"
                                                                                fill="none" 
                                                                                stroke="currentColor" 
                                                                                viewBox="0 0 24 24"
                                                                            >
                                                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                                                                            </svg>
                                                                        </div>
                                                                    </button>
                                                                    <div class="viewport-content" id="viewport-content-${runIndex}-${urlIndex}-${browserIndex}-${deviceIndex}">
                                                                        ${data.screenshots
                                                                          .filter(
                                                                            (
                                                                              s
                                                                            ) =>
                                                                              s.device ===
                                                                                device &&
                                                                              s.browser ===
                                                                                browser
                                                                          )
                                                                          .map(
                                                                            (
                                                                              screenshot,
                                                                              screenshotIndex
                                                                            ) => `
                                                                                <div class="space-y-2 mb-8">
                                                                                    <div class="flex justify-between items-center">
                                                                                        <div class="text-sm font-medium text-gray-300">
                                                                                            ${
                                                                                              screenshot.resolution
                                                                                            }
                                                                                        </div>
                                                                                        <div class="view-modes">
                                                                                            <button class="view-mode-btn active" 
                                                                                                    onclick="switchView(${runIndex}, ${urlIndex}, ${browserIndex}, ${deviceIndex}, ${screenshotIndex}, 'comparison')">
                                                                                                Slider
                                                                                            </button>
                                                                                            ${
                                                                                              screenshot.diff
                                                                                                ? `
                                                                                                <button class="view-mode-btn" 
                                                                                                        onclick="switchView(${runIndex}, ${urlIndex}, ${browserIndex}, ${deviceIndex}, ${screenshotIndex}, 'diff')">
                                                                                                    Diff
                                                                                                </button>
                                                                                            `
                                                                                                : ""
                                                                                            }
                                                                                        </div>
                                                                                    </div>
                                                                                    <div class="comparison-container" id="container-${runIndex}-${urlIndex}-${browserIndex}-${deviceIndex}-${screenshotIndex}">
                                                                                        <div class="comparison-view">
                                                                                            <img-comparison-slider class="rounded-lg shadow-sm">
                                                                                                <img slot="first" data-src="${
                                                                                                  screenshot.baseline
                                                                                                }" alt="Baseline" class="lazy-image">
                                                                                                <img slot="second" data-src="${
                                                                                                  screenshot.current
                                                                                                }" alt="Current" class="lazy-image">
                                                                                            </img-comparison-slider>
                                                                                        </div>
                                                                                        ${
                                                                                          screenshot.diff
                                                                                            ? `
                                                                                            <div class="diff-view">
                                                                                                <img data-src="${screenshot.diff}" alt="Diff" class="w-full rounded-lg shadow-sm lazy-image">
                                                                                            </div>
                                                                                        `
                                                                                            : ""
                                                                                        }
                                                                                    </div>
                                                                                </div>
                                                                            `
                                                                          )
                                                                          .join(
                                                                            ""
                                                                          )}
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

    <button id="goToTopBtn" onclick="scrollToTop()" class="bg-indigo-600 hover:bg-indigo-700 hover-transform">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18"/>
        </svg>
    </button>

    <script>
        const urlSearch = document.getElementById('urlSearch');
        urlSearch.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            document.querySelectorAll('.url-container').forEach(container => {
                const url = container.dataset.url.toLowerCase();
                container.style.display = url.includes(searchTerm) ? 'block' : 'none';
            });
        });

        function toggleHistory(index) {
            const content = document.getElementById('history-content-' + index);
            const arrow = document.getElementById('history-arrow-' + index);
            
            if (content.classList.contains('active')) {
                content.classList.remove('active');
                arrow.style.transform = 'rotate(0deg)';
            } else {
                content.classList.add('active');
                arrow.style.transform = 'rotate(180deg)';
            }
        }

        function toggleUrlContent(runIndex, urlIndex) {
            const content = document.getElementById('url-content-' + runIndex + '-' + urlIndex);
            const arrow = document.getElementById('url-arrow-' + runIndex + '-' + urlIndex);
            
            if (content.classList.contains('hidden')) {
                content.classList.remove('hidden');
                arrow.style.transform = 'rotate(180deg)';
            } else {
                content.classList.add('hidden');
                arrow.style.transform = 'rotate(0deg)';
            }
        }

        function toggleBrowser(runIndex, urlIndex, browserIndex) {
            const content = document.getElementById('browser-content-' + runIndex + '-' + urlIndex + '-' + browserIndex);
            const arrow = document.getElementById('browser-arrow-' + runIndex + '-' + urlIndex + '-' + browserIndex);
            
            if (content.classList.contains('active')) {
                content.classList.remove('active');
                arrow.style.transform = 'rotate(0deg)';
            } else {
                content.classList.add('active');
                arrow.style.transform = 'rotate(180deg)';
            }
        }

        function toggleViewport(runIndex, urlIndex, browserIndex, deviceIndex) {
            const content = document.getElementById('viewport-content-' + runIndex + '-' + urlIndex + '-' + browserIndex + '-' + deviceIndex);
            const arrow = document.getElementById('viewport-arrow-' + runIndex + '-' + urlIndex + '-' + browserIndex + '-' + deviceIndex);
            
            if (content.classList.contains('active')) {
                content.classList.remove('active');
                arrow.style.transform = 'rotate(0deg)';
            } else {
                content.classList.add('active');
                arrow.style.transform = 'rotate(180deg)';
            }
        }

        function switchView(runIndex, urlIndex, browserIndex, deviceIndex, screenshotIndex, mode) {
            const container = document.getElementById('container-' + runIndex + '-' + urlIndex + '-' + browserIndex + '-' + deviceIndex + '-' + screenshotIndex);
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

        function scrollToTop() {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        }

        window.onscroll = function() {
            const btn = document.getElementById('goToTopBtn');
            if (document.body.scrollTop > 20 || document.documentElement.scrollTop > 20) {
                btn.classList.add('visible');
            } else {
                btn.classList.remove('visible');
            }
        };

        function filterHistory(filter) {
            const now = new Date();
            const sections = document.querySelectorAll('.history-section');
            
            sections.forEach(section => {
                const timestamp = new Date(section.dataset.timestamp);
                const daysDiff = (now - timestamp) / (1000 * 60 * 60 * 24);
                
                switch(filter) {
                    case 'latest':
                        section.classList.toggle('hidden', sections[0] !== section);
                        break;
                    case 'last7':
                        section.classList.toggle('hidden', daysDiff > 7);
                        break;
                    case 'last30':
                        section.classList.toggle('hidden', daysDiff > 30);
                        break;
                    default:
                        section.classList.remove('hidden');
                }
            });
        }

        document.getElementById('historyFilter').addEventListener('change', (e) => {
            filterHistory(e.target.value);
        });

        document.getElementById('expandAllBtn').addEventListener('click', () => {
            const btn = document.getElementById('expandAllBtn');
            const contents = document.querySelectorAll('.history-content');
            const arrows = document.querySelectorAll('.history-arrow');
            
            if (btn.textContent.includes('Expand')) {
                contents.forEach(content => content.classList.add('active'));
                arrows.forEach(arrow => arrow.style.transform = 'rotate(180deg)');
                btn.textContent = 'Collapse All';
            } else {
                contents.forEach(content => content.classList.remove('active'));
                arrows.forEach(arrow => arrow.style.transform = 'rotate(0deg)');
                btn.textContent = 'Expand All';
            }
        });

        // Lazy loading implementation
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.classList.add('loaded');
                    observer.unobserve(img);
                }
            });
        }, {
            root: null,
            rootMargin: '50px',
            threshold: 0.1
        });

        // Observe all lazy images
        document.querySelectorAll('.lazy-image').forEach(img => {
            imageObserver.observe(img);
        });
    </script>
</body>
    </body>
    </html>`;

    fs.writeFileSync(path.join(this.publicDir, "index.html"), htmlTemplate);
  }

  copyScreenshots() {
    const sourceDir = this.findScreenshotsDir();
    if (!sourceDir) {
      return;
    }

    const targetDir = path.join(this.publicDir, "screenshots");

    try {
      fs.mkdirSync(targetDir, { recursive: true });

      if (fs.existsSync(this.baselineDir)) {
        fs.cpSync(this.baselineDir, path.join(targetDir, "baseline"), {
          recursive: true,
          force: true,
        });
      }

      fs.cpSync(sourceDir, path.join(targetDir, this.env), {
        recursive: true,
        force: true,
      });

      console.log(`Successfully copied screenshots to ${targetDir}`);
    } catch (error) {
      console.error("Error copying screenshots:", error);
    }
  }

  generate() {
    console.log("Initializing report generation...");
    console.log("Environment:", this.env);
    this.initialize();

    console.log("Loading existing data...");
    const existingData = this.loadHistoricalData();

    console.log("Processing screenshots...");
    const newData = this.processScreenshots();

    console.log("Generating HTML...");
    this.generateHTML(newData);

    console.log("Copying screenshots...");
    this.copyScreenshots();

    console.log("Report generation completed");
  }
}

if (require.main === module) {
  console.log("Starting report generation...");
  const env = process.env.TEST_ENV || "ci";
  const reportGenerator = new ReportGenerator(env);
  reportGenerator.generate();
}

module.exports = { ReportGenerator };
