<template>
  <div
    role="group"
    :aria-label="$t('site.language')"
    class="inline-flex overflow-hidden rounded border"
    :class="onBoard ? 'border-board-line' : 'border-surface-300'"
  >
    <button
      v-for="(code, i) in codes"
      :key="code"
      type="button"
      :lang="code"
      :aria-pressed="locale === code"
      class="min-h-[42px] min-w-11 cursor-pointer px-3 text-[0.8125rem] font-semibold uppercase transition-colors duration-120 ease-snap focus-visible:-outline-offset-2"
      :class="[
        i > 0 && (onBoard ? 'border-l border-board-line' : 'border-l border-surface-300'),
        locale === code
          ? (onBoard ? 'bg-board-2 text-board-ink' : 'bg-surface-100 text-color')
          : (onBoard ? 'text-board-ink-2 hover:text-board-ink' : 'text-muted-color hover:text-color'),
      ]"
      @click="setLocale(code)"
    >
      {{ code }}
    </button>
  </div>
</template>

<script setup lang="ts">
/** EN / VI segmented switch. `onBoard` styles it for the always-dark header. */
defineProps<{ onBoard?: boolean }>()

const { locale, setLocale } = useI18n()
const codes = ["en", "vi"] as const
</script>
