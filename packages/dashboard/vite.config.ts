import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  plugins: [react(), tailwindcss(), basicSsl()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    // Expose on the LAN so a phone can open the mobile Node app;
    // HTTPS (self-signed) is required for microphone access off-localhost.
    host: true,
    proxy: {
      '/api': 'http://localhost:4000',
      // Same-origin bridges so the HTTPS phone page avoids mixed-content blocking
      '/lora': 'http://localhost:4001',
      '/uploads': 'http://localhost:4000',
      '/socket.io': {
        target: 'http://localhost:4000',
        ws: true,
      },
    },
  },
})
