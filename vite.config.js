import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  server: {
    open: true,
    host: true
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        photography: resolve(__dirname, 'photography.html'),
        videos: resolve(__dirname, 'videos.html'),
        projects: resolve(__dirname, 'projects.html'),
        secret: resolve(__dirname, 'secret.html'),
      }
    }
  },
  publicDir: 'public'
})