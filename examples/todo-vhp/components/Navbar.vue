<script setup>
defineProps({
  active: {
    type: String,
    required: true
  }
})
const navigate = (path) => {
  if (typeof window !== 'undefined' && window.navigate) {
    window.navigate(path)
  }
}
</script>

<template>
  <nav class="top-menu-container">
    <div class="menu-section">
      <span class="section-label">SPA Links (&lt;VhpLink&gt;):</span>
      <nav class="top-menu">
        <VhpLink to="/" :class="{ active: active === 'home' }">Todos (RPC)</VhpLink>
        <VhpLink to="/api-demo" :class="{ active: active === 'api-demo' }">Todos (API)</VhpLink>
        <VhpLink to="/about" :class="{ active: active === 'about' }">About</VhpLink>
      </nav>
    </div>
    <div class="menu-section">
      <span class="section-label">MPA Links (Standard &lt;a&gt;):</span>
      <nav class="top-menu">
        <a href="/" :class="{ active: active === 'home' }">Todos RPC (Reload)</a>
        <a href="/api-demo" :class="{ active: active === 'api-demo' }">Todos API (Reload)</a>
        <a href="/about" :class="{ active: active === 'about' }">About (Reload)</a>
      </nav>
    </div>
  </nav>
</template>

<style scoped>
.top-menu-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 2rem;
}

.menu-section {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: #fdfdfd;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  border: 1px solid #eaeaea;
}

.section-label {
  font-size: 0.9rem;
  font-weight: 600;
  color: #555;
  min-width: 180px;
}

.top-menu {
  display: flex;
  gap: 1rem;
}

.top-menu a {
  text-decoration: none;
  color: #666;
  font-weight: 500;
  padding: 0.4rem 0.8rem;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.top-menu a.active {
  background: #42b983;
  color: white;
}

.top-menu a:hover:not(.active) {
  background: #f0f0f0;
}
</style>
