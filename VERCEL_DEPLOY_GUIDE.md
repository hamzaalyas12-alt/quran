# 🚀 Vercel & GitHub Deployment Guide for Halqa Tracker (حلقہ ٹریکر)

### ⚠️ If you encountered `ERESOLVE could not resolve peerOptional esbuild...`:
This error occurred because Vercel was executing `npm install` without `--legacy-peer-deps` while `esbuild` was listed in `devDependencies`.

**This has now been fixed in the codebase:**
1. `esbuild` was removed from `devDependencies` in `package.json` (Vite and tsx manage their own esbuild dependencies).
2. `vercel.json` now explicitly sets:
   ```json
   "installCommand": "npm install --legacy-peer-deps"
   ```
3. `.npmrc` contains `legacy-peer-deps=true`.

---

## 🔄 How to Push the Fix to GitHub so Vercel Automatically Redeploys:

On your computer in the project folder, run:

```bash
git add .
git commit -m "Fix Vercel peer dependency resolution with --legacy-peer-deps"
git push origin main
```

As soon as you push to GitHub, Vercel will automatically detect the new commit and deploy successfully!

---

### Alternative: If deploying directly from Vercel Dashboard
In your Vercel Dashboard project settings:
1. Go to **Settings > General**.
2. Under **Build & Development Settings**:
   - Enable **Override** for **Install Command**.
   - Set it to:
     ```bash
     npm install --legacy-peer-deps
     ```
3. Click **Save** and click **Redeploy**.
