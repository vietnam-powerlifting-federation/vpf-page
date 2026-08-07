<template>
  <Dialog
    :visible="visible"
    modal
    :header="$t('profile.vipBenefits.cropTitle')"
    :closable="!busy"
    :style="{ width: 'min(900px, 95vw)' }"
    @update:visible="(v: boolean) => emit('update:visible', v)"
  >
    <p class="text-sm text-surface-400 mb-3">{{ $t("profile.vipBenefits.cropHint") }}</p>

    <ClientOnly>
      <VuePictureCropper
        v-if="src"
        :key="src"
        :img="src"
        :box-style="boxStyle"
        :options="cropperOptions"
      />
      <template #fallback>
        <div class="flex justify-center items-center h-[420px] bg-surface-900 rounded-lg">
          <ProgressSpinner />
        </div>
      </template>
    </ClientOnly>

    <template #footer>
      <Button
        :label="$t('profile.vipBenefits.cropCancel')"
        severity="secondary"
        text
        :disabled="busy"
        @click="emit('update:visible', false)"
      />
      <Button
        :label="$t('profile.vipBenefits.cropApply')"
        class="bg-primary text-primary-contrast"
        :loading="busy"
        @click="onApply"
      />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, ref } from "vue"

// cropperjs touches the DOM at import time, so it must never reach the SSR bundle.
const VuePictureCropper = defineAsyncComponent(() => import("vue-picture-cropper").then((m) => m.default))

const props = defineProps<{
  visible: boolean
  /** blob: url of the raw picked file. */
  src: string | null
  aspectRatio: number
  outputWidth: number
  outputHeight: number
  outputType: string
  fileName: string
}>()

const emit = defineEmits<{
  "update:visible": [value: boolean]
  apply: [file: File]
  error: []
}>()

const busy = ref(false)

const boxStyle = {
  width: "100%",
  height: "420px",
  backgroundColor: "var(--p-surface-900)",
}

const cropperOptions = computed(() => ({
  aspectRatio: props.aspectRatio,
  viewMode: 1,
  dragMode: "move" as const,
  autoCropArea: 1,
  background: false,
  checkCrossOrigin: false,
}))

async function onApply() {
  busy.value = true
  try {
    // The singleton is only valid while the cropper is mounted, so read the blob
    // before closing. Dynamic import keeps the module out of the server build.
    const { cropper } = await import("vue-picture-cropper")
    const canvas = cropper?.getCroppedCanvas({
      width: props.outputWidth,
      height: props.outputHeight,
      imageSmoothingEnabled: true,
      imageSmoothingQuality: "high",
      // JPEG has no alpha; without this, transparent source pixels come out black.
      fillColor: props.outputType === "image/jpeg" ? "#000000" : undefined,
    })
    if (!canvas) {
      emit("error")
      return
    }

    // Deliberately not the library's getBlob(): it passes no quality and infers the
    // mime only from data: urls, so a blob: source would silently become a huge PNG.
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, props.outputType, 0.85),
    )
    if (!blob) {
      emit("error")
      return
    }

    emit("apply", new File([blob], props.fileName, { type: blob.type }))
    emit("update:visible", false)
  } catch {
    emit("error")
  } finally {
    busy.value = false
  }
}
</script>
