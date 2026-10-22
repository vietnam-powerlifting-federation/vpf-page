<template>
  <!-- eslint-disable-next-line vue/no-v-html -- markup comes from the generated Lucide map, never from users -->
  <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true" focusable="false" class="shrink-0" v-html="body" />
</template>

<script setup lang="ts">
import { ICONS } from "~/lib/constants/icons"

/**
 * A decorative Lucide icon, inlined as SVG. Write the full name ("lucide:search")
 * as a string literal and run `node scripts/gen-icons.mjs` after using a new
 * icon, which adds it to lib/constants/icons.ts. Icon-only buttons put their
 * label on the button.
 */
const props = defineProps<{ name: string }>()
const body = computed(() => ICONS[props.name.replace(/^lucide:/, "")] ?? "")
</script>
