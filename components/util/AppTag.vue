<template>
  <span class="inline-flex items-center rounded px-2 py-0.5 text-[0.8125rem] font-semibold whitespace-nowrap" :class="TONE[tone]">
    <slot />
  </span>
</template>

<script setup lang="ts">
/** A small status label; the text always carries the meaning, the colour only supports it. */
withDefaults(defineProps<{ tone?: "neutral" | "success" | "info" | "warn" | "danger" | "accent" }>(), { tone: "neutral" })

const TONE = {
  neutral: "bg-surface-100 text-color",
  success: "bg-success-soft text-success",
  info: "bg-info-soft text-info",
  warn: "bg-warn-soft text-warn",
  danger: "bg-danger-soft text-danger",
  accent: "bg-accent-soft text-color",
}
</script>
