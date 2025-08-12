import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api/spacescan': {
        target: 'https://api.spacescan.io',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/spacescan/, ''),
        headers: {
          'x-api-key': 'esL8oRqzao1qQ6f5kYbB16iQ2C9zdXOl8BNm72Us'
        }
      }
    }
  }
}) 