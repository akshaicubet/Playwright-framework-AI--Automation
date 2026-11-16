#!/usr/bin/env bash
# Creates the GitHub repo (if needed) and pushes master + automation branches.
# Usage: bash scripts/publish-to-github.sh [repo-name] [--public]
set -euo pipefail
GH="${GH:-gh}"
command -v "$GH" >/dev/null 2>&1 || GH="/c/Program Files/GitHub CLI/gh.exe"
REPO_NAME="${1:-playwright-Claude-ai-framework}"
VISIBILITY="--private"; [[ "${2:-}" == "--public" ]] && VISIBILITY="--public"
cd "$(dirname "$0")/.."

# Wait up to 15 minutes for gh sign-in to complete
for i in $(seq 1 180); do "$GH" auth status >/dev/null 2>&1 && break; sleep 5; done
"$GH" auth status >/dev/null 2>&1 || { echo "Not signed in to GitHub. Run: gh auth login"; exit 1; }
"$GH" auth setup-git

OWNER="$("$GH" api user --jq .login)"
if "$GH" repo view "$OWNER/$REPO_NAME" >/dev/null 2>&1; then
  echo "Repo $OWNER/$REPO_NAME already exists; reusing it."
  git remote get-url origin >/dev/null 2>&1 || git remote add origin "https://github.com/$OWNER/$REPO_NAME.git"
else
  "$GH" repo create "$REPO_NAME" $VISIBILITY --source=. --remote=origin \
    --description "Playwright + Claude AI test automation framework"
fi
git push -u origin master
git push -u origin automation
echo "BRANCH_URL=https://github.com/$OWNER/$REPO_NAME/tree/automation"
echo "CLONE: git clone -b automation https://github.com/$OWNER/$REPO_NAME.git"
