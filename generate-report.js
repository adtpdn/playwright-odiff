const fs = require("fs");
const path = require("path");

const screenshotsDir = path.join(process.cwd(), "screenshots");
const publicDir = path.join(process.cwd(), "public");

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

const screenshots = fs
  .readdirSync(currentDir)
  .filter((f) => !f.startsWith("diff-"));

const reportData = screenshots.map((screenshot) => ({
  name: screenshot,
  baseline: path.join("screenshots/baseline", screenshot),
  current: path.join(`screenshots/${latestDir}`, screenshot),
  diff: path.join(`screenshots/${latestDir}`, `diff-${screenshot}`),
}));

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
        <h1 class="text-3xl font-bold text-gray-800 mb-8">Visual Testing Report</h1>
        
        <div class="space-y-4">
            ${screenshots
              .map(
                (screenshot, index) => `
                <div class="bg-white rounded-lg shadow-md overflow-hidden">
                    <button 
                        class="w-full px-6 py-4 text-left hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors duration-200"
                        onclick="toggleCollapse(${index})"
                    >
                        <div class="flex items-center justify-between">
                            <h2 class="text-lg font-semibold text-gray-700">${screenshot}</h2>
                            <svg class="w-5 h-5 text-gray-500 transform transition-transform duration-200" id="arrow-${index}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                            </svg>
                        </div>
                    </button>
                    
                    <div class="hidden px-6 py-4" id="collapse-${index}">
                        <div class="max-w-4xl mx-auto">
                            <img-comparison-slider>
                                <img slot="first" src="${reportData[index].baseline}" class="w-full" alt="Baseline">
                                <img slot="second" src="${reportData[index].current}" class="w-full" alt="Current">
                            </img-comparison-slider>
                            
                            <div class="mt-4 grid grid-cols-2 gap-4 text-sm text-gray-600">
                                <div class="text-center">
                                    <p class="font-medium">Baseline</p>
                                    <p class="text-gray-500">${reportData[index].baseline}</p>
                                </div>
                                <div class="text-center">
                                    <p class="font-medium">Current</p>
                                    <p class="text-gray-500">${reportData[index].current}</p>
                                </div>
                            </div>
                            
                            <div class="mt-6">
                                <p class="font-medium text-gray-700 mb-2">Difference Visualization</p>
                                <img src="${reportData[index].diff}" class="w-full rounded-lg shadow" alt="Difference">
                            </div>
                        </div>
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
