import MagicString from 'magic-string'
import fs from 'fs'
import path from 'path'

export interface ScriptServerOptions {
  // Directory to write the stubs and registry (e.g. .nuxt or node_modules/.cache/script-server)
  outDir?: string
}

export const ViteScriptServerPlugin = (options: ScriptServerOptions = {}): any => {
  let exportedFunctions: string[] = []
  // Map of file ID -> server code block, so multiple files' <script server> blocks are merged
  const serverCodeMap: Map<string, string> = new Map()
  let viteRoot: string = ''
  const outDir = options.outDir || path.resolve(process.cwd(), 'node_modules/.cache/script-server')

  function scanDir(dir: string) {
    if (!fs.existsSync(dir)) return
    const files = fs.readdirSync(dir)
    for (const file of files) {
      const fullPath = path.join(dir, file)
      if (fs.statSync(fullPath).isDirectory()) {
        if (!file.startsWith('.') && file !== 'node_modules') {
          scanDir(fullPath)
        }
      } else if (fullPath.endsWith('.vue') || fullPath.endsWith('.vhp') || fullPath.endsWith('.x.vue') || fullPath.endsWith('.vsa')) {
        const code = fs.readFileSync(fullPath, 'utf-8')
        const match = code.match(/<script\s+server>([\s\S]*?)<\/script>/)
        if (match) {
          // Store this file's server code in the map for registry merging
          serverCodeMap.set(fullPath, match[1])

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
    const stubsDir = path.resolve(outDir, 'stubs')
    if (!fs.existsSync(stubsDir)) {
      fs.mkdirSync(stubsDir, { recursive: true })
    }
    const stubPath = path.resolve(stubsDir, 'index.ts')
    // Support both Nuxt's $fetch and standard fetch for pure Vue apps
    const code = exportedFunctions.map(fnName => `
export const ${fnName} = async (...args: any[]) => {
  const fetcher = typeof $fetch !== 'undefined' ? $fetch : (url: string, opts: any) => fetch(url, {
    method: opts.method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(opts.body)
  }).then(r => r.json());

  const res = await fetcher('/__script_server_rpc', {
    method: 'POST',
    body: { functionName: '${fnName}', args }
  })
  return res
}
`).join('\n')
    fs.writeFileSync(stubPath, code)
  }

  function writeServerRegistry() {
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true })
    }
    const registryPath = path.resolve(outDir, 'script-server-registry.ts')

    // Write each file's server code as a separate module to avoid symbol collisions
    const reExports: string[] = []
    let moduleIndex = 0
    for (const [filePath, serverCode] of serverCodeMap.entries()) {
      const moduleName = `_server_module_${moduleIndex++}`
      const modulePath = path.resolve(outDir, `${moduleName}.ts`)
      fs.writeFileSync(modulePath, serverCode)

      // Collect which exports come from this module
      const exportRegex = /export\s+(?:(?:async\s+)?function\s+|(?:const|let|var)\s+)([a-zA-Z0-9_]+)/g
      let m
      const exportNames: string[] = []
      while ((m = exportRegex.exec(serverCode)) !== null) {
        exportNames.push(m[1])
      }
      if (exportNames.length > 0) {
        reExports.push(`export { ${exportNames.join(', ')} } from './${moduleName}'`)
      }
    }

    // Write a registry that re-exports from all modules
    fs.writeFileSync(registryPath, reExports.join('\n') + '\n')
  }

  return {
    name: 'vite-plugin-vue-script-server',
    enforce: 'pre' as const,

    // Capture the Vite-resolved project root so we only scan the current app
    configResolved(config: any) {
      viteRoot = config.root
    },

    buildStart() {
      exportedFunctions = []
      serverCodeMap.clear()
      const scanRoot = viteRoot || process.cwd()
      console.log('[vite-plugin-vue-script-server] Scanning root:', scanRoot, '(viteRoot:', viteRoot, ')')
      scanDir(scanRoot)
      console.log('[vite-plugin-vue-script-server] Found server exports:', exportedFunctions)
      writeClientStubs()
      writeServerRegistry()
    },

    config() {
      return {
        resolve: {
          alias: {
            '#script-server': path.resolve(outDir, 'stubs/index.ts')
          }
        }
      }
    },

    configureServer(server: any) {
      // Add dev server middleware for pure Vite + Vue apps
      server.middlewares.use('/__script_server_rpc', async (req: import('http').IncomingMessage, res: import('http').ServerResponse) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end('Method Not Allowed')
          return
        }

        let body = ''
        req.on('data', (chunk: Buffer) => {
          body += chunk.toString()
        })
        req.on('end', async () => {
          try {
            const { functionName, args } = JSON.parse(body)
            if (!functionName) {
              res.statusCode = 400
              res.end(JSON.stringify({ error: 'Missing functionName' }))
              return
            }

            const registryPath = path.resolve(outDir, 'script-server-registry.ts')
            if (!fs.existsSync(registryPath)) {
              res.statusCode = 500
              res.end(JSON.stringify({ error: 'Server registry not found' }))
              return
            }

            // Using Vite's ssrLoadModule to evaluate the file with ES modules support
            const registry = await server.ssrLoadModule(registryPath)

            if (typeof registry[functionName] !== 'function') {
              res.statusCode = 500
              res.end(JSON.stringify({ error: `Function ${functionName} is not exported from <script server>` }))
              return
            }

            const result = await registry[functionName](...(args || []))
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(result))

          } catch (err: any) {
            console.error('Script Server Error:', err)
            res.statusCode = 500
            res.end(JSON.stringify({ error: err.message || 'Internal Server Error' }))
          }
        })
      })
    },

    transform(code: string, id: string) {
      const cleanId = id.split('?')[0]
      if (!cleanId.endsWith('.vue') && !cleanId.endsWith('.vhp') && !cleanId.endsWith('.x.vue') && !cleanId.endsWith('.vsa')) return null

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

      // Store this file's server code in the map and write merged registry
      serverCodeMap.set(id, serverCode)
      writeServerRegistry()

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
