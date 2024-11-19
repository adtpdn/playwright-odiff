// generate-report.js
const fs = require("fs");
const path = require("path");

function generateReport() {
  const screenshotsDir = path.join(process.cwd(), "screenshots");
  const publicDir = path.join(process.cwd(), "public");

  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir);
  }

  const baselineDir = path.join(screenshotsDir, "baseline");
  const currentDir = path.join(screenshotsDir);

  function parseScreenshotName(filename) {
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
    const page = parts[1];
    const domain = parts[0];
    const displayUrl = page === "home" ? `${domain}` : `${domain}/${page}`;

    return {
      url: displayUrl,
      browser,
      device,
      resolution,
      fullName: filename,
    };
  }

  const browsers = ["chromium", "firefox", "webkit"];
  const screenshots = [];

  browsers.forEach((browser) => {
    const browserDir = path.join(currentDir, browser);
    if (fs.existsSync(browserDir)) {
      const browserScreenshots = fs
        .readdirSync(browserDir)
        .filter((f) => !f.startsWith("diff-"))
        .map((filename) => ({
          filename,
          browser,
          path: path.join(browser, filename),
        }));
      screenshots.push(...browserScreenshots);
    }
  });

  const groupedByUrl = {};

  screenshots.forEach(({ filename, browser, path: screenshotPath }) => {
    const metadata = parseScreenshotName(filename);

    if (!groupedByUrl[metadata.url]) {
      groupedByUrl[metadata.url] = {
        browsers: new Set(),
        devices: new Set(),
        screenshots: [],
      };
    }

    groupedByUrl[metadata.url].browsers.add(metadata.browser);
    groupedByUrl[metadata.url].devices.add(metadata.device);
    groupedByUrl[metadata.url].screenshots.push({
      ...metadata,
      baseline: path.join("screenshots/baseline", browser, filename),
      current: path.join("screenshots", browser, filename),
      diff: fs.existsSync(path.join(currentDir, browser, `diff-${filename}`))
        ? path.join("screenshots", browser, `diff-${filename}`)
        : null,
    });
  });

  const htmlTemplate = `
<!DOCTYPE html>
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
    </style>
</head>
<body>
    <div class="container mx-auto px-4 py-8 max-w-7xl">
        <h1 class="text-3xl font-bold text-gray-100 mb-8">Visual Regression Test Report</h1>
        <div class="space-y-6">
            ${Object.entries(groupedByUrl)
              .map(
                ([url, data], urlIndex) => `
                <div class="bg-gray-800 rounded-lg shadow-md overflow-hidden hover-transform">
                    <button 
                        class="w-full px-6 py-4 text-left hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        onclick="toggleCollapse(${urlIndex})"
                    >
                        <div class="flex items-center justify-between">
                            <div>
                                <h2 class="text-lg font-semibold text-gray-100">${url}</h2>
                                <div class="mt-1 text-sm text-gray-300">
                                    ${Array.from(data.browsers).join(", ")} | 
                                    ${Array.from(data.devices).join(", ")}
                                </div>
                            </div>
                            <svg class="w-5 h-5 text-gray-400 transform transition-transform duration-200" 
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
                            <div class="browser-section border-t border-gray-700">
                                <button 
                                    class="w-full px-6 py-3 text-left bg-gray-900 hover:bg-gray-800 focus:outline-none transition-all"
                                    onclick="toggleBrowser(${urlIndex}, ${browserIndex})"
                                >
                                    <div class="flex items-center justify-between">
                                        <div class="flex items-center">
                                            <i class="browser-icon fa-brands fa-${browser.toLowerCase()}"></i>
                                            <h3 class="text-md font-medium text-gray-300">${browser}</h3>
                                        </div>
                                        <svg class="w-4 h-4 text-gray-400 transform transition-transform duration-200" 
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
                                        (device, deviceIndex) => `
                                        <div class="viewport-section">
                                            <button 
                                                class="w-full px-6 py-3 text-left bg-gray-800 hover:bg-gray-700 focus:outline-none transition-all"
                                                onclick="toggleViewport(${urlIndex}, ${browserIndex}, ${deviceIndex})"
                                            >
                                                <div class="flex items-center justify-between">
                                                    <div class="flex items-center">
                                                        <i class="device-icon fa-solid ${
                                                          device === "desktop"
                                                            ? "fa-desktop"
                                                            : device ===
                                                              "tablet"
                                                            ? "fa-tablet-screen-button"
                                                            : "fa-mobile-screen"
                                                        }"></i>
                                                        <h4 class="text-sm font-medium text-gray-300">${device}</h4>
                                                    </div>
                                                    <svg class="w-4 h-4 text-gray-400 transform transition-transform duration-200" 
                                                        id="viewport-arrow-${urlIndex}-${browserIndex}-${deviceIndex}"
                                                        fill="none" 
                                                        stroke="currentColor" 
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                                                    </svg>
                                                </div>
                                            </button>
                                            <div class="viewport-content" id="viewport-content-${urlIndex}-${browserIndex}-${deviceIndex}">
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
                                                                <div class="text-sm font-medium text-gray-300">
                                                                    ${
                                                                      screenshot.resolution
                                                                    }
                                                                </div>
                                                                <div class="view-modes">
                                                                    <button class="view-mode-btn active" 
                                                                            onclick="switchView(${urlIndex}, ${browserIndex}, ${deviceIndex}, ${screenshotIndex}, 'comparison')">
                                                                        Slider
                                                                    </button>
                                                                    ${
                                                                      screenshot.diff
                                                                        ? `
                                                                        <button class="view-mode-btn" 
                                                                                onclick="switchView(${urlIndex}, ${browserIndex}, ${deviceIndex}, ${screenshotIndex}, 'diff')">
                                                                            Diff
                                                                        </button>
                                                                    `
                                                                        : ""
                                                                    }
                                                                </div>
                                                            </div>
                                                            <div class="comparison-container" id="container-${urlIndex}-${browserIndex}-${deviceIndex}-${screenshotIndex}">
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

        function toggleViewport(urlIndex, browserIndex, deviceIndex) {
            const content = document.getElementById('viewport-content-' + urlIndex + '-' + browserIndex + '-' + deviceIndex);
            const arrow = document.getElementById('viewport-arrow-' + urlIndex + '-' + browserIndex + '-' + deviceIndex);
            
            if (content.classList.contains('active')) {
                content.classList.remove('active');
                arrow.style.transform = 'rotate(0deg)';
            } else {
                content.classList.add('active');
                arrow.style.transform = 'rotate(180deg)';
            }
        }

        function switchView(urlIndex, browserIndex, deviceIndex, screenshotIndex, mode) {
            const container = document.getElementById('container-' + urlIndex + '-' + browserIndex + '-' + deviceIndex + '-' + screenshotIndex);
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
    </script>
</body>
</html>
`;

  fs.writeFileSync(path.join(publicDir, "index.html"), htmlTemplate);
  fs.cpSync(screenshotsDir, path.join(publicDir, "screenshots"), {
    recursive: true,
  });
}

module.exports = { generateReport };
