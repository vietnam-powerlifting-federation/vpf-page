<template>
    <Password
        unstyled
        :pt="computedTheme"
        :pt-options="{
            mergeProps: ptViewMerge
        }"
        v-bind="$attrs"
    >
        <template #maskicon="{ toggleCallback }">
            <EyeSlashIcon class="end-3 text-surface-500 dark:text-surface-400 absolute top-1/2 -mt-2 w-4 h-4" @click="toggleCallback" />
        </template>
        <template #unmaskicon="{ toggleCallback }">
            <EyeIcon class="end-3 text-surface-500 dark:text-surface-400 absolute top-1/2 -mt-2 w-4 h-4" @click="toggleCallback" />
        </template>
        <template v-for="(_, slotName) in $slots" #[slotName]="slotProps">
            <slot :name="slotName" v-bind="slotProps ?? {}" />
        </template>
    </Password>
</template>

<script setup lang="ts">
import EyeIcon from "@primevue/icons/eye"
import EyeSlashIcon from "@primevue/icons/eyeslash"
import Password, { type PasswordPassThroughOptions, type PasswordProps } from "primevue/password"
import { computed, useAttrs } from "vue"
import { ptViewMerge } from "./utils"

interface Props extends /* @vue-ignore */ PasswordProps {}
defineProps<Props>()

const attrs = useAttrs()

const baseTheme: PasswordPassThroughOptions = {
  root: "inline-flex relative p-fluid:flex",
  pcInputText: {
    root: `appearance-none rounded-md outline-hidden
        bg-surface-0 dark:bg-surface-950
        p-filled:bg-surface-50 dark:p-filled:bg-surface-800
        text-surface-700 dark:text-surface-0
        placeholder:text-surface-500 dark:placeholder:text-surface-400
        border border-surface-300 dark:border-surface-700
        enabled:hover:border-surface-400 dark:enabled:hover:border-surface-600
        enabled:focus:border-primary
        disabled:bg-surface-200 disabled:text-surface-500
        dark:disabled:bg-surface-700 dark:disabled:text-surface-400
        p-invalid:border-red-400 dark:p-invalid:border-red-300
        p-invalid:placeholder:text-red-600 dark:p-invalid:placeholder:text-red-400
        px-3 py-2 p-fluid:w-full p-has-e-icon:pe-10
        p-small:text-sm p-small:px-[0.625rem] p-small:py-[0.375rem]
        p-large:text-lg p-large:px-[0.875rem] p-large:py-[0.625rem]
        transition-colors duration-200 shadow-[0_1px_2px_0_rgba(18,18,23,0.05)]`
  },
  overlay: `p-3 rounded-md p-portal-self:min-w-full
        bg-surface-0 dark:bg-surface-900
        border border-surface-200 dark:border-surface-700
        text-surface-700 dark:text-surface-0
        shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-2px_rgba(0,0,0,0.1)]`,
  content: "flex flex-col gap-2",
  meter: "h-3 bg-surface-200 dark:bg-surface-700 rounded-md",
  meterLabel: `h-full w-0 transition-[width] duration-1000 ease-in-out rounded-md
        p-weak:bg-red-500 dark:p-weak:bg-red-400
        p-medium:bg-amber-500 dark:p-medium:bg-amber-400
        p-strong:bg-green-500 dark:p-strong:bg-green-400`,
  meterText: "",
  transition: {
    enterFromClass: "opacity-0 scale-y-75",
    enterActiveClass: "transition duration-120 ease-[cubic-bezier(0,0,0.2,1)]",
    leaveActiveClass: "transition-opacity duration-100 ease-linear",
    leaveToClass: "opacity-0"
  }
}

const computedTheme = computed<PasswordPassThroughOptions>(() => {
  const classValue = attrs.class
  let classString = ''
  
  if (classValue) {
    if (typeof classValue === 'string') {
      classString = classValue
    } else if (Array.isArray(classValue)) {
      classString = classValue.join(' ')
    } else if (typeof classValue === 'object' && classValue !== null) {
      classString = Object.keys(classValue).filter(k => (classValue as Record<string, unknown>)[k]).join(' ')
    }
  }
  
  const hasWFull = classString.includes('w-full')
  
  // If w-full is in the class, change inline-flex to block in root for simpler width handling
  let rootClass = typeof baseTheme.root === 'string' ? baseTheme.root : 'inline-flex relative p-fluid:flex'
  if (hasWFull) {
    // Change to block but keep relative for icon positioning
    rootClass = rootClass.replace('inline-flex', 'block').replace('p-fluid:flex', '').replace('relative', '').trim() + ' relative'
  }
  
  const finalRootClass = classString 
    ? `${rootClass} ${classString}`
    : rootClass
  
  // If w-full is in the class, ensure the input also gets w-full
  let inputClass = typeof baseTheme.pcInputText?.root === 'string' 
    ? baseTheme.pcInputText.root 
    : ''
  if (hasWFull) {
    // Remove p-fluid:w-full and add w-full
    inputClass = inputClass.replace(/\bp-fluid:w-full\b/g, '')
    // Add w-full if not already present
    if (!inputClass.includes('w-full')) {
      inputClass = `${inputClass} w-full`.trim()
    }
  }
  
  return {
    ...baseTheme,
    root: finalRootClass,
    pcInputText: {
      ...baseTheme.pcInputText,
      root: inputClass || baseTheme.pcInputText?.root
    }
  }
})
</script>
