import { defineNuxtModule, addVitePlugin, addServerHandler, createResolver, addImportsDir, addPluginTemplate } from '@nuxt/kit'
import fs from 'fs'
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
    
    // 2.5 Add Nitro middleware for API routes
    addServerHandler({
      middleware: true,
      handler: resolver.resolve('./runtime/api-middleware')
    })

    // 3. Alias #script-server to the real generated stubs file
    const stubsDir = path.resolve(nuxtDir, 'stubs')
    const stubsPath = path.resolve(stubsDir, 'index.ts')
    const apiRegistryPath = path.resolve(nuxtDir, 'script-server-api.ts')
    
    // Ensure the stubs file exists synchronously so `unimport` doesn't complain during setup
    if (!fs.existsSync(stubsDir)) {
      fs.mkdirSync(stubsDir, { recursive: true })
    }
    
    if (!fs.existsSync(apiRegistryPath)) {
      fs.writeFileSync(apiRegistryPath, 'export const apiRoutes: Record<string, any> = {};\n', 'utf-8')
    }
    
    // Pre-scan for exports so unimport registers them immediately
    let exportedFunctions: string[] = []
    function scanForServerExports(dir: string) {
      if (!fs.existsSync(dir)) return
      const files = fs.readdirSync(dir)
      for (const file of files) {
        const fullPath = path.join(dir, file)
        if (fs.statSync(fullPath).isDirectory()) {
          if (!file.startsWith('.') && file !== 'node_modules') {
            scanForServerExports(fullPath)
          }
        } else if (fullPath.endsWith('.vue')) {
          const code = fs.readFileSync(fullPath, 'utf-8')
          const match = code.match(/<script\s+server>([\s\S]*?)<\/script>/)
          if (match) {
            const exportRegex = /export\s+(?:(?:async\s+)?function\s+|(?:const|let|var)\s+)([a-zA-Z0-9_]+)/g
            let m
            while ((m = exportRegex.exec(match[1])) !== null) {
              if (!exportedFunctions.includes(m[1])) {
                exportedFunctions.push(m[1])
              }
            }
          }
        }
      }
    }
    scanForServerExports(nuxt.options.srcDir)
    
    const initialCode = exportedFunctions.map(fn => `export const ${fn} = (...args: any[]) => {} as any`).join('\n')
    fs.writeFileSync(stubsPath, initialCode || 'export {}', 'utf-8')

    nuxt.options.alias['#script-server'] = stubsPath
    nuxt.options.alias['#script-server-api'] = apiRegistryPath
    
    // 4. Register the stubs directory for auto-imports
    addImportsDir(stubsDir)
    
    // 5. Inject a global Vue plugin to provide `$rpc` for templates
    addPluginTemplate({
      filename: 'script-server-plugin.mjs',
      getContents() {
        return `
import { defineNuxtPlugin } from '#app'
import * as rpc from '#script-server'

export default defineNuxtPlugin(() => {
  return {
    provide: { rpc }
  }
})
`
      }
    })

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
