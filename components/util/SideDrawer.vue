<template>
  <dialog
    ref="dialog"
    :aria-labelledby="titleId"
    class="fixed inset-y-0 m-0 h-dvh max-h-none w-[min(320px,86vw)] max-w-none border-surface-200 bg-surface-0 p-0 text-color backdrop:bg-scrim open:flex open:flex-col motion-safe:open:animate-drawer-in"
    :class="[side === 'left' ? 'right-auto left-0 border-r' : 'right-0 left-auto border-l', widthClass]"
    @cancel.prevent="visible = false"
    @close="onClose"
    @click="onBackdrop"
  >
    <div class="flex items-center justify-between border-b border-surface-200 py-3 pr-3 pl-4">
      <strong :id="titleId" class="font-display text-lg font-bold tracking-[0.06em] uppercase">
        <slot name="title">{{ title }}</slot>
      </strong>
      <button type="button" class="grid size-11 cursor-pointer place-items-center rounded hover:bg-surface-100" :aria-label="closeLabel" @click="visible = false">
        <AppIcon name="lucide:x" class="size-5" />
      </button>
    </div>
    <div class="min-h-0 flex-1 overflow-y-auto" :class="bodyClass">
      <slot />
    </div>
  </dialog>
</template>

<script setup lang="ts">
/**
 * A side drawer on the native <dialog>. showModal() makes the rest of the page
 * inert (so focus stays inside) and Escape closes it; focus returns to whatever
 * opened it. Used on the public pages instead of PrimeVue's Drawer.
 */
withDefaults(defineProps<{
  title?: string
  closeLabel: string
  side?: "left" | "right"
  widthClass?: string
  bodyClass?: string
}>(), { title: "", side: "right", widthClass: "", bodyClass: "" })

const visible = defineModel<boolean>("visible", { required: true })
const emit = defineEmits<{ closed: [] }>()

const dialog = ref<HTMLDialogElement | null>(null)
const titleId = useId()
let opener: HTMLElement | null = null

watch(visible, (open) => {
  const el = dialog.value
  if (!el) return
  if (open && !el.open) {
    opener = document.activeElement as HTMLElement | null
    el.showModal()
  } else if (!open && el.open) {
    el.close()
  }
})

function onClose() {
  visible.value = false
  opener?.focus()
  opener = null
  emit("closed")
}

/** A click on the dialog element itself (not its content) is a click on the backdrop. */
function onBackdrop(event: MouseEvent) {
  if (event.target === dialog.value) visible.value = false
}
</script>
