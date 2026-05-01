# TLM Finance - Scripts

This directory contains build, deployment, and development scripts for the TLM Finance project.

## Git Workflow Scripts

### `commit-and-push.sh` (macOS/Linux) ⭐ RECOMMENDED
Safe, interactive Git workflow script that:
- Shows you what will be committed
- Prompts for a custom commit message (or uses a default timestamp)
- Asks for confirmation before committing
- Asks before pushing to GitHub
- **Never force pushes** - safe for daily use
- Provides helpful error messages

**Usage:**
```bash
./scripts/commit-and-push.sh
```

### `commit-and-push.bat` (Windows)
Windows version of the safe Git workflow script with the same features.

**Usage:**
```cmd
scripts\commit-and-push.bat
```

### `push-to-github.bat` (Legacy - Not Recommended)
⚠️ **WARNING**: This is a legacy "nuclear sync" script designed for initial repository setup.

**Issues:**
- Removes and re-adds the remote every time
- Can force push (dangerous - can destroy history)
- Uses generic commit messages
- Automatically commits without asking

**Use only if you need to:**
- Force sync after major conflicts
- Re-initialize the repository

**For regular development, use `commit-and-push.sh` or `commit-and-push.bat` instead.**

---

## Development Scripts

### `dev.bat`
Starts a local development server on port 8080.

**Usage:**
```cmd
scripts\dev.bat
```

### `setup.bat`
Project setup and initialization script.

---

## Build Scripts

### `validate.mjs`
Validates JSON files and checks for required files.

**Usage:**
```bash
node scripts/validate.mjs
```

### `build-presentation-zip.ps1`
Builds a presentation package including PowerPoint files and presentation data.

**Usage:**
```powershell
powershell -ExecutionPolicy Bypass -File scripts/build-presentation-zip.ps1
```

### `make-lovable-zip.bat`
Creates a lovable deployment package.

---

## Deployment Scripts

### `deploy.bat`
Main deployment script.

### `netlify-deploy.bat`
Deploys to Netlify (production or preview).

**Usage:**
```cmd
REM Preview deploy
netlify deploy --dir=.

REM Production deploy
netlify deploy --prod --dir=.
```

---

## Utility Scripts

### `copy-zip-to-clipboard.bat`
Copies a zip file path to clipboard (Windows).

---

## Best Practices

### Daily Workflow (Recommended)

1. **Make your changes** to the code
2. **Test locally**: `npm run dev` or open `index.html`
3. **Validate**: `node scripts/validate.mjs`
4. **Commit and push**: `./scripts/commit-and-push.sh`

### When to Use Which Script

| Task | Script | Platform |
|------|--------|----------|
| Regular commits | `commit-and-push.sh` | macOS/Linux |
| Regular commits | `commit-and-push.bat` | Windows |
| Local development | `dev.bat` | Windows |
| Validate changes | `validate.mjs` | All |
| Deploy to Netlify | `netlify-deploy.bat` | Windows |
| Emergency repo sync | `push-to-github.bat` | Windows |

---

## Git Best Practices

✅ **DO:**
- Use descriptive commit messages
- Commit after each logical change
- Test before committing
- Pull before pushing if working with others
- Use the safe `commit-and-push` scripts

❌ **DON'T:**
- Force push (unless absolutely necessary)
- Commit with generic messages
- Skip testing
- Use the legacy `push-to-github.bat` for regular work

---

**Questions?** Check the main [README.md](../README.md) or ask in the project issues.
