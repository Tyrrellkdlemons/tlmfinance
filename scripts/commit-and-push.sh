#!/bin/bash
# Safe commit and push script for TLM Finance
# Prompts for commit message and shows changes before committing
# Never force pushes - follows Git best practices

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Change to project root (script is in scripts/)
cd "$(dirname "$0")/.." || exit 1

echo ""
echo "============================================"
echo "   TLM Finance - Git Commit and Push"
echo "============================================"
echo ""

# Check if git is installed
if ! command -v git &> /dev/null; then
  echo -e "${RED}[X] Git is not installed.${NC}"
  echo "    Install from: https://git-scm.com/downloads"
  exit 1
fi

# Check if we're in a git repository
if ! git rev-parse --git-dir &> /dev/null; then
  echo -e "${RED}[X] Not a git repository.${NC}"
  echo "    Run this from the project root."
  exit 1
fi

# Show current status
echo -e "${BLUE}--- Current Status ---${NC}"
git status --short
echo ""

# Check if there are any changes
if git diff --quiet && git diff --cached --quiet; then
  echo -e "${YELLOW}[i] No changes to commit.${NC}"
  echo ""
  exit 0
fi

# Show what will be committed
echo -e "${BLUE}--- Changes to be committed ---${NC}"
echo ""
git status
echo ""

# Ask user to confirm
read -p "Do you want to commit these changes? (y/n): " CONFIRM
if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
  echo ""
  echo -e "${YELLOW}[i] Commit cancelled.${NC}"
  exit 0
fi

# Prompt for commit message
echo ""
echo -e "${BLUE}--- Enter Commit Message ---${NC}"
echo "(Press Enter for default message, or type your custom message)"
echo ""
read -p "Commit message: " COMMIT_MSG

# Use default message if empty
if [ -z "$COMMIT_MSG" ]; then
  COMMIT_MSG="update $(date +'%a %m/%d/%Y %H:%M:%S.%2N')"
fi

# Stage all changes
echo ""
echo -e "${BLUE}--- Staging changes ---${NC}"
git add -A
if [ $? -ne 0 ]; then
  echo -e "${RED}[X] Failed to stage changes.${NC}"
  exit 1
fi

# Create commit
echo ""
echo -e "${BLUE}--- Creating commit ---${NC}"
git commit -m "$COMMIT_MSG"
if [ $? -ne 0 ]; then
  echo -e "${RED}[X] Commit failed.${NC}"
  exit 1
fi

echo -e "${GREEN}[✓] Commit created successfully.${NC}"

# Ask if user wants to push
echo ""
read -p "Push to GitHub? (y/n): " PUSH
if [[ ! "$PUSH" =~ ^[Yy]$ ]]; then
  echo ""
  echo -e "${YELLOW}[i] Changes committed locally but not pushed.${NC}"
  echo "    Run 'git push' when ready to push to GitHub."
  exit 0
fi

# Push to remote
echo ""
echo -e "${BLUE}--- Pushing to GitHub ---${NC}"
git push origin main
if [ $? -ne 0 ]; then
  echo ""
  echo -e "${RED}[X] Push failed.${NC}"
  echo "    This might be because:"
  echo "    - You need to pull changes first (git pull)"
  echo "    - Authentication failed"
  echo "    - No internet connection"
  echo ""
  echo "    Try running: git pull --rebase"
  echo "    Then run this script again."
  exit 1
fi

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}   ✓ Success!${NC}"
echo -e "${GREEN}   Changes committed and pushed to GitHub.${NC}"
echo "   Repository: github.com/Tyrrellkdlemons/tlmfinance"
echo -e "${GREEN}============================================${NC}"
echo ""

# Show the commit that was just created
echo -e "${BLUE}--- Latest commit ---${NC}"
git log -1 --oneline --decorate
echo ""
