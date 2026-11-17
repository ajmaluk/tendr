#!/bin/bash
set -e

echo "=== 1. Testing CI Workflow Steps Locally ==="
echo "Running: npm run typecheck"
npm run typecheck

echo "Running: npm run lint"
npm run lint

echo "Running: npm run test:coverage"
npm run test:coverage

echo "Running: npm run build"
npm run build

echo "=== 2. Testing Check-Dist Step Locally ==="
TEMP_DIST=$(mktemp -d)
npx ncc build src/main.ts -o "$TEMP_DIST" --source-map --license licenses.txt >/dev/null 2>&1
if diff -q dist/index.js "$TEMP_DIST/index.js" >/dev/null 2>&1; then
  echo "SUCCESS: dist/index.js matches freshly compiled bundle."
else
  echo "ERROR: dist/index.js does not match compiled bundle! Run npm run build."
  rm -rf "$TEMP_DIST"
  exit 1
fi
rm -rf "$TEMP_DIST"

echo "=== 3. Testing MaintainerKit Action Run Locally (Dry-Run Mode) ==="
TMP_SUMMARY=$(mktemp)
export GITHUB_STEP_SUMMARY="$TMP_SUMMARY"
export GITHUB_REPOSITORY="ajmaluk/tendr"
export INPUT_CONFIG_PATH=".github/maintainerkit.yml"
export INPUT_DRY_RUN="true"
export DRY_RUN="true"
export INPUT_FEATURES="triage,pull-requests"
export GITHUB_TOKEN="ghp_dummy_token_for_dry_run"

# Test 3a: Issues event (dry-run)
export GITHUB_EVENT_NAME="issues"
export GITHUB_EVENT_PATH="tests/fixtures/issues-opened-bug.json"
echo "Simulating issues event with dry-run..."
node dist/index.js

# Test 3b: Pull Request event (dry-run)
export GITHUB_EVENT_NAME="pull_request"
export GITHUB_EVENT_PATH="tests/fixtures/pull-request-opened.json"
echo "Simulating pull_request event with dry-run..."
node dist/index.js

echo "=== 4. Verifying Generated Step Summary ==="
cat "$TMP_SUMMARY"
rm -f "$TMP_SUMMARY"

echo ""
echo "=== ALL WORKFLOWS PASSED LOCALLY! ==="
