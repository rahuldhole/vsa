<script setup>
import { ref, onMounted } from 'vue'

const users = ref([])
const helloMessage = ref('')

onMounted(async () => {
  try {
    // Attempting to use auto-imported functions (if they work via composables/rpc.ts)
    // If not, we can fall back to $rpc plugin.
    if (typeof getTopUsers === 'function') {
      users.value = await getTopUsers(3)
      console.log('Users:', users.value)
    }
    
    if (typeof hello === 'function') {
      helloMessage.value = await hello()
      console.log('Hello Message:', helloMessage.value)
    }
  } catch (err) {
    console.error('Failed to fetch:', err)
  }
})
</script>

<template>
  <div style="font-family: sans-serif; padding: 20px;">
    <h1>Auto Import & Template Access Test</h1>
    
    <div style="margin-bottom: 20px;">
      <h2>Users (via Auto-Import in script setup):</h2>
      <ul v-if="users.length">
        <li v-for="user in users" :key="user.id">{{ user.name }}</li>
      </ul>
      <p v-else>Loading or auto-import failed.</p>
    </div>

    <div style="margin-bottom: 20px;">
      <h2>Hello Message (via Auto-Import):</h2>
      <p>{{ helloMessage || 'Loading...' }}</p>
    </div>

    <div style="margin-bottom: 20px; padding: 10px; border: 1px solid #ccc;">
      <h2>Direct Template Access (via $rpc plugin):</h2>
      <p>
        <button @click="$rpc.hello().then(msg => helloMessage = msg)">
          Call $rpc.hello() from template
        </button>
      </p>
      <p>
        <button @click="$rpc.getTopUsers(2).then(res => users = res)">
          Call $rpc.getTopUsers(2) from template
        </button>
      </p>
    </div>
  </div>
</template>
