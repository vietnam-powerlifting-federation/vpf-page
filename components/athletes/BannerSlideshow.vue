<template>
  <section
    ref="container"
    class="relative w-full overflow-hidden rounded-md bg-board"
    :style="{ height: `${slideHeight}px` }"
    :aria-label="$t('athlete.bannerLabel')"
    aria-roledescription="carousel"
  >
    <div
      class="flex h-full gap-4 motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-snap"
      :style="{ transform: `translateX(${translateX}px)` }"
    >
      <div
        v-for="(banner, i) in loopedBanners"
        :key="i"
        class="relative h-full shrink-0"
        :style="{ width: `${slideWidth}px` }"
        :aria-hidden="i !== current || undefined"
      >
        <img
          :src="banner"
          alt=""
          :loading="i === current ? 'eager' : 'lazy'"
          decoding="async"
          class="size-full object-cover"
        >
        <div class="absolute inset-0 transition-opacity duration-300" :class="i === current ? 'opacity-0' : 'bg-scrim'" />
      </div>
    </div>

    <template v-if="banners.length > 1">
      <button
        type="button"
        class="absolute top-1/2 left-3 grid size-11 -translate-y-1/2 cursor-pointer place-items-center rounded-full bg-board/70 text-board-ink hover:bg-board"
        :aria-label="$t('athlete.prevBanner')"
        @click="prev"
      >
        <AppIcon name="lucide:chevron-left" class="size-5" />
      </button>
      <button
        type="button"
        class="absolute top-1/2 right-3 grid size-11 -translate-y-1/2 cursor-pointer place-items-center rounded-full bg-board/70 text-board-ink hover:bg-board"
        :aria-label="$t('athlete.nextBanner')"
        @click="next"
      >
        <AppIcon name="lucide:chevron-right" class="size-5" />
      </button>
      <div class="absolute bottom-1 left-1/2 flex -translate-x-1/2">
        <button
          v-for="(_, i) in banners"
          :key="i"
          type="button"
          class="grid size-8 cursor-pointer place-items-center"
          :aria-label="$t('athlete.showBanner', { n: i + 1 })"
          :aria-current="realIndex === i || undefined"
          @click="goTo(i)"
        >
          <span class="size-2.5 rounded-full" :class="realIndex === i ? 'bg-light' : 'bg-light/40'" />
        </button>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
/**
 * A VIP athlete's cover photos. It only moves when asked (buttons or dots),
 * so there is nothing to pause, and the slide motion is dropped under
 * prefers-reduced-motion.
 */
const props = withDefaults(
  defineProps<{
    banners: string[]
    /** Tallest the slideshow may get. Narrow containers shrink below this to keep 24:9. */
    height?: number
  }>(),
  { height: 400 },
)

/* Duplicate the first and last slides so stepping past either end wraps around. */
const loopedBanners = computed(() => {
  if (props.banners.length <= 1) return props.banners
  return [props.banners[props.banners.length - 1], ...props.banners, props.banners[0]]
})

const current = ref(props.banners.length > 1 ? 1 : 0)
const container = ref<HTMLElement | null>(null)
const containerWidth = ref(0)

/* Slides are always 24:9, capped by `height` and by the container, so a phone sees the whole banner. */
const ASPECT = 24 / 9
const GAP = 16

const slideWidth = computed(() => {
  const max = props.height * ASPECT
  if (!containerWidth.value) return max
  return Math.min(max, containerWidth.value * 0.92)
})
const slideHeight = computed(() => slideWidth.value / ASPECT)

let observer: ResizeObserver | null = null
function updateWidth() {
  if (container.value) containerWidth.value = container.value.clientWidth
}
onMounted(() => {
  updateWidth()
  if (container.value) {
    observer = new ResizeObserver(updateWidth)
    observer.observe(container.value)
  }
})
onBeforeUnmount(() => observer?.disconnect())

const translateX = computed(() => (containerWidth.value - slideWidth.value) / 2 - current.value * (slideWidth.value + GAP))

const realIndex = computed(() => {
  if (props.banners.length <= 1) return 0
  return (current.value - 1 + props.banners.length) % props.banners.length
})

function next() {
  current.value++
  wrap()
}
function prev() {
  current.value--
  wrap()
}
function goTo(i: number) {
  current.value = i + 1
}

/* After sliding onto a duplicate, jump to the real slide it copies. */
function wrap() {
  const last = loopedBanners.value.length - 1
  setTimeout(() => {
    if (current.value === last) current.value = 1
    if (current.value === 0) current.value = last - 1
  }, 300)
}
</script>
