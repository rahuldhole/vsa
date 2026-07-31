<script setup>
import { ref, onMounted, inject } from 'vue'
// Import db.vue to place it in the dependency graph so the RPC compiler processes it
import Db from '../db.vue'

const rpc = inject('rpc')
const dbStatus = ref('Loading status...')

onMounted(async () => {
  try {
    dbStatus.value = await rpc.getDbData()
  } catch (e) {
    dbStatus.value = 'Failed to load DB status: ' + e.message
  }
})
</script>

<template>
  <div class="about-page">
    <h2>About This App</h2>
    <p>This is a sample multipage setup to show how routing or dynamic components can work in VHP.</p>
    <p>You can use standard Vue features like dynamic components (<code>&lt;component :is="..."&gt;</code>) or even integrate <code>vue-router</code> for more complex apps.</p>
    
    <div class="db-status">
      <h4>Database Status (from parent folder component):</h4>
      <p class="status-text">{{ dbStatus }}</p>
    </div>
  </div>
</template>

<style scoped>
.about-page {
  padding: 2rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  text-align: center;
}
h2 {
  color: #2c3e50;
  margin-top: 0;
}
p {
  line-height: 1.6;
  color: #555;
}
</style>
