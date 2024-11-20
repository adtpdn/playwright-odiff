// run-tests-ci.js
const { execSync } = require("child_process");
const path = require("path");
const urlGroups = require("./url-groups");

const groupName = process.env.TEST_URL_GROUP || process.argv[2];
if (!groupName || !urlGroups[groupName]) {
  console.error("Error: CI requires a valid URL group name");
  console.error("Available groups:");
  Object.keys(urlGroups).forEach((group) => {
    console.error(`  - ${group}`);
  });
  process.exit(1);
}

process.env.TEST_ENV = "ci";
process.env.TEST_URLS = JSON.stringify(urlGroups[groupName]);

try {
  console.log(`Running CI tests for group: ${groupName}`);
  console.log("URLs to test:");
  urlGroups[groupName].forEach((url) => console.log(`  - ${url}`));

  execSync("npx playwright test --config=playwright.ci.config.ts", {
    stdio: "inherit",
    env: {
      ...process.env,
      TEST_URLS: JSON.stringify(urlGroups[groupName]),
    },
  });
} catch (error) {
  console.error(`Error running CI tests: ${error.message}`);
  process.exit(1);
}
