<template>
  <!-- Colour never carries the rank alone: the number is always shown. -->
  <span
    class="inline-grid h-8 min-w-8 place-items-center rounded px-1.5 font-display text-lg font-bold tabular-nums"
    :class="{
      'text-gold-ink': rank === 1,
      'text-silver-ink': rank === 2,
      'text-bronze-ink': rank === 3,
      'text-base text-danger': label,
    }"
  >
    <template v-if="label">
      <abbr :title="labelTitle" class="no-underline">{{ label }}</abbr>
    </template>
    <template v-else>{{ rank }}</template>
  </span>
</template>

<script setup lang="ts">
/** A rank or placing. `label` replaces the number for a non-placing such as a disqualification ("DSQ"). */
defineProps<{ rank: number | null; label?: string; labelTitle?: string }>()
</script>
