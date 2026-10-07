import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  // Dynamic base path determination:
  // - If VITE_BASE_PATH is provided, use it
  // - If built in GitHub Actions (GITHUB_REPOSITORY is set e.g. "owner/repo"):
  //   - If repo is "owner.github.io", base is "/"
  //   - If repo is project page, base is "/repo/" to prevent 404 on assets
  // - Otherwise fallback to "./" (relative path for local, Vercel, Netlify, custom domains)
  const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1];
  const isUserPage = repoName?.toLowerCase().endsWith('.github.io');
  const basePath =
    process.env.VITE_BASE_PATH ||
    (repoName ? (isUserPage ? '/' : `/${repoName}/`) : './');

  return {
    base: basePath,
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
