<script server>
export const getMessage = async () => {
  return "Hello from Vite dev server middleware!"
}
</script>

<script setup lang="ts">
import { ref } from 'vue'
// @ts-ignore
import { getMessage } from '#script-server'

const message = ref('Loading...')

getMessage().then(msg => {
  message.value = msg
})
</script>

<template>
  <div>
    <h1>Vite + Vue Script Server</h1>
    <p>Message from server: {{ message }}</p>
  </div>
</template>
