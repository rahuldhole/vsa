<script server>
import Database from 'better-sqlite3'

// Initialize SQLite database (in-memory for this example, or change to a file like 'todo.db')
const db = new Database('todo.db')
db.exec(`
  CREATE TABLE IF NOT EXISTS todos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT NOT NULL,
    completed BOOLEAN DEFAULT 0
  )
`)

export async function getTodos() {
  const stmt = db.prepare('SELECT * FROM todos ORDER BY id DESC')
  return stmt.all()
}

export async function addTodo(text) {
  if (!text.trim()) throw new Error('Text cannot be empty')
  const stmt = db.prepare('INSERT INTO todos (text) VALUES (?)')
  const info = stmt.run(text)
  return { id: info.lastInsertRowid, text, completed: 0 }
}

export async function toggleTodo(id, completed) {
  const stmt = db.prepare('UPDATE todos SET completed = ? WHERE id = ?')
  stmt.run(completed ? 1 : 0, id)
  return true
}

export async function deleteTodo(id) {
  const stmt = db.prepare('DELETE FROM todos WHERE id = ?')
  stmt.run(id)
  return true
}
</script>

<script setup>
import { ref, onMounted } from 'vue'
import { getTodos, addTodo, toggleTodo, deleteTodo } from '#script-server'

const todos = ref([])
const newTodo = ref('')
const loading = ref(true)

async function fetchTodos() {
  loading.value = true
  try {
    todos.value = await getTodos()
  } catch (err) {
    console.error('Failed to fetch todos:', err)
  } finally {
    loading.value = false
  }
}

onMounted(fetchTodos)

async function handleAdd() {
  if (!newTodo.value.trim()) return
  try {
    await addTodo(newTodo.value)
    newTodo.value = ''
    await fetchTodos()
  } catch (err) {
    console.error('Failed to add todo:', err)
  }
}

async function handleToggle(todo) {
  try {
    // optimistic update
    todo.completed = todo.completed ? 0 : 1
    await toggleTodo(todo.id, todo.completed)
  } catch (err) {
    console.error('Failed to toggle todo:', err)
    todo.completed = todo.completed ? 0 : 1 // revert on error
  }
}

async function handleDelete(id) {
  try {
    // optimistic update
    todos.value = todos.value.filter(t => t.id !== id)
    await deleteTodo(id)
  } catch (err) {
    console.error('Failed to delete todo:', err)
    await fetchTodos() // revert on error
  }
}
</script>

<template>
  <div style="font-family: sans-serif; max-width: 500px; margin: 40px auto; padding: 20px; border: 1px solid #ccc; border-radius: 8px;">
    <h2>Vite SQLite Todo List</h2>
    <div style="display: flex; gap: 8px; margin-bottom: 20px;">
      <input 
        v-model="newTodo" 
        @keyup.enter="handleAdd"
        placeholder="What needs to be done?" 
        style="flex: 1; padding: 8px;"
      />
      <button @click="handleAdd" style="padding: 8px 16px;">Add</button>
    </div>
    
    <div v-if="loading" style="text-align: center; color: #666;">Loading...</div>
    
    <ul v-else style="list-style: none; padding: 0;">
      <li 
        v-for="todo in todos" 
        :key="todo.id"
        style="display: flex; align-items: center; justify-content: space-between; padding: 8px; border-bottom: 1px solid #eee;"
      >
        <div style="display: flex; align-items: center; gap: 12px; cursor: pointer;" @click="handleToggle(todo)">
          <input 
            type="checkbox" 
            :checked="todo.completed === 1" 
            @change.stop="handleToggle(todo)"
          />
          <span :style="{ textDecoration: todo.completed === 1 ? 'line-through' : 'none', color: todo.completed === 1 ? '#999' : '#000' }">
            {{ todo.text }}
          </span>
        </div>
        <button @click.stop="handleDelete(todo.id)" style="color: red; border: none; background: none; cursor: pointer;">Delete</button>
      </li>
    </ul>
    
    <p v-if="!loading && todos.length === 0" style="text-align: center; color: #666;">No todos yet. Add one above!</p>
  </div>
</template>
