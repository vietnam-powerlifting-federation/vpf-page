<template>
  <nav :aria-label="$t('nav.main')" class="mx-auto hidden nav:block">
    <ul class="flex gap-1">
      <li v-for="item in items" :key="item.to">
        <NuxtLinkLocale
          :to="item.to"
          :aria-current="ariaCurrent(item.to)"
          class="inline-flex min-h-11 items-center whitespace-nowrap rounded px-4 font-display text-[1.0625rem] font-bold tracking-[0.06em] text-board-ink-2 uppercase no-underline transition-colors duration-120 ease-snap hover:bg-board-2 hover:text-board-ink aria-[current]:rounded-none aria-[current]:text-accent-fill aria-[current]:shadow-accent-under aria-[current]:hover:bg-transparent"
        >
          {{ $t(item.label) }}
        </NuxtLinkLocale>
      </li>
    </ul>
  </nav>
</template>

<script setup lang="ts">
const { items, ariaCurrent } = useMainNav()
</script>
