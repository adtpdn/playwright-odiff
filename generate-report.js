const fs = require("fs");
const path = require("path");

// Configuration
const screenshotsDir = path.join(process.cwd(), "screenshots");
const publicDir = path.join(process.cwd(), "public");
const reportFileName = "visual-test-report.html";

// Create public directory if it doesn't exist
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir);
}

// Get timestamps and sort them
const timestamps = fs
  .readdirSync(screenshotsDir)
  .filter((f) => f !== "baseline")
  .sort()
  .reverse();

if (timestamps.length === 0) {
  console.error("No screenshot directories found!");
  process.exit(1);
}

const latestDir = timestamps[0];
const baselineDir = path.join(screenshotsDir, "baseline");
const currentDir = path.join(screenshotsDir, latestDir);

// Group screenshots by URL
const screenshots = fs
  .readdirSync(currentDir)
  .filter((f) => !f.startsWith("diff-"));

// Parse screenshot filename to get metadata
function parseScreenshotName(filename) {
  const parts = filename.replace(".png", "").split("-");
  const resolution = parts.slice(-1)[0].split("x");
  const browser = parts.find((p) =>
    ["chromium", "firefox", "webkit"].includes(p)
  );
  const deviceType = parts.find((p) =>
    ["desktop", "tablet", "mobile"].includes(p)
  );
  const url = parts.slice(0, parts.indexOf(browser)).join("-");

  return {
    url,
    browser,
    deviceType,
    width: resolution[0],
    height: resolution[1],
    timestamp: new Date().toLocaleString(),
  };
}

// Group screenshots by URL
const groupedScreenshots = screenshots.reduce((acc, screenshot) => {
  const metadata = parseScreenshotName(screenshot);
  if (!acc[metadata.url]) {
    acc[metadata.url] = [];
  }
  acc[metadata.url].push({
    filename: screenshot,
    ...metadata,
    baseline: path.join("screenshots/baseline", screenshot),
    current: path.join(`screenshots/${latestDir}`, screenshot),
    diff: path.join(`screenshots/${latestDir}`, `diff-${screenshot}`),
  });
  return acc;
}, {});

const htmlTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Visual Testing Report</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/img-comparison-slider@7/dist/index.js"></script>
    <link rel="stylesheet" href="https://unpkg.com/img-comparison-slider@7/dist/styles.css" />
</head>
<body class="bg-gray-50 min-h-screen">
    <div class="container mx-auto px-4 py-8">
        <header class="mb-8">
            <h1 class="text-3xl font-bold text-gray-800">Visual Testing Report</h1>
            <p class="text-gray-600 mt-2">Generated on: ${new Date().toLocaleString()}</p>
            <div class="mt-4">
                <span class="text-sm font-medium text-gray-500">Test Run Directory: </span>
                <span class="text-sm text-gray-900">${latestDir}</span>
            </div>
        </header>

        <div class="space-y-8">
            ${Object.entries(groupedScreenshots)
              .map(
                ([url, items], urlIndex) => `
                <div class="bg-white rounded-lg shadow-md overflow-hidden">
                    <button 
                        class="w-full px-6 py-4 text-left hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors duration-200"
                        onclick="toggleCollapse('url-${urlIndex}')"
                    >
                        <div class="flex items-center justify-between">
                            <div>
                                <h2 class="text-lg font-semibold text-gray-700">${url}</h2>
                                <p class="text-sm text-gray-500 mt-1">
                                    ${items.length} screenshots | ${
                  new Set(items.map((i) => i.deviceType)).size
                } devices
                                </p>
                            </div>
                            <svg class="w-5 h-5 text-gray-500 transform transition-transform duration-200" id="arrow-url-${urlIndex}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                            </svg>
                        </div>
                    </button>
                    
                    <div class="hidden px-6 py-4" id="collapse-url-${urlIndex}">
                        ${items
                          .map(
                            (item, itemIndex) => `
                            <div class="border-t first:border-t-0 py-4">
                                <div class="mb-4">
                                    <h3 class="font-medium text-gray-700">${item.browser} - ${item.deviceType}</h3>
                                    <p class="text-sm text-gray-500">${item.width}x${item.height}</p>
                                </div>
                                
                                <div class="max-w-4xl mx-auto">
                                    <img-comparison-slider class="shadow-lg rounded-lg">
                                        <img slot="first" src="${item.baseline}" class="w-full" alt="Baseline">
                                        <img slot="second" src="${item.current}" class="w-full" alt="Current">
                                    </img-comparison-slider>
                                    
                                    <div class="mt-6">
                                        <p class="font-medium text-gray-700 mb-2">Difference Visualization</p>
                                        <img src="${item.diff}" class="w-full rounded-lg shadow" alt="Difference">
                                    </div>
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
        function toggleCollapse(id) {
            const content = document.getElementById(\`collapse-\${id}\`);
            const arrow = document.getElementById(\`arrow-\${id}\`);
            
            if (content.classList.contains('hidden')) {
                content.classList.remove('hidden');
                arrow.style.transform = 'rotate(180deg)';
            } else {
                content.classList.add('hidden');
                arrow.style.transform = 'rotate(0deg)';
            }
        }
    </script>
</body>
</html>
`;

// Write the HTML report
fs.writeFileSync(path.join(publicDir, reportFileName), htmlTemplate);

// Copy screenshots to public directory
fs.cpSync(screenshotsDir, path.join(publicDir, "screenshots"), {
  recursive: true,
});

console.log(`Report generated: ${path.join(publicDir, reportFileName)}`);
