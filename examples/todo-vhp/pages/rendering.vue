<script server>
import os from 'os'

export async function GET() {
  return {
    message: 'Hello from rendering.vue GET API!',
    serverTime: new Date(),
    hostname: os.hostname()
  }
}

export async function POST(event) {
  const body = event.req ? await new Promise(resolve => {
    let data = '';
    event.req.on('data', chunk => data += chunk);
    event.req.on('end', () => resolve(JSON.parse(data || '{}')));
  }) : (typeof readBody !== 'undefined' ? await readBody(event) : {});

  return {
    success: true,
    message: 'Hello from rendering.vue POST API!',
    receivedBody: body
  }
}

// 1. RPC Endpoints (Methods)
export const getServerInfo = async () => {
  return {
    hostname: os.hostname(),
    time: new Date(),
  }
}
export const getMessage = async () => "Hello from VHP RPC"
export const getCount = async () => 5

// 2. Public State (Exported Variables) - Hydrated globally, accessible everywhere
export const publicMessage = "This is a public server variable (hydrated)"
export const publicItems = [1, 2, 3]

// 3. Private State (Unexported Variables) - Server-only, hydrated globally for SSR but private
const privateMessage = "This is a private server variable (server-only)"
const privateItems = [4, 5, 6]

// Log on server
console.log("[Server] rendering.vue initialized")
</script>

<script setup lang="ts">
import { ref, onMounted, inject } from 'vue'
import { 
  getServerInfo as fetchServerInfo, 
  getMessage as fetchMessage,
  getCount as fetchCount
} from '#script-server'

const rpc = inject<any>('rpc')

// --- Client-Side State ---
const clientInfo = ref<{ browser: string; time: Date } | null>(null)
const clientMessage = "Hello from Vue Client"

// --- Direct Import State ---
const directServerInfo = ref<{ hostname: string; time: Date } | null>(null)
const directMessage = ref<string | null>(null)
const directCount = ref<number | null>(null)

// --- RPC Inject State ---
const rpcServerInfo = ref<{ hostname: string; time: Date } | null>(null)
const rpcMessage = ref<string | null>(null)
const rpcCount = ref<number | null>(null)

// --- API Test State ---
const apiGetResult = ref<any>(null)
const apiPostResult = ref<any>(null)
const apiPostInput = ref('Test payload')

const testGetApi = async () => {
  try {
    const res = await fetch(window.location.pathname, {
      headers: { 'Accept': 'application/json' }
    })
    apiGetResult.value = await res.json()
  } catch (e: any) {
    apiGetResult.value = { error: e.message }
  }
}

const testPostApi = async () => {
  try {
    const res = await fetch(window.location.pathname, {
      method: 'POST',
      headers: { 
        'Accept': 'application/json',
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ text: apiPostInput.value })
    })
    apiPostResult.value = await res.json()
  } catch (e: any) {
    apiPostResult.value = { error: e.message }
  }
}

onMounted(async () => {
  // 1. Client initialization
  clientInfo.value = {
    browser: navigator.userAgent,
    time: new Date(),
  }
  
  // 2. Fetch via Direct Import (Tree-shaken)
  directServerInfo.value = await fetchServerInfo()
  directMessage.value = await fetchMessage()
  directCount.value = await fetchCount()

  // 3. Fetch via RPC Inject (Global)
  rpcServerInfo.value = await rpc.getServerInfo()
  rpcMessage.value = await rpc.getMessage()
  rpcCount.value = await rpc.getCount()

  // 4. Test Private State Accessibility
  try {
    console.log("Testing privateMessage access:", privateMessage)
  } catch (err: any) {
    console.warn("Expected ReferenceError for privateMessage:", err.message)
  }
})
</script>

<template>
  <div class="rendering-guide">
    <header>
      <h1>VHP Rendering Patterns</h1>
      <p>A comprehensive guide to state hydration and RPC in Vue HTML Protocol.</p>
    </header>

    <div class="grid">
      <!-- 1. Client-Side Rendering -->
      <section class="card">
        <h2>1. Client-Side Rendering</h2>
        <p class="desc">State generated entirely on the browser after mount.</p>
        <div class="content" v-if="clientInfo">
          <p><strong>Browser:</strong> {{ clientInfo.browser }}</p>
          <p><strong>Time:</strong> {{ clientInfo.time.toLocaleTimeString() }}</p>
          <p><strong>Message:</strong> {{ clientMessage }}</p>
        </div>
        
        <ClientOnly>
          <div class="client-only-badge">
            Loaded via <code>&lt;ClientOnly&gt;</code>
          </div>
        </ClientOnly>
      </section>

      <!-- 2. Direct Import (RPC) -->
      <section class="card">
        <h2>2. Direct Import (RPC)</h2>
        <p class="desc">Fetching server data via tree-shaken <code>#script-server</code> imports.</p>
        <div class="content" v-if="directServerInfo">
          <p><strong>Server Host:</strong> {{ directServerInfo.hostname }}</p>
          <p><strong>Server Time:</strong> {{ new Date(directServerInfo.time).toLocaleTimeString() }}</p>
          <p><strong>Message:</strong> {{ directMessage }}</p>
          <p><strong>Count:</strong> {{ directCount }}</p>
        </div>
        <div v-else class="loading">Loading...</div>
      </section>

      <!-- 3. Global Inject (RPC) -->
      <section class="card">
        <h2>3. Global Inject (RPC)</h2>
        <p class="desc">Fetching server data via the global <code>inject('rpc')</code> client.</p>
        <div class="content" v-if="rpcServerInfo">
          <p><strong>Server Host:</strong> {{ rpcServerInfo.hostname }}</p>
          <p><strong>Server Time:</strong> {{ new Date(rpcServerInfo.time).toLocaleTimeString() }}</p>
          <p><strong>Message:</strong> {{ rpcMessage }}</p>
          <p><strong>Count:</strong> {{ rpcCount }}</p>
        </div>
        <div v-else class="loading">Loading...</div>
      </section>

      <!-- 4. Public State Hydration -->
      <section class="card">
        <h2>4. Public State (Exported)</h2>
        <p class="desc">Exported variables are automatically hydrated and available everywhere.</p>
        <div class="content">
          <p><strong>Message:</strong> {{ publicMessage }}</p>
          <p><strong>Items:</strong> <span v-for="i in publicItems" :key="i" class="tag">{{ i }}</span></p>
        </div>
        <ClientOnly>
          <div class="client-only-box">
            Works in ClientOnly: <strong>{{ publicMessage }}</strong>
          </div>
        </ClientOnly>
      </section>

      <!-- 5. Private State Hydration -->
      <section class="card">
        <h2>5. Private State (Unexported)</h2>
        <p class="desc">Unexported variables hydrate for SSR templates, but remain private.</p>
        <div class="content">
          <p><strong>Message:</strong> {{ privateMessage }}</p>
          <p><strong>Items:</strong> <span v-for="i in privateItems" :key="i" class="tag">{{ i }}</span></p>
        </div>
        <ClientOnly>
          <div class="client-only-box error">
            <span v-if="privateMessage">{{ privateMessage }}</span>
            <span v-else>Fails in ClientOnly (Expected)</span>
          </div>
        </ClientOnly>
      </section>

      <!-- 6. Same-File API Handlers -->
      <section class="card" style="grid-column: 1 / -1">
        <h2>6. Same-File API Handlers</h2>
        <p class="desc">Fetching JSON from the same URL by setting the <code>Accept: application/json</code> header.</p>
        
        <div style="display: flex; gap: 1rem; margin-bottom: 1rem;">
          <button @click="testGetApi" class="btn">Test GET API</button>
        </div>
        <pre class="content" v-if="apiGetResult" style="overflow-x: auto; font-size: 0.85rem;">{{ JSON.stringify(apiGetResult, null, 2) }}</pre>

        <div style="display: flex; gap: 1rem; margin-bottom: 1rem; align-items: center;">
          <input v-model="apiPostInput" type="text" class="input" />
          <button @click="testPostApi" class="btn">Test POST API</button>
        </div>
        <pre class="content" v-if="apiPostResult" style="overflow-x: auto; font-size: 0.85rem;">{{ JSON.stringify(apiPostResult, null, 2) }}</pre>
      </section>
    </div>

    <!-- Comparison Table -->
    <section class="comparison">
      <h2>RPC Inject vs Direct Import</h2>
      <table>
        <thead>
          <tr>
            <th>Feature</th>
            <th><code>inject('rpc')</code></th>
            <th><code>import { fn } from '#script-server'</code></th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Scope</strong></td>
            <td>Global access to all server functions</td>
            <td>Targeted access to specific functions</td>
          </tr>
          <tr>
            <td><strong>Tree-shaking</strong></td>
            <td>Less optimal (bundles all stubs)</td>
            <td>Highly optimized (bundles only imported stubs)</td>
          </tr>
          <tr>
            <td><strong>Type Safety</strong></td>
            <td>Requires explicit generics</td>
            <td>Implicitly strong (inferred from module)</td>
          </tr>
          <tr>
            <td><strong>Use Case</strong></td>
            <td>Large apps, dynamic calls</td>
            <td>Small components, strict bundle sizes</td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>

<style scoped>
.rendering-guide {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  font-family: system-ui, -apple-system, sans-serif;
  color: #333;
}

header {
  margin-bottom: 3rem;
  text-align: center;
}

header h1 {
  font-size: 2.5rem;
  color: #2c3e50;
  margin-bottom: 0.5rem;
}

header p {
  color: #666;
  font-size: 1.1rem;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 2rem;
  margin-bottom: 4rem;
}

.card {
  background: #fff;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.1);
  border: 1px solid #eaeaea;
  display: flex;
  flex-direction: column;
}

.card h2 {
  font-size: 1.25rem;
  color: #42b883;
  margin-top: 0;
  margin-bottom: 0.5rem;
}

.desc {
  font-size: 0.9rem;
  color: #777;
  margin-bottom: 1.5rem;
  line-height: 1.4;
}

.content {
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  flex-grow: 1;
}

.content p {
  margin: 0.5rem 0;
  font-size: 0.95rem;
}

.tag {
  display: inline-block;
  background: #e2e8f0;
  padding: 2px 8px;
  border-radius: 4px;
  margin-right: 4px;
  font-size: 0.85rem;
}

.loading {
  color: #999;
  font-style: italic;
  padding: 1rem;
}

.client-only-badge {
  background: #e6f6ff;
  color: #0066cc;
  padding: 0.75rem;
  border-radius: 6px;
  font-size: 0.9rem;
  text-align: center;
  border: 1px dashed #b3d9ff;
}

.client-only-box {
  background: #f0fdf4;
  color: #166534;
  padding: 0.75rem;
  border-radius: 6px;
  font-size: 0.9rem;
  text-align: center;
  border: 1px dashed #bbf7d0;
}

.client-only-box.error {
  background: #fef2f2;
  color: #991b1b;
  border-color: #fecaca;
}

.comparison {
  background: #fff;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  border: 1px solid #eaeaea;
}

.comparison h2 {
  color: #2c3e50;
  margin-top: 0;
  margin-bottom: 1.5rem;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  padding: 1rem;
  text-align: left;
  border-bottom: 1px solid #eaeaea;
}

th {
  background-color: #f8f9fa;
  font-weight: 600;
  color: #444;
}

tr:last-child td {
  border-bottom: none;
}

.btn {
  background: #42b883;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-weight: bold;
}

.btn:hover {
  background: #33a06f;
}

.input {
  border: 1px solid #eaeaea;
  padding: 0.5rem;
  border-radius: 6px;
  font-size: 1rem;
  flex-grow: 1;
}
</style>
