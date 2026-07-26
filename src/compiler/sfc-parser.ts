import MagicString from 'magic-string'
import fs from 'fs'
import path from 'path'

export const ViteScriptServerPlugin = (nuxtDir: string) => {
  let exportedFunctions: string[] = []

  function scanDir(dir: string) {
    if (!fs.existsSync(dir)) return
    const files = fs.readdirSync(dir)
    for (const file of files) {
      const fullPath = path.join(dir, file)
      if (fs.statSync(fullPath).isDirectory()) {
        if (!file.startsWith('.') && file !== 'node_modules') {
          scanDir(fullPath)
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

  function writeClientStubs() {
    if (!fs.existsSync(nuxtDir)) {
      fs.mkdirSync(nuxtDir, { recursive: true })
    }
    const stubPath = path.resolve(nuxtDir, 'script-server-stubs.ts')
    const code = exportedFunctions.map(fnName => `
export const ${fnName} = async (...args: any[]) => {
  const res = await $fetch('/__script_server_rpc', {
    method: 'POST',
    body: { functionName: '${fnName}', args }
  })
  return res
}
`).join('\n')
    fs.writeFileSync(stubPath, code)
  }

  return {
    name: 'vite-plugin-nuxt-script-server',
    enforce: 'pre' as const,

    buildStart() {
      exportedFunctions = []
      scanDir(process.cwd())
      console.log('[vite-plugin-nuxt-script-server] Found server exports:', exportedFunctions)
      writeClientStubs()
    },

    transform(code: string, id: string) {
      if (!id.endsWith('.vue')) return null

      // Use a simple regex to find the <script server> block
      const match = code.match(/<script\s+server>([\s\S]*?)<\/script>/)
      if (!match) return null

      const serverCode = match[1]

      // Extract the exported function names (in case transform runs before buildStart on HMR)
      const exportRegex = /export\s+(?:(?:async\s+)?function\s+|(?:const|let|var)\s+)([a-zA-Z0-9_]+)/g
      let m
      while ((m = exportRegex.exec(serverCode)) !== null) {
        if (!exportedFunctions.includes(m[1])) {
          exportedFunctions.push(m[1])
        }
      }

      // Write server code to registry for the Nitro handler
      const registryPath = path.resolve(nuxtDir, 'script-server-registry.ts')
      fs.writeFileSync(registryPath, serverCode)

      // Re-generate client stubs (handles HMR case)
      writeClientStubs()

      // Remove the <script server> block from the Vue SFC
      const s = new MagicString(code)
      s.remove(match.index!, match.index! + match[0].length)

      return {
        code: s.toString(),
        map: s.generateMap({ source: id, includeContent: true })
      }
    }
  }
}
