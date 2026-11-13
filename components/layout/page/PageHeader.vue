<template>
  <!-- The title band: a full-bleed board that stays dark in both themes. -->
  <section class="border-b-[3px] border-accent-fill bg-board bg-dots bg-size-[6px_6px] text-board-ink" :aria-labelledby="titleId">
    <div
      class="mx-auto grid w-full max-w-page gap-x-12 gap-y-6 px-4 md:px-6"
      :class="[
        showDetails && $slots.aside && 'lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)]',
        collapsed ? 'py-4' : 'py-8',
      ]"
    >
      <div class="min-w-0">
        <p v-if="kicker && showDetails" class="mb-2 flex items-center gap-2 font-display text-[0.9375rem] font-bold tracking-[0.12em] text-accent-fill uppercase">
          <span class="size-2 rounded-full bg-current shadow-glow" aria-hidden="true" />
          {{ kicker }}
        </p>
        <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h1
            :id="titleId"
            class="pt-[0.08em] font-display text-[clamp(2.5rem,1.5rem+4vw,4.5rem)] leading-[1.02] font-extrabold tracking-[0.005em] uppercase [overflow-wrap:anywhere]"
            :class="(compact || collapsed) && '!text-[clamp(2rem,1.25rem+3vw,3.25rem)]'"
          >
            <slot name="title">{{ title }}</slot>
          </h1>
          <template v-if="collapsible">
            <button
              v-if="helpLabel"
              type="button"
              class="inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-2 rounded px-2 text-sm font-medium text-accent-fill hover:underline hover:underline-offset-3"
              :aria-expanded="helpOpen"
              :aria-controls="helpId"
              @click="helpOpen = !helpOpen"
            >
              <AppIcon name="lucide:info" class="size-5" />
              <span>{{ helpLabel }}</span>
            </button>
            <button
              type="button"
              class="inline-grid size-11 shrink-0 cursor-pointer place-items-center rounded-full text-board-ink-2 hover:bg-board-2 hover:text-board-ink"
              :aria-expanded="open"
              :aria-label="open ? collapseLabel : expandLabel"
              :title="open ? collapseLabel : expandLabel"
              @click="open = !open"
            >
              <AppIcon name="lucide:chevron-down" class="size-6 transition-transform duration-200 ease-snap" :class="open && 'rotate-180'" />
            </button>
          </template>
        </div>
        <div v-if="collapsible && helpOpen" :id="helpId" class="mt-3 grid max-w-prose gap-2 rounded-md border border-board-line bg-board-2 p-4 text-sm text-board-ink-2">
          <slot name="help" />
        </div>
        <p v-if="(lede || $slots.lede) && showDetails" class="mt-2 max-w-[60ch] text-lg text-board-ink-2">
          <slot name="lede">{{ lede }}</slot>
        </p>
        <slot v-if="showDetails" name="meta" />
        <details v-if="helpLabel && !collapsible" class="group mt-3 max-w-prose">
          <summary class="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded text-sm font-medium text-accent-fill hover:underline hover:underline-offset-3">
            <AppIcon name="lucide:info" class="size-5" />
            <span>{{ helpLabel }}</span>
            <AppIcon name="lucide:chevron-down" class="size-5 transition-transform duration-200 ease-snap group-open:rotate-180" />
          </summary>
          <div class="grid gap-2 rounded-md border border-board-line bg-board-2 p-4 text-sm text-board-ink-2">
            <slot name="help" />
          </div>
        </details>
        <div v-if="$slots.actions && showDetails" class="mt-4 flex flex-wrap gap-2">
          <slot name="actions" />
        </div>
      </div>
      <div v-if="$slots.aside && showDetails" class="min-w-0 lg:pt-1">
        <slot name="aside" />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
/**
 * Each page's title band: kicker, h1, lede, an optional "What is …?" disclosure
 * and an optional right-hand slot (Rankings puts its top 3 there).
 */
const props = defineProps<{
  title?: string
  kicker?: string
  lede?: string
  helpLabel?: string
  compact?: boolean
  /** Starts folded to the title and an info button. The info button shows the help, the chevron opens the rest of the band. */
  collapsible?: boolean
}>()

const titleId = useId()
const helpId = useId()
const { t } = useI18n()
const collapseLabel = computed(() => t("general.collapse"))
const expandLabel = computed(() => t("general.expand"))
const open = ref(false)
const helpOpen = ref(false)
const collapsed = computed(() => props.collapsible && !open.value)
const showDetails = computed(() => !collapsed.value)
</script>
