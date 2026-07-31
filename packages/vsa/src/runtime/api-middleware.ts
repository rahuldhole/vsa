import { defineEventHandler, createRouter, H3Event } from 'h3'

// @ts-ignore
import { apiRoutes } from '#script-server-api'

const router = createRouter()

for (const [route, handlers] of Object.entries(apiRoutes)) {
  for (const [method, handler] of Object.entries(handlers as Record<string, any>)) {
    if (typeof handler === 'function' && ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'].includes(method)) {
      const h3Method = method.toLowerCase()
      router.add(route, defineEventHandler(async (event: H3Event) => {
        const result = await handler(event)
        if (result !== undefined) {
          return result
        }
        // Return undefined to let H3 fall through to Nuxt page renderer
      }), h3Method as any)
    }
  }
}

export default defineEventHandler((event: H3Event) => {
  return router.handler(event)
})
