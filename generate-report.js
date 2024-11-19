const fs = require("fs");
const path = require("path");

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

const latestDir = timestamps[0];
const baselineDir = path.join(screenshotsDir, "baseline");
const currentDir = path.join(screenshotsDir, latestDir);

// Parse screenshot metadata
function parseScreenshotName(filename) {
  const [url, browser, device, resolution] = filename
    .replace(".png", "")
    .split("-");
  return {
    url,
    browser,
    device,
    resolution,
    fullName: filename,
  };
}

// Group screenshots by URL
const screenshots = fs
  .readdirSync(currentDir)
  .filter((f) => !f.startsWith("diff-"));
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

  groupedByUrl[metadata.url].browsers.add(metadata.browser);
  groupedByUrl[metadata.url].devices.add(metadata.device);
  groupedByUrl[metadata.url].screenshots.push({
    ...metadata,
    baseline: path.join("screenshots/baseline", screenshot),
    current: path.join(`screenshots/${latestDir}`, screenshot),
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
                        ${Array.from(data.devices)
                          .map(
                            (device) => `
                            <div class="border-t border-gray-200 px-6 py-4">
                                <h3 class="text-md font-medium text-gray-700 mb-4">${device}</h3>
                                <div class="screenshot-grid">
                                    ${data.screenshots
                                      .filter((s) => s.device === device)
                                      .map(
                                        (screenshot) => `
                                            <div class="space-y-2">
                                                <div class="text-sm font-medium text-gray-600">
                                                    ${screenshot.browser} - ${screenshot.resolution}
                                                </div>
                                                <img-comparison-slider class="rounded-lg shadow-sm">
                                                    <img slot="first" src="${screenshot.baseline}" alt="Baseline">
                                                    <img slot="second" src="${screenshot.current}" alt="Current">
                                                </img-comparison-slider>
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
            const content = document.getElementById(\`collapse-\${index}\`);
            const arrow = document.getElementById(\`arrow-\${index}\`);
            
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

fs.writeFileSync(path.join(publicDir, "index.html"), htmlTemplate);

// Copy screenshots to public directory
fs.cpSync(screenshotsDir, path.join(publicDir, "screenshots"), {
  recursive: true,
});

console.log("Report generated successfully!");
