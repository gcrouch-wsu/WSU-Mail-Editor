# Rollback Plan: Monorepo Migration Fallback

## Quick Reference

**If something goes wrong, use this guide to restore your project to working state.**

---

## Emergency Rollback (Complete Revert)

### If you need to completely undo the migration:

```powershell
# 1. Check current status
git status

# 2. See recent commits
git log --oneline -5

# 3. Revert to before migration (replace COMMIT_HASH with the commit before migration started)
git reset --hard COMMIT_HASH

# OR if you haven't pushed yet, reset to origin
git reset --hard origin/main

# 4. If folder was renamed, rename it back
# From: C:\Python Projects\wsu-gradschool-tools
# To: C:\Python Projects\GS Slate Editor V7
```

---

## Phase-by-Phase Rollback

### Rollback Phase 1 (Folder Rename)

**If folder rename caused issues:**

```powershell
# Simply rename back
# From: C:\Python Projects\wsu-gradschool-tools
# To: C:\Python Projects\GS Slate Editor V7

# Then verify git still works
cd "C:\Python Projects\GS Slate Editor V7"
git status
```

**Common Issues:**
- **Git not working:** The `.git` folder should have moved with the folder. If not, check if it exists.
- **Node modules issues:** Run `npm install` again
- **IDE workspace:** Update your IDE/editor workspace path

---

### Rollback Phase 2 (Monorepo Structure)

**If file moves caused issues:**

```powershell
# Option 1: Git revert (if committed)
git log --oneline
git revert COMMIT_HASH  # Revert the migration commit

# Option 2: Manual restore (if not committed)
# Move files back to root:
# - Move apps/wsu-tools/* back to root
# - Delete apps/ and packages/ folders
# - Restore root package.json
```

**Files to restore to root:**
- `app/`
- `components/`
- `lib/`
- `types/`
- `public/`
- `package.json`
- `package-lock.json`
- `next.config.js`
- `tailwind.config.ts`
- `postcss.config.js`
- `tsconfig.json`
- `next-env.d.ts`

---

### Rollback Phase 3 (Import Paths)

**If imports are broken:**

```powershell
# Check for import errors
cd apps/wsu-tools
npm run build  # Will show import errors

# Fix tsconfig.json paths
# Should be: "paths": { "@/*": ["./*"] }

# Or revert tsconfig.json changes
git checkout HEAD -- tsconfig.json
```

**Common Issues:**
- **Module not found:** Check `tsconfig.json` paths
- **Build fails:** Verify all imports use `@/` prefix correctly
- **Type errors:** May need to restart TypeScript server in IDE

---

### Rollback Phase 4 (Vercel Config)

**If Vercel deployment fails:**

```powershell
# Option 1: Remove vercel.json
git rm vercel.json
git commit -m "Revert: Remove vercel.json, use dashboard config"

# Option 2: Update Vercel Dashboard
# - Go to Project Settings
# - Set Root Directory back to: (empty/root)
# - Save and redeploy
```

**Vercel Dashboard Settings to Revert:**
- **Root Directory:** (empty) or `/`
- **Build Command:** `npm run build`
- **Output Directory:** `.next`

---

## Partial Rollback Options

### Keep Structure, Fix Issues

**If you want to keep the monorepo but fix specific problems:**

1. **Import Issues:**
   ```powershell
   # Check all imports
   cd apps/wsu-tools
   grep -r "@/components" . --include="*.ts" --include="*.tsx"
   grep -r "@/lib" . --include="*.ts" --include="*.tsx"
   
   # Verify tsconfig.json
   cat tsconfig.json | grep -A 2 "paths"
   ```

2. **Build Issues:**
   ```powershell
   # Clean and rebuild
   cd apps/wsu-tools
   rm -rf .next node_modules
   npm install
   npm run build
   ```

3. **Dev Server Issues:**
   ```powershell
   # From root
   npm install
   npm run dev
   
   # Or from app directory
   cd apps/wsu-tools
   npm run dev
   ```

---

## Alternative: Simplified Structure

**If full monorepo is too complex, use this simpler structure:**

```
wsu-gradschool-tools/
├── apps/
│   └── wsu-tools/          # All files here
│       └── [everything]
├── package.json            # Simple root package.json
└── README.md
```

**Steps:**
1. Keep `apps/wsu-tools/` with all files
2. Simplify root `package.json` (remove workspaces if causing issues)
3. Run commands from `apps/wsu-tools/` directly

---

## Verification Checklist (After Rollback)

After rolling back, verify:

- [ ] `git status` shows clean working tree
- [ ] `npm install` completes without errors
- [ ] `npm run dev` starts successfully
- [ ] Homepage loads: http://localhost:3000
- [ ] Editor loads: http://localhost:3000/editor
- [ ] Org chart loads: http://localhost:3000/orgchart
- [ ] `npm run build` completes successfully
- [ ] Vercel deployment works (if applicable)

---

## Git Commands Reference

```powershell
# See what changed
git status
git diff

# See commit history
git log --oneline -10

# Revert uncommitted changes
git checkout -- .

# Revert specific file
git checkout HEAD -- path/to/file

# Revert to specific commit
git reset --hard COMMIT_HASH

# Revert to remote state
git reset --hard origin/main

# Create backup branch before rollback
git branch backup-before-rollback
git checkout main
git reset --hard COMMIT_HASH
```

---

## Emergency Contacts/Resources

**If you need help:**

1. **Git Issues:**
   - Check: `git status`, `git log`
   - All changes should be in git history

2. **Build Issues:**
   - Check: `npm run build` output
   - Look for specific error messages

3. **Vercel Issues:**
   - Check Vercel dashboard deployment logs
   - Verify Root Directory setting

4. **Import Issues:**
   - Check `tsconfig.json` paths
   - Verify file structure matches imports

---

## Pre-Migration Backup

**Before starting migration, create a backup:**

```powershell
# Create a backup branch
git checkout -b backup-pre-migration
git push origin backup-pre-migration

# Or create a zip backup
# Right-click folder → Send to → Compressed folder
```

**This gives you a safe restore point!**

---

## Quick Decision Tree

```
Problem?
├─ Build fails?
│  ├─ Import errors? → Check tsconfig.json paths
│  ├─ Type errors? → Restart TypeScript server
│  └─ Other? → Check build output, fix specific error
│
├─ Dev server won't start?
│  ├─ Port in use? → Change port or kill process
│  ├─ Module errors? → Run npm install
│  └─ Other? → Check error message
│
├─ Vercel deployment fails?
│  ├─ Build error? → Check Root Directory setting
│  ├─ Config error? → Remove/update vercel.json
│  └─ Other? → Check Vercel logs
│
└─ Want to completely revert?
   └─ Use "Emergency Rollback" section above
```

---

## Last Resort: Fresh Clone

**If everything is broken and you need a fresh start:**

```powershell
# 1. Note your current branch/commit
git log --oneline -1

# 2. Go to parent directory
cd "C:\Python Projects"

# 3. Clone fresh copy
git clone https://github.com/gcrouch-wsu/WSU-Mail-Editor.git wsu-gradschool-tools-fresh

# 4. Checkout the commit before migration
cd wsu-gradschool-tools-fresh
git log --oneline
git checkout COMMIT_HASH_BEFORE_MIGRATION

# 5. Verify it works
npm install
npm run dev
```

**Then you can:**
- Copy over any uncommitted work
- Start migration again with lessons learned
- Or just use the fresh copy

---

## Notes

- **All git operations are reversible** (until you force push)
- **File moves are tracked by git** (git mv preserves history)
- **Vercel settings can always be changed** in dashboard
- **Local folder rename doesn't affect remote** (GitHub/Vercel)

**Remember:** You can always create a new branch to test the migration without affecting main!

