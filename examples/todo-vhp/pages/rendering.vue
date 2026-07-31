<script server>
import os from 'os'

export const serverInfo = async () => {
  return {
    hostname: os.hostname(),
    time: new Date(),
  }
}

export const serverHello = "hello from vhp server"
export const count = 5;
const serverOnlyMessage = "hello from vhp server only"
const serverOnlyCount = 10

export const serverAccessedInTemplate = "from server"
export const serverCountAccessedInTemplate = 7

console.log("server-only-message: ", serverOnlyMessage)

</script>

<script setup lang="ts">
import { ref, onMounted, inject } from 'vue'
import { serverInfo as fetchServerInfo, count as fetchCount, serverHello as fetchServerHello } from '#script-server'

const rpc = inject<any>('rpc')

const clientInfo = ref<{ browser: string; time: Date } | null>(null)
const getServerInfo = ref<{ hostname: string; time: Date } | null>(null)
const getDirectHello = ref<string | null>(null)
const getDirectCount = ref<number | null>(null)

const getServerInfoRpc = ref<{ hostname: string; time: Date } | null>(null)
const getServerHello = ref<string | null>(null)
const getCounter = ref<number | null>(null)

onMounted(async () => {
  clientInfo.value = {
    browser: navigator.userAgent,
    time: new Date(),
  }
  getServerInfo.value = await fetchServerInfo()
  getDirectHello.value = await fetchServerHello()
  getDirectCount.value = await fetchCount()

  getServerInfoRpc.value = await rpc.serverInfo()
  getServerHello.value = await rpc.serverHello()
  getCounter.value = await rpc.count()
})

const clientHello = "hello from vhp"
console.log("client: ", clientHello)
</script>

<template>
  <div>
    <h1>Rendering Demos</h1>
    <h2>1. Client Side</h2>
    <template v-if="clientInfo">
      {{ clientInfo.browser }} <br />
      {{ clientInfo.time }} <br />
      {{ clientHello }} <br />
    </template>
    <br />
    <h2>1.5. ClientOnly Component</h2>
    <ClientOnly>
      <div>This text and block is wrapped in <code>&lt;ClientOnly&gt;</code>.</div>
      <div v-if="clientInfo">{{ clientInfo.browser }} (ClientOnly)</div>
    </ClientOnly>
    <br />
    <h2>2. Server Side Data Hydration Illusion (Direct Import)</h2>
    <template v-if="getServerInfo">
      {{ getServerInfo.hostname }} <br />
      {{ getServerInfo.time }} <br />
      {{ getDirectHello }} <br />
      Count is: {{ getDirectCount }} <br />
    </template>
    <br />
    <h2>3. Server Side Data Hydration Illusion (RPC Inject)</h2>
    <template v-if="getServerInfoRpc">
      {{ getServerInfoRpc.hostname }} <br />
      {{ getServerInfoRpc.time }} <br />
      {{ getServerHello }} <br />
    </template>

    <h2>4. Server Side SSR Rendered</h2>
    <div>The exported variables</div>
    {{ serverAccessedInTemplate }}
    <template v-for="i in serverCountAccessedInTemplate" :key="i">
      {{ i }}
    </template>
    
    

    <div>Server only (non exported) will not be visible:</div>
    {{  serverOnlyMessage }} <br />
    <template v-for="i in serverOnlyCount" :key="i">
      {{ i }}<br />
    </template>
    <hr />

    <section class="comparison">
      <h2>Comparison: RPC Inject vs Direct Import</h2>
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
            <td>Requires careful setup (e.g., generics)</td>
            <td>Implicitly strong (inferred from module)</td>
          </tr>
          <tr>
            <td><strong>Use Case</strong></td>
            <td>Large apps, dynamic calls, high convenience</td>
            <td>Small components, strict bundle sizes</td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>

<style scoped>
.comparison {
  margin-top: 2rem;
}
.comparison h2 {
  font-size: 1.25rem;
  margin-bottom: 1rem;
}
table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 2rem;
}
th, td {
  border: 1px solid #ddd;
  padding: 8px 12px;
  text-align: left;
}
th {
  background-color: #f4f4f4;
  font-weight: bold;
}
</style>
