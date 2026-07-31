<script setup>
defineProps({
  active: {
    type: String,
    required: true
  }
})
</script>

<template>
  <nav class="top-menu">
    <a href="/" @click.prevent="window.navigate('/')" :class="{ active: active === 'home' }">Todos</a>
    <a href="/about" @click.prevent="window.navigate('/about')" :class="{ active: active === 'about' }">About</a>
  </nav>
</template>

<style scoped>
.top-menu {
  display: flex;
  justify-content: center;
  gap: 2rem;
  background: white;
  padding: 1rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  margin-bottom: 2rem;
  border-radius: 8px;
}

.top-menu a {
  text-decoration: none;
  color: #666;
  font-weight: 500;
  padding: 0.5rem 1rem;
  border-radius: 4px;
}

.top-menu a.active {
  background: #42b983;
  color: white;
}

.top-menu a:hover:not(.active) {
  background: #f0f0f0;
}
</style>
