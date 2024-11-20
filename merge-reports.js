// merge-reports.js
const fs = require("fs");
const path = require("path");

class ReportMerger {
  constructor() {
    this.artifactsDir = path.join(process.cwd(), "artifacts");
    this.publicDir = path.join(process.cwd(), "public");
    this.mergedData = {
      timestamp: new Date().toISOString(),
      testGroups: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        new: 0,
        updated: 0,
      },
    };
  }

  ensureDirectoryExists(dir) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  async mergeReports() {
    try {
      console.log("Starting report merge process...");

      // Ensure directories exist
      this.ensureDirectoryExists(this.publicDir);

      // Get all report directories
      const reportDirs = fs
        .readdirSync(this.artifactsDir)
        .filter((dir) => dir.includes("report"))
        .map((dir) => path.join(this.artifactsDir, dir));

      console.log(`Found ${reportDirs.length} report directories`);

      // Process each report
      for (const reportDir of reportDirs) {
        await this.processReport(reportDir);
      }

      // Update summary
      this.updateSummary();

      // Write merged report
      this.writeMergedReport();

      // Copy assets
      this.copyAssets();

      console.log("Report merge completed successfully");
    } catch (error) {
      console.error("Error merging reports:", error);
      process.exit(1);
    }
  }

  async processReport(reportDir) {
    try {
      const reportFile = path.join(reportDir, "report.json");
      if (!fs.existsSync(reportFile)) {
        console.log(`No report.json found in ${reportDir}`);
        return;
      }

      const reportData = JSON.parse(fs.readFileSync(reportFile, "utf8"));

      // Add group data to merged report
      this.mergedData.testGroups.push({
        groupName: path.basename(reportDir),
        ...reportData,
      });

      // Copy screenshots
      const screenshotsDir = path.join(reportDir, "screenshots");
      if (fs.existsSync(screenshotsDir)) {
        const targetDir = path.join(
          this.publicDir,
          "screenshots",
          path.basename(reportDir)
        );
        this.ensureDirectoryExists(targetDir);
        this.copyDirectory(screenshotsDir, targetDir);
      }
    } catch (error) {
      console.error(`Error processing report ${reportDir}:`, error);
    }
  }

  updateSummary() {
    this.mergedData.testGroups.forEach((group) => {
      if (group.summary) {
        this.mergedData.summary.total += group.summary.total || 0;
        this.mergedData.summary.passed += group.summary.passed || 0;
        this.mergedData.summary.failed += group.summary.failed || 0;
        this.mergedData.summary.new += group.summary.new || 0;
        this.mergedData.summary.updated += group.summary.updated || 0;
      }
    });
  }

  writeMergedReport() {
    // Write JSON report
    const jsonReport = path.join(this.publicDir, "merged-report.json");
    fs.writeFileSync(jsonReport, JSON.stringify(this.mergedData, null, 2));

    // Generate HTML report
    const htmlReport = this.generateHtmlReport();
    fs.writeFileSync(path.join(this.publicDir, "index.html"), htmlReport);
  }

  generateHtmlReport() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Visual Regression Test Report</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .header {
            background: #fff;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            margin-bottom: 20px;
        }
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin-bottom: 30px;
        }
        .summary-item {
            background: #fff;
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            text-align: center;
        }
        .group {
            background: #fff;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            margin-bottom: 20px;
        }
        .test-result {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 15px;
            margin: 15px 0;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 4px;
        }
        .success { color: #28a745; }
        .failure { color: #dc3545; }
        .new { color: #17a2b8; }
        img {
            max-width: 100%;
            height: auto;
            border: 1px solid #ddd;
            border-radius: 4px;
        }
        @media (max-width: 768px) {
            .test-result {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Visual Regression Test Report</h1>
        <p>Generated: ${new Date().toLocaleString()}</p>
    </div>

    <div class="summary">
        <div class="summary-item">
            <h3>Total Tests</h3>
            <p>${this.mergedData.summary.total}</p>
        </div>
        <div class="summary-item">
            <h3>Passed</h3>
            <p class="success">${this.mergedData.summary.passed}</p>
        </div>
        <div class="summary-item">
            <h3>Failed</h3>
            <p class="failure">${this.mergedData.summary.failed}</p>
        </div>
        <div class="summary-item">
            <h3>New</h3>
            <p class="new">${this.mergedData.summary.new}</p>
        </div>
        <div class="summary-item">
            <h3>Updated</h3>
            <p>${this.mergedData.summary.updated}</p>
        </div>
    </div>

    ${this.mergedData.testGroups
      .map(
        (group) => `
        <div class="group">
            <h2>${group.groupName}</h2>
            ${
              group.results
                ? group.results
                    .map(
                      (result) => `
                <div class="test-result">
                    <div>
                        <h4>${result.name}</h4>
                        <p>Status: <span class="${
                          result.status === "passed" ? "success" : "failure"
                        }">${result.status}</span></p>
                    </div>
                    ${
                      result.screenshots
                        ? `
                        <div>
                            <img src="${result.screenshots.current}" alt="Current" />
                            <p>Current</p>
                        </div>
                        <div>
                            <img src="${result.screenshots.diff}" alt="Diff" />
                            <p>Diff</p>
                        </div>
                    `
                        : ""
                    }
                </div>
            `
                    )
                    .join("")
                : ""
            }
        </div>
    `
      )
      .join("")}

    <script>
        // Add any interactive features here if needed
    </script>
</body>
</html>`;
  }

  copyDirectory(source, target) {
    if (!fs.existsSync(target)) {
      fs.mkdirSync(target, { recursive: true });
    }

    const files = fs.readdirSync(source);
    for (const file of files) {
      const sourcePath = path.join(source, file);
      const targetPath = path.join(target, file);

      if (fs.lstatSync(sourcePath).isDirectory()) {
        this.copyDirectory(sourcePath, targetPath);
      } else {
        fs.copyFileSync(sourcePath, targetPath);
      }
    }
  }

  copyAssets() {
    // Copy any additional assets needed for the report
    const assetsDir = path.join(__dirname, "assets");
    if (fs.existsSync(assetsDir)) {
      this.copyDirectory(assetsDir, path.join(this.publicDir, "assets"));
    }
  }
}

// Execute if run directly
if (require.main === module) {
  const merger = new ReportMerger();
  merger.mergeReports().catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
}

module.exports = { ReportMerger };
