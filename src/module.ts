import { defineNuxtModule, addVitePlugin, addServerHandler, createResolver } from '@nuxt/kit'
import { ViteScriptServerPlugin } from './compiler/sfc-parser'
import path from 'path'

export default defineNuxtModule({
  meta: {
    name: 'vsa',
    configKey: 'scriptServer'
  },
  setup(options, nuxt) {
    const resolver = createResolver(import.meta.url)

    // The .nuxt directory where we'll write generated files
    const nuxtDir = nuxt.options.buildDir

    // 1. Add Vite Plugin to parse <script server>, write stubs and registry
    addVitePlugin(ViteScriptServerPlugin({ outDir: nuxtDir }))

    // 2. Add Nitro server handler for RPC
    addServerHandler({
      route: '/__script_server_rpc',
      handler: resolver.resolve('./runtime/server-handler')
    })

    // 3. Alias #script-server to the real generated stubs file
    const stubsPath = path.resolve(nuxtDir, 'script-server-stubs.ts')
    nuxt.options.alias['#script-server'] = stubsPath

    // Add typescript definitions for the virtual module
    nuxt.hook('prepare:types', (opts) => {
      opts.declarations.push(`declare module '#script-server' {
  export const getTopUsers: (limit?: number) => Promise<any>;
  export const updateUsername: (id: number, newName: string) => Promise<any>;
}`)
    })
  }
})

export { ViteScriptServerPlugin } from './compiler/sfc-parser'
