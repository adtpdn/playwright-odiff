// run-tests-ci.js
const { execSync } = require("child_process");
const urlGroups = require("./url-groups");

const groupName = process.argv[2];
if (!groupName || !urlGroups[groupName]) {
  console.error("Error: CI requires a valid URL group name");
  process.exit(1);
}

process.env.TEST_ENV = "ci";
process.env.TEST_URLS = JSON.stringify(urlGroups[groupName]);

try {
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
