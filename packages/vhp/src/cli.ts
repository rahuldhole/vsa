import { defineCommand, runMain } from 'citty'
import { createServer } from 'vite'
import { ViteScriptServerPlugin } from '@rahuldhole/vsa'
import vuePlugin from '@vitejs/plugin-vue'
import path from 'path'
import fs from 'fs'

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
    const outDir = path.resolve(cwd, '.vsa')

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

const main = defineCommand({
  meta: {
    name: 'vsa',
    version: '0.0.1',
    description: 'Vue Server Actions CLI'
  },
  subCommands: {
    dev
  }
})

runMain(main)
