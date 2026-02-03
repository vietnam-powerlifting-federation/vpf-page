<template>
  <div class="layout-wrapper">
    <AppHeader />
    <main class="main-content">
      <slot />
    </main>
    <Toast />
  </div>
</template>

<script setup>
import Toast from "@/components/volt/Toast.vue"
</script>

<style scoped>
.layout-wrapper {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.main-content {
  flex: 1;
}
</style>
