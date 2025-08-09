import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // Set the correct base path for GitHub Pages (repo name)
  // This ensures built asset URLs are prefixed with /WOPR/
  base: '/wopr/',
  plugins: [react()],
})
