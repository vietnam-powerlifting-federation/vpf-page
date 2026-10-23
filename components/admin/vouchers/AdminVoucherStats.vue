<template>
  <!-- Issued vs redeemed vs expired, and what it cost (§8). -->
  <div v-if="vouchers.hasStats" class="mb-6 grid grid-cols-2 md:grid-cols-5 gap-4">
    <div v-for="stat in vouchers.statTiles" :key="stat.label">
      <p class="text-xs uppercase tracking-wide text-muted-color">{{ $t(stat.label) }}</p>
      <p class="text-xl font-semibold text-color">{{ stat.value }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
/** Vouchers issued, redeemed, available and expired, and what they have cost. */
const vouchers = useAdminVouchers()
</script>
