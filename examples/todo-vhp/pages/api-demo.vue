<script setup>
import { ref, onMounted } from 'vue'
import TodoItem from '../components/TodoItem.vue'
import Navbar from '../components/Navbar.vue'

const todos = ref([])
const newTodoText = ref('')

async function fetchTodos() {
  const res = await fetch('/api/todos')
  const data = await res.json()
  todos.value = data.todos || []
}

async function handleAdd() {
  if (!newTodoText.value.trim()) return
  const res = await fetch('/api/todos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: newTodoText.value })
  })
  const data = await res.json()
  if (data.success) {
    todos.value.push(data.todo)
  }
  newTodoText.value = ''
}

async function handleToggle(todo) {
  todo.done = !todo.done
  await fetch('/api/todos', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: todo.id, done: todo.done })
  })
}

async function handleDelete(id) {
  await fetch('/api/todos', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id })
  })
  todos.value = todos.value.filter(t => t.id !== id)
}

onMounted(() => {
  fetchTodos()
})
</script>

<template>
  <div class="layout">
    <Navbar active="api-demo" />
    <main class="content">
      <div class="todo-app">
        <h1>Todo List (API Demo)</h1>
        <p class="subtitle">This page uses standard REST API fetch instead of VSA RPC.</p>
    <div class="input-group">
      <input 
        v-model="newTodoText" 
        @keyup.enter="handleAdd" 
        placeholder="What needs to be done?"
      />
      <button @click="handleAdd">Add</button>
    </div>

    <ul>
      <TodoItem 
        v-for="todo in todos" 
        :key="todo.id" 
        :todo="todo" 
        @toggle="handleToggle" 
        @delete="handleDelete" 
      />
    </ul>
    <p v-if="todos.length === 0" class="empty">No todos yet!</p>
      </div>
    </main>
  </div>
</template>

<style scoped>
.layout {
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
}

.subtitle {
  text-align: center;
  color: #666;
  margin-bottom: 2rem;
  font-size: 0.9rem;
}

.content {
  display: flex;
  justify-content: center;
  padding: 0 1rem;
}

h1 {
  margin-top: 0;
  color: #2c3e50;
  text-align: center;
  margin-bottom: 0.5rem;
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
