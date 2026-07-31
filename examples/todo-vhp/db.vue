<script server>
// Global in-memory data store for the MVP so it can be reused across different server blocks
globalThis.todos = globalThis.todos || []
globalThis.idCounter = globalThis.idCounter || 1

export async function getDbData() {
  console.log("Reading secret DB data on the server...")
  return "Database Connection: SUCCESS. Retrieved 42 secret items."
}

export async function getTodos() {
  return globalThis.todos
}

export async function addTodo(text) {
  const newTodo = { id: globalThis.idCounter++, text, done: false }
  globalThis.todos.push(newTodo)
  console.log("Added todo", newTodo)
  return newTodo
}

export async function toggleTodo(id, done) {
  const todo = globalThis.todos.find(t => t.id === id)
  if (todo) {
    todo.done = done
  }
  return true
}

export async function deleteTodo(id) {
  globalThis.todos = globalThis.todos.filter(t => t.id !== id)
  return true
}
</script>
