<template>
  <span class="block min-w-0">
    <NuxtLinkLocale
      v-if="to"
      :to="to"
      class="text-[1.0625rem] font-semibold text-color no-underline decoration-accent decoration-2 underline-offset-3 hover:underline"
    >
      <span :style="decoratorStyle">{{ name }}</span>
    </NuxtLinkLocale>
    <span v-else class="text-[1.0625rem] font-semibold">{{ name }}</span>
    <span v-if="meta" class="block text-[0.8125rem] font-normal whitespace-nowrap text-muted-color">{{ meta }}</span>
  </span>
</template>

<script setup lang="ts">
import { nameDecoratorStyle } from "~/lib/domain/format"

/** Athlete name linking to their page, with "Category · Weight class · Division" below. */
const props = defineProps<{
  name: string
  to?: string | null
  meta?: string
  decorator1?: string | null
  decorator2?: string | null
}>()

const decoratorStyle = computed(() => nameDecoratorStyle(props.decorator1, props.decorator2))
</script>
