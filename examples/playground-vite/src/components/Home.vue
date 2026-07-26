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
    <h2>Vite + Vue Script Server MVP</h2>
    <p>Message from server: {{ message }}</p>
  </div>
</template>
