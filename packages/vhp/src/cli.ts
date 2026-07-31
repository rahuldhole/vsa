import { defineCommand, runMain } from 'citty'
import { createServer, build as viteBuild } from 'vite'
import { ViteScriptServerPlugin } from '@rahuldhole/vsa'
import vuePlugin from '@vitejs/plugin-vue'
import path from 'path'
import fs from 'fs'
import { createNitro, build as buildNitro } from 'nitropack'

const dev = defineCommand({
  meta: {
    name: 'dev',
    description: 'Start vsa development server'
  },
  args: {
    entry: {
      type: 'positional',
      description: 'Entry file (e.g., App.vhp)',
      required: false
    },
    port: {
      type: 'string',
      description: 'Port to run the server on',
      default: '3000'
    },
    dir: {
      type: 'string',
      description: 'Directory context to run VHP in',
      required: false
    }
  },
  async run({ args }) {
    const cwd = args.dir ? path.resolve(process.cwd(), args.dir) : process.cwd()
    const outDir = path.resolve(cwd, '.vhp')

    let entry = args.entry
    // Fallbacks
    if (!entry) {
      const files = fs.existsSync(cwd) ? fs.readdirSync(cwd) : []
      const findFile = (name: string) => files.find(f => f.toLowerCase() === name.toLowerCase())
      const appVhp = findFile('App.vhp')
      const indexVhp = findFile('index.vhp')
      const appXVue = findFile('App.x.vue')
      const indexXVue = findFile('index.x.vue')
      const appVue = findFile('App.vue')
      const indexVue = findFile('index.vue')
      
      if (appVhp) entry = appVhp
      else if (indexVhp) entry = indexVhp
      else if (appXVue) entry = appXVue
      else if (indexXVue) entry = indexXVue
      else if (appVue) entry = appVue
      else if (indexVue) entry = indexVue
    }

    if (!entry) {
      console.warn('No entry file provided and no default (App.vhp, App.vue) found. Running in standard Vite mode.')
    }

    const hasPagesDir = fs.existsSync(path.resolve(cwd, 'pages'))
    const globPattern = hasPagesDir 
      ? "'/pages/**/*.{vue,x.vue,vhp,vsa}'" 
      : "['/**/*.{vue,x.vue,vhp,vsa}', '!**/node_modules/**', '!**/.vhp/**']"
    const routePrefix = hasPagesDir ? '/pages' : '/'
    const isMultipage = !entry || entry.startsWith('index.')
    const importLine = entry ? `import App from '/${entry}'` : `const App = null`

    const htmlPlugin = () => {
      return {
        name: 'vsa-html-fallback',
        configureServer(server: any) {
          server.middlewares.use((req: any, res: any, next: any) => {
            const isHtmlGet = req.method === 'GET' && (req.headers.accept || '').includes('text/html')
            const isFile = req.url.includes('.')
            if (isHtmlGet && !isFile && !fs.existsSync(path.resolve(cwd, 'index.html'))) {
              const html = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>VSA App</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module">
      import { createApp, ref, defineComponent, h } from 'vue'
      ${importLine}
      import * as rpc from '#script-server'
      
      const currentPath = ref(window.location.pathname)
      window.addEventListener('popstate', () => {
        currentPath.value = window.location.pathname
      })
      window.navigate = (path) => {
        window.history.pushState({}, '', path)
        currentPath.value = path
      }

      const VhpPage = defineComponent({
        setup() {
          const pages = import.meta.glob(${globPattern}, { eager: true })
          const routes = {}
          for (const path in pages) {
            if (path.includes('/_') || path.includes('/.')) continue
            // If using App.vue layout, exclude it from routing to prevent infinite loop
            if (path.endsWith('/App.vue') || path.endsWith('/App.x.vue') || path.endsWith('/App.vhp') || path.endsWith('/App.vsa')) continue
            let routePath = path
              .replace('${routePrefix}', '')
              .replace(/\\.(vue|x\\.vue|vhp|vsa)$/i, '')
              .replace(/(^|\\/)index$/i, '')
            if (!routePath.startsWith('/')) {
              routePath = '/' + routePath
            }
            if (routePath === '') routePath = '/'
            routes[routePath] = pages[path].default
          }
          return () => {
            let path = currentPath.value
            if (path.endsWith('/') && path.length > 1) path = path.slice(0, -1)
            const comp = routes[path]
            if (comp) return h(comp)
            
            // Directory listing fallback
            const prefix = path === '/' ? '/' : path + '/'
            const childRoutes = Object.keys(routes).filter(r => 
              r.startsWith(prefix) && r !== path
            )
            if (childRoutes.length > 0) {
              const routeLinks = childRoutes.map(r => 
                h('li', {}, h('a', { 
                  href: r, 
                  onClick: (e) => { e.preventDefault(); window.navigate(r) },
                  style: 'color: #42b983; text-decoration: none; font-size: 1.1rem; line-height: 2;'
                }, r))
              )
              return h('div', { style: 'padding: 2rem; font-family: sans-serif;' }, [
                h('h2', {}, 'Index of ' + path),
                h('p', { style: 'color: #666;' }, 'No index page found. Showing nested routes:'),
                h('ul', { style: 'list-style-type: disc; padding-left: 20px;' }, routeLinks)
              ])
            }
            
            return h('div', { class: 'vhp-not-found' }, '404: Route not found')
          }
        }
      })
      
      const useMultipage = ${isMultipage}
      const rootComponent = useMultipage ? VhpPage : App
      
      const VhpLink = defineComponent({
        props: {
          to: { type: String, required: true }
        },
        setup(props, { slots }) {
          return () => h('a', {
            href: props.to,
            onClick: (e) => {
              e.preventDefault()
              window.navigate(props.to)
            }
          }, slots.default ? slots.default() : [])
        }
      })
      const app = createApp(rootComponent)
      app.component('VhpPage', VhpPage)
      app.component('VhpLink', VhpLink)
      app.provide('rpc', rpc)
      app.mount('#app')
    </script>
  </body>
</html>
              `
              res.setHeader('Content-Type', 'text/html')
              // Use Vite's transformIndexHtml to inject HMR scripts
              server.transformIndexHtml(req.url, html).then((transformed: string) => {
                res.end(transformed)
              })
              return
            }
            next()
          })
        }
      }
    }

    const server = await createServer({
      root: cwd,
      server: {
        port: parseInt(args.port, 10)
      },
      plugins: [
        ViteScriptServerPlugin({ outDir }),
        vuePlugin({
          include: [/\.vue$/, /\.vhp$/, /\.vsa$/, /\.x\.vue$/]
        }),
        htmlPlugin()
      ],
      resolve: {
        alias: {
          '#script-server': path.resolve(outDir, 'stubs/index.ts')
        }
      }
    })

    await server.listen()
    server.printUrls()
  }
})

const build = defineCommand({
  meta: {
    name: 'build',
    description: 'Build vsa for production'
  },
  args: {
    entry: {
      type: 'positional',
      description: 'Entry file (e.g., App.vhp)',
      required: false
    },
    dir: {
      type: 'string',
      description: 'Directory context to run VHP in',
      required: false
    }
  },
  async run({ args }) {
    const cwd = args.dir ? path.resolve(process.cwd(), args.dir) : process.cwd()
    const outDir = path.resolve(cwd, '.vhp')
    
    let entry = args.entry
    // Fallbacks
    if (!entry) {
      const files = fs.existsSync(cwd) ? fs.readdirSync(cwd) : []
      const findFile = (name: string) => files.find(f => f.toLowerCase() === name.toLowerCase())
      const appVhp = findFile('App.vhp')
      const indexVhp = findFile('index.vhp')
      const appXVue = findFile('App.x.vue')
      const indexXVue = findFile('index.x.vue')
      const appVue = findFile('App.vue')
      const indexVue = findFile('index.vue')
      
      if (appVhp) entry = appVhp
      else if (indexVhp) entry = indexVhp
      else if (appXVue) entry = appXVue
      else if (indexXVue) entry = indexXVue
      else if (appVue) entry = appVue
      else if (indexVue) entry = indexVue
    }

    if (!entry) {
      console.warn('No entry file provided and no default (App.vhp, App.vue) found. Running in standard Vite mode.')
    }

    const hasPagesDir = fs.existsSync(path.resolve(cwd, 'pages'))
    const globPattern = hasPagesDir 
      ? "'/pages/**/*.{vue,x.vue,vhp,vsa}'" 
      : "['/**/*.{vue,x.vue,vhp,vsa}', '!**/node_modules/**', '!**/.vhp/**']"
    const routePrefix = hasPagesDir ? '/pages' : '/'
    const isMultipage = !entry || entry.startsWith('index.')
    const importLine = entry ? `import App from '/${entry}'` : `const App = null`

    // 1. Build Client
    console.log('Building client...')
    await viteBuild({
      root: cwd,
      build: {
        outDir: path.resolve(outDir, 'dist/public'),
        emptyOutDir: true,
        rollupOptions: {
          // If no index.html exists, Vite will need a fallback input
          input: fs.existsSync(path.resolve(cwd, 'index.html')) ? path.resolve(cwd, 'index.html') : path.resolve(cwd, 'vsa-virtual-index.html')
        }
      },
      plugins: [
        ViteScriptServerPlugin({ outDir }),
        vuePlugin({
          include: [/\.vue$/, /\.vhp$/, /\.vsa$/, /\.x\.vue$/]
        }),
        {
          name: 'vsa-html-fallback-build',
          resolveId(id) {
            if (id === 'vsa-virtual-index.html' || id === path.resolve(cwd, 'vsa-virtual-index.html')) {
              return path.resolve(cwd, 'vsa-virtual-index.html')
            }
          },
          load(id) {
            if (id === path.resolve(cwd, 'vsa-virtual-index.html')) {
              return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>VSA App</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module">
      import { createApp, ref, defineComponent, h } from 'vue'
      ${importLine}
      import * as rpc from '#script-server'
      
      const currentPath = ref(window.location.pathname)
      window.addEventListener('popstate', () => {
        currentPath.value = window.location.pathname
      })
      window.navigate = (path) => {
        window.history.pushState({}, '', path)
        currentPath.value = path
      }

      const VhpPage = defineComponent({
        setup() {
          const pages = import.meta.glob(${globPattern}, { eager: true })
          const routes = {}
          for (const path in pages) {
            if (path.includes('/_') || path.includes('/.')) continue
            // If using App.vue layout, exclude it from routing to prevent infinite loop
            if (path.endsWith('/App.vue') || path.endsWith('/App.x.vue') || path.endsWith('/App.vhp') || path.endsWith('/App.vsa')) continue
            let routePath = path
              .replace('${routePrefix}', '')
              .replace(/\\.(vue|x\\.vue|vhp|vsa)$/i, '')
              .replace(/(^|\\/)index$/i, '')
            if (!routePath.startsWith('/')) {
              routePath = '/' + routePath
            }
            if (routePath === '') routePath = '/'
            routes[routePath] = pages[path].default
          }
          return () => {
            let path = currentPath.value
            if (path.endsWith('/') && path.length > 1) path = path.slice(0, -1)
            const comp = routes[path]
            if (comp) return h(comp)
            
            // Directory listing fallback
            const prefix = path === '/' ? '/' : path + '/'
            const childRoutes = Object.keys(routes).filter(r => 
              r.startsWith(prefix) && r !== path
            )
            if (childRoutes.length > 0) {
              const routeLinks = childRoutes.map(r => 
                h('li', {}, h('a', { 
                  href: r, 
                  onClick: (e) => { e.preventDefault(); window.navigate(r) },
                  style: 'color: #42b983; text-decoration: none; font-size: 1.1rem; line-height: 2;'
                }, r))
              )
              return h('div', { style: 'padding: 2rem; font-family: sans-serif;' }, [
                h('h2', {}, 'Index of ' + path),
                h('p', { style: 'color: #666;' }, 'No index page found. Showing nested routes:'),
                h('ul', { style: 'list-style-type: disc; padding-left: 20px;' }, routeLinks)
              ])
            }
            
            return h('div', { class: 'vhp-not-found' }, '404: Route not found')
          }
        }
      })
      
      const useMultipage = ${isMultipage}
      const rootComponent = useMultipage ? VhpPage : App
      
      const VhpLink = defineComponent({
        props: {
          to: { type: String, required: true }
        },
        setup(props, { slots }) {
          return () => h('a', {
            href: props.to,
            onClick: (e) => {
              e.preventDefault()
              window.navigate(props.to)
            }
          }, slots.default ? slots.default() : [])
        }
      })
      const app = createApp(rootComponent)
      app.component('VhpPage', VhpPage)
      app.component('VhpLink', VhpLink)
      app.provide('rpc', rpc)
      app.mount('#app')
    </script>
  </body>
</html>
              `
            }
          }
        }
      ],
      resolve: {
        alias: {
          '#script-server': path.resolve(outDir, 'stubs/index.ts')
        }
      }
    })

    const fallbackHtmlPath = path.resolve(outDir, 'dist/public/vsa-virtual-index.html')
    const realFallbackHtmlPath = path.resolve(outDir, `dist/public/${path.basename(cwd)}-virtual-index.html`)
    if (fs.existsSync(fallbackHtmlPath)) {
      fs.renameSync(fallbackHtmlPath, path.resolve(outDir, 'dist/public/index.html'))
    } else if (fs.existsSync(realFallbackHtmlPath)) {
      fs.renameSync(realFallbackHtmlPath, path.resolve(outDir, 'dist/public/index.html'))
    } else {
      // Sometimes Vite outputs it using the resolved name from Rollup
      const possibleName = path.resolve(outDir, 'dist/public', path.basename(cwd) + '/vsa-virtual-index.html')
      if (fs.existsSync(possibleName)) {
        fs.renameSync(possibleName, path.resolve(outDir, 'dist/public/index.html'))
      }
    }

    // 2. Generate Nitro Handler
    const handlerPath = path.resolve(outDir, 'nitro-rpc-handler.ts')
    const handlerCode = `
import { defineEventHandler, readBody, createError } from 'h3'
import * as registry from './script-server-registry'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { functionName, args } = body

  if (!functionName) {
    throw createError({ statusCode: 400, statusMessage: 'Missing functionName' })
  }

  if (typeof registry[functionName] !== 'function') {
    throw createError({ statusCode: 500, statusMessage: \`Function \${functionName} is not exported from <script server>\` })
  }

  try {
    const result = await registry[functionName](...(args || []))
    return result
  } catch (err: any) {
    console.error('Script Server Error:', err)
    throw createError({
      statusCode: 500,
      statusMessage: err.message || 'Internal Server Error'
    })
  }
})
`
    fs.writeFileSync(handlerPath, handlerCode)

    // 3. Build Nitro Server
    console.log('Building Nitro server...')
    const nitro = await createNitro({
      rootDir: cwd,
      buildDir: path.resolve(outDir, 'nitro'),
      compatibilityDate: '2024-04-03',
      serveStatic: true,
      output: {
        dir: path.resolve(cwd, '.output')
      },
      publicAssets: [
        {
          baseURL: '/',
          dir: path.resolve(outDir, 'dist/public'),
          maxAge: 3600
        }
      ],
      handlers: [
        {
          route: '/__script_server_rpc',
          handler: handlerPath
        }
      ]
    })
    
    // Ensure the output server directory exists for node-externals
    const outServerDir = path.resolve(cwd, '.output/server')
    if (!fs.existsSync(outServerDir)) {
      fs.mkdirSync(outServerDir, { recursive: true })
    }
    
    await buildNitro(nitro)

    // Copy public assets to .output/public
    const publicOutDir = path.resolve(cwd, '.output/public')
    const publicSrcDir = path.resolve(outDir, 'dist/public')
    if (fs.existsSync(publicSrcDir)) {
      if (fs.existsSync(publicOutDir)) {
        fs.rmSync(publicOutDir, { recursive: true, force: true })
      }
      fs.cpSync(publicSrcDir, publicOutDir, { recursive: true })
    }

    console.log('Build complete. Output in .output/')
  }
})

const main = defineCommand({
  meta: {
    name: 'vsa',
    version: '0.0.1',
    description: 'Vue Server Actions CLI'
  },
  subCommands: {
    dev,
    build
  }
})

runMain(main)
