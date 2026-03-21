<template>
  <div
    ref="container"
    class="relative w-full overflow-hidden bg-surface-900"
    style="height: 400px"
  >
    <!-- Track -->
    <div
      class="flex h-full gap-4 transition-transform duration-300 ease-in-out"
      :style="{ transform: `translateX(${translateX}px)` }"
    >
      <div
        v-for="(banner, i) in loopedBanners"
        :key="i"
        class="h-full flex-shrink-0"
        :style="{ width: slideWidth + 'px' }"
      >
        <div class="relative w-full h-full">
          <img
            :src="banner"
            class="w-full h-full object-cover"
          />

          <!-- darken side slides -->
          <div
            class="absolute inset-0 transition duration-300"
            :class="i === current ? 'bg-black/0' : 'bg-black/40'"
          />
        </div>
      </div>
    </div>

    <!-- buttons -->
    <button
      v-if="banners.length > 1"
      class="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white"
      @click="prev"
    >
      ‹
    </button>

    <button
      v-if="banners.length > 1"
      class="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white"
      @click="next"
    >
      ›
    </button>

    <!-- dots -->
    <div
      v-if="banners.length > 1"
      class="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2"
    >
      <button
        v-for="(_, i) in banners"
        :key="i"
        class="w-2.5 h-2.5 rounded-full"
        :class="realIndex === i ? 'bg-white' : 'bg-white/40'"
        @click="goTo(i)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from "vue"

const props = defineProps<{ banners: string[] }>()

/* duplicate slides */
const loopedBanners = computed(() => {
  if (props.banners.length <= 1) return props.banners
  return [
    props.banners[props.banners.length - 1],
    ...props.banners,
    props.banners[0]
  ]
})

/* state */
const current = ref(1)
const container = ref<HTMLElement | null>(null)
const containerWidth = ref(0)

/* sizes */
const containerHeight = 400
const slideWidth = containerHeight * (24 / 9)
const gap = 16

/* responsive width */
function updateWidth() {
  if (container.value) containerWidth.value = container.value.clientWidth
}

onMounted(() => {
  updateWidth()
  window.addEventListener("resize", updateWidth)
})

onBeforeUnmount(() => {
  window.removeEventListener("resize", updateWidth)
})

/* center active slide correctly */
const translateX = computed(() => {
  const total = slideWidth + gap

  return (
    (containerWidth.value - slideWidth) / 2 - current.value * total
  )
})

/* dots index */
const realIndex = computed(() => {
  if (props.banners.length === 0) return 0
  return (current.value - 1 + props.banners.length) % props.banners.length
})

/* navigation */
function next() {
  current.value++
  handleLoop()
}

function prev() {
  current.value--
  handleLoop()
}

function goTo(i: number) {
  current.value = i + 1
}

/* infinite loop correction */
function handleLoop() {
  const max = loopedBanners.value.length - 1

  setTimeout(() => {
    if (current.value === max) current.value = 1
    if (current.value === 0) current.value = max - 1
  }, 300)
}
</script>