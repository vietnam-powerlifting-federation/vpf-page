<template>
  <div class="relative">
    <AppInput v-bind="$attrs" v-model="model" :type="shown ? 'text' : 'password'" :invalid="invalid" class="pr-12" />
    <button
      type="button"
      class="absolute top-1/2 right-0.5 grid size-11 -translate-y-1/2 cursor-pointer place-items-center rounded text-muted-color hover:text-color"
      :aria-label="shown ? $t('auth.hidePassword') : $t('auth.showPassword')"
      :aria-pressed="shown"
      @click="shown = !shown"
    >
      <AppIcon :name="shown ? 'lucide:eye-off' : 'lucide:eye'" class="size-5" />
    </button>
  </div>
</template>

<script setup lang="ts">
/** Password field with a show/hide toggle. id, autocomplete and aria-* go to the input. */
defineOptions({ inheritAttrs: false })
defineProps<{ invalid?: boolean }>()
const model = defineModel<string>({ default: "" })
const shown = ref(false)
</script>
