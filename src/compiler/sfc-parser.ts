import MagicString from 'magic-string'
import fs from 'fs'
import path from 'path'

export const ViteScriptServerPlugin = () => {
  // Store the list of extracted function names
  let exportedFunctions: string[] = []

  return {
    name: 'vite-plugin-nuxt-script-server',
    enforce: 'pre' as const,
    
    resolveId(id: string) {
      if (id === '#script-server') {
        return '\0#script-server'
      }
    },

    load(id: string) {
      if (id === '\0#script-server') {
        const exportsCode = exportedFunctions.map(fnName => `
export const ${fnName} = async (...args) => {
  return await $fetch('/__script_server_rpc', {
    method: 'POST',
    body: { functionName: '${fnName}', args }
  })
}
        `).join('\n')
        
        return exportsCode
      }
    },

    transform(code: string, id: string) {
      if (!id.endsWith('.vue')) return null

      // Use a simple regex to find the <script server> block
      const match = code.match(/<script\s+server>([\s\S]*?)<\/script>/)
      if (!match) return null

      const serverCode = match[1]

      // Extract the exported function names
      const exportRegex = /export\s+(?:async\s+)?function\s+([a-zA-Z0-9_]+)/g
      let m
      while ((m = exportRegex.exec(serverCode)) !== null) {
        if (!exportedFunctions.includes(m[1])) {
          exportedFunctions.push(m[1])
        }
      }

      // Extract the server code and save it to a registry file
      const nuxtDir = path.resolve(process.cwd(), '.nuxt')
      if (!fs.existsSync(nuxtDir)) {
        fs.mkdirSync(nuxtDir, { recursive: true })
      }
      const registryPath = path.resolve(nuxtDir, 'script-server-registry.ts')
      
      // Overwrite for the MVP single-file demo.
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
