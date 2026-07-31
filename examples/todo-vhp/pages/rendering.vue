<script server>
import os from 'os'

export const serverInfo = async () => {
  return {
    hostname: os.hostname(),
    time: new Date(),
  }
}

// const serverHello = "hello from vhp server"
// console.log("server: ", serverHello);
</script>

<script setup lang="ts">
import { ref, onMounted, inject } from 'vue'
import { serverInfo as fetchServerInfo } from '#script-server'

const rpc = inject<any>('rpc')

const clientInfo = ref<{ browser: string; time: Date } | null>(null)
const getServerInfo = ref<{ hostname: string; time: Date } | null>(null)
const getServerInfoRpc = ref<{ hostname: string; time: Date } | null>(null)

onMounted(async () => {
  clientInfo.value = {
    browser: navigator.userAgent,
    time: new Date(),
  }
  getServerInfo.value = await fetchServerInfo()
  getServerInfoRpc.value = await rpc.serverInfo()
})

const clientHello = "hello from vhp"
console.log("client: ", clientHello)
</script>

<template>
  <div>
    <h1>Rendering Demos</h1>
    <h2>1. Client Side</h2>
    <template v-if="clientInfo">
      {{ clientInfo.browser }}
      {{ clientInfo.time }}
      {{ clientHello }}
    </template>
    <br />
    <h2>2. Server Side Data Hydration Illusion (Direct Import)</h2>
    <template v-if="getServerInfo">
      {{ getServerInfo.hostname }}
      {{ getServerInfo.time }}
    </template>
    <br />
    <h2>3. Server Side Data Hydration Illusion (RPC Inject)</h2>
    <template v-if="getServerInfoRpc">
      {{ getServerInfoRpc.hostname }}
      {{ getServerInfoRpc.time }}
    </template>

    <!-- TODO -->
    <!-- <h2>4. Server Side SSR Rendered</h2> -->
    <!-- {{ serverHello }} -->
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
