import { createUnplugin } from 'unplugin'
import MagicString from 'magic-string'
import { parse } from '@vue/compiler-sfc'
import fs from 'fs'
import path from 'path'

// We will write the extracted server functions to a file that the Nitro handler can import.
// For the MVP, we assume a single app.vue or a few files, and we just export everything from them.
let serverFunctions = ''

export const ViteScriptServerPlugin = () => {
  return {
    name: 'vite-plugin-nuxt-script-server',
    enforce: 'pre' as const,
    transform(code: string, id: string) {
      if (!id.endsWith('.vue')) return null

      // Use a simple regex to find the <script server> block
      const match = code.match(/<script\s+server>([\s\S]*?)<\/script>/)
      if (!match) return null

      const serverCode = match[1]

      // Extract the server code and save it to a registry file
      // In a real implementation, we'd use a virtual module or proper AST parsing
      // to handle multiple files and name collisions.
      const nuxtDir = path.resolve(process.cwd(), '.nuxt')
      if (!fs.existsSync(nuxtDir)) {
        fs.mkdirSync(nuxtDir, { recursive: true })
      }
      const registryPath = path.resolve(nuxtDir, 'script-server-registry.ts')
      
      // We just append or overwrite for the MVP. Overwrite is safer for a single file demo.
      fs.writeFileSync(registryPath, serverCode)

      // Remove the <script server> block from the client/server vue components
      const s = new MagicString(code)
      s.remove(match.index!, match.index! + match[0].length)

      return {
        code: s.toString(),
        map: s.generateMap({ source: id, includeContent: true })
      }
    }
  }
}
