// run-tests-local.js
const { execSync } = require("child_process");
const path = require("path");
const urlGroups = require("./url-groups");

// Default to 'all' if no group specified
const groupName = process.argv[2] || "all";

function runLocalTests(urls) {
  process.env.TEST_ENV = "local";
  process.env.TEST_URLS = JSON.stringify(urls);

  try {
    console.log(
      "\x1b[34m%s\x1b[0m",
      `Running local tests for ${urls.length} URLs...`
    );
    console.log("\x1b[34m%s\x1b[0m", "URLs to test:");
    urls.forEach((url) => console.log("\x1b[36m%s\x1b[0m", `  - ${url}`));

    execSync("npx playwright test --config=playwright.local.config.ts", {
      stdio: "inherit",
      env: {
        ...process.env,
        TEST_URLS: JSON.stringify(urls),
      },
    });

    console.log("\x1b[32m%s\x1b[0m", "Local tests completed successfully!");
    return true;
  } catch (error) {
    console.error(
      "\x1b[31m%s\x1b[0m",
      `Error running local tests: ${error.message}`
    );
    return false;
  }
}

if (groupName === "all") {
  const allUrls = Object.values(urlGroups).flat();
  runLocalTests(allUrls);
} else if (urlGroups[groupName]) {
  runLocalTests(urlGroups[groupName]);
} else {
  console.error("\x1b[31m%s\x1b[0m", `Error: Unknown URL group '${groupName}'`);
  console.log("\x1b[34m%s\x1b[0m", "Available groups:");
  Object.keys(urlGroups).forEach((group) => {
    console.log("\x1b[36m%s\x1b[0m", `  - ${group}`);
  });
  console.log("\x1b[34m%s\x1b[0m", "  - all (runs all groups)");
  process.exit(1);
}
