<template>
  <dialog
    ref="dialog"
    :aria-labelledby="titleId"
    class="m-auto w-[min(40rem,94vw)] max-w-none rounded-md border border-surface-200 bg-surface-0 p-0 text-color backdrop:bg-scrim"
    @cancel.prevent="visible = false"
    @close="onClose"
    @click="onBackdrop"
  >
    <div class="flex items-center justify-between gap-4 border-b border-surface-200 py-3 pr-3 pl-5">
      <h2 :id="titleId" class="font-display text-xl font-bold uppercase">{{ title }}</h2>
      <button type="button" class="grid size-11 cursor-pointer place-items-center rounded hover:bg-surface-100" :aria-label="closeLabel" @click="visible = false">
        <AppIcon name="lucide:x" class="size-5" />
      </button>
    </div>
    <div class="p-5">
      <slot />
    </div>
    <div v-if="$slots.footer" class="flex justify-end gap-2 border-t border-surface-200 px-5 py-3">
      <slot name="footer" />
    </div>
  </dialog>
</template>

<script setup lang="ts">
/** A modal on the native <dialog>: the page behind is inert, Escape closes it, focus returns to the opener. */
defineProps<{ title: string; closeLabel: string }>()
const visible = defineModel<boolean>("visible", { required: true })

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
}

function onBackdrop(event: MouseEvent) {
  if (event.target === dialog.value) visible.value = false
}
</script>
