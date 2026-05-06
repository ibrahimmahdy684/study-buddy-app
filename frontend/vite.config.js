import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000,
    proxy: {
      '/graphql': {
        target: process.env.VITE_GRAPHQL_ENDPOINT || 'http://localhost:4000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
