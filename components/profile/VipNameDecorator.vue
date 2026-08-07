<template>
  <div class="space-y-3">
    <div>
      <label class="block text-sm font-medium text-surface-300">{{ $t("profile.vipBenefits.nameColor") }}</label>
      <p class="text-sm text-surface-500 mt-1">{{ $t("profile.vipBenefits.nameColorHint") }}</p>
    </div>

    <!-- Live sample on a dark swatch, so pale gradients stay legible -->
    <div class="rounded-lg bg-surface-900 border border-surface-700 px-4 py-3">
      <span
        class="text-2xl sm:text-3xl font-bold break-words"
        :class="hasDecorator ? '' : 'text-surface-0'"
        :style="sampleStyle"
      >
        {{ sampleName }}
      </span>
    </div>

    <SelectButton
      :model-value="mode"
      :options="modeOptions"
      option-label="label"
      option-value="value"
      :allow-empty="false"
      :disabled="disabled"
      @update:model-value="(v: Mode) => v && setMode(v)"
    />

    <template v-if="mode !== 'none'">
      <!-- Presets -->
      <div>
        <p class="text-sm text-surface-400 mb-2">{{ $t("profile.vipBenefits.colorPresets") }}</p>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="preset in PRESETS"
            :key="preset.key"
            type="button"
            class="w-8 h-8 rounded-full border border-surface-600 transition-transform hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            :style="presetSwatchStyle(preset)"
            :title="$t(`profile.vipBenefits.preset${preset.key}`)"
            :aria-label="$t(`profile.vipBenefits.preset${preset.key}`)"
            :disabled="disabled"
            @click="applyPreset(preset)"
          />
        </div>
      </div>

      <!-- Manual colours -->
      <div class="flex flex-wrap gap-4">
        <div class="flex flex-col gap-1">
          <label class="text-sm text-surface-400">
            {{ mode === "solid" ? $t("profile.vipBenefits.colorSolid") : $t("profile.vipBenefits.colorStart") }}
          </label>
          <div class="flex items-center gap-2">
            <ColorPicker
              :model-value="stripHash(decorator1)"
              format="hex"
              :disabled="disabled"
              @update:model-value="(v: string) => onPick(0, v)"
            />
            <InputText
              v-model="text1"
              class="w-28"
              :disabled="disabled"
              placeholder="#FFCC00"
              @update:model-value="onType(0)"
            />
          </div>
        </div>

        <div v-if="mode === 'gradient'" class="flex flex-col gap-1">
          <label class="text-sm text-surface-400">{{ $t("profile.vipBenefits.colorEnd") }}</label>
          <div class="flex items-center gap-2">
            <ColorPicker
              :model-value="stripHash(decorator2)"
              format="hex"
              :disabled="disabled"
              @update:model-value="(v: string) => onPick(1, v)"
            />
            <InputText
              v-model="text2"
              class="w-28"
              :disabled="disabled"
              placeholder="#FF5E62"
              @update:model-value="onType(1)"
            />
          </div>
        </div>
      </div>

      <Message v-if="invalid" severity="error" size="small" variant="simple">
        {{ $t("profile.vipBenefits.colorInvalid") }}
      </Message>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { nameGradientStyle } from "~/lib/utils/client"

type Mode = "none" | "solid" | "gradient"
type Preset = { key: string; from: string; to: string }

const PRESETS: Preset[] = [
  { key: "Gold", from: "#f7d774", to: "#b8860b" },
  { key: "Silver", from: "#e8e8e8", to: "#9aa0a6" },
  { key: "Fire", from: "#ff7a18", to: "#af002d" },
  { key: "Ocean", from: "#43cea2", to: "#185a9d" },
  { key: "Sunset", from: "#ff9966", to: "#ff5e62" },
  { key: "Neon", from: "#00f5a0", to: "#00d9f5" },
  { key: "Mint", from: "#a8ff78", to: "#78ffd6" },
  { key: "Violet", from: "#c471f5", to: "#fa71cd" },
]

const HEX = /^#[0-9a-fA-F]{6}$/

const props = defineProps<{
  disabled: boolean
  decorator1: string | null
  decorator2: string | null
  sampleName: string
}>()

const emit = defineEmits<{ update: [d1: string | null, d2: string | null] }>()

const { t } = useI18n()

const modeOptions = computed(() => [
  { label: t("profile.vipBenefits.colorModeNone"), value: "none" as Mode },
  { label: t("profile.vipBenefits.colorModeSolid"), value: "solid" as Mode },
  { label: t("profile.vipBenefits.colorModeGradient"), value: "gradient" as Mode },
])

// Derived from the values, but an explicit choice wins — otherwise picking "gradient"
// and then setting both ends to the same colour would silently flip back to "solid".
const derivedMode = computed<Mode>(() => {
  if (!props.decorator1 && !props.decorator2) return "none"
  if (props.decorator1 === props.decorator2) return "solid"
  return "gradient"
})
const modeOverride = ref<Mode | null>(null)
const mode = computed<Mode>(() => modeOverride.value ?? derivedMode.value)

const hasDecorator = computed(() => !!(props.decorator1 || props.decorator2))
const sampleStyle = computed(() => nameGradientStyle(props.decorator1, props.decorator2))

function stripHash(v: string | null): string {
  return v ? v.replace(/^#/, "") : ""
}
function withHash(v: string): string {
  return v.startsWith("#") ? v : `#${v}`
}

function presetSwatchStyle(preset: Preset) {
  // In solid mode the swatch previews what clicking it will actually apply.
  return mode.value === "solid"
    ? { background: preset.from }
    : { background: `linear-gradient(to right, ${preset.from}, ${preset.to})` }
}

function setMode(next: Mode) {
  modeOverride.value = next
  if (next === "none") {
    emit("update", null, null)
    return
  }
  const base = props.decorator1 || props.decorator2 || PRESETS[0]!.from
  if (next === "solid") {
    emit("update", base, base)
    return
  }
  const end = props.decorator2 && props.decorator2 !== props.decorator1 ? props.decorator2 : PRESETS[0]!.to
  emit("update", base, end)
}

function applyPreset(preset: Preset) {
  if (mode.value === "solid") {
    emit("update", preset.from, preset.from)
    return
  }
  modeOverride.value = "gradient"
  emit("update", preset.from, preset.to)
}

// PrimeVue's ColorPicker emits hex without a leading #, which the API rejects.
function onPick(index: 0 | 1, value: string) {
  const hex = withHash(value)
  if (!HEX.test(hex)) return
  if (mode.value === "solid") {
    emit("update", hex, hex)
    return
  }
  if (index === 0) emit("update", hex, props.decorator2)
  else emit("update", props.decorator1, hex)
}

/* Typed hex — kept local so half-typed values do not clobber the form */
const text1 = ref(props.decorator1 ?? "")
const text2 = ref(props.decorator2 ?? "")
const invalid = ref(false)

watch(
  () => [props.decorator1, props.decorator2] as const,
  ([d1, d2]) => {
    if (withHash(text1.value || "#") !== d1) text1.value = d1 ?? ""
    if (withHash(text2.value || "#") !== d2) text2.value = d2 ?? ""
    invalid.value = false
  },
)

function onType(index: 0 | 1) {
  const raw = (index === 0 ? text1.value : text2.value).trim()
  if (!raw) {
    invalid.value = false
    return
  }
  const hex = withHash(raw)
  if (!HEX.test(hex)) {
    invalid.value = true
    return
  }
  invalid.value = false
  onPick(index, hex)
}
</script>
