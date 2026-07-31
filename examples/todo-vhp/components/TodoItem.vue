<script setup>
defineProps({
  todo: {
    type: Object,
    required: true
  }
})

defineEmits(['toggle', 'delete'])
</script>

<template>
  <li :class="{ done: todo.done }">
    <span @click="$emit('toggle', todo)" class="text">{{ todo.text }}</span>
    <button @click="$emit('delete', todo.id)" class="delete-btn">×</button>
  </li>
</template>

<style scoped>
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
</style>
