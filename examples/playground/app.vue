<script server>
// This block executes ONLY on Node/Edge runtime
const db = {
  users: [
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' },
    { id: 3, name: 'Charlie' }
  ]
}
export const hello = async () => { return await Promise.resolve("Hello World!") }
export async function getTopUsers(limit = 5) {
  console.log('[Server] fetching top users with limit:', limit)
  return db.users.slice(0, limit)
}

export async function updateUsername(id, newName) {
  console.log(`[Server] updating user ${id} to ${newName}`)
  const user = db.users.find(u => u.id === id)
  if (user) {
    user.name = newName
    return user
  }
  throw new Error('User not found')
}
</script>

<script setup>
import { ref, onMounted } from 'vue'
// The compiler automatically converts exports into reactive RPC actions!
import { getTopUsers, updateUsername, hello } from '#script-server'

const users = ref([])
const helloMessage = ref('')

onMounted(async () => {
  try {
    users.value = await getTopUsers(10)
    helloMessage.value = await hello()
  } catch (err) {
    console.error('Failed to fetch users:', err)
  }
})

async function handleRename(id) {
  try {
    await updateUsername(id, 'NewName-' + Math.floor(Math.random() * 100))
    users.value = await getTopUsers(10)
  } catch (err) {
    console.error('Failed to rename user:', err)
  }
}
</script>

<template>
  <div style="font-family: sans-serif; padding: 20px;">
    <h1>Nuxt Script Server MVP</h1>
    <ul v-for="user in users" :key="user.id">
      <li>
        {{ user.name }}
        <button @click="handleRename(user.id)" style="margin-left: 10px;">Rename</button>
      </li>
    </ul>
    <p v-if="users.length === 0">Loading...</p>
    <p>{{ helloMessage }}</p>
  </div>
</template>
