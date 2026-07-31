<script server>
// In-memory data store for the MVP
let todos = []
let idCounter = 1

export async function getTodos() {
  return todos
}

export async function addTodo(text) {
  const newTodo = { id: idCounter++, text, done: false }
  todos.push(newTodo)
  console.log("Added todo", newTodo)
  return newTodo
}

export async function toggleTodo(id, done) {
  const todo = todos.find(t => t.id === id)
  if (todo) {
    todo.done = done
  }
  return true
}

export async function deleteTodo(id) {
  todos = todos.filter(t => t.id !== id)
  return true
}
</script>

<script setup>
// No router logic here! Everything is handled by VhpPage globally.
</script>

<template>
  <div class="layout">
    <nav class="top-menu">
      <a href="/" @click.prevent="window.navigate('/')">Todos</a>
      <a href="/about" @click.prevent="window.navigate('/about')">About</a>
      <!-- This link will intentionally 404 because the folder starts with _ -->
      <a href="/hidden/secret" @click.prevent="window.navigate('/hidden/secret')">Secret (Excluded)</a>
    </nav>

    <main class="content">
      <VhpPage />
    </main>
  </div>
</template>

<style>
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  background-color: #f5f5f5;
  color: #333;
  display: flex;
  justify-content: center;
  padding-top: 0;
  margin: 0;
}

.layout {
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
}

.top-menu {
  display: flex;
  justify-content: center;
  gap: 2rem;
  background: white;
  padding: 1rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  margin-bottom: 2rem;
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

.content {
  display: flex;
  justify-content: center;
  padding: 0 1rem;
}

.todo-app {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  width: 100%;
  max-width: 400px;
}

h1 {
  margin-top: 0;
  color: #2c3e50;
  text-align: center;
}

.input-group {
  display: flex;
  margin-bottom: 1.5rem;
}

input {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px 0 0 4px;
  font-size: 1rem;
}

button {
  padding: 0.5rem 1rem;
  background-color: #42b983;
  color: white;
  border: none;
  border-radius: 0 4px 4px 0;
  cursor: pointer;
  font-size: 1rem;
}

button:hover {
  background-color: #3aa876;
}

ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.empty {
  text-align: center;
  color: #888;
  font-style: italic;
  margin-top: 1rem;
}
</style>
