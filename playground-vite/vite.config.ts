import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { ViteScriptServerPlugin } from '../dist/module.mjs'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    ViteScriptServerPlugin(),
    vue()
  ],
})
