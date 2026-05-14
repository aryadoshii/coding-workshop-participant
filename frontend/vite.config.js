import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/login': 'http://localhost:8001',
      '/logout': 'http://localhost:8001',
      '/me': 'http://localhost:8001',
      '/employees': 'http://localhost:8002',
      '/reviews': 'http://localhost:8003',
      '/competencies': 'http://localhost:8004',
      '/training': 'http://localhost:8005',
      '/plans': 'http://localhost:8006',
    }
  }
})