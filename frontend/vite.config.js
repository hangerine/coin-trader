import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // server: {
  //   host: true,          // listen on 0.0.0.0 for Docker
  //   port: 5173,
  //   strictPort: true,
  //   watch: {
  //     usePolling: true,  // required for reliable file change detection on mounted volumes
  //     interval: 300,
  //   },
  // },
})
