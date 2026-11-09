import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pages serves the site at https://<username>.github.io/rain-check/,
  // so this must match the repository name
  base: '/rain-check/',
})
