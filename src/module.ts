import { defineNuxtModule, addVitePlugin, addServerHandler, createResolver, addTemplate } from '@nuxt/kit'
import { ViteScriptServerPlugin } from './compiler/sfc-parser'

export default defineNuxtModule({
  meta: {
    name: 'nuxt-script-server',
    configKey: 'scriptServer'
  },
  setup(options, nuxt) {
    const resolver = createResolver(import.meta.url)

    // 1. Add Vite Plugin to parse <script server>
    addVitePlugin(ViteScriptServerPlugin())

    // 2. Add Nitro server handler for RPC
    addServerHandler({
      route: '/__script_server_rpc',
      handler: resolver.resolve('./runtime/server-handler')
    })

    // 3. Setup virtual module alias for client stubs
    nuxt.options.alias['#script-server'] = resolver.resolve('./runtime/client-stub')

    // Add typescript definitions for the virtual module
    nuxt.hook('prepare:types', (options) => {
      options.declarations.push(`declare module '#script-server' {
  // This would ideally be generated dynamically based on the parsed SFCs.
  // For the MVP, we assume developers will use it dynamically or we provide a generic type.
  export const getTopUsers: (limit?: number) => Promise<any>;
  export const updateUsername: (id: number, newName: string) => Promise<any>;
}`)
    })
  }
})
