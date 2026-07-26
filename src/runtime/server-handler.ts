import { defineEventHandler, readBody, createError } from 'h3'
import path from 'path'
import fs from 'fs'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { functionName, args } = body

  if (!functionName) {
    throw createError({ statusCode: 400, statusMessage: 'Missing functionName' })
  }

  try {
    const registryPath = path.resolve(process.cwd(), '.nuxt/script-server-registry.ts')
    
    // In dev mode, we can use jiti or dynamic import.
    // Nitro has access to the filesystem.
    if (!fs.existsSync(registryPath)) {
      throw new Error('Server registry not found')
    }

    // Use dynamic import with cache busting
    const registry = await import(registryPath + '?t=' + Date.now())

    if (typeof registry[functionName] !== 'function') {
      throw new Error(`Function ${functionName} is not exported from <script server>`)
    }

    // Execute the function
    const result = await registry[functionName](...(args || []))
    return result

  } catch (err: any) {
    console.error('Script Server Error:', err)
    throw createError({
      statusCode: 500,
      statusMessage: err.message || 'Internal Server Error',
      data: err.stack
    })
  }
})
