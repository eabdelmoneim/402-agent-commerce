import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        //target: 'https://ed9373bbd298.ngrok-free.app',
        changeOrigin: true,
      },
    },
  },
})
