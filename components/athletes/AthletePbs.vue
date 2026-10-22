<template>
  <section :aria-labelledby="titleId" class="grid gap-3">
    <h2 :id="titleId" class="font-display text-2xl font-bold uppercase">{{ $t("athlete.pbsTitle") }}</h2>
    <dl class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <div
        v-for="item in items"
        :key="item.key"
        class="rounded-md border border-surface-200 bg-surface-0 p-4"
        :class="item.key === 'gl' && 'border-t-[3px] border-t-accent-fill'"
      >
        <dt class="font-display text-[0.8125rem] font-bold tracking-[0.08em] text-muted-color uppercase">{{ item.label }}</dt>
        <dd class="mt-1 font-display text-3xl font-bold tabular-nums">
          {{ item.value }}<small v-if="item.value !== '–'" class="ml-1 font-sans text-sm font-semibold text-accent">{{ item.unit }}</small>
        </dd>
      </div>
    </dl>
  </section>
</template>

<script setup lang="ts">
import { formatGl, formatKg } from "~/lib/domain/format"
import type { PersonalBestSummary, Result } from "~/types/results"

/** Best squat, bench, deadlift, total and GL across every result. */
const props = defineProps<{ personalBest: PersonalBestSummary; compHistory: Result[] }>()

const { t, locale } = useI18n()
const titleId = useId()

const glPb = computed(() => {
  const values = props.compHistory.map((r) => r.gl).filter((v): v is number => v !== null && v !== undefined)
  return values.length ? Math.max(...values) : null
})

const items = computed(() => [
  { key: "squat", label: t("general.squat"), value: formatKg(props.personalBest.squat, locale.value), unit: "kg" },
  { key: "bench", label: t("general.bench"), value: formatKg(props.personalBest.bench, locale.value), unit: "kg" },
  { key: "deadlift", label: t("general.deadlift"), value: formatKg(props.personalBest.deadlift, locale.value), unit: "kg" },
  { key: "total", label: t("general.total"), value: formatKg(props.personalBest.total, locale.value), unit: "kg" },
  { key: "gl", label: t("ranking.glPoints"), value: formatGl(glPb.value, locale.value), unit: "GL" },
])
</script>
