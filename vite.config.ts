import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  build: {
    minify: true,
    lib: {
      entry: './lib/main.ts',
      name: 'index',
      fileName: 'index',
    },
  },
})
