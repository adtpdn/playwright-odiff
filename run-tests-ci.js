// run-tests-ci.js
const { execSync } = require("child_process");
const urlGroups = require("./url-groups");

const groupName = process.argv[2];
if (!groupName || !urlGroups[groupName]) {
  console.error("Error: CI requires a valid URL group name");
  process.exit(1);
}

// Set environment variables
process.env.TEST_ENV = "ci";
process.env.TEST_URLS = JSON.stringify(urlGroups[groupName]);
process.env.NODE_OPTIONS = "--max-old-space-size=4096";

try {
  // Install browsers first
  console.log("Installing Playwright browsers...");
  execSync("npx playwright install --with-deps", {
    stdio: "inherit",
  });

  // Run the tests
  console.log("Running tests...");
  execSync("npx playwright test --config=playwright.ci.config.ts --workers=1", {
    stdio: "inherit",
    env: {
      ...process.env,
      PLAYWRIGHT_BROWSERS_PATH: "0",
      TEST_URLS: JSON.stringify(urlGroups[groupName]),
    },
    timeout: 30 * 60 * 1000, // 30 minutes
  });
} catch (error) {
  console.error(`Error running CI tests: ${error.message}`);
  process.exit(1);
}
