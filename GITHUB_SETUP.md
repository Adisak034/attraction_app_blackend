# GitHub Setup Instructions

## 1. Create a GitHub Repository

1. Go to https://github.com/new
2. Create a new repository:
   - **Repository name**: `temple_blackend` (or your preferred name)
   - **Description**: Next.js admin panel for managing temple attractions
   - **Visibility**: Public or Private (your choice)
   - **Initialize with:** Leave unchecked (we already have code)
3. Click **Create repository**

## 2. Initialize Git (if not already done)

In your project directory, run:

```bash
git init
git add .
git commit -m "Initial commit: Temple backend admin panel with attractions, users, images, and ratings management"
```

## 3. Add Remote and Push to GitHub

After creating the repository, GitHub will show you commands. Use these:

```bash
git remote add origin https://github.com/YOUR_USERNAME/temple_blackend.git
git branch -M main
git push -u origin main
```

Replace `YOUR_USERNAME` with your actual GitHub username.

## 4. (Optional) Create .gitignore

Make sure you have a `.gitignore` file in your project root:

```
node_modules/
.next/
out/
.env
.env.local
*.log
public/uploads/
```

This prevents uploading dependencies, build files, and uploaded images to GitHub.

## 5. Verify

View your repository at: `https://github.com/YOUR_USERNAME/temple_blackend`

---

## If Using SSH (Alternative)

If you prefer SSH authentication:

1. Set up SSH key: https://docs.github.com/en/authentication/connecting-to-github-with-ssh
2. Use SSH URL instead:
   ```bash
   git remote add origin git@github.com:YOUR_USERNAME/temple_blackend.git
   git push -u origin main
   ```

## Future Pushes

After the first push, just use:
```bash
git add .
git commit -m "Your commit message"
git push
```
