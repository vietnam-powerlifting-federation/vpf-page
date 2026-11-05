<template>
  <div class="flex min-w-0 flex-wrap items-center gap-1.5">
    <span
      v-for="athlete in athletes"
      :key="athlete.userId"
      class="inline-flex max-w-full items-center gap-1.5 rounded border border-surface-300 bg-surface-100 py-1 pr-1 pl-2 text-sm"
    >
      <span class="truncate font-medium">{{ athlete.fullName }}</span>
      <span class="font-mono text-xs text-muted-color">{{ athlete.vpfId }}</span>
      <button
        type="button"
        class="grid size-6 shrink-0 cursor-pointer place-items-center rounded hover:bg-surface-200"
        :aria-label="$t('admin.athleteSearch.remove', { name: athlete.fullName })"
        @click="remove(athlete)"
      >
        <AppIcon name="lucide:x" class="size-3.5" />
      </button>
    </span>

    <Button type="button" size="small" outlined @click="open = true">
      <AppIcon name="lucide:search" class="size-4" />
      {{ $t(buttonLabel) }}
    </Button>

    <AdminAthleteSearchDialog v-model:visible="open" :multiple="multiple" :selected="athletes" @select="athletes = $event" />
  </div>
</template>

<script setup lang="ts">
import type { UserPrivate } from "~/types/users"

/**
 * An athlete field for admin forms: the chosen athlete(s) as removable chips,
 * and a button that opens the search dialog. The model is always a list; it
 * holds at most one athlete unless `multiple` is set. Wrap it in `AppField`
 * with `group`: the button names itself ("Find athlete"), and a `<label for>`
 * would replace that name.
 */
const props = defineProps<{ multiple?: boolean }>()
const athletes = defineModel<UserPrivate[]>({ required: true })

const open = ref(false)

const buttonLabel = computed(() => {
  if (!athletes.value.length) return props.multiple ? "admin.athleteSearch.findMany" : "admin.athleteSearch.find"
  return props.multiple ? "admin.athleteSearch.addMore" : "admin.athleteSearch.change"
})

function remove(athlete: UserPrivate) {
  athletes.value = athletes.value.filter((a) => a.userId !== athlete.userId)
}
</script>
