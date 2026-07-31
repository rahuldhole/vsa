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
    }
  },
  async run({ args }) {
    const cwd = process.cwd()
    const outDir = path.resolve(cwd, '.vhp')

    let entry = args.entry
    // Fallbacks
    if (!entry) {
      if (fs.existsSync(path.resolve(cwd, 'App.vhp'))) entry = 'App.vhp'
      else if (fs.existsSync(path.resolve(cwd, 'index.vhp'))) entry = 'index.vhp'
      else if (fs.existsSync(path.resolve(cwd, 'App.x.vue'))) entry = 'App.x.vue'
      else if (fs.existsSync(path.resolve(cwd, 'index.x.vue'))) entry = 'index.x.vue'
      else if (fs.existsSync(path.resolve(cwd, 'App.vue'))) entry = 'App.vue'
      else if (fs.existsSync(path.resolve(cwd, 'index.vue'))) entry = 'index.vue'
    }

    if (!entry) {
      console.warn('No entry file provided and no default (App.vhp, App.vue) found. Running in standard Vite mode.')
    }

    const htmlPlugin = () => {
      return {
        name: 'vsa-html-fallback',
        configureServer(server: any) {
          server.middlewares.use((req: any, res: any, next: any) => {
            if (req.url === '/' && !fs.existsSync(path.resolve(cwd, 'index.html'))) {
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
      import { createApp } from 'vue'
      import App from '/${entry}'
      import * as rpc from '#script-server'
      
      const app = createApp(App)
      app.provide('rpc', rpc)
      app.mount('#app')
    </script>
  </body>
</html>
              `
              res.setHeader('Content-Type', 'text/html')
              // Use Vite's transformIndexHtml to inject HMR scripts
              server.transformIndexHtml('/', html).then((transformed: string) => {
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
    }
  },
  async run({ args }) {
    const cwd = process.cwd()
    const outDir = path.resolve(cwd, '.vhp')
    
    let entry = args.entry
    // Fallbacks
    if (!entry) {
      if (fs.existsSync(path.resolve(cwd, 'App.vhp'))) entry = 'App.vhp'
      else if (fs.existsSync(path.resolve(cwd, 'index.vhp'))) entry = 'index.vhp'
      else if (fs.existsSync(path.resolve(cwd, 'App.x.vue'))) entry = 'App.x.vue'
      else if (fs.existsSync(path.resolve(cwd, 'index.x.vue'))) entry = 'index.x.vue'
      else if (fs.existsSync(path.resolve(cwd, 'App.vue'))) entry = 'App.vue'
      else if (fs.existsSync(path.resolve(cwd, 'index.vue'))) entry = 'index.vue'
    }

    if (!entry) {
      console.warn('No entry file provided and no default (App.vhp, App.vue) found. Running in standard Vite mode.')
    }

    // 1. Build Client
    console.log('Building client...')
    await viteBuild({
      root: cwd,
      build: {
        outDir: path.resolve(outDir, 'dist/public'),
        emptyOutDir: true,
        rollupOptions: {
          // If no index.html exists, Vite will need a fallback input
          input: fs.existsSync(path.resolve(cwd, 'index.html')) ? path.resolve(cwd, 'index.html') : 'vsa-virtual-index.html'
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
            if (id === 'vsa-virtual-index.html') {
              return id
            }
          },
          load(id) {
            if (id === 'vsa-virtual-index.html') {
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
      import { createApp } from 'vue'
      import App from '/${entry}'
      import * as rpc from '#script-server'
      
      const app = createApp(App)
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
    if (fs.existsSync(fallbackHtmlPath)) {
      fs.renameSync(fallbackHtmlPath, path.resolve(outDir, 'dist/public/index.html'))
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
      output: {
        dir: path.resolve(cwd, '.output')
      },
      publicAssets: [
        {
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
