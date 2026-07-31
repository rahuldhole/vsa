<script setup lang="ts">
const count = 5

console.log('setup', count)
</script>

<template>
  <div>
    <h1>SSR Example</h1>
    <h2>Server Side SSR Rendered</h2>
    <p>{{ count }}</p>
  </div>
</template>
