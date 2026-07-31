<script server>
export async function getDbData() {
  console.log("Reading secret DB data on the server...")
  return "Database Connection: SUCCESS. Retrieved 42 secret items."
}
</script>

<template>
  <div class="db-hidden">
    <h3>Private DB Config</h3>
    <p>This page should NOT be reachable via any public URL (e.g. /db or /pages/db).</p>
  </div>
</template>
