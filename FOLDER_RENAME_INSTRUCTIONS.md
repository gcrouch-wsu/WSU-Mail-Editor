# Folder Rename Instructions

## Important: Manual Step Required

The code migration to monorepo structure is complete, but you need to manually rename the local folder.

## Current Status

- ✅ Monorepo structure created
- ✅ All files moved to `apps/wsu-tools/`
- ✅ Root `package.json` with workspace config created
- ✅ Vercel configuration updated
- ✅ Build tested and working
- ⚠️ **Folder still named:** `GS Slate Editor V7`
- ⚠️ **Should be renamed to:** `wsu-gradschool-tools`

## How to Rename the Folder

### Option 1: Using File Explorer (Easiest)

1. **Close any running processes:**
   - Stop the dev server if running (Ctrl+C)
   - Close your IDE/editor

2. **Navigate to parent directory:**
   - Open File Explorer
   - Go to: `C:\Python Projects\`

3. **Rename the folder:**
   - Right-click on `GS Slate Editor V7`
   - Select "Rename"
   - Type: `wsu-gradschool-tools`
   - Press Enter

4. **Reopen in your IDE:**
   - Open the renamed folder in your IDE/editor
   - Verify git still works: `git status`

### Option 2: Using PowerShell

```powershell
# Navigate to parent directory
cd "C:\Python Projects"

# Rename the folder
Rename-Item -Path "GS Slate Editor V7" -NewName "wsu-gradschool-tools"

# Navigate into the renamed folder
cd wsu-gradschool-tools

# Verify git still works
git status
```

## After Renaming

1. **Verify Git:**
   ```powershell
   git status
   git remote -v
   ```

2. **Test the app:**
   ```powershell
   npm install  # Reinstall if needed
   npm run dev
   ```

3. **Update IDE workspace:**
   - If using VS Code: File → Open Folder → Select the renamed folder
   - If using other IDEs: Update the workspace/project path

## Notes

- **GitHub:** No impact - linked via remote URL, not folder name
- **Vercel:** No impact - linked to GitHub repo, not local folder
- **Git:** Should work fine - `.git` folder moves with the folder
- **Node modules:** May need to reinstall if there are absolute path issues

## If Something Goes Wrong

If renaming causes issues:

1. **Rename back:**
   ```powershell
   cd "C:\Python Projects"
   Rename-Item -Path "wsu-gradschool-tools" -NewName "GS Slate Editor V7"
   ```

2. **Check git:**
   ```powershell
   cd "GS Slate Editor V7"
   git status
   ```

3. **Reinstall if needed:**
   ```powershell
   npm install
   ```

The folder name doesn't affect the code or deployment - it's purely for local organization!

