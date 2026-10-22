<template>
  <ol class="flex flex-wrap gap-x-1 gap-y-2" :aria-label="label">
    <li
      v-for="(step, i) in steps"
      :key="step"
      :aria-current="i === current ? 'step' : undefined"
      class="flex items-center gap-2 pr-3 text-sm"
      :class="i === current ? 'font-semibold text-color' : i < current ? 'text-color' : 'text-muted-color'"
    >
      <span
        class="grid size-7 shrink-0 place-items-center rounded-full font-display text-sm font-bold"
        :class="i === current ? 'bg-accent-fill text-on-accent' : i < current ? 'bg-ink text-paper' : 'border border-surface-300'"
      >
        <AppIcon v-if="i < current" name="lucide:check" class="size-4" />
        <template v-else>{{ i + 1 }}</template>
      </span>
      <span>
        {{ step }}
        <span v-if="i < current" class="sr-only">({{ $t("steps.done") }})</span>
      </span>
    </li>
  </ol>
</template>

<script setup lang="ts">
/** Where the user is in a multi-step flow. The current step carries aria-current="step". */
defineProps<{ steps: string[]; current: number; label: string }>()
</script>
