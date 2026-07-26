// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@rahuldhole/vsa'
  ],
  scriptServer: {
    // any custom options
  },
  vite: {
    optimizeDeps: { exclude: ['better-sqlite3'] },
    ssr: { external: ['better-sqlite3'] }
  }
})
