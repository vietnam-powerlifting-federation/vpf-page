<template>
  <div class="grid min-w-0 grid-cols-1 content-start gap-1">
    <component :is="group ? 'span' : 'label'" :id="labelId" :for="group ? undefined : id" class="text-sm font-semibold">
      {{ label }}<span v-if="required" class="text-danger" aria-hidden="true"> *</span>
    </component>
    <slot :id="id" :label-id="labelId" :described-by="describedBy" :invalid="!!error" />
    <small v-if="hint" :id="hintId" class="text-[0.8125rem] text-muted-color">{{ hint }}</small>
    <small v-if="error" :id="errorId" class="flex items-center gap-1 text-[0.8125rem] font-medium text-danger">
      <AppIcon name="lucide:circle-alert" class="size-4" />{{ error }}
    </small>
  </div>
</template>

<script setup lang="ts">
/**
 * A visible label, the control, a hint and an error, wired together.
 *
 * The slot receives `id` (for the control), `labelId` (for controls that are
 * not native inputs, via aria-labelledby), `describedBy` (hint + error) and
 * `invalid`. Use `group` when the control is a group of inputs and the label
 * should not point at one of them.
 */
const props = defineProps<{
  label: string
  hint?: string
  error?: string
  required?: boolean
  group?: boolean
  /** Fix the control id, e.g. to keep a stable target for focusing the first error. */
  fieldId?: string
}>()

const generated = useId()
const id = computed(() => props.fieldId ?? generated)
const labelId = computed(() => `${id.value}-label`)
const hintId = computed(() => `${id.value}-hint`)
const errorId = computed(() => `${id.value}-error`)
const describedBy = computed(() => [props.hint && hintId.value, props.error && errorId.value].filter(Boolean).join(" ") || undefined)
</script>
