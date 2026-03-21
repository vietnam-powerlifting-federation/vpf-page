<template>
  <div class="relative w-full overflow-hidden bg-surface-900" style="height: 300px;">
    <div
      class="flex h-full transition-transform duration-300 ease-in-out"
      :style="{ transform: `translateX(-${current * 100}%)` }"
    >
      <div
        v-for="(banner, i) in banners"
        :key="i"
        class="min-w-full h-full flex-shrink-0"
      >
        <img :src="banner" class="w-full h-full object-cover" :alt="`Banner ${i + 1}`" />
      </div>
    </div>

    <button
      v-if="banners.length > 1"
      class="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white transition-colors"
      @click="prev"
    >
      <i class="pi pi-chevron-left text-sm" />
    </button>
    <button
      v-if="banners.length > 1"
      class="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white transition-colors"
      @click="next"
    >
      <i class="pi pi-chevron-right text-sm" />
    </button>

    <div v-if="banners.length > 1" class="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
      <button
        v-for="(_, i) in banners"
        :key="i"
        class="w-2.5 h-2.5 rounded-full transition-colors"
        :class="i === current ? 'bg-white' : 'bg-white/40'"
        @click="current = i"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue"

const props = defineProps<{ banners: string[] }>()

const current = ref(0)

function prev() {
  current.value = (current.value - 1 + props.banners.length) % props.banners.length
}

function next() {
  current.value = (current.value + 1) % props.banners.length
}
</script>
