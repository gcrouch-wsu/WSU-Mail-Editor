# Vercel Deployment Troubleshooting Guide

## Common Issues and Solutions

### 1. **File System Access in Serverless Functions**

Your API routes use `process.cwd()` to read files from the `public` directory. This should work on Vercel, but there are a few things to check:

**Issue:** Files in `public/` might not be accessible via `fs` in serverless functions.

**Solution:** Files in `public/` are served statically by Next.js. For API routes that need to read these files, ensure:
- Files exist in the `public/` directory
- Files are committed to git (not in `.gitignore`)
- The path resolution is correct

**Current Implementation:**
```typescript
const filePath = join(process.cwd(), 'public', fileName)
```

This should work, but if it doesn't, you might need to use an alternative approach.

### 2. **Check Vercel Build Logs**

To see the actual error:
1. Go to your Vercel dashboard
2. Click on the failed deployment
3. Check the "Build Logs" tab
4. Look for:
   - TypeScript compilation errors
   - Missing dependencies
   - File not found errors
   - Build timeout errors

### 3. **Common Error Types**

#### TypeScript Errors
- **Symptom:** Build fails with TypeScript compilation errors
- **Solution:** Run `npm run build` locally to catch these errors first
- **Check:** Ensure all TypeScript files compile without errors

#### Missing Dependencies
- **Symptom:** `Module not found` errors
- **Solution:** Ensure all dependencies are in `package.json` (not just `devDependencies`)
- **Check:** Run `npm install` and verify `node_modules` is up to date

#### File Not Found
- **Symptom:** `ENOENT` errors when reading files
- **Solution:** Ensure files in `public/` are committed to git
- **Check:** Verify files exist in the repository on GitHub

#### Build Timeout
- **Symptom:** Build times out after 45 seconds
- **Solution:** Optimize build process, check for slow operations
- **Check:** Review build logs for slow steps

### 4. **Verification Steps**

1. **Check if files are in git:**
   ```bash
   git ls-files public/
   ```
   Should show all files including:
   - `Wordpress.js`
   - `Wordpress.css`
   - `orgchart-admin.html`
   - `orgchart-center.html`
   - `orgchart-vertical.html`
   - `orgchart-horizontal.html`
   - `admin.js`

2. **Check TypeScript compilation:**
   ```bash
   npx tsc --noEmit
   ```

3. **Check build locally (if possible):**
   ```bash
   npm run build
   ```

### 5. **Alternative Approach for File Reading**

If `process.cwd()` doesn't work on Vercel, you could:

**Option A: Use Next.js static file serving**
Instead of reading files in API routes, serve them directly:
- Move files to `/public/orgchart/` 
- Access via `/orgchart/Wordpress.js` instead of `/api/orgchart/runtime.js`

**Option B: Embed files at build time**
Import files as strings in the API routes (if they're small enough).

**Option C: Use environment variables**
Store file contents in environment variables (not recommended for large files).

### 6. **Next.js Configuration**

Check `next.config.js` - ensure it's properly configured:
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
}

module.exports = nextConfig
```

### 7. **Vercel Project Settings**

In Vercel dashboard, check:
- **Framework Preset:** Should be "Next.js"
- **Root Directory:** Should be "." (root)
- **Build Command:** Should be "npm run build" (default)
- **Output Directory:** Should be ".next" (default)
- **Install Command:** Should be "npm install" (default)

### 8. **Node.js Version**

Check `package.json` for `engines` field:
```json
{
  "engines": {
    "node": ">=18.0.0"
  }
}
```

Vercel uses Node.js 18.x by default, which should be fine.

## Next Steps

1. **Get the actual error message** from Vercel build logs
2. **Share the error** so we can provide a specific fix
3. **Check the build logs** for specific file paths or line numbers

## Quick Fixes to Try

1. **Ensure all files are committed:**
   ```bash
   git add public/
   git commit -m "Ensure public files are committed"
   git push
   ```

2. **Clear Vercel cache:**
   - In Vercel dashboard, go to Settings → General
   - Click "Clear Build Cache"
   - Redeploy

3. **Check for TypeScript errors:**
   ```bash
   npx tsc --noEmit
   ```

4. **Verify package.json scripts:**
   - Ensure `build` script exists: `"build": "next build"`

