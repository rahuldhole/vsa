<script setup lang="ts">
import { ref, computed } from 'vue'
import Home from './components/Home.vue'
import Todo from './components/Todo.vue'

const currentPath = ref(window.location.hash || '#/')

window.addEventListener('hashchange', () => {
  currentPath.value = window.location.hash || '#/'
})

const currentComponent = computed(() => {
  return currentPath.value === '#/todo' ? Todo : Home
})
</script>

<template>
  <div>
    <nav style="padding: 10px; background: #eee; margin-bottom: 20px;">
      <a href="#/" style="margin-right: 15px;">Home (Message)</a>
      <a href="#/todo">Todo App (SQLite)</a>
    </nav>
    <component :is="currentComponent" />
  </div>
</template>
