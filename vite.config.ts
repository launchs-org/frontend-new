import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(),tailwindcss()],
  base: '/ui/',
  server: {
    watch: {
      usePolling: true
    },
    allowedHosts: ["test.launchs.org"],
    hmr: {
      // nginx経由でアクセスされる外部ポートに合わせる
      clientPort: 8950,
    }
  }
})
