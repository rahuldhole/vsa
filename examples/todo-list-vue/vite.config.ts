import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { ViteScriptServerPlugin } from '@rahuldhole/vsa/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    ViteScriptServerPlugin(),
    vue()
  ],
  optimizeDeps: {
    exclude: ['better-sqlite3']
  },
  ssr: {
    external: ['better-sqlite3']
  }
})
