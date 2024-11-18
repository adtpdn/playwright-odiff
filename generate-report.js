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
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f5f5f5;
        }
        
        .collapse-header {
            background: #fff;
            padding: 15px;
            margin: 10px 0;
            border-radius: 5px;
            cursor: pointer;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        
        .collapse-content {
            display: none;
            padding: 15px;
            background: #fff;
            margin-bottom: 20px;
            border-radius: 5px;
        }
        
        .comparison-table {
            width: 100%;
            border-collapse: collapse;
        }
        
        .comparison-table td {
            padding: 10px;
            text-align: center;
        }
        
        .thumbnail {
            max-width: 200px;
            cursor: pointer;
        }
        
        .modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.9);
            z-index: 1000;
        }
        
        .modal-content {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #fff;
            padding: 20px;
            border-radius: 5px;
        }
        
        .comparison-slider {
            position: relative;
            width: 100%;
            max-width: 800px;
            overflow: hidden;
        }
        
        .comparison-slider img {
            max-width: 100%;
        }
        
        .slider-handle {
            position: absolute;
            top: 0;
            bottom: 0;
            width: 2px;
            background: #fff;
            cursor: ew-resize;
        }
        
        .close-modal {
            position: absolute;
            top: 10px;
            right: 10px;
            cursor: pointer;
            color: #fff;
            font-size: 24px;
        }
    </style>
</head>
<body>
    <h1>Visual Testing Report</h1>
    
    ${screenshots
      .map(
        (screenshot, index) => `
        <div class="collapse-header" onclick="toggleCollapse(${index})">
            ${screenshot}
        </div>
        <div class="collapse-content" id="collapse-${index}">
            <table class="comparison-table">
                <tr>
                    <td>
                        <img src="${reportData[index].baseline}" class="thumbnail" 
                             onclick="showComparison('${reportData[index].baseline}', '${reportData[index].current}')">
                        <p>Baseline</p>
                    </td>
                    <td>
                        <img src="${reportData[index].current}" class="thumbnail">
                        <p>Current</p>
                    </td>
                    <td>
                        <img src="${reportData[index].diff}" class="thumbnail">
                        <p>Diff</p>
                    </td>
                </tr>
            </table>
        </div>
    `
      )
      .join("")}
    
    <div class="modal" id="comparison-modal">
        <span class="close-modal" onclick="closeModal()">&times;</span>
        <div class="modal-content">
            <div class="comparison-slider" id="comparison-slider">
                <img src="" id="baseline-image">
                <div class="slider-handle"></div>
            </div>
        </div>
    </div>

    <script>
        function toggleCollapse(index) {
            const content = document.getElementById(\`collapse-\${index}\`);
            content.style.display = content.style.display === 'none' ? 'block' : 'none';
        }
        
        function showComparison(baselineUrl, currentUrl) {
            const modal = document.getElementById('comparison-modal');
            const slider = document.getElementById('comparison-slider');
            const baselineImage = document.getElementById('baseline-image');
            
            baselineImage.src = baselineUrl;
            modal.style.display = 'block';
            
            let isDragging = false;
            let startX;
            let sliderLeft;
            
            slider.addEventListener('mousedown', startDragging);
            document.addEventListener('mousemove', drag);
            document.addEventListener('mouseup', stopDragging);
            
            function startDragging(e) {
                isDragging = true;
                startX = e.pageX - slider.offsetLeft;
            }
            
            function drag(e) {
                if (!isDragging) return;
                
                e.preventDefault();
                const x = e.pageX - startX;
                const sliderWidth = slider.offsetWidth;
                
                const left = Math.max(0, Math.min(x, sliderWidth));
                slider.style.clipPath = \`inset(0 0 0 \${(left / sliderWidth) * 100}%)\`;
                document.querySelector('.slider-handle').style.left = \`\${left}px\`;
            }
            
            function stopDragging() {
                isDragging = false;
            }
        }
        
        function closeModal() {
            document.getElementById('comparison-modal').style.display = 'none';
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
