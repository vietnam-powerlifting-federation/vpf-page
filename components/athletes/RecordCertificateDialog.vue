<template>
  <Dialog
    v-model:visible="visible"
    modal
    dismissable-mask
    :show-header="false"
    class="max-w-[95vw]"
  >
    <!-- Scalable wrapper: certificate renders at a fixed size for PDF fidelity, scaled to fit on small screens -->
    <div ref="wrapperRef" class="w-full overflow-hidden bg-surface-0" :style="{ height: `${CERT_HEIGHT * scale}px` }">
      <div
        ref="certRef"
        class="relative overflow-hidden"
        :style="{
          width: `${CERT_WIDTH}px`,
          height: `${CERT_HEIGHT}px`,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          backgroundColor: '#ffffff',
        }"
      >
        <!-- Layer: watermark background -->
        <img :src="canvaUrl" alt="" class="absolute inset-0 w-full h-full object-cover" crossorigin="anonymous">
        <!-- Layer: decorative frame -->
        <img :src="borderUrl" alt="" class="absolute inset-0 w-full h-full object-fill" crossorigin="anonymous">

        <!-- Content -->
        <div class="absolute inset-0 px-16 pt-10 pb-8 flex flex-col">
          <!-- Header: logo (and optional attached image) -->
          <div class="flex items-start justify-center" :class="attachedImageUrl ? 'justify-between' : 'justify-center'">
            <img
              :src="logoUrl"
              alt="One Strong Nation"
              :class="attachedImageUrl ? 'h-32' : 'h-36'"
              crossorigin="anonymous"
            >
            <img
              v-if="attachedImageUrl"
              :src="attachedImageUrl"
              alt=""
              class="h-44 w-72 object-cover rounded-md shadow-md"
            >
          </div>

          <!-- Body text -->
          <div class="flex-1 flex flex-col items-center text-center mt-2">
            <h1 class="text-2xl font-bold tracking-wide" :style="{ color: NAVY }">
              {{ $t("athlete.certificate.title") }}
            </h1>
            <p class="text-sm mt-2" :style="{ color: NAVY }">{{ $t("athlete.certificate.forAthlete") }}</p>
            <p class="text-3xl font-extrabold mt-1" :style="{ color: RED }">{{ cert.fullName.toUpperCase() }}</p>

            <p class="text-sm mt-3" :style="{ color: NAVY }">{{ $t("athlete.certificate.achievedNationalRecord") }}</p>
            <p class="text-2xl font-bold mt-1" :style="{ color: RED }">{{ cert.liftLabel }} {{ formattedWeight }}</p>
            <p class="text-base mt-1" :style="{ color: NAVY }">
              {{ $t("athlete.certificate.inClass") }} <span class="font-semibold">{{ categoryLabel }}</span>
            </p>

            <p class="text-sm mt-3" :style="{ color: NAVY }">{{ $t("athlete.certificate.setAtChampionship") }}</p>
            <p class="text-lg font-bold mt-1" :style="{ color: NAVY }">{{ cert.meetName }}</p>
            <p class="text-sm mt-1" :style="{ color: NAVY }">{{ formattedDate }}</p>
          </div>

          <!-- Signatures -->
          <div class="grid grid-cols-2 gap-8 mt-auto">
            <div class="flex flex-col items-center">
              <p class="text-sm font-bold" :style="{ color: RED }">{{ $t("athlete.certificate.issuedBy") }}</p>
              <div class="h-16" />
              <p class="text-sm font-bold" :style="{ color: NAVY }">{{ $t("athlete.certificate.secretaryName") }}</p>
              <p class="text-xs" :style="{ color: NAVY }">{{ $t("athlete.certificate.secretaryTitle") }}</p>
            </div>
            <div class="flex flex-col items-center">
              <p class="text-sm font-bold" :style="{ color: RED }">{{ $t("athlete.certificate.approvedBy") }}</p>
              <img :src="signatureUrl" alt="" class="h-16 object-contain" crossorigin="anonymous">
              <p class="text-sm font-bold" :style="{ color: NAVY }">{{ $t("athlete.certificate.presidentName") }}</p>
              <p class="text-xs" :style="{ color: NAVY }">{{ $t("athlete.certificate.presidentTitle") }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Hidden file input for VIP image attach -->
    <input
      ref="imageInputRef"
      type="file"
      accept="image/jpeg,image/png,image/gif,image/webp"
      class="hidden"
      @change="onImageChange"
    >

    <!-- Footer actions -->
    <div class="flex flex-wrap justify-center gap-3 pt-4">
      <button
        v-if="canAttach"
        type="button"
        class="px-5 py-2 rounded-md font-semibold text-white bg-surface-400 hover:bg-surface-500 transition-colors"
        @click="imageInputRef?.click()"
      >
        {{ attachedImageUrl ? $t("athlete.certificate.changePhoto") : $t("athlete.certificate.addPhoto") }}
      </button>
      <button
        type="button"
        :disabled="generating"
        class="px-5 py-2 rounded-md font-semibold text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-60 transition-colors"
        @click="downloadPdf"
      >
        {{ $t("athlete.certificate.downloadPdf") }}
      </button>
      <button
        type="button"
        class="px-5 py-2 rounded-md font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors"
        @click="visible = false"
      >
        {{ $t("athlete.certificate.close") }}
      </button>
    </div>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import Dialog from "~/components/volt/Dialog.vue"
import { formatDivision, formatSex, formatWeightClass } from "~/lib/utils/client"
import borderUrl from "~/assets/img/record-certificate/border.png"
import canvaUrl from "~/assets/img/record-certificate/canva.png"
import signatureUrl from "~/assets/img/record-certificate/signature.png"
import logo2022 from "~/assets/img/record-certificate/2022.png"
import logo2023 from "~/assets/img/record-certificate/2023.png"
import logo2024 from "~/assets/img/record-certificate/2024.png"
import logo2025 from "~/assets/img/record-certificate/2025.png"

export type CertificateData = {
  fullName: string
  liftLabel: string
  weight: number
  sex: string | null
  division: string | null
  weightClass: number | null
  meetName: string
  hostDate: string | null | undefined
}

const props = defineProps<{
  cert: CertificateData
  canAttach?: boolean
}>()

const visible = defineModel<boolean>("visible", { default: false })

const CERT_WIDTH = 920
const CERT_HEIGHT = 650
const RED = "#C0392B"
const NAVY = "#3B4A6B"

const { locale } = useI18n()

const LOGO_BY_YEAR: Record<number, string> = {
  2022: logo2022,
  2023: logo2023,
  2024: logo2024,
  2025: logo2025,
}
const LOGO_YEARS = Object.keys(LOGO_BY_YEAR).map(Number).sort((a, b) => a - b)

const certYear = computed(() => {
  const d = props.cert.hostDate ? new Date(props.cert.hostDate) : null
  const y = d && !isNaN(d.getTime()) ? d.getFullYear() : LOGO_YEARS[LOGO_YEARS.length - 1]
  return y
})

const logoUrl = computed(() => {
  const y = certYear.value
  if (LOGO_BY_YEAR[y]) return LOGO_BY_YEAR[y]
  // Clamp to the nearest available year (earliest if before range, latest if after)
  const clamped = y < LOGO_YEARS[0] ? LOGO_YEARS[0] : LOGO_YEARS[LOGO_YEARS.length - 1]
  return LOGO_BY_YEAR[clamped]
})

const formattedWeight = computed(() => {
  const trimmed = parseFloat(props.cert.weight.toFixed(2)).toString()
  const localized = locale.value === "vi" ? trimmed.replace(".", ",") : trimmed
  return `${localized}kg`
})

const categoryLabel = computed(() => {
  const sex = formatSex(props.cert.sex)
  const division = formatDivision(props.cert.division)
  const weightClass = formatWeightClass(props.cert.weightClass, props.cert.sex)
  return `Classic ${sex} ${division} ${weightClass}`
})

const formattedDate = computed(() => {
  if (!props.cert.hostDate) return ""
  const d = new Date(props.cert.hostDate)
  if (isNaN(d.getTime())) return ""
  if (locale.value === "vi") {
    return `ngày ${d.getDate()} tháng ${d.getMonth() + 1} năm ${d.getFullYear()}`
  }
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
})

// --- VIP image attach (client-side only) ---
const imageInputRef = ref<HTMLInputElement | null>(null)
const attachedImageUrl = ref<string | null>(null)

function onImageChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (attachedImageUrl.value) URL.revokeObjectURL(attachedImageUrl.value)
  attachedImageUrl.value = file ? URL.createObjectURL(file) : null
  input.value = ""
}

// Clear the attached image when switching to a different record's certificate
watch(() => [props.cert.fullName, props.cert.liftLabel, props.cert.meetName], () => {
  if (attachedImageUrl.value) {
    URL.revokeObjectURL(attachedImageUrl.value)
    attachedImageUrl.value = null
  }
})

onBeforeUnmount(() => {
  if (attachedImageUrl.value) URL.revokeObjectURL(attachedImageUrl.value)
})

// --- Responsive scaling ---
const wrapperRef = ref<HTMLElement | null>(null)
const certRef = ref<HTMLElement | null>(null)
const scale = ref(1)
let resizeObserver: ResizeObserver | null = null

function updateScale() {
  const width = wrapperRef.value?.clientWidth ?? CERT_WIDTH
  scale.value = Math.min(1, width / CERT_WIDTH)
}

onMounted(() => {
  updateScale()
  if (typeof ResizeObserver !== "undefined" && wrapperRef.value) {
    resizeObserver = new ResizeObserver(updateScale)
    resizeObserver.observe(wrapperRef.value)
  }
})

watch(visible, (v) => {
  if (v) requestAnimationFrame(updateScale)
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
})

// --- PDF generation ---
const generating = ref(false)

async function downloadPdf() {
  if (!certRef.value || generating.value) return
  generating.value = true
  try {
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import("html2canvas-pro"),
      import("jspdf"),
    ])

    // Temporarily render at full scale so the capture is at native resolution
    const prevTransform = certRef.value.style.transform
    certRef.value.style.transform = "scale(1)"

    const canvas = await html2canvas(certRef.value, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
    })

    certRef.value.style.transform = prevTransform

    const imgData = canvas.toDataURL("image/png")
    const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: [CERT_WIDTH, CERT_HEIGHT] })
    pdf.addImage(imgData, "PNG", 0, 0, CERT_WIDTH, CERT_HEIGHT)
    const safeName = props.cert.fullName.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "")
    pdf.save(`record-certificate-${safeName || "athlete"}.pdf`)
  } finally {
    generating.value = false
  }
}
</script>
