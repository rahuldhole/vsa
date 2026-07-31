<script server>
export async function GET() {
  return { 
    message: 'This is the API showcase endpoint for Todos!',
    todos: globalThis.todos || []
  }
}

export async function POST(event) {
  // Mock simple POST for pure Vite example (since readBody requires Nuxt/H3)
  const body = event.req ? await new Promise(resolve => {
    let data = '';
    event.req.on('data', chunk => data += chunk);
    event.req.on('end', () => resolve(JSON.parse(data || '{}')));
  }) : (typeof readBody !== 'undefined' ? await readBody(event) : {});

  if (body && body.text) {
    globalThis.idCounter = globalThis.idCounter || 1
    const newTodo = { id: globalThis.idCounter++, text: body.text, done: false }
    globalThis.todos = globalThis.todos || []
    globalThis.todos.push(newTodo)
    return { success: true, todo: newTodo }
  }
  
  return { success: false, error: 'Text required in JSON body' }
}

export async function PUT(event) {
  const body = event.req ? await new Promise(resolve => {
    let data = '';
    event.req.on('data', chunk => data += chunk);
    event.req.on('end', () => resolve(JSON.parse(data || '{}')));
  }) : (typeof readBody !== 'undefined' ? await readBody(event) : {});

  if (body && body.id !== undefined) {
    globalThis.todos = globalThis.todos || []
    const todo = globalThis.todos.find(t => t.id === body.id)
    if (todo) {
      todo.done = body.done
      return { success: true, todo }
    }
    return { success: false, error: 'Todo not found' }
  }
  return { success: false, error: 'ID required' }
}

export async function DELETE(event) {
  const body = event.req ? await new Promise(resolve => {
    let data = '';
    event.req.on('data', chunk => data += chunk);
    event.req.on('end', () => resolve(JSON.parse(data || '{}')));
  }) : (typeof readBody !== 'undefined' ? await readBody(event) : {});

  if (body && body.id !== undefined) {
    globalThis.todos = (globalThis.todos || []).filter(t => t.id !== body.id)
    return { success: true }
  }
  return { success: false, error: 'ID required' }
}
</script>

<template> 
  <div>
    Todos
  </div>
</template>