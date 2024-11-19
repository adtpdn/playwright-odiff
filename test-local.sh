#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}Starting local visual regression testing...${NC}"

# Check node_modules
if [ ! -d "node_modules" ]; then
    echo -e "${RED}Installing dependencies...${NC}"
    npm install
fi

# Run tests
echo -e "${BLUE}Running tests...${NC}"
npx playwright test

# Generate report
echo -e "${BLUE}Generating report...${NC}"
node generate-report.js

# Check test results
if [ $? -eq 0 ]; then
    echo -e "${GREEN}Tests completed successfully!${NC}"
else
    echo -e "${RED}Tests failed. Check results above.${NC}"
fi