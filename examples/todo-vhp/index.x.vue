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
import { ref, onMounted, inject } from 'vue'

const rpc = inject('rpc')

const todos = ref([])
const newTodoText = ref('')

async function fetchTodos() {
  todos.value = await rpc.getTodos()
}

async function handleAdd() {
  if (!newTodoText.value.trim()) return
  const added = await rpc.addTodo(newTodoText.value)
  todos.value.push(added)
  newTodoText.value = ''
}

async function handleToggle(todo) {
  todo.done = !todo.done
  await rpc.toggleTodo(todo.id, todo.done)
}

async function handleDelete(id) {
  await rpc.deleteTodo(id)
  todos.value = todos.value.filter(t => t.id !== id)
}

onMounted(() => {
  fetchTodos()
})
</script>

<template>
  <div class="todo-app">
    <h1>Todo List (.vhp)</h1>
    <div class="input-group">
      <input 
        v-model="newTodoText" 
        @keyup.enter="handleAdd" 
        placeholder="What needs to be done?"
      />
      <button @click="handleAdd">Add</button>
    </div>

    <ul>
      <li v-for="todo in todos" :key="todo.id" :class="{ done: todo.done }">
        <span @click="handleToggle(todo)" class="text">{{ todo.text }}</span>
        <button @click="handleDelete(todo.id)" class="delete-btn">×</button>
      </li>
    </ul>
    <p v-if="todos.length === 0" class="empty">No todos yet!</p>
  </div>
</template>

<style>
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  background-color: #f5f5f5;
  color: #333;
  display: flex;
  justify-content: center;
  padding-top: 50px;
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

li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0;
  border-bottom: 1px solid #eee;
}

li:last-child {
  border-bottom: none;
}

.text {
  cursor: pointer;
  flex: 1;
}

.done .text {
  text-decoration: line-through;
  color: #999;
}

.delete-btn {
  background-color: #ff4757;
  border-radius: 4px;
  padding: 0.2rem 0.5rem;
  margin-left: 0.5rem;
}

.delete-btn:hover {
  background-color: #ff6b81;
}

.empty {
  text-align: center;
  color: #888;
  font-style: italic;
  margin-top: 1rem;
}
</style>
