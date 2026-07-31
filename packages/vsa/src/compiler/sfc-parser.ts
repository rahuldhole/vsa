import MagicString from 'magic-string'
import fs from 'fs'
import path from 'path'
import process from 'node:process'

export interface ScriptServerOptions {
  // Directory to write the stubs and registry (e.g. .nuxt or node_modules/.cache/script-server)
  outDir?: string
}

const API_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD']

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
            const fnName = m[1]
            if (!API_METHODS.includes(fnName) && !exportedFunctions.includes(fnName)) {
              exportedFunctions.push(fnName)
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
    const currentCode = fs.existsSync(stubPath) ? fs.readFileSync(stubPath, 'utf-8') : ''
    if (currentCode !== code) {
      fs.writeFileSync(stubPath, code)
    }
  }

  function pathToRoute(filePath: string, root: string): string {
    const relative = path.relative(root, filePath).replace(/\\/g, '/')
    let routePath = ''
    
    const pagesMatch = relative.match(/(?:^|\/)pages\/(.+)\.(?:vue|vhp|vsa|x\.vue)$/)
    if (pagesMatch) {
      routePath = pagesMatch[1]
    } else {
      // If root is already the pages directory (like with vhp dev --dir pages)
      const extMatch = relative.match(/(.+)\.(?:vue|vhp|vsa|x\.vue)$/)
      if (extMatch && !relative.startsWith('..')) {
        routePath = extMatch[1]
      }
    }
    
    if (!routePath) return ''
    if (routePath === 'index') return '/'
    
    routePath = routePath.replace(/\/index$/, '')
    // replace [param] with :param
    routePath = routePath.replace(/\[([^\]]+)\]/g, ':$1')
    // Catch-all [...slug] -> **
    routePath = routePath.replace(/:(\.\.\.[^/]+)/g, '**')
    
    return '/' + routePath
  }

  function writeServerRegistry() {
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true })
    }
    const registryPath = path.resolve(outDir, 'script-server-registry.ts')

    // Write each file's server code as a separate module to avoid symbol collisions
    const reExports: string[] = []
    const apiReExports: string[] = []
    apiReExports.push(`export const apiRoutes: Record<string, any> = {};`)
    
    let moduleIndex = 0
    for (const [filePath, serverCode] of serverCodeMap.entries()) {
      const moduleName = `_server_module_${moduleIndex++}`
      const modulePath = path.resolve(outDir, `${moduleName}.ts`)
      const currentModuleCode = fs.existsSync(modulePath) ? fs.readFileSync(modulePath, 'utf-8') : ''
      if (currentModuleCode !== serverCode) {
        fs.writeFileSync(modulePath, serverCode)
      }

      // Collect which exports come from this module
      const exportRegex = /export\s+(?:(?:async\s+)?function\s+|(?:const|let|var)\s+)([a-zA-Z0-9_]+)/g
      let m
      const exportNames: string[] = []
      while ((m = exportRegex.exec(serverCode)) !== null) {
        const fnName = m[1]
        if (!API_METHODS.includes(fnName)) {
          exportNames.push(fnName)
        }
      }
      if (exportNames.length > 0) {
        reExports.push(`export { ${exportNames.join(', ')} } from './${moduleName}'`)
      }
      
      const routePath = pathToRoute(filePath, viteRoot || process.cwd())
      if (routePath) {
        apiReExports.push(`import * as _api_${moduleIndex} from './${moduleName}';`)
        apiReExports.push(`apiRoutes['${routePath}'] = _api_${moduleIndex};`)
      }
    }

    // Write a registry that re-exports from all modules for RPC
    const registryCode = reExports.join('\n') + '\n'
    const currentRegistryCode = fs.existsSync(registryPath) ? fs.readFileSync(registryPath, 'utf-8') : ''
    if (currentRegistryCode !== registryCode) {
      fs.writeFileSync(registryPath, registryCode)
    }
    
    // Write API registry
    const apiCode = apiReExports.join('\n') + '\n'
    const apiPath = path.resolve(outDir, 'script-server-api.ts')
    const currentApiCode = fs.existsSync(apiPath) ? fs.readFileSync(apiPath, 'utf-8') : ''
    if (currentApiCode !== apiCode) {
      fs.writeFileSync(apiPath, apiCode)
    }
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
      // Add dev server middleware for pure Vite + Vue apps to handle API routes
      server.middlewares.use(async (req: import('http').IncomingMessage, res: import('http').ServerResponse, next: Function) => {
        if (!req.url || req.url === '/__script_server_rpc') return next()
        
        try {
          const apiRegistryPath = path.resolve(outDir, 'script-server-api.ts')
          if (!fs.existsSync(apiRegistryPath)) return next()
          
          // In Vite dev, URL path without query
          const urlPath = req.url.split('?')[0]
          const apiModule = await server.ssrLoadModule(apiRegistryPath)
          const apiRoutes = apiModule.apiRoutes
          
          if (apiRoutes && apiRoutes[urlPath]) {
            const handlers = apiRoutes[urlPath]
            const method = req.method || 'GET'
            if (typeof handlers[method] === 'function') {
              // Execute the API handler
              // For pure Vite apps, we mock a simple event object or just pass req/res
              // To keep it simple, we pass { req, res }
              const result = await handlers[method]({ req, res, method, path: urlPath })
              
              if (result !== undefined) {
                if (result instanceof Response) {
                  // Forward standard Web Response headers and status
                  result.headers.forEach((value, key) => {
                    res.setHeader(key, value)
                  })
                  res.statusCode = result.status
                  
                  const arrayBuffer = await result.arrayBuffer()
                  res.end(Buffer.from(arrayBuffer))
                  return
                }
                
                if (result instanceof Buffer) {
                  if (!res.hasHeader('Content-Type')) res.setHeader('Content-Type', 'application/octet-stream')
                  res.end(result)
                } else if (typeof result === 'object' && result !== null) {
                  if (!res.hasHeader('Content-Type')) res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify(result))
                } else {
                  if (!res.hasHeader('Content-Type')) res.setHeader('Content-Type', 'text/html')
                  res.end(String(result))
                }
                return
              }
            }
          }
        } catch (err) {
          console.error('Script Server API Error:', err)
        }
        next()
      })

      // Add dev server middleware for RPC
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

            if (registry[functionName] === undefined) {
              res.statusCode = 500
              res.end(JSON.stringify({ error: `Export ${functionName} is not found in <script server>` }))
              return
            }

            const exportedValue = registry[functionName]
            const result = typeof exportedValue === 'function' ? await exportedValue(...(args || [])) : exportedValue
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

    transform(code: string, id: string, options?: { ssr?: boolean }) {
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
        const fnName = m[1]
        if (!API_METHODS.includes(fnName) && !exportedFunctions.includes(fnName)) {
          exportedFunctions.push(fnName)
        }
      }

      // Store this file's server code in the map and write merged registry
      serverCodeMap.set(cleanId, serverCode)
      writeServerRegistry()

      // Re-generate client stubs (handles HMR case)
      writeClientStubs()

      // Remove the <script server> block from the Vue SFC
      const s = new MagicString(code)
      s.remove(match.index!, match.index! + match[0].length)

      if (options?.ssr) {
        // Strip 'export ' so it doesn't break <script setup> compilation
        const injectCode = serverCode.replace(/export\s+/g, '')
        const setupMatch = code.match(/<script\s+setup[^>]*>/)
        if (setupMatch) {
          s.appendRight(setupMatch.index! + setupMatch[0].length, '\n' + injectCode + '\n')
        } else {
          s.prepend('<script setup>\n' + injectCode + '\n</script>\n')
        }
      } else {
        // Mock server-only variables on client so Vue doesn't complain during hydration
        const varRegex = /(?:const|let|var)\s+([a-zA-Z0-9_]+)/g
        const funcRegex = /function\s+([a-zA-Z0-9_]+)/g
        
        let clientMocks = ''
        let m2
        while ((m2 = varRegex.exec(serverCode)) !== null) {
          if (!exportedFunctions.includes(m2[1])) {
             clientMocks += `const ${m2[1]} = undefined;\n`
          }
        }
        while ((m2 = funcRegex.exec(serverCode)) !== null) {
          if (!exportedFunctions.includes(m2[1])) {
             clientMocks += `const ${m2[1]} = () => {};\n`
          }
        }
        
        if (clientMocks) {
          const setupMatch = code.match(/<script\s+setup[^>]*>/)
          if (setupMatch) {
            s.appendRight(setupMatch.index! + setupMatch[0].length, '\n' + clientMocks + '\n')
          } else {
            s.prepend('<script setup>\n' + clientMocks + '\n</script>\n')
          }
        }
      }

      // If the file lacks a template (e.g. it was an API-only file), Vue compiler will complain.
      // We automatically inject an empty template to appease it.
      if (!/<template[\s\S]*?>/.test(s.toString())) {
        s.append('\n<template></template>\n')
      }

      return {
        code: s.toString(),
        map: s.generateMap({ source: id, includeContent: true })
      }
    }
  }
}
