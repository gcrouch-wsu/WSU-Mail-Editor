# Migration Plan: Monorepo Structure for WSU Graduate School Tools

## Overview
Migrating from a single-app structure to a monorepo structure with the folder renamed to `wsu-gradschool-tools`.

**Target Structure:**
```
wsu-gradschool-tools/
├── apps/
│   └── wsu-tools/              # Current Next.js app (newsletter + org chart)
│       ├── app/
│       ├── components/
│       ├── lib/
│       ├── types/
│       ├── public/
│       ├── package.json
│       └── next.config.js
├── packages/                   # Shared code (future use)
│   └── shared/                 # (optional, for future shared utilities)
├── package.json                # Root workspace config
├── README.md
└── .gitignore
```

---

## Phase 1: Rename Local Folder (SAFE - No Code Changes)
**Goal:** Rename the folder without breaking anything  
**Risk:** ⚠️ Low - Only affects local file system  
**Time:** ~5 minutes

### Steps:
1. **Close any running dev servers or processes**
2. **Rename the folder:**
   - From: `C:\Python Projects\GS Slate Editor V7`
   - To: `C:\Python Projects\wsu-gradschool-tools`
3. **Verify Git still works:**
   ```powershell
   cd "C:\Python Projects\wsu-gradschool-tools"
   git status
   git remote -v
   ```
4. **Test that everything still works:**
   ```powershell
   npm install  # Reinstall if needed (node_modules might have absolute paths)
   npm run dev
   ```

### What This Affects:
- ✅ **GitHub:** No impact (linked via remote URL)
- ✅ **Vercel:** No impact (linked to GitHub repo)
- ⚠️ **Local:** IDE workspace, any scripts with absolute paths

### Rollback:
Simply rename the folder back if needed.

---

## Phase 2: Create Monorepo Structure
**Goal:** Set up the folder structure and move current app  
**Risk:** ⚠️ Medium - Moving files, but git will track  
**Time:** ~15-20 minutes

### Steps:

1. **Create new folder structure:**
   ```powershell
   mkdir apps
   mkdir apps\wsu-tools
   mkdir packages
   ```

2. **Move all current app files to `apps/wsu-tools/`:**
   - Move: `app/`, `components/`, `lib/`, `types/`, `public/`
   - Move: `package.json`, `package-lock.json`
   - Move: `next.config.js`, `tailwind.config.ts`, `postcss.config.js`
   - Move: `tsconfig.json`, `next-env.d.ts`
   - Move: `README.md` (or create new root one)
   - Keep: `.git/`, `.gitignore` (at root)

3. **Create root `package.json` for workspace:**
   ```json
   {
     "name": "wsu-gradschool-tools",
     "version": "1.0.0",
     "private": true,
     "workspaces": [
       "apps/*",
       "packages/*"
     ],
     "scripts": {
       "dev": "npm run dev --workspace=apps/wsu-tools",
       "build": "npm run build --workspace=apps/wsu-tools",
       "start": "npm run start --workspace=apps/wsu-tools"
     }
   }
   ```

4. **Update `apps/wsu-tools/package.json`:**
   - Change name to: `"name": "wsu-tools"`
   - Keep all other configs the same

5. **Commit the structure:**
   ```powershell
   git add .
   git commit -m "Restructure: Move to monorepo with apps/wsu-tools"
   ```

### What This Affects:
- ⚠️ **Imports:** All `@/` imports will need path updates (Phase 3)
- ⚠️ **Configs:** `tsconfig.json` paths need updating
- ✅ **Git:** Will track all moves properly

### Rollback:
```powershell
git reset --hard HEAD~1  # Revert the commit
```

---

## Phase 3: Update Import Paths and Configurations
**Goal:** Fix all import paths and config files  
**Risk:** ⚠️ Medium - Need to update many files  
**Time:** ~30-45 minutes

### Files to Update:

1. **`apps/wsu-tools/tsconfig.json`:**
   ```json
   {
     "compilerOptions": {
       "paths": {
         "@/*": ["./*"]  // Update if needed
       }
     },
     "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"]
   }
   ```

2. **All import statements using `@/`:**
   - These should still work if `tsconfig.json` paths are correct
   - Verify: `grep -r "@/components" apps/wsu-tools/`
   - Verify: `grep -r "@/lib" apps/wsu-tools/`
   - Verify: `grep -r "@/types" apps/wsu-tools/`

3. **`apps/wsu-tools/next.config.js`:**
   - Should work as-is, but verify

4. **Test imports:**
   ```powershell
   cd apps/wsu-tools
   npm run build  # Should catch any import errors
   ```

### What This Affects:
- ⚠️ **Build:** Must verify build works
- ⚠️ **Dev server:** Must verify dev works
- ✅ **Runtime:** Should work if paths are correct

### Rollback:
Revert Phase 2 commit if issues arise.

---

## Phase 4: Update Vercel Configuration
**Goal:** Configure Vercel to work with monorepo  
**Risk:** ⚠️ Low - Vercel supports monorepos well  
**Time:** ~10 minutes

### Steps:

1. **Create `vercel.json` at root (if needed):**
   ```json
   {
     "buildCommand": "cd apps/wsu-tools && npm run build",
     "outputDirectory": "apps/wsu-tools/.next",
     "installCommand": "npm install",
     "framework": "nextjs",
     "rootDirectory": "apps/wsu-tools"
   }
   ```

   OR configure in Vercel dashboard:
   - **Root Directory:** `apps/wsu-tools`
   - **Build Command:** `npm run build` (runs in root directory)
   - **Output Directory:** `.next`

2. **Update Vercel project settings:**
   - Go to Vercel Dashboard → Project Settings
   - Set **Root Directory** to: `apps/wsu-tools`
   - Save and redeploy

3. **Test deployment:**
   ```powershell
   git push origin main
   # Watch Vercel deployment
   ```

### What This Affects:
- ⚠️ **Deployment:** Must verify Vercel builds correctly
- ✅ **GitHub:** No changes needed

### Rollback:
Revert `vercel.json` or change Root Directory back in dashboard.

---

## Phase 5: Testing and Documentation
**Goal:** Verify everything works and update docs  
**Risk:** ⚠️ Low - Just verification  
**Time:** ~20-30 minutes

### Steps:

1. **Local Testing:**
   ```powershell
   # From root
   npm install
   npm run dev
   
   # Test all routes:
   # - http://localhost:3000 (homepage)
   # - http://localhost:3000/editor
   # - http://localhost:3000/orgchart
   ```

2. **Build Testing:**
   ```powershell
   npm run build
   npm run start
   # Test production build
   ```

3. **Update Documentation:**
   - Update `README.md` with new structure
   - Update any setup instructions
   - Document the monorepo structure

4. **Final Commit:**
   ```powershell
   git add .
   git commit -m "Complete monorepo migration"
   git push origin main
   ```

### What This Affects:
- ✅ **Everything:** Final verification

---

## Alternative: Simpler Approach (If Issues Arise)

If the full monorepo causes issues, we can use a simpler structure:

```
wsu-gradschool-tools/
├── apps/
│   └── wsu-tools/          # Just move everything here
│       └── [all current files]
├── package.json            # Simple root package.json
└── README.md
```

This keeps the monorepo structure but minimizes changes.

---

## Risk Assessment Summary

| Phase | Risk Level | Can Break | Rollback Ease |
|-------|-----------|-----------|---------------|
| Phase 1 | 🟢 Low | Nothing | Easy (rename back) |
| Phase 2 | 🟡 Medium | Imports | Easy (git revert) |
| Phase 3 | 🟡 Medium | Build/Dev | Medium (fix paths) |
| Phase 4 | 🟢 Low | Deployment | Easy (revert config) |
| Phase 5 | 🟢 Low | Nothing | N/A |

---

## Recommended Approach

**Option A: All at Once (Faster)**
- Do Phases 1-3 in one session
- Test thoroughly
- Then do Phases 4-5

**Option B: Incremental (Safer)**
- Phase 1 → Test → Commit
- Phase 2 → Test → Commit
- Phase 3 → Test → Commit
- Phase 4 → Test → Commit
- Phase 5 → Final verification

**Recommendation:** Option B (Incremental) for safety, especially if this is a production app.

---

## Questions to Consider

1. **Do you want to keep the current app as one app, or split newsletter and org chart into separate apps?**
   - Current plan: Keep as one app (`apps/wsu-tools`)
   - Alternative: Split into `apps/mail-editor` and `apps/org-chart`

2. **Do you need shared packages now, or can that wait?**
   - Current plan: Create `packages/` folder but leave empty for now

3. **Should we update the GitHub repo name too?**
   - Current: `WSU-Mail-Editor`
   - Could rename to: `wsu-gradschool-tools` (optional, separate step)

---

## Next Steps

1. Review this plan
2. Decide on approach (Option A or B)
3. Start with Phase 1
4. Test after each phase
5. Proceed to next phase when ready

